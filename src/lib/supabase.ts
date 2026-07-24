import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log("Supabase URL carregada:", supabaseUrl ? supabaseUrl : 'Ausente');

export const isDbConfigured = !!(supabaseUrl && supabaseUrl.startsWith('http') && supabaseKey);

export const supabase = createClient(
  isDbConfigured ? supabaseUrl : 'https://supabase.local',
  isDbConfigured ? supabaseKey : 'public-anon-key'
);
