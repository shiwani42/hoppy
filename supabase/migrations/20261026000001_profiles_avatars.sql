-- Slice 1: profiles, avatar stages, and private storage buckets.
-- Every user (including anonymous ones) owns exactly one profile row.

create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  name text,
  sex text check (sex in ('female', 'male')),
  birth_year int check (birth_year between 1900 and 2100),
  height_cm numeric check (height_cm between 80 and 250),
  weight_kg numeric check (weight_kg between 20 and 350),
  goal_weight_kg numeric check (goal_weight_kg between 20 and 350),
  diet_type text check (diet_type in ('veg', 'egg', 'non-veg', 'jain', 'vegan')),
  current_stage int not null default 1 check (current_stage between 1 and 5),
  selfie_path text,
  skin_tone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "profiles: own row" on public.profiles
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.avatar_stages (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  stage int not null check (stage between 1 and 5),
  image_path text not null,
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, stage)
);

alter table public.avatar_stages enable row level security;
create policy "avatar_stages: own rows" on public.avatar_stages
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Storage: each user writes under a folder named after their user id.
insert into storage.buckets (id, name, public)
values ('selfies', 'selfies', false), ('avatars', 'avatars', false)
on conflict (id) do nothing;

create policy "storage: own folder read" on storage.objects
  for select to authenticated
  using (bucket_id in ('selfies', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);

create policy "storage: own folder write" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('selfies', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);

create policy "storage: own folder update" on storage.objects
  for update to authenticated
  using (bucket_id in ('selfies', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);

create policy "storage: own folder delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('selfies', 'avatars') and (storage.foldername(name))[1] = auth.uid()::text);
