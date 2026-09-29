-- 024_add_performance_score.sql
-- "How well did you play?" slider: per-entry performance score (1-10).
-- Shown on journal entries and as a tab in the calendar.

alter table public.journal_entries
  add column if not exists performance_score integer check (performance_score between 1 and 10);

comment on column public.journal_entries.performance_score is
  'How well the athlete felt they played/performed in the session (1-10).';
