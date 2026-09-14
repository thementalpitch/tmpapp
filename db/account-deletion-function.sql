-- Database function for account deletion
-- Run this in your Supabase SQL editor to enable account deletion

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_id_to_delete uuid;
BEGIN
  user_id_to_delete := auth.uid();

  IF user_id_to_delete IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  DELETE FROM public.notification_send_log WHERE user_id = user_id_to_delete;
  DELETE FROM public.notification_preferences WHERE user_id = user_id_to_delete;
  DELETE FROM public.notification_tokens WHERE user_id = user_id_to_delete;
  DELETE FROM public.journal_entries WHERE user_id = user_id_to_delete;
  DELETE FROM public.profiles WHERE id = user_id_to_delete;
  DELETE FROM public.workout_types WHERE owner_id = user_id_to_delete;
  DELETE FROM public.journal_questions WHERE owner_id = user_id_to_delete;

  DELETE FROM auth.users WHERE id = user_id_to_delete;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Could not delete auth user record';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

COMMENT ON FUNCTION public.delete_user_account() IS
  'Deletes the current authenticated user account and all associated data.';
