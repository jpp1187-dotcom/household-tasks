import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY

if (!serviceKey) {
  console.warn('[supabaseAdmin] VITE_SUPABASE_SERVICE_KEY not set — admin features (invite user) will be disabled.')
}

// Admin client bypasses RLS. Only used server-side operations like inviteUserByEmail.
// Returns null if the service key is not configured.
export const supabaseAdmin = url && serviceKey
  ? createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null
