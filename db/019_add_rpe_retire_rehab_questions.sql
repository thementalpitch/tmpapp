-- Add session RPE and retire superseded rehab prompts without deleting historical answers.

alter table public.journal_entries
  add column if not exists rpe_score integer check (rpe_score between 0 and 10);

comment on column public.journal_entries.rpe_score is
  'Athlete-reported session effort from 0 (rest) to 10 (maximal effort).';

alter table public.journal_questions
  add column if not exists retired_at timestamptz;

update public.journal_questions as question
set retired_at = now()
from public.workout_types as workout
where question.workout_type_id = workout.id
  and lower(workout.name) = 'rehab'
  and question.is_system_default
  and question.prompt in (
    'What did I do when I first woke up to set a positive tone for my recovery?',
    'Did I get 20 minutes of stretching in today? If not, why?',
    'What did/am I going to do to stay connected with my teammates today?'
  )
  and question.retired_at is null;
