-- Slice 12: push subscriptions, meal reminders and the scheduler (prd.md > Reminders).

alter table public.profiles add column timezone text not null default 'Asia/Kolkata';

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'snack', 'dinner')),
  time text not null check (time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  enabled boolean not null default true,
  unique (user_id, meal_type)
);

-- One send per reminder per local day, so the 5-minute job never repeats itself.
create table public.reminder_sends (
  user_id uuid not null references auth.users on delete cascade,
  key text not null,
  date date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key, date)
);

alter table public.push_subscriptions enable row level security;
alter table public.reminders enable row level security;
alter table public.reminder_sends enable row level security;
create policy "push_subscriptions: own rows" on public.push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reminders: own rows" on public.reminders for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
-- reminder_sends is written only by the cron route (service role); no user policies.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Points the every-5-minutes job at the app. Run once per environment:
--   select public.schedule_reminders('https://<app>/api/cron/reminders', '<CRON_SECRET>');
create or replace function public.schedule_reminders(url text, secret text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'hoppy-reminders';
  perform cron.schedule(
    'hoppy-reminders',
    '*/5 * * * *',
    format(
      $job$select net.http_post(url := %L, headers := jsonb_build_object('Authorization', %L, 'Content-Type', 'application/json'), body := '{}'::jsonb)$job$,
      url, 'Bearer ' || secret
    )
  );
end;
$$;
revoke all on function public.schedule_reminders(text, text) from public, anon, authenticated;
grant execute on function public.schedule_reminders(text, text) to service_role;
