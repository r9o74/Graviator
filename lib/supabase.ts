import { createClient } from '@supabase/supabase-js';
import { GameMode, Difficulty, ScoreRecord } from '../types';

// 環境変数からSupabaseの設定を読み込む
// Vite環境なので import.meta.env を使用します。
const env = (import.meta as any).env || {};

// 環境変数が読み込まれていない場合、ハードコードされた値をフォールバックとして設定します
// 注意: プロダクションビルドでは環境変数をビルド時に注入することを推奨します
const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://mzzltgihinrzvnvllqqt.supabase.co';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_XLpGAe0B60lb6-CVgWGFuw_wCujD-Zz';

// URLが有効かどうかを簡易チェック
const isValidUrl = (url: string) => {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
};

export const isSupabaseConfigured = 
    isValidUrl(SUPABASE_URL) && 
    SUPABASE_URL !== 'https://placeholder-url.supabase.co' && 
    SUPABASE_ANON_KEY !== 'placeholder-key-to-prevent-crash' &&
    SUPABASE_ANON_KEY.length > 20; // 簡易的なキー長チェック

if (!isSupabaseConfigured) {
  console.warn('Supabase configuration is missing or invalid. Database features will be disabled.');
}

// クライアントの作成。設定が無効な場合は作成せず、API呼び出し時にチェックする
export const supabase = isSupabaseConfigured 
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
    : {
        from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ order: () => ({ limit: () => ({ data: [], error: { message: 'DB not configured' } }) }) }) }) }), insert: () => ({ error: { message: 'DB not configured' } }) }),
        auth: { getSession: async () => ({ data: { session: null }, error: null }), signInAnonymously: async () => ({ data: null, error: { message: 'DB not configured' } }) }
      } as any;

// スコアを保存する
export const saveScore = async (userId: string, mode: GameMode, difficulty: Difficulty, score: number) => {
    if (!isSupabaseConfigured) return;
    
    // チュートリアルは保存しない
    if (mode === GameMode.TUTORIAL) return;

    try {
        const { error } = await supabase
            .from('scores')
            .insert([
                { user_id: userId, game_mode: mode, difficulty: difficulty, score: score }
            ]);
        
        if (error) console.error('Error saving score:', error);
    } catch (e) {
        console.error('Exception saving score:', e);
    }
};

// ランキングを取得する
export const getLeaderboard = async (mode: GameMode, difficulty: Difficulty, limit = 20): Promise<ScoreRecord[]> => {
    if (!isSupabaseConfigured) return [];

    // サバイバルモードはタイム（短い方が良い）なので昇順
    // エンドレスモードはキル数（多い方が良い）なので降順
    const ascending = mode === GameMode.SURVIVAL;

    try {
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
    } catch (e) {
        console.error('Exception fetching leaderboard:', e);
        return [];
    }
};