import { item_ratio, ITEM_SPAWN_START_DELAY, ITEM_SPAWN_INTERVAL_MIN, ITEM_SPAWN_INTERVAL_MAX } from './gameConfig';

// テストモード（開発者用）
// ユーザネーム設定で特定のコードを入力すると有効化。コードはバンドルに平文で残さないようハッシュで照合する。
// テストモード中はプレイ記録（ランキング・個人記録）を一切送信しない。

const TEST_MODE_CODE_HASH = 2561837489031417;

// 53bitの非暗号学的ハッシュ（cyrb53）。HTTP（LAN経由のスマホ確認など）でも動くよう同期・純JSで実装
const hashString = (str: string, seed = 0): number => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

export const isTestModeCode = (input: string): boolean => hashString(input.trim()) === TEST_MODE_CODE_HASH;

// テストモードで変更できるアイテム出現パラメータ
export interface SpawnParams {
    itemRatio: number[];   // ItemType の順（gameConfig の item_ratio と同じ並び）
    startDelay: number;    // ITEM_SPAWN_START_DELAY
    intervalMin: number;   // ITEM_SPAWN_INTERVAL_MIN
    intervalMax: number;   // ITEM_SPAWN_INTERVAL_MAX
}

export const createDefaultSpawnParams = (): SpawnParams => ({
    itemRatio: [...item_ratio],
    startDelay: ITEM_SPAWN_START_DELAY,
    intervalMin: ITEM_SPAWN_INTERVAL_MIN,
    intervalMax: ITEM_SPAWN_INTERVAL_MAX,
});
