-- Migration 016: Auth speed optimizations, availability helpers, and complete trigger
-- 1. Helper to check if a username is available (callable by anon & authenticated)
CREATE OR REPLACE FUNCTION public.check_username_available(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_username IS NULL OR length(trim(p_username)) < 3 THEN
    RETURN FALSE;
  END IF;
  
  RETURN NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE lower(username) = lower(trim(p_username))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_username_available(TEXT) TO anon, authenticated;

-- 2. Helper to check if an email is available (callable by anon & authenticated)
CREATE OR REPLACE FUNCTION public.check_email_available(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) < 5 OR p_email NOT LIKE '%@%.%' THEN
    RETURN FALSE;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE lower(email) = lower(trim(p_email))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_available(TEXT) TO anon, authenticated;

-- 3. Resolve username to email for sign-in with either username or email
CREATE OR REPLACE FUNCTION public.resolve_login_email(p_identifier TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF p_identifier IS NULL OR length(trim(p_identifier)) = 0 THEN
    RETURN NULL;
  END IF;

  p_identifier := lower(trim(p_identifier));

  -- If it already contains an '@', return directly
  IF p_identifier LIKE '%@%' THEN
    RETURN p_identifier;
  END IF;

  -- Otherwise, look up email by username
  SELECT email INTO v_email 
  FROM public.users 
  WHERE lower(username) = p_identifier 
  LIMIT 1;

  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_login_email(TEXT) TO anon, authenticated;

-- 4. Robust handle_new_user trigger that captures ALL profile metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  suffix_counter INTEGER := 1;
  existing_user_id UUID;
  user_phone TEXT;
  user_age INTEGER;
  user_country TEXT;
  user_city TEXT;
  user_work TEXT;
  user_eth_addr TEXT;
  user_eth_key TEXT;
  user_role TEXT;
BEGIN
  -- Extract all metadata cleanly
  user_phone := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');
  user_country := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'country', '')), '');
  user_city := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'city', '')), '');
  user_work := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'work', '')), '');
  user_eth_addr := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'eth_address', '')), '');
  user_eth_key := NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'eth_private_key', '')), '');
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');

  BEGIN
    user_age := (NEW.raw_user_meta_data->>'age')::INTEGER;
  EXCEPTION WHEN OTHERS THEN
    user_age := NULL;
  END;

  -- Check if a public.users row already exists with this email
  SELECT id INTO existing_user_id FROM public.users WHERE lower(email) = lower(NEW.email) LIMIT 1;
  
  IF existing_user_id IS NOT NULL AND existing_user_id <> NEW.id THEN
    UPDATE public.users 
    SET id = NEW.id,
        phone = COALESCE(user_phone, public.users.phone),
        age = COALESCE(user_age, public.users.age),
        country = COALESCE(user_country, public.users.country),
        city = COALESCE(user_city, public.users.city),
        work = COALESCE(user_work, public.users.work)
    WHERE email = NEW.email;
    RETURN NEW;
  END IF;

  -- Determine base username
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'username', 
    split_part(NEW.email, '@', 1),
    'user'
  );
  base_username := regexp_replace(lower(base_username), '[^a-z0-9_]', '', 'g');
  IF base_username = '' THEN base_username := 'user'; END IF;

  final_username := base_username;

  -- Ensure unique username
  WHILE EXISTS (SELECT 1 FROM public.users WHERE lower(username) = lower(final_username) AND id <> NEW.id) LOOP
    final_username := base_username || suffix_counter::text;
    suffix_counter := suffix_counter + 1;
  END LOOP;

  -- Insert full user row atomically
  INSERT INTO public.users (
    id, username, email, full_name, phone, age, country, city, work,
    eth_address, eth_private_key, role, status, created_at
  )
  VALUES (
    NEW.id,
    final_username,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    user_phone,
    user_age,
    user_country,
    user_city,
    user_work,
    user_eth_addr,
    user_eth_key,
    user_role,
    'active',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.users.full_name),
    phone = COALESCE(EXCLUDED.phone, public.users.phone),
    age = COALESCE(EXCLUDED.age, public.users.age),
    country = COALESCE(EXCLUDED.country, public.users.country),
    city = COALESCE(EXCLUDED.city, public.users.city),
    work = COALESCE(EXCLUDED.work, public.users.work),
    eth_address = COALESCE(EXCLUDED.eth_address, public.users.eth_address),
    eth_private_key = COALESCE(EXCLUDED.eth_private_key, public.users.eth_private_key);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
