-- Align Game copy with the current prompts and preserve historical answers.
-- Training phase metadata was added in 013; the app now uses it as a true
-- pre-training / post-training journal flow.

BEGIN;

UPDATE public.journal_questions AS question
SET prompt = 'Who is your opponent?'
FROM public.workout_types AS workout
WHERE question.workout_type_id = workout.id
  AND lower(workout.name) = 'game'
  AND question.owner_id IS NULL
  AND question.is_system_default
  AND question.prompt = 'Who was your opponent?';

UPDATE public.journal_questions AS question
SET prompt = 'Do I think how I played will affect the rest of my day?'
FROM public.workout_types AS workout
WHERE question.workout_type_id = workout.id
  AND lower(workout.name) = 'game'
  AND question.owner_id IS NULL
  AND question.is_system_default
  AND question.prompt = 'Do I think how I played will affect the rest of my day? What if I played the opposite of how I played?';

-- These are postgame questions 9 and 10 after the original eight prompts.
-- Retire instead of deleting so existing journal answers remain readable.
UPDATE public.journal_questions AS question
SET retired_at = COALESCE(question.retired_at, now())
FROM public.workout_types AS workout
WHERE question.workout_type_id = workout.id
  AND lower(workout.name) = 'game'
  AND question.owner_id IS NULL
  AND question.is_system_default
  AND question.prompt IN (
    'What is your mindset going into the game?',
    'What were two moments that stood out?'
  );

COMMIT;
