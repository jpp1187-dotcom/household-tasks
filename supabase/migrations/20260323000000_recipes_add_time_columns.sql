-- Migration: add prep_time_mins, cook_time_mins, total_time_mins to recipes
-- Replaces the old prep_time / cook_time integer columns (which may not exist).
-- total_time_mins is a generated column: always equals prep + cook.
-- Run via:  node scripts/apply-migration.js

ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS prep_time_mins  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cook_time_mins  integer NOT NULL DEFAULT 0;

-- total_time_mins: generated stored column (postgres ≥ 12)
ALTER TABLE public.recipes
  DROP COLUMN IF EXISTS total_time_mins;

ALTER TABLE public.recipes
  ADD COLUMN total_time_mins integer GENERATED ALWAYS AS (
    COALESCE(prep_time_mins, 0) + COALESCE(cook_time_mins, 0)
  ) STORED;

-- Migrate any data that was stored under the old column names
DO $$
BEGIN
  -- Copy old prep_time → prep_time_mins if old column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'recipes'
      AND column_name  = 'prep_time'
  ) THEN
    UPDATE public.recipes SET prep_time_mins = COALESCE(prep_time, 0);
    ALTER TABLE public.recipes DROP COLUMN prep_time;
  END IF;

  -- Copy old cook_time → cook_time_mins if old column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'recipes'
      AND column_name  = 'cook_time'
  ) THEN
    UPDATE public.recipes SET cook_time_mins = COALESCE(cook_time, 0);
    ALTER TABLE public.recipes DROP COLUMN cook_time;
  END IF;
END;
$$;

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
