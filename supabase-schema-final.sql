-- ============================================================
--  GormBase — Complete Supabase Schema
--  Run this in the Supabase SQL Editor on a fresh project.
--  Order matters: tables are created before their dependents.
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
-- gen_random_uuid() is built into Postgres 13+ and all
-- Supabase projects — no extension needed.

-- ============================================================
--  1. PROFILES
--     One row per auth user. Created automatically by trigger.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text,
  name            text,
  -- roles is the canonical source of truth (array allows multi-role users)
  roles           text[]      NOT NULL DEFAULT '{member}',
  -- role is a single-value backward-compat string (= roles[1])
  role            text        NOT NULL DEFAULT 'member',
  avatar          text        DEFAULT '🧑',        -- emoji fallback
  avatar_url      text,                             -- Supabase Storage public URL
  bio             text        DEFAULT '',
  gender          text        DEFAULT '',
  color           text        DEFAULT 'bg-sage-500',
  last_seen       timestamptz,                      -- updated by client; used for online indicator
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Trigger: auto-create a profile row whenever a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, roles, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    ARRAY['member'],
    'member'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
--  2. HOUSEHOLDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.households (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  -- legacy single-line address field (kept for backward compat)
  address         text        NOT NULL DEFAULT '',
  -- structured address fields
  address_1       text        NOT NULL DEFAULT '',
  address_2       text        NOT NULL DEFAULT '',
  city            text        NOT NULL DEFAULT '',
  state           text        NOT NULL DEFAULT '',
  zip             text        NOT NULL DEFAULT '',
  property_type   text        NOT NULL DEFAULT '', -- apartment | house | mixed_use | other
  -- landlord / property contact
  contact_name    text        NOT NULL DEFAULT '',
  contact_email   text        NOT NULL DEFAULT '',
  contact_phone   text        NOT NULL DEFAULT '',
  contact_address text        NOT NULL DEFAULT '',
  description     text        NOT NULL DEFAULT '',
  archived        boolean     NOT NULL DEFAULT false,
  created_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
--  3. RESIDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.residents (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id        uuid        REFERENCES public.households(id) ON DELETE CASCADE,
  legal_name          text        NOT NULL DEFAULT '',
  preferred_name      text        NOT NULL DEFAULT '',
  gender_identity     text        NOT NULL DEFAULT '',
  sex_at_birth        text        NOT NULL DEFAULT '',
  race_ethnicity      text        NOT NULL DEFAULT '',
  primary_language    text        NOT NULL DEFAULT '',
  -- contact
  contact_method      text        NOT NULL DEFAULT '',
  contact_address     text        NOT NULL DEFAULT '',
  mailing_address     text        NOT NULL DEFAULT '',
  emergency_contact   text        NOT NULL DEFAULT '',
  -- sensitive identifiers (stored masked / partial)
  ssn_masked          text        NOT NULL DEFAULT '',
  medicaid_id         text        NOT NULL DEFAULT '',
  medicare_id         text        NOT NULL DEFAULT '',
  mpi_id              text        NOT NULL DEFAULT '',
  gov_id_type         text        NOT NULL DEFAULT '',
  gov_id_number       text        NOT NULL DEFAULT '',
  other_insurance_id  text        NOT NULL DEFAULT '',
  archived            boolean     NOT NULL DEFAULT false,
  created_by          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
--  4. PROJECTS
--     Household-level or resident-level service projects.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id  uuid        NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  resident_id   uuid        REFERENCES public.residents(id) ON DELETE CASCADE,
  project_type  text        NOT NULL DEFAULT '',
  name          text        NOT NULL,
  description   text        NOT NULL DEFAULT '',
  status        text        NOT NULL DEFAULT 'active', -- active | completed | on_hold
  due_date      date,
  archived      boolean     NOT NULL DEFAULT false,
  created_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
--  5. LISTS
--     The 6 permanent program lists (Housing, Clinical, etc.).
--     household_id is nullable; permanent lists have no household.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lists (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  icon          text        NOT NULL DEFAULT '📋',
  color         text        NOT NULL DEFAULT 'sage',
  household_id  uuid        REFERENCES public.households(id) ON DELETE CASCADE,
  archived      boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
--  6. TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- list assignment (required in v7+)
  list_id             uuid        REFERENCES public.lists(id) ON DELETE SET NULL,
  -- entity links (both optional; a task can belong to resident and/or household)
  resident_id         uuid        REFERENCES public.residents(id) ON DELETE SET NULL,
  household_id        uuid        REFERENCES public.households(id) ON DELETE SET NULL,
  -- legacy columns — kept for backward compat with existing data
  project_id          uuid        REFERENCES public.projects(id) ON DELETE SET NULL,
  domain_tag          text,       -- housing | clinical | behavioral_health | justice | care_coordination | benefits | personal
  -- core fields
  title               text        NOT NULL,
  assigned_to         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  priority            text        NOT NULL DEFAULT 'medium', -- high | medium | low
  status              text        NOT NULL DEFAULT 'todo',   -- todo | in_progress | done
  due_date            date,
  notes               text        NOT NULL DEFAULT '',
  archived            boolean     NOT NULL DEFAULT false,
  -- Google Calendar integration (future)
  google_event_id     text        NOT NULL DEFAULT '',
  google_calendar_id  text        NOT NULL DEFAULT '',
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
--  7. ACTIVITY LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action       text        NOT NULL,
  entity_type  text        NOT NULL, -- household | resident | project | task | list
  entity_id    uuid,
  entity_name  text,
  old_value    text,
  new_value    text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
--  8. NOTES
--     Attached to residents or households via entity_type + entity_id.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notes (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  text        NOT NULL, -- resident | household
  entity_id    uuid        NOT NULL,
  note_type    text        NOT NULL, -- soap | free
  -- SOAP fields (only populated when note_type = 'soap')
  subjective   text        NOT NULL DEFAULT '',
  objective    text        NOT NULL DEFAULT '',
  assessment   text        NOT NULL DEFAULT '',
  plan         text        NOT NULL DEFAULT '',
  -- Free-write field (only populated when note_type = 'free')
  content      text        NOT NULL DEFAULT '',
  created_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
--  9. MESSAGES
--     1:1 real-time messaging between users.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_id  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  content       text        NOT NULL,
  read          boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
--  10. TEAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  created_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
--  11. TEAM MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.team_members (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     uuid        NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text        NOT NULL DEFAULT 'member',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

-- ============================================================
--  12. FAVORITES
--     Pin residents or households to the sidebar.
--     Falls back to localStorage if this table doesn't exist.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.favorites (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type  text        NOT NULL, -- resident | household
  entity_id    uuid        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);

-- ============================================================
--  INDEXES
-- ============================================================

-- tasks — most-queried columns
CREATE INDEX IF NOT EXISTS tasks_list_id_idx        ON public.tasks(list_id);
CREATE INDEX IF NOT EXISTS tasks_resident_id_idx    ON public.tasks(resident_id);
CREATE INDEX IF NOT EXISTS tasks_household_id_idx   ON public.tasks(household_id);
CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx    ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS tasks_created_by_idx     ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS tasks_status_idx         ON public.tasks(status);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx       ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS tasks_archived_idx       ON public.tasks(archived);

-- residents
CREATE INDEX IF NOT EXISTS residents_household_id_idx  ON public.residents(household_id);
CREATE INDEX IF NOT EXISTS residents_archived_idx      ON public.residents(archived);

-- projects
CREATE INDEX IF NOT EXISTS projects_household_id_idx  ON public.projects(household_id);
CREATE INDEX IF NOT EXISTS projects_resident_id_idx   ON public.projects(resident_id);

-- activity_log
CREATE INDEX IF NOT EXISTS activity_log_entity_id_idx  ON public.activity_log(entity_id);
CREATE INDEX IF NOT EXISTS activity_log_user_id_idx    ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS activity_log_created_at_idx ON public.activity_log(created_at DESC);

-- notes
CREATE INDEX IF NOT EXISTS notes_entity_idx ON public.notes(entity_type, entity_id);

-- messages
CREATE INDEX IF NOT EXISTS messages_recipient_idx  ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS messages_sender_idx     ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_unread_idx     ON public.messages(recipient_id, read) WHERE read = false;

-- team_members
CREATE INDEX IF NOT EXISTS team_members_user_id_idx  ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS team_members_team_id_idx  ON public.team_members(team_id);

-- favorites
CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON public.favorites(user_id);

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on every table
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.households   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lists        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites    ENABLE ROW LEVEL SECURITY;

-- ── profiles ────────────────────────────────────────────────
-- Any authenticated user can view all profiles (needed for
-- team member cards, assignee dropdowns, messaging).
-- Users may only update their own row.

CREATE POLICY "profiles: authenticated users can read all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles: users can insert own row"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles: users can update own row"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- ── households ──────────────────────────────────────────────
CREATE POLICY "households: authenticated full access"
  ON public.households FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── residents ───────────────────────────────────────────────
CREATE POLICY "residents: authenticated full access"
  ON public.residents FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── projects ────────────────────────────────────────────────
CREATE POLICY "projects: authenticated full access"
  ON public.projects FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── lists ───────────────────────────────────────────────────
CREATE POLICY "lists: authenticated full access"
  ON public.lists FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── tasks ───────────────────────────────────────────────────
CREATE POLICY "tasks: authenticated full access"
  ON public.tasks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── activity_log ────────────────────────────────────────────
-- Anyone authenticated can read; anyone can insert (log events).
-- No updates or deletes — activity log is append-only.

CREATE POLICY "activity_log: authenticated can read"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "activity_log: authenticated can insert"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ── notes ───────────────────────────────────────────────────
CREATE POLICY "notes: authenticated full access"
  ON public.notes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── messages ────────────────────────────────────────────────
-- Users can only see threads they are part of.
-- Users can only send as themselves.
-- Users can only mark as read on messages addressed to them.

CREATE POLICY "messages: users see own threads"
  ON public.messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "messages: users send as themselves"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "messages: recipients can mark read"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id);

-- ── teams ───────────────────────────────────────────────────
CREATE POLICY "teams: authenticated full access"
  ON public.teams FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── team_members ────────────────────────────────────────────
CREATE POLICY "team_members: authenticated full access"
  ON public.team_members FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── favorites ───────────────────────────────────────────────
-- Users can only read, write, and delete their own favorites.

CREATE POLICY "favorites: users own their rows"
  ON public.favorites FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
--  SEED DATA — 6 Permanent Lists
--  Only inserts if the lists table is empty, so this is safe
--  to re-run on existing databases.
-- ============================================================
INSERT INTO public.lists (name, icon, color)
SELECT name, icon, color FROM (VALUES
  ('Housing',           '🏠', 'green'),
  ('Clinical',          '🏥', 'blue'),
  ('Behavioral Health', '🧠', 'teal'),
  ('Justice',           '⚖️', 'orange'),
  ('Care Coordination', '🤝', 'indigo'),
  ('Benefits',          '💰', 'purple')
) AS t(name, icon, color)
WHERE NOT EXISTS (SELECT 1 FROM public.lists LIMIT 1);

-- ============================================================
--  STORAGE
--  Create the "avatars" bucket for user profile photos.
--  Run this block separately if the bucket already exists.
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow any authenticated user to upload to avatars/
CREATE POLICY "avatars: authenticated users can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

-- Allow public read of all avatar objects
CREATE POLICY "avatars: public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Allow users to overwrite their own avatar (upsert = DELETE + INSERT)
CREATE POLICY "avatars: users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "avatars: users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
--  END OF SCHEMA
-- ============================================================
