-- Slice 10: which milestones the user has already been offered, so each is celebrated once.
alter table public.profiles add column milestones jsonb not null default '{}'::jsonb;
