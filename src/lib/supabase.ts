import { createClient } from '@supabase/supabase-js'

// trim() e remoção de barras finais evitam URLs malformados (ex.: ".../")
const url = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '')
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

/** true quando o .env está preenchido com o URL e a chave do Supabase. */
export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase: falta VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY no .env. ' +
      'Copia .env.example para .env, preenche os valores e reinicia o servidor (npm run dev).',
  )
}

// Fallbacks só para evitar que createClient rebente quando o .env não está
// configurado — a app mostra uma mensagem em vez de um ecrã em branco.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  { auth: { persistSession: true, autoRefreshToken: true } },
)
