-- Slice 13: cached report summaries (prd.md > Reports).
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  period_days int not null check (period_days in (7, 30, 90)),
  to_date date not null,
  numbers jsonb not null,
  summary text not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, period_days, to_date)
);
alter table public.reports enable row level security;
create policy "reports: own rows" on public.reports for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
