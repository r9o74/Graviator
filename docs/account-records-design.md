# 基本設計書: アカウントページ(個人記録)

最終更新: 2026-10-22

## 0. 要件サマリ(確定事項)

| 項目 | 決定内容 |
|---|---|
| 対象 | Googleログイン済みアカウントのみ記録。匿名プレイ・チュートリアルは記録しない |
| 範囲 | 記録の表示のみ(アチーブメントは対象外。後から追加できる構造にする) |
| ホーム画面 | 歯車ボタン → 人型アイコン(アカウントページ)。LOGIN/LOGOUT はアカウントページへ移動 |
| 匿名時のページ | ログイン案内+LOGINボタン+名前変更。記録欄は出さない |
| 集計粒度 | 全記録を モード(SURVIVAL/ENDLESS) × 難易度(4) の8区画で保存 |
| 合算表示 | 通算記録は和、最高記録は最大値 |
| 書き込み時機 | ゲーム終了時のみ(VICTORY / GAME_OVER、両モード)。途中離脱は記録しない |
| 使用アイテム数 | 直接取得+強奪成功の両方を加算 |
| 過去データ | 既存 `scores` からの復元は行わない(導入日から集計) |
| 改ざん対策 | 行わない(RPCで破損データの最低限の検証のみ) |

### 表示項目

| 区分 | 項目 | 表示単位 | 集計 |
|---|---|---|---|
| 基本 | ユーザID | 先頭8文字(タップで全文コピー) | — |
| 基本 | ユーザネーム | 最大20文字 | — |
| 最高記録 | 最高速度 | 1値 | 全区画の最大 |
| 最高記録 | 最大引力 | 1値 | 全区画の最大 |
| 最高記録 | 使用アイテム数(1プレイ) | 1値 | 全区画の最大 |
| 最高記録 | ENDLESS撃墜数 | 難易度別 | ENDLESS区画のみ |
| 最高記録 | SURVIVALクリアタイム | 難易度別(最速) | SURVIVAL区画のみ、VICTORY時のみ更新 |
| 通算記録 | 移動距離 | 1値 | 全区画の和 |
| 通算記録 | 撃墜数 | 1値 | 全区画の和 |
| 通算記録 | 生存時間 | 1値 | 全区画の和 |
| 通算記録 | 使用アイテム数 | アイテム別 | 全区画の和 |

---

## 1. 全体構成

```
[Engine] ─ ゲーム中に集計(距離・アイテム別・最高速度・最大引力・撃墜数・生存時間)
   │ emitStats() → GameStats(runId 付き)
   ▼
[App.tsx] ─ VICTORY / GAME_OVER を検知、ログイン済み&非匿名&非チュートリアルなら送信
   │ recordGameResult()                     ※ runId で二重送信を防止
   ▼
[lib/stats.ts] ── supabase.rpc('record_game_result') ──▶ [DB] player_stats / player_item_usage
                                                              ▲
[AccountPage] ─ 開いた時に fetchPlayerStats() ── supabase.rpc('get_player_stats') ─┘
              └ 区画データを合算(和/最大)して表示
```

- テーブルへの直接書き込みは禁止し、書き込みはRPC経由のみとする。
- 閲覧はRLSで本人行のみ許可する。

---

## 2. DB設計

マイグレーションSQLはリポジトリの `supabase/migrations/` に置き、Supabase MCP の `apply_migration` で適用する。

### 2.1 `player_stats`(1ユーザー最大8行)

```sql
create table public.player_stats (
  user_id                  uuid not null references auth.users(id) on delete cascade,
  mode                     text not null check (mode in ('SURVIVAL', 'ENDLESS')),
  difficulty               text not null check (difficulty in ('EASY', 'NORMAL', 'HARD', 'EXTREME')),
  -- 通算
  total_distance           double precision not null default 0,
  total_kills              integer          not null default 0,
  total_survival_time      double precision not null default 0,
  -- 最高(1プレイ)
  best_speed               double precision not null default 0,
  best_gravity             double precision not null default 0,
  best_items_used          integer          not null default 0,
  best_endless_kills       integer,           -- ENDLESS行のみ値を持つ
  best_survival_clear_time double precision,  -- SURVIVAL行のみ。VICTORY時のみ更新(最速)
  updated_at               timestamptz not null default now(),
  primary key (user_id, mode, difficulty)
);
```

