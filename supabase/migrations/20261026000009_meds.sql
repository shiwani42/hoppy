-- Slice 11: medicines and supplements (prd.md > Medicines and Supplements).

create table public.meds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (length(name) between 1 and 80),
  dose text,
  kind text not null default 'medicine' check (kind in ('medicine', 'supplement')),
  times text[] not null check (array_length(times, 1) between 1 and 8),
  created_at timestamptz not null default now()
);

create table public.med_logs (
  id uuid primary key default gen_random_uuid(),
  med_id uuid not null references public.meds on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  time text not null,
  taken_at timestamptz not null default now(),
  unique (med_id, date, time)
);

alter table public.meds enable row level security;
alter table public.med_logs enable row level security;
create policy "meds: own rows" on public.meds for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "med_logs: own rows" on public.med_logs for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
