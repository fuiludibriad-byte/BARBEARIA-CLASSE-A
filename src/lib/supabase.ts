import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) return import.meta.env[key];
  return '';
};

let supabaseUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || '';
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY') || '';

if (supabaseUrl && !supabaseUrl.startsWith('http') && !supabaseUrl.includes('SUA_CHAVE_AQUI')) {
  supabaseUrl = 'https://' + supabaseUrl;
}

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

if (!isDbConfigured) {
  console.warn("⚠️ Supabase Client Warning: URL ou Chave inválida/ausente. As chamadas ao banco falharão.");
}

export const supabase = createClient(
  isDbConfigured ? supabaseUrl : 'https://placeholder-project.supabase.co',
  isDbConfigured ? supabaseKey : 'placeholder-key'
);
