/*
 * ============================================================
 *  SUPABASE CLIENT — supabase.js
 *  Shared across all pages. Load this before any other script.
 * ============================================================
 *
 *  QUICK SETUP (3 steps):
 *  ──────────────────────
 *  1. Go to https://supabase.com → sign in → create a new project.
 *
 *  2. In your project, go to:
 *       Project Settings → API
 *     Copy the "Project URL" and paste it into SUPABASE_URL below.
 *     Copy the "anon / public" key and paste it into SUPABASE_ANON_KEY below.
 *
 *  3. Enable the Email auth provider:
 *       Authentication → Providers → Email → make sure it is enabled.
 *     (Email is on by default in new Supabase projects.)
 *
 *  4. In the Supabase SQL editor, run the SQL block below to create the
 *     profiles table, the RPC function, and Row Level Security policies.
 *
 * ============================================================
 *  SQL SETUP — paste this into Supabase → SQL Editor → New Query
 * ============================================================
 *
 *  -- 1. Create the profiles table
 *  CREATE TABLE IF NOT EXISTS public.profiles (
 *    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 *    student_id  TEXT UNIQUE,
 *    full_name   TEXT,
 *    email       TEXT,
 *    created_at  TIMESTAMPTZ DEFAULT NOW()
 *  );
 *
 *  -- 2. Enable Row Level Security
 *  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
 *
 *  -- 3. RLS Policy: users can only read their own profile
 *  CREATE POLICY "Users can view own profile"
 *    ON public.profiles
 *    FOR SELECT
 *    USING (auth.uid() = id);
 *
 *  -- 4. RLS Policy: users can update their own profile
 *  CREATE POLICY "Users can update own profile"
 *    ON public.profiles
 *    FOR UPDATE
 *    USING (auth.uid() = id);
 *
 *  -- 5. RPC function: look up email by student_id (used for Student ID login)
 *  CREATE OR REPLACE FUNCTION get_email_by_student_id(p_student_id TEXT)
 *  RETURNS TEXT AS $$
 *    SELECT email FROM public.profiles
 *    WHERE student_id = p_student_id
 *    LIMIT 1;
 *  $$ LANGUAGE sql SECURITY DEFINER;
 *
 *  -- 6. (Optional) Auto-create a profile row when a new user signs up
 *  --    Attach this as a database trigger on auth.users inserts.
 *  CREATE OR REPLACE FUNCTION public.handle_new_user()
 *  RETURNS TRIGGER AS $$
 *  BEGIN
 *    INSERT INTO public.profiles (id, email, full_name)
 *    VALUES (
 *      NEW.id,
 *      NEW.email,
 *      NEW.raw_user_meta_data->>'full_name'
 *    );
 *    RETURN NEW;
 *  END;
 *  $$ LANGUAGE plpgsql SECURITY DEFINER;
 *
 *  CREATE OR REPLACE TRIGGER on_auth_user_created
 *    AFTER INSERT ON auth.users
 *    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
 *
 * ============================================================
 */

// ── Load credentials from config.js (which reads from environment variables) ──
// Make sure config.js is loaded before this script in your HTML:
// <script src="config.js"></script>
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// <script src="supabase.js"></script>

if (!window.ENV) {
  console.error(
    "[supabase.js] ⚠️  config.js not loaded!\n" +
    "Make sure config.js is included before supabase.js in your HTML."
  );
}

const SUPABASE_URL      = window.ENV?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.ENV?.SUPABASE_ANON_KEY || '';
// ─────────────────────────────────────────────────────────────────────────

// Guard: warn clearly in the console if credentials are still placeholders
if (
  !SUPABASE_URL ||
  !SUPABASE_ANON_KEY ||
  SUPABASE_URL === "PASTE_YOUR_SUPABASE_URL_HERE" ||
  SUPABASE_ANON_KEY === "PASTE_YOUR_SUPABASE_ANON_KEY_HERE"
) {
  console.error(
    "[supabase.js] ⚠️  Supabase credentials not configured.\n" +
    "Open config.js and replace the placeholder values with your " +
    "project credentials from supabase.com → Project Settings → API."
  );
}

// Initialise the Supabase client and expose it as a global so every
// other script (auth.js, dashboard.js) can reference `supabaseClient`.
const { createClient } = supabase;
const supabaseClient   = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
