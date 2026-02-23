import { createClient } from '@supabase/supabase-js';
import { GameMode, Difficulty, ScoreRecord } from '../types';

// 環境変数からSupabaseの設定を読み込む
// Vite環境なので import.meta.env を使用します。
// サーバー再起動ができない環境のために、ハードコードされた値をフォールバックとして設定します。

// 安全に環境変数を取得 (import.meta.env が undefined の場合の対策)
const env = (import.meta as any).env || {};

// 環境変数が読み込まれていない場合、直接値を指定します
const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://mzzltgihinrzvnvllqqt.supabase.co';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_XLpGAe0B60lb6-CVgWGFuw_wCujD-Zz';

export const isSupabaseConfigured = SUPABASE_URL !== 'https://placeholder-url.supabase.co' && SUPABASE_ANON_KEY !== 'placeholder-key-to-prevent-crash';

if (!isSupabaseConfigured) {
  console.warn('Supabase Anon Key is missing. Database features will be disabled.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// スコアを保存する
export const saveScore = async (userId: string, mode: GameMode, difficulty: Difficulty, score: number) => {
    if (!isSupabaseConfigured) return;
    
    // チュートリアルは保存しない
    if (mode === GameMode.TUTORIAL) return;

    const { error } = await supabase
        .from('scores')
        .insert([
            { user_id: userId, game_mode: mode, difficulty: difficulty, score: score }
        ]);
    
    if (error) console.error('Error saving score:', error);
};

// ランキングを取得する
export const getLeaderboard = async (mode: GameMode, difficulty: Difficulty, limit = 20): Promise<ScoreRecord[]> => {
    if (!isSupabaseConfigured) return [];

    // サバイバルモードはタイム（短い方が良い）なので昇順
    // エンドレスモードはキル数（多い方が良い）なので降順
    const ascending = mode === GameMode.SURVIVAL;

    const { data, error } = await supabase
        .from('scores')
        .select('*')
        .eq('game_mode', mode)
        .eq('difficulty', difficulty)
        .order('score', { ascending })
        .limit(limit);

    if (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
    }
    return data as ScoreRecord[];
};