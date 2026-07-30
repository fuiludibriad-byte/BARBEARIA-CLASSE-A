import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : '') || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : '') || 'https://fallback.supabase.co';
const supabaseKey = (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : '') || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : '') || 'fallback-key';

let sanitizedUrl = supabaseUrl;
if (sanitizedUrl && !sanitizedUrl.startsWith('http')) {
  sanitizedUrl = 'https://' + sanitizedUrl;
}

console.log("Supabase URL carregada:", sanitizedUrl);

export const isDbConfigured = !!(sanitizedUrl && sanitizedUrl.startsWith('http') && supabaseKey && !supabaseKey.includes('fallback'));

export const supabase = createClient(sanitizedUrl, supabaseKey);
