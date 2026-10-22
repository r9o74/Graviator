-- 個人記録（アカウントページ）用テーブルとRPC
-- 設計: docs/account-records-design.md

-- ============================================================
-- テーブル
-- ============================================================

-- モード×難易度の区画ごとの記録（1ユーザー最大8行）
create table public.player_stats (
  user_id                  uuid not null references auth.users(id) on delete cascade,
  mode                     text not null check (mode in ('SURVIVAL', 'ENDLESS')),
  difficulty               text not null check (difficulty in ('EASY', 'NORMAL', 'HARD', 'EXTREME')),
  -- 通算
  total_distance           double precision not null default 0,
  total_kills              integer          not null default 0,
  total_survival_time      double precision not null default 0,
  -- 最高（1プレイ）
  best_speed               double precision not null default 0,
  best_gravity             double precision not null default 0,
  best_items_used          integer          not null default 0,
  best_endless_kills       integer,           -- ENDLESS行のみ値を持つ
  best_survival_clear_time double precision,  -- SURVIVAL行のみ。VICTORY時のみ更新（最速）
  updated_at               timestamptz not null default now(),
  primary key (user_id, mode, difficulty)
);

-- 区画ごとのアイテム別使用数（item_key は列挙制約なし：新アイテム追加時にマイグレーション不要）
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

-- ============================================================
-- RLS：閲覧は本人行のみ。書き込みポリシーは作らない（書き込みはRPC経由のみ）
-- ============================================================

alter table public.player_stats      enable row level security;
alter table public.player_item_usage enable row level security;

create policy "Users can read own stats" on public.player_stats
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "Users can read own item usage" on public.player_item_usage
  for select to authenticated using ((select auth.uid()) = user_id);

-- ============================================================
-- RPC：ゲーム終了時の記録
-- ============================================================

create or replace function public.record_game_result(
  p_mode          text,
  p_difficulty    text,
  p_distance      double precision,
  p_kills         integer,
  p_survival_time double precision,
  p_max_speed     double precision,
  p_max_gravity   double precision,
  p_items_used    integer,
  p_cleared       boolean,
  p_item_counts   jsonb
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_item record;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- 匿名ログインのユーザーは記録しない（サーバー側でも強制）
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'anonymous users are not recorded';
  end if;

  -- 破損データ防止の最低限の検証（改ざん対策ではない）
  if p_mode not in ('SURVIVAL', 'ENDLESS') then
    raise exception 'invalid mode: %', p_mode;
  end if;
  if p_difficulty not in ('EASY', 'NORMAL', 'HARD', 'EXTREME') then
    raise exception 'invalid difficulty: %', p_difficulty;
  end if;
  -- JSONの Infinity / NaN は null になるため null チェックで弾かれる
  if p_distance is null or p_distance < 0
     or p_kills is null or p_kills < 0 or p_kills > 100000
     or p_survival_time is null or p_survival_time < 0 or p_survival_time > 86400
     or p_max_speed is null or p_max_speed < 0
     or p_max_gravity is null or p_max_gravity < 0
     or p_items_used is null or p_items_used < 0 or p_items_used > 100000
     or p_cleared is null then
    raise exception 'invalid record values';
  end if;

  -- 区画の記録を原子的にUPSERT（通算は加算、最高は greatest / least。greatest/least は null を無視する）
  insert into public.player_stats as s (
    user_id, mode, difficulty,
    total_distance, total_kills, total_survival_time,
    best_speed, best_gravity, best_items_used,
    best_endless_kills, best_survival_clear_time
  ) values (
    v_uid, p_mode, p_difficulty,
    p_distance, p_kills, p_survival_time,
    p_max_speed, p_max_gravity, p_items_used,
    case when p_mode = 'ENDLESS' then p_kills end,
    case when p_mode = 'SURVIVAL' and p_cleared then p_survival_time end
  )
  on conflict (user_id, mode, difficulty) do update set
    total_distance           = s.total_distance + excluded.total_distance,
    total_kills              = s.total_kills + excluded.total_kills,
    total_survival_time      = s.total_survival_time + excluded.total_survival_time,
    best_speed               = greatest(s.best_speed, excluded.best_speed),
    best_gravity             = greatest(s.best_gravity, excluded.best_gravity),
    best_items_used          = greatest(s.best_items_used, excluded.best_items_used),
    best_endless_kills       = greatest(s.best_endless_kills, excluded.best_endless_kills),
    best_survival_clear_time = least(s.best_survival_clear_time, excluded.best_survival_clear_time),
    updated_at               = now();

  -- アイテム別使用数を加算（1件以上のキーのみ）
  for v_item in select key, value from jsonb_each_text(coalesce(p_item_counts, '{}'::jsonb)) loop
    v_count := v_item.value::integer;
    if v_count < 0 or v_count > 10000 then
      raise exception 'invalid item count for %', v_item.key;
    end if;
    if v_count > 0 then
      insert into public.player_item_usage as u (user_id, mode, difficulty, item_key, count)
      values (v_uid, p_mode, p_difficulty, v_item.key, v_count)
      on conflict (user_id, mode, difficulty, item_key) do update set
        count = u.count + excluded.count;
    end if;
  end loop;
end;
$$;

revoke all on function public.record_game_result(text, text, double precision, integer, double precision, double precision, double precision, integer, boolean, jsonb) from public, anon;
grant execute on function public.record_game_result(text, text, double precision, integer, double precision, double precision, double precision, integer, boolean, jsonb) to authenticated;

-- ============================================================
-- RPC：本人の記録を一括取得（RLSにより本人行のみ）
-- ============================================================

create or replace function public.get_player_stats()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'stats', coalesce(
      (select jsonb_agg(to_jsonb(s) - 'user_id') from public.player_stats s where s.user_id = (select auth.uid())),
      '[]'::jsonb),
    'items', coalesce(
      (select jsonb_agg(to_jsonb(u) - 'user_id') from public.player_item_usage u where u.user_id = (select auth.uid())),
      '[]'::jsonb)
  );
$$;

revoke all on function public.get_player_stats() from public, anon;
grant execute on function public.get_player_stats() to authenticated;