### 2.2 `player_item_usage`(1ユーザー最大 8区画 × アイテム種数)

```sql
create table public.player_item_usage (
  user_id    uuid not null,
  mode       text not null,
  difficulty text not null,
  item_key   text not null check (item_key ~ '^[A-Z_]{1,32}$'),
  count      integer not null default 0 check (count >= 0),
  primary key (user_id, mode, difficulty, item_key),
  foreign key (user_id, mode, difficulty)
    references public.player_stats (user_id, mode, difficulty) on delete cascade
);
```

- `item_key` には列挙制約を付けない(書式チェックのみ)。新アイテムの追加時にマイグレーションを不要にするため。
- 複合外部キーにより、`player_stats` の行がない区画にアイテム行はできない。アカウント削除時は連鎖削除される。

### 2.3 RLS

```sql
alter table public.player_stats      enable row level security;
alter table public.player_item_usage enable row level security;

create policy "Users can read own stats" on public.player_stats
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can read own item usage" on public.player_item_usage
  for select to authenticated using ((select auth.uid()) = user_id);
-- INSERT / UPDATE / DELETE のポリシーは作らない(=直接書き込み不可)
```

注: 匿名ログインのユーザーも `authenticated` ロールで動く。匿名を除外する判定はRPC内でJWTの `is_anonymous` を見て行う。

---

## 3. RPC設計

### 3.1 `record_game_result`(書き込み)

| 引数 | 型 | 内容 |
|---|---|---|
| `p_mode` | text | `SURVIVAL` / `ENDLESS` |
| `p_difficulty` | text | `EASY` / `NORMAL` / `HARD` / `EXTREME` |
| `p_distance` | double precision | このプレイの移動距離 |
| `p_kills` | integer | このプレイの撃墜数 |
| `p_survival_time` | double precision | このプレイの経過時間(秒) |
| `p_max_speed` | double precision | このプレイの最高速度 |
| `p_max_gravity` | double precision | このプレイの最大引力 |
| `p_items_used` | integer | このプレイの使用アイテム数(取得+強奪) |
| `p_cleared` | boolean | SURVIVALでVICTORYなら true |
| `p_item_counts` | jsonb | アイテム別件数 例 `{"MASS_BOOST":2,"HOLE":1}` |

- 戻り値は `void`。
- `security definer`、`set search_path = ''` とする。
- 実行権限は `authenticated` のみに付与し、`public` / `anon` からは剥奪する。

処理の流れ:
1. `auth.uid()` が null なら例外を投げる。
2. `auth.jwt() ->> 'is_anonymous'` が true なら例外を投げる(サーバー側でも「ログイン済みのみ」を強制する)。
3. 値を検証する(破損データ防止。改ざん対策ではない)。
   - モードと難易度が定義済みの値であること。
   - 全数値が null でなく 0 以上であること。JSONの `Infinity` / `NaN` は null になるので、ここで弾かれる。
   - `p_survival_time` は 86400 以下、`p_kills` と `p_items_used` は 100000 以下であること。
   - 速度・引力・距離には上限を設けない。ブラックホールの速度増幅に上限がないため、正当なプレイでも非常に大きな値になり得る。
