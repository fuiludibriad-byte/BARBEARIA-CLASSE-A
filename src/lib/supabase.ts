import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

// Validação robusta de URL
const isValidUrl = (url: string) => {
  if (!url) return false;
  if (url.includes('SUA_CHAVE_AQUI')) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const isValidKey = (key: string) => {
  if (!key) return false;
  if (key.includes('SUA_CHAVE_AQUI')) return false;
  return key.length > 20; // Chaves JWT do supabase são longas
};

export const isDbConfigured = isValidUrl(supabaseUrl) && isValidKey(supabaseKey);

if (!isDbConfigured && process.env.NODE_ENV !== 'production') {
  console.warn("⚠️ Supabase Client Warning: URL ou Chave inválida/ausente. As chamadas ao banco falharão.");
}

export const supabase = createClient(
  isDbConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co',
  isDbConfigured ? supabaseKey : 'placeholder-key'
);
