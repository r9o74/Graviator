import { createClient } from '@supabase/supabase-js';

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