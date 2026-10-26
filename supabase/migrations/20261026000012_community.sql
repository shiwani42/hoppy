-- Slice 14: friends via invite links, a feed of shared cards, a fair weekly leaderboard
-- (prd.md > Community). Friends see each other's shared cards and weekly strong-day counts only.

alter table public.profiles
  add column invite_code text unique default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
update public.profiles set invite_code = lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)) where invite_code is null;

create table public.friendships (
  user_id uuid not null references auth.users on delete cascade,
  friend_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
alter table public.friendships enable row level security;
create policy "friendships: own rows" on public.friendships for select to authenticated using (user_id = auth.uid());
create policy "friendships: unfriend" on public.friendships for delete to authenticated using (user_id = auth.uid());

create or replace function public.is_friend(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from friendships where user_id = auth.uid() and friend_id = other);
$$;

-- Accepting an invite makes the friendship mutual. Returns the inviter's name.
create or replace function public.accept_invite(code text) returns text
language plpgsql security definer set search_path = public as $$
declare inviter uuid; inviter_name text;
begin
  select user_id, name into inviter, inviter_name from profiles where invite_code = lower(code);
  if inviter is null then raise exception 'invite not found'; end if;
  if inviter = auth.uid() then raise exception 'that''s your own invite'; end if;
  insert into friendships (user_id, friend_id) values (auth.uid(), inviter), (inviter, auth.uid()) on conflict do nothing;
  return inviter_name;
end;
$$;

-- Friends and me: name, stage, and strong days in the last 7 days.
create or replace function public.weekly_leaderboard() returns table (user_id uuid, name text, current_stage int, strong_days bigint, is_me boolean)
language sql stable security definer set search_path = public as $$
  with people as (
    select auth.uid() as id
    union select friend_id from friendships where user_id = auth.uid()
  )
  select p.user_id, p.name, p.current_stage,
         (select count(*) from daily_snapshots s where s.user_id = p.user_id and s.strong_day and s.date > current_date - 7),
         p.user_id = auth.uid()
  from profiles p join people on people.id = p.user_id
  order by 4 desc, p.name;
$$;

create or replace function public.friend_names() returns table (user_id uuid, name text, current_stage int)
language sql stable security definer set search_path = public as $$
  select p.user_id, p.name, p.current_stage from profiles p
  join friendships f on f.friend_id = p.user_id where f.user_id = auth.uid();
$$;

revoke all on function public.accept_invite(text), public.weekly_leaderboard(), public.friend_names() from public, anon;
grant execute on function public.accept_invite(text), public.weekly_leaderboard(), public.friend_names(), public.is_friend(uuid) to authenticated;

-- Friends can read each other's shared cards (rows and images).
create policy "shared_cards: friends read" on public.shared_cards
  for select to authenticated using (public.is_friend(user_id));
create policy "storage cards: friends read" on storage.objects
  for select to authenticated
  using (bucket_id = 'cards' and public.is_friend(((storage.foldername(name))[1])::uuid));
