import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mzzltgihinrzvnvllqqt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XLpGAe0B60lb6-CVgWGFuw_wCujD-Zz';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
