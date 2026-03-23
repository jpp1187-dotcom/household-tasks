-- Migration: add dashboard_layout column to profiles
-- Stores per-user widget visibility preferences as JSONB
-- Shape: { "hidden": ["gmail", "recipes"] }
-- Run via Supabase Dashboard → SQL Editor:
--   https://supabase.com/dashboard/project/dhwcawykduzxtohollmx/sql/new

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dashboard_layout jsonb DEFAULT '{}'::jsonb;

NOTIFY pgrst, 'reload schema';
