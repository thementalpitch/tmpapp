-- Allow each enabled weekday to have its own local reminder time.

BEGIN;

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS daily_reminder_times jsonb;

UPDATE public.notification_preferences AS preferences
SET daily_reminder_times = COALESCE(
  (
    SELECT jsonb_object_agg(
      enabled_day.day_number::text,
      COALESCE(preferences.reminder_times[1], '18:00')
    )
    FROM unnest(
      COALESCE(preferences.reminder_days, ARRAY[0,1,2,3,4,5,6]::integer[])
    ) AS enabled_day(day_number)
    WHERE enabled_day.day_number BETWEEN 0 AND 6
  ),
  '{}'::jsonb
)
WHERE preferences.daily_reminder_times IS NULL;

ALTER TABLE public.notification_preferences
  ALTER COLUMN daily_reminder_times SET DEFAULT
    '{"0":"18:00","1":"18:00","2":"18:00","3":"18:00","4":"18:00","5":"18:00","6":"18:00"}'::jsonb,
  ALTER COLUMN daily_reminder_times SET NOT NULL;

ALTER TABLE public.notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_daily_times_object;

ALTER TABLE public.notification_preferences
  ADD CONSTRAINT notification_preferences_daily_times_object
  CHECK (jsonb_typeof(daily_reminder_times) = 'object');

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
      preferences.user_id,
      preferences.daily_reminder_times,
      (now() AT TIME ZONE public.safe_iana_timezone(preferences.timezone))::date AS local_date,
      EXTRACT(
        DOW FROM (now() AT TIME ZONE public.safe_iana_timezone(preferences.timezone))
      )::int AS local_dow,
      to_char(
        now() AT TIME ZONE public.safe_iana_timezone(preferences.timezone),
        'HH24:MI'
      ) AS local_hm
    FROM public.notification_preferences AS preferences
    WHERE preferences.enabled = true
  ),
  due AS (
    SELECT
      user_local.user_id,
      user_local.local_hm AS reminder_time,
      user_local.local_date
    FROM user_local
    WHERE user_local.daily_reminder_times ->> (user_local.local_dow::text) = user_local.local_hm
      AND NOT EXISTS (
        SELECT 1
        FROM public.journal_entries AS entry
        WHERE entry.user_id = user_local.user_id
          AND entry.entry_date = user_local.local_date
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.notification_send_log AS send_log
        WHERE send_log.user_id = user_local.user_id
          AND send_log.reminder_time = user_local.local_hm
          AND send_log.local_date = user_local.local_date
      )
  )
  SELECT due.user_id, token.expo_push_token, due.reminder_time, due.local_date
  FROM due
  INNER JOIN public.notification_tokens AS token
    ON token.user_id = due.user_id
   AND token.enabled = true;
$$;

REVOKE ALL ON FUNCTION public.get_due_journal_reminders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_due_journal_reminders() TO service_role;

COMMIT;
