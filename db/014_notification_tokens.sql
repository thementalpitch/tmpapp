-- 014_notification_tokens.sql
-- Store Expo push tokens per user/device for future server-side notifications.

set check_function_bodies = off;

BEGIN;

CREATE TABLE IF NOT EXISTS public.notification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  expo_push_token text NOT NULL UNIQUE,
  device_id text,
  platform text,
  app_version text,
  enabled boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_tokens FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notification tokens"
  ON public.notification_tokens;

CREATE POLICY "Users can manage their own notification tokens"
  ON public.notification_tokens
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS notification_tokens_user_id_idx
  ON public.notification_tokens(user_id);

DROP TRIGGER IF EXISTS set_notification_tokens_updated_at
  ON public.notification_tokens;

CREATE TRIGGER set_notification_tokens_updated_at
BEFORE UPDATE ON public.notification_tokens
FOR EACH ROW
EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

COMMIT;
