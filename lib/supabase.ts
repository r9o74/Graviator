import { createClient } from '@supabase/supabase-js';
import { GameMode, Difficulty, ScoreRecord } from '../types';

// 環境変数からSupabaseの設定を読み込む
// Vite環境なので import.meta.env を使用します。
// 注意: プロダクションビルドでは環境変数をビルド時に静的に置換するため、直接参照する必要があります
// @ts-ignore
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mzzltgihinrzvnvllqqt.supabase.co';
// @ts-ignore
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_XLpGAe0B60lb6-CVgWGFuw_wCujD-Zz';

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
export const saveScore = async (userId: string, mode: GameMode, difficulty: Difficulty, score: number, userName: string | null) => {
    if (!isSupabaseConfigured) return;
    
    // チュートリアルは保存しない
    if (mode === GameMode.TUTORIAL) return;

    console.log("Attempting to save score with userId:", userId, "mode:", mode, "score:", score);

    // スコアはそのまま保存する（サバイバルモードのタイムアタックのため）
    const finalScore = score;

    try {
        // まず user_name を含めて保存を試みる
        const { error } = await supabase
            .from('scores')
            .insert([
                { user_id: userId, game_mode: mode, difficulty: difficulty, score: finalScore, user_name: userName}
            ]);
        
        if (error) {
            console.error('Error saving score with user_name:', error);
            // user_name カラムが存在しないエラーの可能性があるため、user_name を除外してリトライ
            const { error: retryError } = await supabase
                .from('scores')
                .insert([
                    { user_id: userId, game_mode: mode, difficulty: difficulty, score: finalScore }
                ]);
            
            if (retryError) {
                console.error('Error saving score on retry:', retryError);
            } else {
                console.log('Score saved successfully on retry (without user_name)');
            }
        } else {
            console.log('Score saved successfully');
        }
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
        console.log(`Fetching leaderboard for mode: ${mode}, difficulty: ${difficulty}`);
        const { data, error } = await supabase
            .from('scores')
            .select('*')
            .eq('game_mode', mode)
            .eq('difficulty', difficulty)
            .order('score', { ascending })
            .limit(limit);

        console.log('Leaderboard fetch result:', { data, error });

        if (error) {
            console.error('Error fetching leaderboard:', error);
            return [];
        }
        return (data || []) as ScoreRecord[];
    } catch (e) {
        console.error('Exception fetching leaderboard:', e);
        return [];
    }
};

// Googleでログインする関数
export const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) return;
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                // ログイン完了後に元の画面（ゲーム）に戻ってくるようにする
                redirectTo: window.location.origin 
            }
        });
        if (error) console.error('Google login error:', error);
    } catch (e) {
        console.error('Exception during Google login:', e);
    }
};

// ログアウトする関数
export const signOut = async () => {
    if (!isSupabaseConfigured) return;
    try {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Sign out error:', error);
    } catch (e) {
        console.error('Exception during sign out:', e);
    }
};

// lib/supabase.ts

// プロフィール（名前）を保存または更新する
export const updateProfile = async (userId: string, displayName: string | null) => {
    if (!isSupabaseConfigured) return;
    try {
        const nameToSave = (displayName && displayName.trim() !== '') ? displayName : null;
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ 
                id: userId, 
                display_name: nameToSave, 
                updated_at: new Date() 
            });
        if (profileError) throw profileError;

        // スコアテーブルのユーザー名も更新する
        const { error: scoresError } = await supabase
            .from('scores')
            .update({ user_name: nameToSave })
            .eq('user_id', userId);
        
        if (scoresError) throw scoresError;

    } catch (e) {
        console.error('Error updating profile:', e);
    }
};

// プロフィール（名前）を取得する
export const getProfile = async (userId: string) => {
    if (!isSupabaseConfigured) return null;
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', userId)
            .single();
        if (error && error.code !== 'PGRST116') throw error; // PGRST116はデータなしの意味
        return data ? data.display_name : null;
    } catch (e) {
        console.error('Error fetching profile:', e);
        return null;
    }
};