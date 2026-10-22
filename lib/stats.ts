import { supabase, isSupabaseConfigured } from './supabase';
import { GameStats, GameMode, Difficulty } from '../types';
import { ITEM_INFOS, ITEM_KEYS } from '../constants/items';


// 設計: docs/account-records-design.md

const DIFFICULTIES: Difficulty[] = [Difficulty.EASY, Difficulty.NORMAL, Difficulty.HARD, Difficulty.EXTREME];

// get_player_stats が返す区画ごとの行
interface PlayerStatsRow {
    mode: GameMode;
    difficulty: Difficulty;
    total_distance: number;
    total_kills: number;
    total_survival_time: number;
    best_speed: number;
    best_gravity: number;
    best_items_used: number;
    best_endless_kills: number | null;
    best_survival_clear_time: number | null;
}

interface ItemUsageRow {
    mode: GameMode;
    difficulty: Difficulty;
    item_key: string;
    count: number;
}

// アカウントページ表示用（区画データを合算済み：通算は和、最高は最大）
export interface PlayerStatsSummary {
    bestSpeed: number;
    bestGravity: number;
    bestItemsUsed: number;
    endlessKillsByDifficulty: Record<Difficulty, number | null>;
    survivalClearTimeByDifficulty: Record<Difficulty, number | null>;
    totalDistance: number;
    totalKills: number;
    totalSurvivalTime: number;
    itemTotals: Record<string, number>; // キーは ITEM_KEYS。全アイテムを0で初期化済み
}

// ゲーム終了時の記録送信（失敗時はログのみ。再送しない）
export const recordGameResult = async (stats: GameStats, cleared: boolean) => {
    if (!isSupabaseConfigured) return;
    if (stats.mode === GameMode.TUTORIAL) return;

    try {
        const { error } = await supabase.rpc('record_game_result', {
            p_mode: stats.mode,
            p_difficulty: stats.difficulty,
            p_distance: stats.distance,
            p_kills: stats.kills,
            p_survival_time: stats.timeSurvived,
            p_max_speed: stats.maxSpeed,
            p_max_gravity: stats.maxGravity,
            p_items_used: stats.itemsUsed,
            p_cleared: cleared,
            p_item_counts: stats.itemCounts,
        });
        if (error) console.error('Error recording game result:', error);
    } catch (e) {
        console.error('Exception recording game result:', e);
    }
};

// 本人の記録を取得して表示用に合算する（失敗時は null）
export const fetchPlayerStats = async (): Promise<PlayerStatsSummary | null> => {
    if (!isSupabaseConfigured) return null;

    try {
        const { data, error } = await supabase.rpc('get_player_stats');
        if (error) {
            console.error('Error fetching player stats:', error);
            return null;
        }
        const rows: PlayerStatsRow[] = data?.stats ?? [];
        const items: ItemUsageRow[] = data?.items ?? [];
        return summarize(rows, items);
    } catch (e) {
        console.error('Exception fetching player stats:', e);
        return null;
    }
};

const summarize = (rows: PlayerStatsRow[], items: ItemUsageRow[]): PlayerStatsSummary => {
    const findRow = (mode: GameMode, difficulty: Difficulty) =>
        rows.find(r => r.mode === mode && r.difficulty === difficulty);

    const endlessKillsByDifficulty = {} as Record<Difficulty, number | null>;
    const survivalClearTimeByDifficulty = {} as Record<Difficulty, number | null>;
    for (const d of DIFFICULTIES) {
        endlessKillsByDifficulty[d] = findRow(GameMode.ENDLESS, d)?.best_endless_kills ?? null;
        survivalClearTimeByDifficulty[d] = findRow(GameMode.SURVIVAL, d)?.best_survival_clear_time ?? null;
    }

    // 全アイテムを0で初期化し、未知のキー（将来のアイテム）は無視する
    const itemTotals: Record<string, number> = {};
    for (const info of ITEM_INFOS) itemTotals[ITEM_KEYS[info.type]] = 0;
    for (const item of items) {
        if (item.item_key in itemTotals) itemTotals[item.item_key] += item.count;
    }

    const sum = (pick: (r: PlayerStatsRow) => number) => rows.reduce((acc, r) => acc + pick(r), 0);
    const max = (pick: (r: PlayerStatsRow) => number) => rows.reduce((acc, r) => Math.max(acc, pick(r)), 0);

    return {
        bestSpeed: max(r => r.best_speed),
        bestGravity: max(r => r.best_gravity),
        bestItemsUsed: max(r => r.best_items_used),
        endlessKillsByDifficulty,
        survivalClearTimeByDifficulty,
        totalDistance: sum(r => r.total_distance),
        totalKills: sum(r => r.total_kills),
        totalSurvivalTime: sum(r => r.total_survival_time),
        itemTotals,
    };
};
