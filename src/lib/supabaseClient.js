import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Fails loudly in dev/build rather than silently breaking auth calls later.
  console.error(
    'Missing Supabase env vars. Copy .env.example to .env and fill in ' +
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, and set the same as ' +
    'GitHub Actions secrets for the deployed build.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