4. `player_stats` に UPSERT する。1文の `insert ... on conflict do update` で原子的に処理する。
   - 通算: `total_x = 既存 + 今回`
   - 最高: `best_speed / best_gravity / best_items_used = greatest(既存, 今回)`
   - `best_endless_kills = greatest(既存, 今回)`。今回分は ENDLESS のときのみ値を入れ、それ以外は null にする。
   - `best_survival_clear_time = least(既存, 今回)`。今回分は SURVIVAL かつ `p_cleared` のときのみ値を入れ、それ以外は null にする。
   - Postgres の `greatest` / `least` は null を無視するので、初回や対象外区画でも正しく動く。
5. `player_item_usage` に UPSERT する。`jsonb_each_text(p_item_counts)` で展開し、件数が 1 以上のキーだけを `count = 既存 + 今回` で加算する。1キーあたり 10000 以下とする。

### 3.2 `get_player_stats`(読み出し)

- 引数なし。戻り値は jsonb。
- `security invoker` で、RLSにより本人行のみ返る。

```json
{
  "stats": [ { "mode": "ENDLESS", "difficulty": "HARD", "total_distance": 12345.6, ... } ],
  "items": [ { "mode": "ENDLESS", "difficulty": "HARD", "item_key": "HOLE", "count": 3 } ]
}
```

行が1つもないユーザーには `{"stats": [], "items": []}` を返す(画面では全項目0表示)。

---

## 4. クライアント設計

### 4.1 アイテム定義の一元化: `constants/items.ts`(新規)

- `ITEM_KEYS: Record<ItemType, string>` を定義する。`ItemType` の数値enumは変えずに、文字列キーへの対応表として持つ。型が網羅的なので、新アイテムを追加してキーを書き忘れるとコンパイルエラーになる。
  - `MASS_BOOST, SATELLITE, INVISIBILITY, GRAVITY_WAVE, INVERSION, REPULSIVE_TRAIL, CAPTURE, RAMJET, HOLE`
  - **このキーはDBとの永続的な契約**であり、後から改名しない。
- `ITEM_INFOS`(名前・英語名・説明)を `ItemGuide.tsx` からここへ移す。アイテムガイドとアカウントページの両方で使う。

### 4.2 型: `types.ts`

`GameStats` に以下を追加する。

| フィールド | 型 | 内容 |
|---|---|---|
| `distance` | number | このプレイの移動距離 |
| `itemCounts` | `Record<string, number>` | アイテム別使用数(キーは `ITEM_KEYS`) |
| `runId` | number | プレイごとの通番(二重送信防止用) |

既存の `itemsUsed` は、強奪分も含む値に意味が変わる。リザルト画面の「使用アイテム数」表示にも反映される。

### 4.3 Engine での集計: `game/Engine.ts`

| 追加 | 内容 |
|---|---|
| `runId` | `start()` ごとに +1 する |
| `distanceTraveled` | `start()` で0に戻す。毎フレーム、プレイヤーの `update()` 前後の位置差の長さを加算する(ポーズ中は `update` が早期 return するので加算されない) |
| `itemUseCounts` | `Partial<Record<ItemType, number>>`。`start()` で空にする |

- **直接取得:** アイテム取得処理の `if (entity.isPlayer) this.itemsUsedCount++` の箇所で、`itemUseCounts[item.type]` も +1 する。
- **強奪:** `stealableItems` の各要素に `itemType: ItemType` を持たせる(`'MASS'` → `MASS_BOOST` などの対応はここで固定)。強奪成功(`stoleSomething`)かつ `capturer.isPlayer` のとき、`itemsUsedCount` と `itemUseCounts[itemType]` を +1 する。
- **`emitStats()`:** `distance` と `runId` を載せ、`itemUseCounts` を `ITEM_KEYS` で文字列キーに変換して `itemCounts` に載せる。
- 最高速度・最大引力・撃墜数・生存時間は、既存の `maxSpeedRecorded` / `maxGravityRecorded` / `killCount` / `survivalTime` をそのまま使う。

### 4.4 記録の送信: `App.tsx`

新しい `useEffect` を追加する。既存の `saveScore` の処理とは発火条件が異なるので別にする。

