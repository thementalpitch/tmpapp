-- 015_fix_notification_preferences_upsert.sql
-- Make notification preferences safe for DB-backed per-user upserts.

BEGIN;

ALTER TABLE public.notification_preferences
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN enabled SET DEFAULT false,
  ALTER COLUMN reminder_times SET DEFAULT ARRAY['18:00']::text[],
  ALTER COLUMN reminder_days SET DEFAULT ARRAY[0,1,2,3,4,5,6]::integer[],
  ALTER COLUMN streak_reminders SET DEFAULT true,
  ALTER COLUMN mood_insights SET DEFAULT true,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

UPDATE public.notification_preferences
SET
  reminder_times = COALESCE(reminder_times, ARRAY['18:00']::text[]),
  reminder_days = COALESCE(reminder_days, ARRAY[0,1,2,3,4,5,6]::integer[]),
  streak_reminders = COALESCE(streak_reminders, true),
  mood_insights = COALESCE(mood_insights, true),
  updated_at = now();

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notification preferences"
  ON public.notification_preferences;

CREATE POLICY "Users can manage their own notification preferences"
  ON public.notification_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE UNIQUE INDEX IF NOT EXISTS notification_preferences_user_id_key
  ON public.notification_preferences(user_id);

COMMIT;
