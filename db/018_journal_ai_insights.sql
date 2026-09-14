-- 018_journal_ai_insights.sql
-- Async AI insight generation for completed journal saves.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.journal_ai_insight_config (
  id integer PRIMARY KEY DEFAULT 1,
  edge_function_url text NOT NULL,
  webhook_secret text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journal_ai_insight_config_singleton CHECK (id = 1)
);

ALTER TABLE public.journal_ai_insight_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_ai_insight_config FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.journal_ai_insight_config FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.journal_ai_insights (
  entry_id uuid PRIMARY KEY REFERENCES public.journal_entries (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'complete', 'error')),
  experience text,
  tips jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  generated_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journal_ai_insights_user_idx
  ON public.journal_ai_insights (user_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS journal_ai_insights_status_idx
  ON public.journal_ai_insights (status, requested_at);

DROP TRIGGER IF EXISTS set_journal_ai_insights_updated_at ON public.journal_ai_insights;
CREATE TRIGGER set_journal_ai_insights_updated_at
BEFORE UPDATE ON public.journal_ai_insights
FOR EACH ROW
EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

ALTER TABLE public.journal_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_ai_insights FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own journal AI insights" ON public.journal_ai_insights;
CREATE POLICY "Users can read their own journal AI insights"
  ON public.journal_ai_insights
  FOR SELECT
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.invoke_journal_ai_insight()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  cfg record;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.requested_at IS NOT DISTINCT FROM NEW.requested_at THEN
    RETURN NEW;
  END IF;

  SELECT edge_function_url, webhook_secret INTO cfg
  FROM public.journal_ai_insight_config
  WHERE id = 1;

  IF cfg.edge_function_url IS NULL OR cfg.webhook_secret IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := cfg.edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cfg.webhook_secret
    ),
    body := jsonb_build_object('entry_id', NEW.entry_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS journal_ai_insight_requested ON public.journal_ai_insights;
CREATE TRIGGER journal_ai_insight_requested
AFTER INSERT OR UPDATE OF requested_at ON public.journal_ai_insights
FOR EACH ROW
EXECUTE FUNCTION public.invoke_journal_ai_insight();

REVOKE ALL ON FUNCTION public.invoke_journal_ai_insight() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.request_journal_ai_insight(p_entry_id uuid)
RETURNS public.journal_ai_insights
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  uid uuid;
  row public.journal_ai_insights;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.journal_entries
    WHERE id = p_entry_id AND user_id = uid
  ) THEN
    RAISE EXCEPTION 'Journal entry not found';
  END IF;

  INSERT INTO public.journal_ai_insights (
    entry_id,
    user_id,
    status,
    experience,
    tips,
    requested_at,
    generated_at,
    error
  )
  VALUES (
    p_entry_id,
    uid,
    'pending',
    NULL,
    '[]'::jsonb,
    now(),
    NULL,
    NULL
  )
  ON CONFLICT (entry_id) DO NOTHING
  RETURNING * INTO row;

  IF row.entry_id IS NULL THEN
    SELECT * INTO row
    FROM public.journal_ai_insights
    WHERE entry_id = p_entry_id;
  END IF;

  RETURN row;
END;
$$;

REVOKE ALL ON FUNCTION public.request_journal_ai_insight(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_journal_ai_insight(uuid) TO authenticated;

COMMIT;
