-- 023_user_hidden_questions.sql
-- Per-user question visibility for the customizable journal questions feature.
-- Lets each user hide questions from their journals without deleting them:
-- answers already written are preserved and reappear if the question is
-- re-enabled. Hiding a system question only affects that user (system rows
-- are shared, so a join table is used instead of a flag on the question).

create table if not exists public.user_hidden_questions (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.journal_questions(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index if not exists user_hidden_questions_user_id_idx
  on public.user_hidden_questions (user_id);

alter table public.user_hidden_questions enable row level security;
alter table public.user_hidden_questions force row level security;

-- Users can read only their own hidden-question rows.
create policy "Users can read their own hidden questions"
  on public.user_hidden_questions
  for select
  using (user_id = auth.uid());

-- Users can hide questions for themselves.
create policy "Users can hide questions for themselves"
  on public.user_hidden_questions
  for insert
  with check (user_id = auth.uid());

-- Users can unhide (re-enable) questions for themselves.
create policy "Users can unhide questions for themselves"
  on public.user_hidden_questions
  for delete
  using (user_id = auth.uid());
