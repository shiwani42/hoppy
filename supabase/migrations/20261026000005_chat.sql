-- Slice 6: the chat thread and a simple per-user daily AI budget (spec.md > Cost controls).

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  kind text not null default 'chat' check (kind in ('chat', 'nudge')),
  content text not null,
  stat jsonb,
  created_at timestamptz not null default now()
);
create index chat_user_time on public.chat_messages (user_id, created_at desc);

create table public.ai_calls (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null,
  at timestamptz not null default now()
);
create index ai_calls_user_time on public.ai_calls (user_id, at desc);

alter table public.chat_messages enable row level security;
alter table public.ai_calls enable row level security;
create policy "chat_messages: own rows" on public.chat_messages
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Users may read and add their own usage rows but never delete them.
create policy "ai_calls: own read" on public.ai_calls for select to authenticated using (user_id = auth.uid());
create policy "ai_calls: own insert" on public.ai_calls for insert to authenticated with check (user_id = auth.uid());
