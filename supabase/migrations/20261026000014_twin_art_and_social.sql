-- Redesign (images/Gemini_Generated_Image_*.png): avatar poses, friend avatars and
-- cheers, expert details, water reminders and "remind me in 15 min" snoozes.

-- Poses of the user's twin (bust, drinking water, stretching…) beside the five body stages.
create table public.avatar_poses (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  pose text not null check (pose in ('bust', 'drink', 'stretch', 'walk', 'wave', 'cheer')),
  image_path text not null,
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, pose)
);
alter table public.avatar_poses enable row level security;
create policy "avatar_poses: own rows" on public.avatar_poses
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Friends see each other's twin portrait on the leaderboard (nothing else in the folder is listed).
create policy "storage avatars: friends read" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and public.is_friend(((storage.foldername(name))[1])::uuid));

-- Days in a row with at least one meal logged (in the user's timezone), ending today or yesterday.
create or replace function public.logging_streak(who uuid) returns int
language plpgsql stable security definer set search_path = public as $$
declare
  tz text := coalesce((select timezone from profiles where user_id = who), 'Asia/Kolkata');
  d date := (now() at time zone tz)::date;
  n int := 0;
begin
  if not exists (select 1 from meals where user_id = who and (eaten_at at time zone tz)::date = d) then
    d := d - 1;
  end if;
  while n < 366 and exists (select 1 from meals where user_id = who and (eaten_at at time zone tz)::date = d - n) loop
    n := n + 1;
  end loop;
  return n;
end;
$$;

drop function public.weekly_leaderboard();
create function public.weekly_leaderboard() returns table (
  user_id uuid, name text, current_stage int, strong_days bigint, is_me boolean, avatar_path text, streak int
)
language sql stable security definer set search_path = public as $$
  with people as (
    select auth.uid() as id
    union select friend_id from friendships where user_id = auth.uid()
  )
  select p.user_id, p.name, p.current_stage,
         (select count(*) from daily_snapshots s where s.user_id = p.user_id and s.strong_day and s.date > current_date - 7),
         p.user_id = auth.uid(),
         coalesce((select image_path from avatar_poses ap where ap.user_id = p.user_id and ap.pose = 'bust'),
                  (select image_path from avatar_stages st where st.user_id = p.user_id and st.stage = p.current_stage),
                  (select image_path from avatar_stages st where st.user_id = p.user_id and st.stage = 1)),
         public.logging_streak(p.user_id)
  from profiles p join people on people.id = p.user_id
  order by 4 desc, p.name;
$$;
revoke all on function public.weekly_leaderboard(), public.logging_streak(uuid) from public, anon;
grant execute on function public.weekly_leaderboard() to authenticated;

-- A friend's "Shabaash!" — shows up in their chat once.
create table public.cheers (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null default auth.uid() references auth.users on delete cascade,
  to_id uuid not null references auth.users on delete cascade,
  seen boolean not null default false,
  created_at timestamptz not null default now(),
  check (from_id <> to_id)
);
alter table public.cheers enable row level security;
create policy "cheers: send to friends" on public.cheers for insert to authenticated
  with check (from_id = auth.uid() and public.is_friend(to_id));
create policy "cheers: read own" on public.cheers for select to authenticated
  using (to_id = auth.uid() or from_id = auth.uid());
create policy "cheers: mark seen" on public.cheers for update to authenticated
  using (to_id = auth.uid()) with check (to_id = auth.uid());

-- Expert cards: title, experience, focus and a photo (sample profiles).
alter table public.specialists
  add column title text,
  add column years int,
  add column specialty text,
  add column photo text;
update public.specialists set name = 'Vikram Singh (sample)', city = 'Delhi', bio = 'Strength and yoga coach for beginners and adults over 40; home workouts with no equipment.'
  where name = 'Rohit Mehra (sample)';
update public.specialists s set title = v.title, years = v.years, specialty = v.specialty, photo = v.photo
from (values
  ('Dr. Ananya Rao (sample)', 'Nutritionist & Dietitian', 12, 'Weight Loss (40+)', '/art/experts/dr-ananya-rao.jpg'),
  ('Vikram Singh (sample)', 'Certified Strength & Yoga Trainer', 9, 'Strength at Home', '/art/experts/vikram-singh.jpg'),
  ('Priya Nair (sample)', 'Sports & Lifestyle Nutritionist', 8, 'South Indian Meals', '/art/experts/priya-nair.jpg'),
  ('Sunil Joshi (sample)', 'Hatha Yoga Teacher', 20, 'Back Pain & Stiffness', '/art/experts/sunil-joshi.jpg'),
  ('Dr. Farah Siddiqui (sample)', 'Clinical Dietitian', 11, 'PCOS & Thyroid', '/art/experts/dr-farah-siddiqui.jpg'),
  ('Kavya Iyer (sample)', 'Nutritionist', 5, 'Veg & Jain Protein', '/art/experts/kavya-iyer.jpg'),
  ('Arjun Singh (sample)', 'Running Coach', 10, 'Your First 5 km', '/art/experts/arjun-singh.jpg'),
  ('Meera Desai (sample)', 'Gentle Yoga Teacher', 25, 'Yoga after 50', '/art/experts/meera-desai.jpg')
) as v(name, title, years, specialty, photo)
where s.name = v.name;

-- Water reminders (on/off) and one-off "remind me in 15 minutes" pushes.
alter table public.profiles add column water_reminders boolean not null default false;

create table public.snoozes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  body text not null,
  url text not null default '/',
  remind_at timestamptz not null,
  sent boolean not null default false
);
alter table public.snoozes enable row level security;
create policy "snoozes: own rows" on public.snoozes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
