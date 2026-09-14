-- 017_security_and_notification_fixes.sql
-- RLS for food_meals, safer notification RPCs, token reassignment, send dedupe.

BEGIN;

-- ---------------------------------------------------------------------------
-- food_meals RLS (was missing — any user could read/write any meal row)
-- ---------------------------------------------------------------------------

ALTER TABLE public.food_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_meals FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read meals for their own entries" ON public.food_meals;
DROP POLICY IF EXISTS "Users can insert meals for their own entries" ON public.food_meals;
DROP POLICY IF EXISTS "Users can update meals for their own entries" ON public.food_meals;
DROP POLICY IF EXISTS "Users can delete meals for their own entries" ON public.food_meals;

CREATE POLICY "Users can read meals for their own entries"
  ON public.food_meals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.journal_entries e
      WHERE e.id = food_meals.entry_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert meals for their own entries"
  ON public.food_meals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.journal_entries e
      WHERE e.id = food_meals.entry_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update meals for their own entries"
  ON public.food_meals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.journal_entries e
      WHERE e.id = food_meals.entry_id AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.journal_entries e
      WHERE e.id = food_meals.entry_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete meals for their own entries"
  ON public.food_meals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.journal_entries e
      WHERE e.id = food_meals.entry_id AND e.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Safe IANA timezone (invalid values fall back to UTC for that user only)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.safe_iana_timezone(p_tz text)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  effective text;
BEGIN
  effective := COALESCE(NULLIF(trim(p_tz), ''), 'UTC');
  BEGIN
    PERFORM (now() AT TIME ZONE effective);
    RETURN effective;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN 'UTC';
  END;
END;
$$;

-- ---------------------------------------------------------------------------
-- Reminder query: skip bad timezones; match local wall-clock minute
-- ---------------------------------------------------------------------------

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
      public.safe_iana_timezone(np.timezone) AS tz,
      (now() AT TIME ZONE public.safe_iana_timezone(np.timezone))::date AS local_date,
      EXTRACT(DOW FROM (now() AT TIME ZONE public.safe_iana_timezone(np.timezone)))::int AS local_dow,
      to_char(now() AT TIME ZONE public.safe_iana_timezone(np.timezone), 'HH24:MI') AS local_hm
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

-- Claim send slot before push (prevents duplicate cron overlap)
CREATE OR REPLACE FUNCTION public.try_claim_reminder_send(
  p_user_id uuid,
  p_reminder_time text,
  p_local_date date
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ins AS (
    INSERT INTO public.notification_send_log (user_id, reminder_time, local_date)
    VALUES (p_user_id, p_reminder_time, p_local_date)
    ON CONFLICT (user_id, reminder_time, local_date) DO NOTHING
    RETURNING id
  )
  SELECT EXISTS (SELECT 1 FROM ins);
$$;

REVOKE ALL ON FUNCTION public.try_claim_reminder_send(uuid, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_claim_reminder_send(uuid, text, date) TO service_role;

-- Reassign expo token to current user (fixes shared-device / account-switch leakage)
CREATE OR REPLACE FUNCTION public.register_expo_push_token(
  p_expo_push_token text,
  p_device_id text DEFAULT NULL,
  p_platform text DEFAULT NULL,
  p_app_version text DEFAULT NULL
)
RETURNS public.notification_tokens
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  row public.notification_tokens;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  DELETE FROM public.notification_tokens
  WHERE expo_push_token = p_expo_push_token
    AND user_id <> uid;

  INSERT INTO public.notification_tokens (
    user_id,
    expo_push_token,
    device_id,
    platform,
    app_version,
    enabled,
    last_seen_at,
    updated_at
  )
  VALUES (
    uid,
    p_expo_push_token,
    p_device_id,
    p_platform,
    p_app_version,
    true,
    now(),
    now()
  )
  ON CONFLICT (expo_push_token) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    device_id = EXCLUDED.device_id,
    platform = EXCLUDED.platform,
    app_version = EXCLUDED.app_version,
    enabled = true,
    last_seen_at = now(),
    updated_at = now()
  RETURNING * INTO row;

  RETURN row;
END;
$$;

REVOKE ALL ON FUNCTION public.register_expo_push_token(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_expo_push_token(text, text, text, text) TO authenticated;

COMMIT;
