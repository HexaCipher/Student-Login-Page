-- ============================================================
--  COMPLETE SUPABASE SETUP FOR STUDENT LOGIN SYSTEM
--  Copy and paste this entire file into:
--  Supabase → SQL Editor → New Query → Run
-- ============================================================

-- STEP 1: Drop existing objects if you need a clean start
-- (Uncomment these lines if you're re-running this script)
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_user();
-- DROP FUNCTION IF EXISTS get_email_by_student_id(TEXT);
-- DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================
-- STEP 2: Create the profiles table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id  TEXT UNIQUE,
  full_name   TEXT,
  email       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STEP 3: Enable Row Level Security
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 4: Drop existing policies if they exist (to avoid conflicts)
-- ============================================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- ============================================================
-- STEP 5: Create RLS Policies
-- ============================================================

-- Allow users to SELECT (read) their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to UPDATE their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- CRITICAL: Allow users to INSERT their own profile during signup
-- Without this, the upsert from auth.js will fail silently
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- STEP 6: Create RPC function for Student ID → Email lookup
-- ============================================================
CREATE OR REPLACE FUNCTION get_email_by_student_id(p_student_id TEXT)
RETURNS TEXT AS $$
  SELECT email FROM public.profiles
  WHERE student_id = p_student_id
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- STEP 7: Auto-create profile on new user signup (trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, student_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'student_id'  -- ← Also extract student_id from metadata
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    student_id = EXCLUDED.student_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STEP 8: Grant necessary permissions
-- ============================================================
-- Allow authenticated users to use the RPC function
GRANT EXECUTE ON FUNCTION get_email_by_student_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_email_by_student_id(TEXT) TO anon;

-- ============================================================
-- VERIFICATION QUERIES (run these after setup to confirm)
-- ============================================================

-- 1. Check if table exists and see all profiles:
SELECT * FROM public.profiles ORDER BY created_at DESC;

-- 2. Check RLS policies (should show 3 policies):
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'profiles';

-- 3. Check triggers (should show 'on_auth_user_created'):
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 4. Test the student ID lookup function (replace 'STU001' with an actual student ID):
SELECT get_email_by_student_id('STU001');

-- 5. Check user metadata (to verify student_id is being stored):
SELECT id, email, raw_user_meta_data->>'full_name' as name, 
       raw_user_meta_data->>'student_id' as student_id
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================
-- DONE! Your database is now ready.
-- ============================================================
