import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY

// A real Supabase service-role JWT always starts with "eyJ" and contains two dots.
// Anything else is a missing or placeholder value.
function isRealKey(key) {
  return typeof key === 'string' && key.startsWith('eyJ') && key.split('.').length === 3
}

if (!serviceKey) {
  console.warn(
    '[supabaseAdmin] VITE_SUPABASE_SERVICE_KEY is not set.\n' +
    'Admin features (e.g. invite user) are disabled.\n' +
    'To enable: add VITE_SUPABASE_SERVICE_KEY=<service_role_key> to .env.local\n' +
    'Find it in Supabase → Project Settings → API → service_role.'
  )
} else if (!isRealKey(serviceKey)) {
  console.error(
    '[supabaseAdmin] VITE_SUPABASE_SERVICE_KEY looks like a placeholder, not a real key.\n' +
    'Replace the placeholder in .env.local with your actual service_role key from\n' +
    'Supabase → Project Settings → API → service_role.'
  )
}

// Admin client bypasses RLS. Only used for operations like inviteUserByEmail.
// Returns null if the key is missing or invalid so callers can show a graceful error.
export const supabaseAdmin = url && isRealKey(serviceKey)
  ? createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null
