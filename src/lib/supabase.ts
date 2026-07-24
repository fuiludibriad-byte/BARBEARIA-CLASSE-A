import { createClient } from '@supabase/supabase-js';

// Fallback seguro: tentamos ler de import.meta.env, senão de window, senão string vazia.
const getEnv = (key: string) => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (e) {
    // Ignora erros de import.meta no Node/build
  }
  try {
    if (typeof window !== 'undefined' && (window as any)[key]) {
      return (window as any)[key];
    }
  } catch (e) {
    // Ignora erros
  }
  return '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');

export const isDbConfigured = !!(supabaseUrl && supabaseUrl.startsWith('http') && supabaseKey && supabaseKey.length > 20);

// Em vez de passar a URL quebrada que gera "Failed to fetch", usamos a URL do projeto se existir.
// Se não, criamos um mock vazio para não quebrar o React e nem gerar erro de rede.
export const supabase = isDbConfigured 
  ? createClient(supabaseUrl, supabaseKey)
  : ({
      from: () => ({
        select: () => ({ order: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }), single: () => Promise.resolve({ data: null, error: { message: "DB not configured" } }) }), maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: { message: "DB not configured" } }) }) }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: { message: "DB not configured" } }) })
      })
    } as unknown as ReturnType<typeof createClient>);
