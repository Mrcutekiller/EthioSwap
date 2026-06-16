-- Robust handle_new_user trigger function
-- Handles OAuth signups, cleans usernames, and automatically resolves duplicate username conflicts

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  suffix_counter INTEGER := 1;
BEGIN
  -- 1. Determine base username (from metadata, or before the @ in email, or fallback to 'user')
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username', 
    split_part(NEW.email, '@', 1),
    'user'
  );
  
  -- Clean username: convert to lower case and remove any character that is not alphanumeric or underscore
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g');
  IF base_username = '' THEN
    base_username := 'user';
  END IF;

  final_username := base_username;

  -- 2. Loop until a unique username is found in the users table
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = final_username) LOOP
    final_username := base_username || suffix_counter::text;
    suffix_counter := suffix_counter + 1;
  END LOOP;

  -- 3. Insert user profile into public.users table
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
