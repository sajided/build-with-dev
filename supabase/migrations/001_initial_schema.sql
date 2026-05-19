-- Optional: omit if unsupported in project (gen_random_uuid is built-in in PG13+)
-- create extension if not exists "uuid-ossp";

-- Profiles (mirror auth.users)

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Days

create table public.days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  daily_adventure text,
  side_quests jsonb default '[]'::jsonb,
  coaching_message text,
  coaching_priority_flag text,
  receipt_generated boolean default false,
  receipt_data jsonb,
  created_at timestamptz default now(),
  unique (user_id, date)
);

create index days_user_date_idx on public.days (user_id, date);

alter table public.days enable row level security;

create policy "Days CRUD owner"
  on public.days for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Blocks

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.days (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  task_name text not null,
  start_time time not null,
  end_time time not null,
  type text not null default 'work'
    check (type in ('work', 'health', 'social', 'anchor', 'break')),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'completed', 'skipped')),
  accountability_buddy text,
  three_ps jsonb,
  micro_actions jsonb,
  stuck_flag boolean default false,
  created_at timestamptz default now()
);

create index blocks_day_idx on public.blocks (day_id);
create index blocks_user_idx on public.blocks (user_id);

alter table public.blocks enable row level security;

create policy "Blocks CRUD owner"
  on public.blocks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Chat messages

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  day_id uuid references public.days (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

create index chat_messages_day_idx on public.chat_messages (day_id, created_at);

alter table public.chat_messages enable row level security;

create policy "Chat CRUD owner"
  on public.chat_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Realtime (explicit publication for local / new projects)

alter publication supabase_realtime add table public.days;
alter publication supabase_realtime add table public.blocks;