```
条件: (gameState === VICTORY || gameState === GAME_OVER)
      && gameStats.mode !== TUTORIAL
      && userId && !isAnonymous
      && gameStats.runId !== lastRecordedRunIdRef.current
処理: recordGameResult(gameStats, cleared = (gameState === VICTORY && mode === SURVIVAL))
      lastRecordedRunIdRef.current = gameStats.runId
```

- エンジンは終了直前に `emitStats()` を呼んでから状態を変えるので、effect 実行時の `gameStats` は終了時点の値になる。
- 終了後は `update()` が PLAYING 以外で早期 return し、`gameStats` は更新されない。effect が再実行されても `runId` で弾かれる。

### 4.5 送受信と集計: `lib/stats.ts`(新規)

| 関数 | 内容 |
|---|---|
| `recordGameResult(stats, cleared)` | `supabase.rpc('record_game_result', ...)` を呼ぶ。失敗時は `console.error` のみ(再送しない) |
| `fetchPlayerStats(): Promise<PlayerStatsSummary \| null>` | `get_player_stats` を呼び、下記の集計を行う。失敗時は null |

`PlayerStatsSummary`(表示用に集計済みの値):

| フィールド | 算出 |
|---|---|
| `bestSpeed` / `bestGravity` / `bestItemsUsed` | 全行の最大 |
| `endlessKillsByDifficulty[d]` | ENDLESS × d 行の `best_endless_kills`(なければ null) |
| `survivalClearTimeByDifficulty[d]` | SURVIVAL × d 行の `best_survival_clear_time`(なければ null) |
| `totalDistance` / `totalKills` / `totalSurvivalTime` | 全行の和 |
| `itemTotals[key]` | 全行の `count` の和。`ITEM_KEYS` の全キーを0で初期化し、未知のキー(新しいクライアントが書いた将来のアイテム)は無視 |

### 4.6 画面

#### ホーム(`MenuOverlay.tsx`)
- ボタン行を RANKING と人型アイコンの2つにする。
- 歯車アイコンを人型アイコンのSVGに差し替え、`title` を "Account" にする。
- LOGIN / LOGOUT ボタンをこの行から削除する。
- `showSettings` を `showAccount` に改名し、`SettingsModal` の代わりに `AccountPage` を表示する。

#### `components/AccountPage.tsx`(新規、`SettingsModal.tsx` は削除)

Props: `onClose, userId, isAnonymous, userName, setUserName`

```
┌──────────────────────────────┐
│ ACCOUNT                    ✕ │
├──────────────────────────────┤
│ ID  1a2b3c4d…  [コピー]       │
│ NAME [__________] [SAVE]     │
│ [LOGOUT] / [LOGIN with Google]│
├──────────────────────────────┤ ← 以下はログイン済みのみ
│ BEST RECORDS                 │
│  最高速度 / 最大引力 / 使用アイテム数 │
│  ┌難易度┬ENDLESS撃墜┬SURVIVAL最速┐│
│  │EASY  │   12     │  45.20s  ││
│  │…     │   —      │   —      ││
│  └──────┴──────────┴──────────┘│
├──────────────────────────────┤
│ TOTAL RECORDS                │
│  移動距離 / 撃墜数 / 生存時間      │
├──────────────────────────────┤
│ ITEM USAGE (アイコン+件数×9)   │
└──────────────────────────────┘
```

- 既存のカード内スクロールコンテナに収める。
- **匿名時:** BEST以降の代わりに「Googleでログインすると記録が保存されます」の案内と LOGIN ボタンを表示する。ID と名前変更は匿名でも表示する。
- **読み込み状態:** 取得中は LOADING、失敗時は「記録を読み込めませんでした」、行なしは全項目0(記録系は `—`)を表示する。
- **名前保存:** 既存 `SettingsModal` と同じ挙動にする(trim、空なら `Player`、最大20文字、`setUserName` → App側でprofilesとlocalStorageに保存)。
- **ID:** 先頭8文字を表示し、コピーボタンで全文(UUID)を `navigator.clipboard` にコピーする。
- **LOGIN / LOGOUT:** 既存の `signInWithGoogle` / `signOut` を使う。
- **データ取得:** ページを開いたとき(ログイン済みのみ)に毎回 `fetchPlayerStats()` を呼ぶ。キャッシュはしない。

