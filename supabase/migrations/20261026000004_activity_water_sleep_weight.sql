-- Slice 5: the remaining stat inputs (prd.md > Exercise and Yoga Logging, Water Tumbler, Daily Stats).

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  done_at timestamptz not null default now(),
  activity_key text not null,
  label text not null,
  minutes numeric not null check (minutes > 0 and minutes <= 600),
  met numeric not null,
  kcal numeric not null,
  active_minutes numeric not null,
  source text not null default 'text' check (source in ('text', 'voice', 'manual')),
  created_at timestamptz not null default now()
);
create index activities_user_time on public.activities (user_id, done_at desc);

create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  at timestamptz not null default now(),
  ml int not null check (ml > 0 and ml <= 2000)
);
create index water_user_time on public.water_logs (user_id, at desc);

create table public.sleep_logs (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  hours numeric not null check (hours >= 0 and hours <= 16),
  primary key (user_id, date)
);

create table public.weights (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  kg numeric not null check (kg between 20 and 350),
  primary key (user_id, date)
);

alter table public.activities enable row level security;
alter table public.water_logs enable row level security;
alter table public.sleep_logs enable row level security;
alter table public.weights enable row level security;
create policy "activities: own rows" on public.activities for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "water_logs: own rows" on public.water_logs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sleep_logs: own rows" on public.sleep_logs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "weights: own rows" on public.weights for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
