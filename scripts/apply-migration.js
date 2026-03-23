#!/usr/bin/env node
/**
 * apply-migration.js
 * Applies the recipes time-column migration to Supabase using the
 * Supabase transaction-mode connection pooler + service role key.
 *
 * Usage:  node scripts/apply-migration.js
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const { VITE_SUPABASE_URL, VITE_SUPABASE_SERVICE_KEY } = process.env

if (!VITE_SUPABASE_URL || !VITE_SUPABASE_SERVICE_KEY) {
  console.error('❌  Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_KEY in .env.local')
  process.exit(1)
}

// Derive project ref from URL:  https://{ref}.supabase.co
const projectRef = new URL(VITE_SUPABASE_URL).hostname.split('.')[0]

// Supabase transaction-mode pooler — uses service role JWT as password
const connectionString =
  `postgresql://postgres.${projectRef}:${VITE_SUPABASE_SERVICE_KEY}` +
  `@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

const sql = readFileSync(
  resolve(__dirname, '../supabase/migrations/20260323000000_recipes_add_time_columns.sql'),
  'utf8'
)

console.log(`🔌  Connecting to project: ${projectRef}`)
console.log('📄  Migration: 20260323000000_recipes_add_time_columns.sql\n')

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  console.log('✅  Connected.')
  await client.query(sql)
  console.log('✅  Migration applied successfully.')
  console.log('    Columns added: prep_time_mins, cook_time_mins, total_time_mins (generated)')
  console.log('    PostgREST schema cache reloaded via NOTIFY.')
} catch (err) {
  console.error('❌  Migration failed:', err.message)
  // If the pooler rejects the JWT password, show the fallback message
  if (err.message.includes('password') || err.message.includes('auth')) {
    console.error('\n💡  Fallback: paste the SQL into Supabase Dashboard → SQL Editor:')
    console.error('    https://supabase.com/dashboard/project/' + projectRef + '/sql/new')
  }
  process.exit(1)
} finally {
  await client.end()
}
