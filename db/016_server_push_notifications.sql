-- 016_server_push_notifications.sql
-- Server-side journal reminders via Edge Function + pg_cron + Expo Push API.
--
-- After running this migration:
-- 1. Deploy supabase/functions/send-journal-reminders
-- 2. Set Edge Function secrets: CRON_SECRET (random), SUPABASE_* auto-injected
-- 3. Insert cron config and schedule (see docs/server-notifications-setup.md)

BEGIN;

-- IANA timezone for interpreting reminder_times / reminder_days per user.
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';

UPDATE public.notification_preferences
SET timezone = COALESCE(NULLIF(trim(timezone), ''), 'UTC')
WHERE timezone IS NULL OR trim(timezone) = '';

-- Dedupe: at most one push per user / local date / reminder slot.
CREATE TABLE IF NOT EXISTS public.notification_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  reminder_time text NOT NULL,
  local_date date NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_send_log_unique UNIQUE (user_id, reminder_time, local_date)
);

CREATE INDEX IF NOT EXISTS notification_send_log_user_date_idx
  ON public.notification_send_log (user_id, local_date DESC);

ALTER TABLE public.notification_send_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own send history (optional transparency).
DROP POLICY IF EXISTS "Users can read their own notification send log"
  ON public.notification_send_log;

CREATE POLICY "Users can read their own notification send log"
  ON public.notification_send_log
  FOR SELECT
  USING (user_id = auth.uid());

-- One-row config table for pg_cron → Edge Function (service role only).
CREATE TABLE IF NOT EXISTS public.notification_cron_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  edge_function_url text,
  cron_secret text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_cron_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_cron_config FROM anon, authenticated;

-- Returns push targets due in the current minute (user local time).
CREATE OR REPLACE FUNCTION public.get_due_journal_reminders()
RETURNS TABLE (
  user_id uuid,
  expo_push_token text,
  reminder_time text,
  local_date date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_local AS (
    SELECT
      np.user_id,
      np.reminder_times,
      np.reminder_days,
      COALESCE(NULLIF(trim(np.timezone), ''), 'UTC') AS tz,
      (now() AT TIME ZONE COALESCE(NULLIF(trim(np.timezone), ''), 'UTC'))::date AS local_date,
      EXTRACT(DOW FROM (now() AT TIME ZONE COALESCE(NULLIF(trim(np.timezone), ''), 'UTC')))::int AS local_dow,
      to_char(now() AT TIME ZONE COALESCE(NULLIF(trim(np.timezone), ''), 'UTC'), 'HH24:MI') AS local_hm
    FROM public.notification_preferences np
    WHERE np.enabled = true
  ),
  due AS (
    SELECT ul.user_id, rt.reminder_time, ul.local_date
    FROM user_local ul
    CROSS JOIN LATERAL unnest(ul.reminder_times) AS rt (reminder_time)
    WHERE ul.local_dow = ANY (ul.reminder_days)
      AND rt.reminder_time = ul.local_hm
      AND NOT EXISTS (
        SELECT 1
        FROM public.journal_entries je
        WHERE je.user_id = ul.user_id
          AND je.entry_date = ul.local_date
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.notification_send_log nsl
        WHERE nsl.user_id = ul.user_id
          AND nsl.reminder_time = rt.reminder_time
          AND nsl.local_date = ul.local_date
      )
  )
  SELECT d.user_id, nt.expo_push_token, d.reminder_time, d.local_date
  FROM due d
  INNER JOIN public.notification_tokens nt
    ON nt.user_id = d.user_id
   AND nt.enabled = true;
$$;

REVOKE ALL ON FUNCTION public.get_due_journal_reminders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_due_journal_reminders() TO service_role;

CREATE OR REPLACE FUNCTION public.record_notification_send(
  p_user_id uuid,
  p_reminder_time text,
  p_local_date date
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.notification_send_log (user_id, reminder_time, local_date)
  VALUES (p_user_id, p_reminder_time, p_local_date)
  ON CONFLICT (user_id, reminder_time, local_date) DO NOTHING;
$$;

REVOKE ALL ON FUNCTION public.record_notification_send(uuid, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_notification_send(uuid, text, date) TO service_role;

CREATE OR REPLACE FUNCTION public.disable_notification_token(p_expo_push_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notification_tokens
  SET enabled = false, updated_at = now()
  WHERE expo_push_token = p_expo_push_token;
$$;

REVOKE ALL ON FUNCTION public.disable_notification_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.disable_notification_token(text) TO service_role;

-- Schedule pg_cron job that POSTs to the Edge Function every minute.
CREATE OR REPLACE FUNCTION public.configure_notification_cron()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  cfg record;
  job_id bigint;
  headers_json text;
BEGIN
  SELECT edge_function_url, cron_secret INTO cfg
  FROM public.notification_cron_config
  WHERE id = 1;

  IF cfg.edge_function_url IS NULL OR cfg.cron_secret IS NULL THEN
    RETURN 'skipped: set notification_cron_config.edge_function_url and cron_secret first';
  END IF;

  BEGIN
    PERFORM cron.unschedule('send-journal-reminders');
  EXCEPTION
    WHEN OTHERS THEN NULL;
  END;

  headers_json := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || cfg.cron_secret
  )::text;

  SELECT cron.schedule(
    'send-journal-reminders',
    '* * * * *',
    format(
      $job$
      SELECT net.http_post(
        url := %L,
        headers := %L::jsonb,
        body := '{}'::jsonb
      );
      $job$,
      cfg.edge_function_url,
      headers_json
    )
  ) INTO job_id;

  UPDATE public.notification_cron_config SET updated_at = now() WHERE id = 1;

  RETURN format('scheduled send-journal-reminders as job %s', job_id);
END;
$$;

REVOKE ALL ON FUNCTION public.configure_notification_cron() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.configure_notification_cron() TO service_role;

-- Extensions (no-op if already enabled or unavailable on local Postgres).
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

COMMIT;
