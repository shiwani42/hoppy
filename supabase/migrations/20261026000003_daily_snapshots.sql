-- Slice 4: one row per user per day with the six stats and the totals behind them.
-- Feeds stage-ups, streaks, the leaderboard and reports (spec.md > Data Model).

create table public.daily_snapshots (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  strength int, muscle int, digestion int, hydration int, energy int, rest int,
  strong_day boolean not null default false,
  kcal_in numeric not null default 0,
  kcal_out numeric not null default 0,
  protein_g numeric not null default 0,
  fiber_g numeric not null default 0,
  water_ml numeric not null default 0,
  active_minutes numeric not null default 0,
  sleep_hours numeric,
  weight_kg numeric,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.daily_snapshots enable row level security;
create policy "daily_snapshots: own rows" on public.daily_snapshots
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Which drip question the avatar has already asked, so it never nags twice in a moment.
alter table public.profiles add column asked jsonb not null default '{}'::jsonb;
