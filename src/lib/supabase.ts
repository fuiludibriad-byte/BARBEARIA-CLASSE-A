import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
  console.error('URL do Supabase inválida ou ausente:', supabaseUrl);
}

export const isDbConfigured = !!(supabaseUrl && supabaseUrl.startsWith('http') && supabaseKey && supabaseKey.length > 20);

export const supabase = createClient(
  isDbConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co',
  isDbConfigured ? supabaseKey : 'placeholder-key'
);
