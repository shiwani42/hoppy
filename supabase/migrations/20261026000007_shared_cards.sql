-- Slice 8: share cards (prd.md > Daily Share Card). Friends get read access in slice 14.

create table public.shared_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('today', 'milestone')),
  title text not null,
  image_path text not null,
  created_at timestamptz not null default now()
);
create index shared_cards_user_time on public.shared_cards (user_id, created_at desc);

alter table public.shared_cards enable row level security;
create policy "shared_cards: own rows" on public.shared_cards
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id, name, public) values ('cards', 'cards', false)
on conflict (id) do nothing;

create policy "storage cards: own folder read" on storage.objects
  for select to authenticated
  using (bucket_id = 'cards' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "storage cards: own folder write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'cards' and (storage.foldername(name))[1] = auth.uid()::text);
