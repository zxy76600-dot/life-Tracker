-- Life Tracker private, per-user data model.
-- All tracker IDs remain text to preserve existing browser backup identifiers.

create table if not exists public.habits (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  icon text not null default 'check-square',
  color text not null default 'blue',
  frequency text not null check (frequency in ('daily', 'weekly')),
  created_at date not null default current_date,
  primary key (user_id, id)
);

create table if not exists public.habit_completions (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  habit_id text not null,
  completed_date date not null,
  primary key (user_id, id),
  unique (user_id, habit_id, completed_date),
  foreign key (user_id, habit_id) references public.habits(user_id, id) on delete cascade
);

create table if not exists public.goals (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  title text not null,
  description text not null default '',
  category text not null check (category in ('health', 'career', 'learning', 'finance', 'personal', 'fitness')),
  target_date date not null,
  created_at date not null default current_date,
  completed boolean not null default false,
  primary key (user_id, id)
);

create table if not exists public.goal_milestones (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  goal_id text not null,
  title text not null,
  completed boolean not null default false,
  created_at date not null default current_date,
  primary key (user_id, id),
  foreign key (user_id, goal_id) references public.goals(user_id, id) on delete cascade
);

create table if not exists public.mood_entries (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  entry_date date not null,
  mood smallint not null check (mood between 1 and 5),
  note text not null default '',
  tags text[] not null default '{}',
  primary key (user_id, id),
  unique (user_id, entry_date)
);

create table if not exists public.workouts (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  type text not null check (type in ('cardio', 'strength', 'flexibility', 'sports', 'other')),
  name text not null,
  duration integer not null default 0 check (duration >= 0),
  calories integer not null default 0 check (calories >= 0),
  workout_date date not null,
  notes text not null default '',
  primary key (user_id, id)
);

create table if not exists public.daily_health (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  health_date date not null,
  sleep_hours numeric(4, 2) not null default 0 check (sleep_hours >= 0),
  water_glasses integer not null default 0 check (water_glasses >= 0),
  primary key (user_id, health_date)
);

create table if not exists public.transactions (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(12, 2) not null check (amount >= 0),
  category text not null,
  description text not null default '',
  transaction_date date not null,
  primary key (user_id, id)
);

create index if not exists habit_completions_user_date_idx on public.habit_completions(user_id, completed_date);
create index if not exists goals_user_target_idx on public.goals(user_id, target_date);
create index if not exists mood_entries_user_date_idx on public.mood_entries(user_id, entry_date desc);
create index if not exists workouts_user_date_idx on public.workouts(user_id, workout_date desc);
create index if not exists transactions_user_date_idx on public.transactions(user_id, transaction_date desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'habits', 'habit_completions', 'goals', 'goal_milestones',
    'mood_entries', 'workouts', 'daily_health', 'transactions'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      table_name || '_select_own', table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      table_name || '_insert_own', table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      table_name || '_update_own', table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      table_name || '_delete_own', table_name
    );
  end loop;
end $$;

-- Import the existing browser backup atomically and only into an empty account.
-- This function runs as the signed-in user (SECURITY INVOKER), so RLS remains active.
create or replace function public.import_life_tracker_data(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
begin
  if owner_id is null then
    raise exception 'Sign in before importing tracker data.' using errcode = '28000';
  end if;

  -- Serialize imports by account so two tabs cannot both pass the empty-account check.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text, 0));

  if exists (select 1 from public.habits where user_id = owner_id)
    or exists (select 1 from public.goals where user_id = owner_id)
    or exists (select 1 from public.mood_entries where user_id = owner_id)
    or exists (select 1 from public.workouts where user_id = owner_id)
    or exists (select 1 from public.daily_health where user_id = owner_id)
    or exists (select 1 from public.transactions where user_id = owner_id) then
    raise exception 'Cloud data already exists. Import is disabled to prevent overwriting it.' using errcode = '23505';
  end if;

  insert into public.habits (user_id, id, name, icon, color, frequency, created_at)
  select owner_id, r.id, r.name, r.icon, r.color, r.frequency, r.created_at
  from pg_catalog.jsonb_to_recordset(coalesce(payload->'habits', '[]'::jsonb)) as r(id text, name text, icon text, color text, frequency text, created_at date);

  insert into public.habit_completions (user_id, id, habit_id, completed_date)
  select owner_id, r.id, r.habit_id, r.completed_date
  from pg_catalog.jsonb_to_recordset(coalesce(payload->'habit_completions', '[]'::jsonb)) as r(id text, habit_id text, completed_date date);

  insert into public.goals (user_id, id, title, description, category, target_date, created_at, completed)
  select owner_id, r.id, r.title, r.description, r.category, r.target_date, r.created_at, r.completed
  from pg_catalog.jsonb_to_recordset(coalesce(payload->'goals', '[]'::jsonb)) as r(id text, title text, description text, category text, target_date date, created_at date, completed boolean);

  insert into public.goal_milestones (user_id, id, goal_id, title, completed, created_at)
  select owner_id, r.id, r.goal_id, r.title, r.completed, r.created_at
  from pg_catalog.jsonb_to_recordset(coalesce(payload->'goal_milestones', '[]'::jsonb)) as r(id text, goal_id text, title text, completed boolean, created_at date);

  insert into public.mood_entries (user_id, id, entry_date, mood, note, tags)
  select owner_id, r.id, r.entry_date, r.mood, r.note, coalesce(r.tags, '{}'::text[])
  from pg_catalog.jsonb_to_recordset(coalesce(payload->'mood_entries', '[]'::jsonb)) as r(id text, entry_date date, mood smallint, note text, tags text[]);

  insert into public.workouts (user_id, id, type, name, duration, calories, workout_date, notes)
  select owner_id, r.id, r.type, r.name, r.duration, r.calories, r.workout_date, r.notes
  from pg_catalog.jsonb_to_recordset(coalesce(payload->'workouts', '[]'::jsonb)) as r(id text, type text, name text, duration integer, calories integer, workout_date date, notes text);

  insert into public.daily_health (user_id, health_date, sleep_hours, water_glasses)
  select owner_id, r.health_date, r.sleep_hours, r.water_glasses
  from pg_catalog.jsonb_to_recordset(coalesce(payload->'daily_health', '[]'::jsonb)) as r(health_date date, sleep_hours numeric, water_glasses integer);

  insert into public.transactions (user_id, id, type, amount, category, description, transaction_date)
  select owner_id, r.id, r.type, r.amount, r.category, r.description, r.transaction_date
  from pg_catalog.jsonb_to_recordset(coalesce(payload->'transactions', '[]'::jsonb)) as r(id text, type text, amount numeric, category text, description text, transaction_date date);
end;
$$;

revoke all on function public.import_life_tracker_data(jsonb) from public, anon;
grant execute on function public.import_life_tracker_data(jsonb) to authenticated;