#### `components/ItemIcon.tsx`(新規)
- `ItemGuide.tsx` 内の `ItemIcon` を切り出し、アイテムガイドとアカウントページで共有する。

### 4.7 表示形式

| 項目 | 形式 |
|---|---|
| 速度 | `1,234 px/s`(整数、3桁区切り) |
| 引力 | `12,345 N` |
| 移動距離 | `1,234,567 px`。単位ラベルと換算係数は `constants` の定数にし、DB値は変えずに後から変更できるようにする |
| クリアタイム | `45.20s`(小数2桁。リザルト画面と同じ) |
| 通算生存時間 | `h:mm:ss` |
| 回数系 | 3桁区切り整数 |
| 記録なし | `—` |

---

## 5. 変更ファイル一覧

| 種別 | ファイル |
|---|---|
| 新規 | `supabase/migrations/<timestamp>_player_stats.sql` |
| 新規 | `constants/items.ts` |
| 新規 | `lib/stats.ts` |
| 新規 | `components/AccountPage.tsx` |
| 新規 | `components/ItemIcon.tsx` |
| 変更 | `types.ts`(GameStats に3フィールド追加) |
| 変更 | `game/Engine.ts`(距離・アイテム別集計、runId、強奪分の加算) |
| 変更 | `App.tsx`(記録送信のeffect、`showSettings` → `showAccount`) |
| 変更 | `components/MenuOverlay.tsx`(ボタン行、AccountPage表示) |
| 変更 | `components/ItemGuide.tsx`(`ItemIcon` / `ITEM_INFOS` を共有モジュールから import) |
| 削除 | `components/SettingsModal.tsx` |

---

## 6. 検証計画

1. `npm run build`(型チェック込み)が通ること。
2. マイグレーション適用後、MCPの `get_advisors`(security)で、RLS漏れや `search_path` 未設定の警告がないこと。
3. 実機確認(Googleログイン状態):
   - SURVIVAL をクリアすると、該当区画の通算が加算され、クリアタイムが記録される。
   - SURVIVAL で GAME_OVER になると、通算は加算され、クリアタイムは更新されない。
   - ENDLESS で GAME_OVER になると、通算が加算され、ENDLESS撃墜数の最大が更新される。
   - アイテムの取得と強奪で、アイテム別件数と1プレイ使用数が増える。
   - ポーズ → HOME で抜けたプレイは記録されない。
   - チュートリアルは記録されない。
4. 匿名状態でプレイしても、行が作られないこと(RPCが例外になり、クライアントからは呼ばれない)。
5. 別ユーザーの行が `select` で見えないこと(RLS)。
6. アカウントページで、合算(通算は和、最高は最大)が区画データと一致すること。

---

## 7. リスク・補足

- **最高速度の極端な値:** ブラックホールの接線速度増幅に上限がないため、最高速度が極端に大きくなり得る。DBは double なので保存は問題ない。表示は `toLocaleString` で、1e21 以上は指数表記になる。
- **途中離脱の記録漏れ:** ゲーム終了時のみ書き込む仕様のため、タブを閉じたプレイは記録されない(要件として合意済み)。
- **既存処理との関係:** 既存の `saveScore`(ランキング)は変更しない。`saveScore` の5秒時間窓による重複防止を `runId` 方式に揃えるのは、別タスクで検討する。
- **関連タスク(本設計の範囲外):** 無料プランの自動一時停止対策(週1回のキープアライブ、またはProプラン)。停止から90日を過ぎると復元できなくなるため、記録データを守る観点で早めに実施を推奨する。
