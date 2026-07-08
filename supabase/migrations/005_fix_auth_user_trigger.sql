-- Fix: database error when creating auth users
-- The handle_new_user trigger must bypass RLS safely and avoid invalid role casts.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role := 'hospital';
  v_meta_role TEXT;
BEGIN
  v_meta_role := NEW.raw_user_meta_data->>'role';
  IF v_meta_role IN ('super_admin', 'hospital', 'civil_officer') THEN
    v_role := v_meta_role::user_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, locale, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      split_part(COALESCE(NEW.email, 'user'), '@', 1)
    ),
    v_role,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'locale', ''), 'en'),
    'active'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user failed for %: %', NEW.id, SQLERRM;
    RAISE;
END;
$$;

-- Allow Supabase Auth service to insert profiles via trigger
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT ALL ON TABLE public.profiles TO supabase_auth_admin;
GRANT USAGE ON TYPE public.user_role TO supabase_auth_admin;
GRANT USAGE ON TYPE public.entity_status TO supabase_auth_admin;

-- Fallback INSERT policy (trigger uses SECURITY DEFINER; this helps dashboard/API paths)
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid() OR is_super_admin());
