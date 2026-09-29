-- 025_user_hidden_sliders.sql
-- Per-user slider visibility for the journal score sliders (mood, effort, performance).
-- Mirrors user_hidden_questions: hiding a slider removes it from the journal entry
-- form (new + edit) and removes its tab from the calendar. Scores already saved
-- are preserved and reappear if the slider is re-enabled.

create table if not exists public.user_hidden_sliders (
  user_id uuid not null references auth.users(id) on delete cascade,
  slider_key text not null check (slider_key in ('mood', 'effort', 'performance')),
  hidden_at timestamptz not null default now(),
  primary key (user_id, slider_key)
);

create index if not exists user_hidden_sliders_user_id_idx
  on public.user_hidden_sliders (user_id);

alter table public.user_hidden_sliders enable row level security;
alter table public.user_hidden_sliders force row level security;

-- Users can read only their own hidden-slider rows.
drop policy if exists "Users can read their own hidden sliders"
  on public.user_hidden_sliders;
create policy "Users can read their own hidden sliders"
  on public.user_hidden_sliders
  for select
  using (user_id = auth.uid());

-- Users can hide sliders for themselves.
drop policy if exists "Users can hide sliders for themselves"
  on public.user_hidden_sliders;
create policy "Users can hide sliders for themselves"
  on public.user_hidden_sliders
  for insert
  with check (user_id = auth.uid());

-- Users can unhide (re-enable) sliders for themselves.
drop policy if exists "Users can unhide sliders for themselves"
  on public.user_hidden_sliders;
create policy "Users can unhide sliders for themselves"
  on public.user_hidden_sliders
  for delete
  using (user_id = auth.uid());
