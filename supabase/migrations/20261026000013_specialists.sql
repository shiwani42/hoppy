-- Slice 15: specialists directory and consult requests (prd.md > Specialists).
-- The directory ships with clearly labeled SAMPLE profiles; there is no specialist-side app yet.

create table public.specialists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null check (role in ('nutritionist', 'dietitian', 'trainer', 'yoga')),
  city text not null,
  languages text[] not null default '{}',
  bio text not null,
  is_sample boolean not null default true
);
alter table public.specialists enable row level security;
create policy "specialists: anyone signed in can browse" on public.specialists for select to authenticated using (true);

create table public.consult_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  specialist_id uuid not null references public.specialists on delete cascade,
  report_id uuid references public.reports on delete set null,
  note text check (length(note) <= 500),
  created_at timestamptz not null default now()
);
alter table public.consult_requests enable row level security;
create policy "consult_requests: own rows" on public.consult_requests
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into public.specialists (name, role, city, languages, bio) values
  ('Dr. Ananya Rao (sample)', 'dietitian', 'Bengaluru', '{English,Kannada,Hindi}', 'Clinical dietitian focused on weight management for adults over 40 and diabetes-friendly Indian meal plans.'),
  ('Rohit Mehra (sample)', 'trainer', 'Delhi', '{Hindi,English}', 'Strength coach for beginners and older adults; home workouts with no equipment.'),
  ('Priya Nair (sample)', 'nutritionist', 'Kochi', '{Malayalam,English}', 'Sports and lifestyle nutrition built around Kerala and South Indian home food.'),
  ('Sunil Joshi (sample)', 'yoga', 'Pune', '{Marathi,Hindi,English}', 'Hatha yoga and pranayama for back pain, stiffness and stress.'),
  ('Dr. Farah Siddiqui (sample)', 'dietitian', 'Hyderabad', '{Urdu,Telugu,English}', 'PCOS and thyroid-aware nutrition counselling for women.'),
  ('Kavya Iyer (sample)', 'nutritionist', 'Chennai', '{Tamil,English}', 'Vegetarian and Jain-friendly high-protein planning.'),
  ('Arjun Singh (sample)', 'trainer', 'Chandigarh', '{Punjabi,Hindi,English}', 'Walking and running programs for first-timers aiming at their first 5 km.'),
  ('Meera Desai (sample)', 'yoga', 'Ahmedabad', '{Gujarati,Hindi,English}', 'Gentle yoga for people over 50, with chair-based options.');
