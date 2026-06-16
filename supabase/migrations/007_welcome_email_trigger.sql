-- Welcome email trigger
-- Sends a styled welcome email to every new user via Supabase's built-in email
-- using the pg_net extension for HTTP calls to the Supabase Edge Function endpoint.
-- 
-- IMPORTANT: This uses the Supabase Auth admin API to send a custom email.
-- We rely on the auth.users ON INSERT event to fire automatically.
-- The email is sent asynchronously so it never blocks sign-up.
--
-- Note: If you want to use this, enable pg_net in your Supabase project:
--   Extensions → pg_net → Enable
-- Then replace YOUR_PROJECT_URL and YOUR_SERVICE_ROLE_KEY below.

-- Enable pg_net if not already enabled
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Welcome email function
CREATE OR REPLACE FUNCTION public.send_welcome_email()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
  project_url TEXT := 'https://gsiyofpzydlkgwpuxmbh.supabase.co';
  -- DO NOT commit real service role key to git — set via Supabase secrets
  service_role_key TEXT := current_setting('app.service_role_key', true);
BEGIN
  user_email := NEW.email;
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Only send for real email addresses (skip anonymous/phone users)
  IF user_email IS NULL OR user_email = '' THEN
    RETURN NEW;
  END IF;

  -- Use pg_net to call the Supabase Auth admin email endpoint asynchronously
  -- This fires and forgets — it won't block the user creation
  IF service_role_key IS NOT NULL AND service_role_key <> '' THEN
    PERFORM net.http_post(
      url := project_url || '/functions/v1/send-welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'email', user_email,
        'name', user_name
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach to auth.users INSERT (fires after every new signup)
DROP TRIGGER IF EXISTS on_auth_user_welcome_email ON auth.users;
CREATE TRIGGER on_auth_user_welcome_email
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_email();
