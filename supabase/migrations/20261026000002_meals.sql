-- Slice 3: meals and their items (prd.md > Meal Logging (Photo and Voice)).

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  eaten_at timestamptz not null default now(),
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'snack', 'dinner')),
  source text not null check (source in ('photo', 'voice', 'manual')),
  photo_path text,
  reply text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create index meals_user_time on public.meals (user_id, eaten_at desc);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  quantity numeric not null check (quantity > 0),
  unit text not null,
  grams numeric not null check (grams >= 0),
  kcal numeric not null default 0,
  protein_g numeric not null default 0,
  fiber_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  sodium_mg numeric not null default 0,
  sticker text,
  food_id text,
  created_at timestamptz not null default now()
);
create index meal_items_meal on public.meal_items (meal_id);

alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
create policy "meals: own rows" on public.meals
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "meal_items: own rows" on public.meal_items
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id, name, public) values ('meals', 'meals', false)
on conflict (id) do nothing;

create policy "storage meals: own folder read" on storage.objects
  for select to authenticated
  using (bucket_id = 'meals' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "storage meals: own folder write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'meals' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "storage meals: own folder delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'meals' and (storage.foldername(name))[1] = auth.uid()::text);
