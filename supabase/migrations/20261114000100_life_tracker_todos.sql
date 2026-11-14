-- Additive To-Do tables. This migration is for review and is not applied here.
-- IDs remain text to match the existing Life Tracker tables and backups.

create table if not exists public.todo_series (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  title text not null,
  notes text not null default '',
  task_time time without time zone,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  category text,
  reminder_enabled boolean not null default false,
  recurrence text not null check (recurrence in ('daily', 'weekdays', 'weekly', 'monthly')),
  subtasks_template jsonb not null default '[]'::jsonb check (jsonb_typeof(subtasks_template) = 'array'),
  weekdays smallint[] not null default '{}',
  starts_on date not null,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  check (ends_on is null or ends_on >= starts_on),
  check (weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  check (recurrence <> 'weekly' or cardinality(weekdays) > 0),
  check (not reminder_enabled or task_time is not null),
  check (length(btrim(title)) > 0)
);

create table if not exists public.todos (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  series_id text,
  title text not null,
  notes text not null default '',
  task_date date not null,
  task_time time without time zone,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  category text,
  position integer not null default 0,
  reminder_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, id),
  unique (user_id, series_id, task_date),
  check (not reminder_enabled or task_time is not null),
  check (length(btrim(title)) > 0),
  foreign key (user_id, series_id) references public.todo_series(user_id, id)
);

create table if not exists public.todo_subtasks (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  todo_id text not null,
  title text not null,
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  check (length(btrim(title)) > 0),
  foreign key (user_id, todo_id) references public.todos(user_id, id) on delete cascade
);

create index if not exists todos_user_date_order_idx
  on public.todos(user_id, task_date, task_time, position);
create index if not exists todos_user_series_idx
  on public.todos(user_id, series_id) where series_id is not null;
create index if not exists todo_subtasks_user_todo_position_idx
  on public.todo_subtasks(user_id, todo_id, position);

alter table public.todo_series enable row level security;
alter table public.todos enable row level security;
alter table public.todo_subtasks enable row level security;

revoke all on table public.todo_series, public.todos, public.todo_subtasks from public, anon, authenticated;
grant select, insert, update, delete on table public.todo_series, public.todos, public.todo_subtasks to authenticated;

create policy todo_series_select_own on public.todo_series for select to authenticated
  using ((select auth.uid()) = user_id);
create policy todo_series_insert_own on public.todo_series for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy todo_series_update_own on public.todo_series for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy todo_series_delete_own on public.todo_series for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy todos_select_own on public.todos for select to authenticated
  using ((select auth.uid()) = user_id);
create policy todos_insert_own on public.todos for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy todos_update_own on public.todos for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy todos_delete_own on public.todos for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy todo_subtasks_select_own on public.todo_subtasks for select to authenticated
  using ((select auth.uid()) = user_id);
create policy todo_subtasks_insert_own on public.todo_subtasks for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy todo_subtasks_update_own on public.todo_subtasks for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy todo_subtasks_delete_own on public.todo_subtasks for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Extend the existing atomic, SECURITY INVOKER browser-backup import.
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

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text, 0));

  if exists (select 1 from public.habits where user_id = owner_id)
    or exists (select 1 from public.goals where user_id = owner_id)
    or exists (select 1 from public.mood_entries where user_id = owner_id)
    or exists (select 1 from public.workouts where user_id = owner_id)
    or exists (select 1 from public.daily_health where user_id = owner_id)
    or exists (select 1 from public.transactions where user_id = owner_id)
    or exists (select 1 from public.todo_series where user_id = owner_id)
    or exists (select 1 from public.todos where user_id = owner_id)
    or exists (select 1 from public.todo_subtasks where user_id = owner_id) then
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

  insert into public.todo_series (user_id, id, title, notes, task_time, priority, category, reminder_enabled, recurrence, subtasks_template, weekdays, starts_on, ends_on, active, created_at)
  select owner_id, r.id, r.title, coalesce(r.notes, ''), r.task_time, coalesce(r.priority, 'medium'), r.category,
    coalesce(r.reminder_enabled, false), r.recurrence, coalesce(r.subtasks_template, '[]'::jsonb), coalesce(r.weekdays, '{}'::smallint[]), r.starts_on, r.ends_on,
    coalesce(r.active, true), coalesce(r.created_at, now())
  from pg_catalog.jsonb_to_recordset(coalesce(payload->'todo_series', '[]'::jsonb)) as r(
    id text, title text, notes text, task_time time, priority text, category text, reminder_enabled boolean,
    recurrence text, subtasks_template jsonb, weekdays smallint[], starts_on date, ends_on date, active boolean, created_at timestamptz);
  insert into public.todos (user_id, id, series_id, title, notes, task_date, task_time, priority, category, position, reminder_enabled, created_at, completed_at)
  select owner_id, r.id, r.series_id, r.title, coalesce(r.notes, ''), r.task_date, r.task_time,
    coalesce(r.priority, 'medium'), r.category, coalesce(r.position, 0), coalesce(r.reminder_enabled, false),
    coalesce(r.created_at, now()), r.completed_at
  from pg_catalog.jsonb_to_recordset(coalesce(payload->'todos', '[]'::jsonb)) as r(
    id text, series_id text, title text, notes text, task_date date, task_time time, priority text, category text,
    position integer, reminder_enabled boolean, created_at timestamptz, completed_at timestamptz);
  insert into public.todo_subtasks (user_id, id, todo_id, title, completed, position, created_at)
  select owner_id, r.id, r.todo_id, r.title, coalesce(r.completed, false), coalesce(r.position, 0), coalesce(r.created_at, now())
  from pg_catalog.jsonb_to_recordset(coalesce(payload->'todo_subtasks', '[]'::jsonb)) as r(
    id text, todo_id text, title text, completed boolean, position integer, created_at timestamptz);
end;
$$;

revoke all on function public.import_life_tracker_data(jsonb) from public, anon;
grant execute on function public.import_life_tracker_data(jsonb) to authenticated;
