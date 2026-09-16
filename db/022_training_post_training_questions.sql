-- 022_training_post_training_questions.sql
-- Mark the five post-training prompts explicitly as Phase: Post-training
-- (previously unmarked; the app treated unmarked questions as post by fallback,
-- but explicit markers match the Game journal setup).
-- Retire the morning-routine prompt per Ben 2026-09-16 (retired, not deleted,
-- so existing journal answers remain readable -- same pattern as 020).

BEGIN;

WITH training_type AS (
  SELECT id
  FROM public.workout_types
  WHERE lower(name) = 'training'
    AND owner_id IS NULL
  LIMIT 1
)
UPDATE public.journal_questions jq
SET help_text = 'Phase: Post-training'
FROM training_type
WHERE jq.workout_type_id = training_type.id
  AND jq.owner_id IS NULL
  AND jq.retired_at IS NULL
  AND jq.prompt IN (
    'Did I feel focused during practice today?',
    'What were distracting external factors for me during training?',
    'What weakness in my game do I want to work on?',
    'Write down what I did well today, and my "play of the day":',
    'Did I do the treatment, activation, and stretching I normally do?'
  );

WITH training_type AS (
  SELECT id
  FROM public.workout_types
  WHERE lower(name) = 'training'
    AND owner_id IS NULL
  LIMIT 1
)
UPDATE public.journal_questions jq
SET retired_at = now()
FROM training_type
WHERE jq.workout_type_id = training_type.id
  AND jq.owner_id IS NULL
  AND jq.retired_at IS NULL
  AND jq.prompt = 'What''d I do when I first woke up this morning to set a positive tone for my day?';

COMMIT;
