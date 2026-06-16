-- Fix: handle_new_user trigger now gracefully handles email conflicts
-- Caused by: orphaned public.users rows with same email but different id than new auth.users row
-- Error was: duplicate key value violates unique constraint "users_email_key"

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  suffix_counter INTEGER := 1;
  existing_user_id UUID;
BEGIN
  -- Check if a public.users row already exists with this email
  -- This can happen when a user previously signed up with email/password and now tries Google OAuth
  SELECT id INTO existing_user_id FROM public.users WHERE email = NEW.email LIMIT 1;
  
  IF existing_user_id IS NOT NULL AND existing_user_id <> NEW.id THEN
    -- Re-link the existing profile to the new auth.users id
    UPDATE public.users SET id = NEW.id WHERE email = NEW.email;
    RETURN NEW;
  END IF;

  -- Build base username from metadata or email prefix
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username', 
    split_part(NEW.email, '@', 1),
    'user'
  );
  -- Clean username: lowercase, only alphanumeric/underscore
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g');
  IF base_username = '' THEN base_username := 'user'; END IF;

  final_username := base_username;

  -- Find a unique username by appending a counter if needed
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = final_username) LOOP
    final_username := base_username || suffix_counter::text;
    suffix_counter := suffix_counter + 1;
  END LOOP;

  -- Insert new profile; update on id conflict (e.g. re-registration attempts)
  INSERT INTO public.users (id, username, email, full_name, role, status, created_at)
  VALUES (
    NEW.id,
    final_username,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    'active',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.users.full_name, EXCLUDED.full_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
