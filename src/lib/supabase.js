import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error(
    '[supabase] Missing environment variables.\n' +
    '  VITE_SUPABASE_URL:', url ?? '❌ undefined', '\n' +
    '  VITE_SUPABASE_ANON_KEY:', key ? '✅ set' : '❌ undefined', '\n' +
    '  Local dev: make sure .env.local exists.\n' +
    '  Deployed: add both vars in your hosting dashboard.'
  )
}

export const supabase = createClient(url, key)
