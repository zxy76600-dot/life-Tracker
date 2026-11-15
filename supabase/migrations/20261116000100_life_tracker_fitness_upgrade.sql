-- Additive fitness upgrade. Review and apply separately; this file does not
-- modify the connected Supabase project.

create table if not exists public.fitness_profiles (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  goal_mode text not null check (goal_mode in ('basic', 'bulk', 'cut', 'custom')),
  experience text not null check (experience in ('beginner', 'intermediate')),
  training_days_per_week smallint not null check (training_days_per_week between 3 and 5),
  equipment text not null check (equipment in ('gym', 'dumbbells', 'bodyweight')),
  units text not null check (units in ('kg', 'lb')),
  confirmed_18_or_older boolean not null default false,
  hide_weight boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id),
  check (goal_mode not in ('bulk', 'cut') or confirmed_18_or_older = true)
);

create table if not exists public.custom_exercises (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  muscle_group text not null,
  equipment text not null check (equipment in ('gym', 'dumbbells', 'bodyweight')),
  is_bodyweight boolean not null default false,
  form_cues text[] not null default '{}'::text[],
  substitutes text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  check (char_length(name) <= 100 and length(btrim(name)) > 0),
  check (cardinality(form_cues) <= 10),
  check (cardinality(substitutes) <= 10)
);

create table if not exists public.fitness_routines (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  check (char_length(name) <= 100 and length(btrim(name)) > 0),
  check (char_length(notes) <= 2000)
);

create table if not exists public.fitness_routine_exercises (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  routine_id text not null,
  exercise_id text not null,
  target_sets smallint not null check (target_sets > 0),
  min_reps smallint not null check (min_reps > 0),
  max_reps smallint not null check (max_reps >= min_reps),
  target_weight numeric(6, 2) check (target_weight is null or target_weight >= 0),
  position smallint not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, routine_id) references public.fitness_routines(user_id, id) on delete cascade
);

create table if not exists public.fitness_plans (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  week_start_date date not null,
  goal_mode text not null check (goal_mode in ('basic', 'bulk', 'cut', 'custom')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, week_start_date),
  check (char_length(notes) <= 2000)
);

create table if not exists public.fitness_plan_days (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  plan_id text not null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  scheduled_date date not null,
  name text not null,
  exercises jsonb not null default '[]'::jsonb,
  is_skipped boolean not null default false,
  position smallint not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, plan_id) references public.fitness_plans(user_id, id) on delete cascade,
  check (char_length(name) <= 100 and length(btrim(name)) > 0),
  check (jsonb_typeof(exercises) = 'array')
);

create table if not exists public.fitness_workout_logs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  plan_day_id text,
  routine_id text,
  name text not null,
  workout_date date not null,
  started_at timestamptz,
  completed_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  check (char_length(name) <= 100 and length(btrim(name)) > 0),
  check (char_length(notes) <= 2000)
);

create table if not exists public.fitness_set_logs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  workout_log_id text not null,
  exercise_id text not null,
  set_number smallint not null check (set_number > 0),
  reps smallint not null check (reps >= 0),
  weight numeric(6, 2) check (weight is null or weight >= 0),
  completed boolean not null default true,
  is_pr boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, workout_log_id) references public.fitness_workout_logs(user_id, id) on delete cascade,
  unique (user_id, workout_log_id, exercise_id, set_number)
);

create table if not exists public.fitness_weekly_checkins (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  week_start_date date not null,
  workouts_completed smallint not null check (workouts_completed >= 0),
  workouts_planned smallint not null check (workouts_planned >= 0),
  energy smallint not null check (energy between 1 and 5),
  sleep smallint not null check (sleep between 1 and 5),
  hunger smallint not null check (hunger between 1 and 5),
  soreness smallint not null check (soreness between 1 and 5),
  weight numeric(6, 2) check (weight is null or weight > 0),
  adjustments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, week_start_date),
  check (jsonb_typeof(adjustments) = 'array')
);

create index if not exists fitness_routine_exercises_user_routine_idx on public.fitness_routine_exercises(user_id, routine_id);
create index if not exists fitness_plans_user_week_idx on public.fitness_plans(user_id, week_start_date);
create index if not exists fitness_plan_days_user_plan_idx on public.fitness_plan_days(user_id, plan_id);
create index if not exists fitness_workout_logs_user_date_idx on public.fitness_workout_logs(user_id, workout_date);
create index if not exists fitness_set_logs_user_workout_idx on public.fitness_set_logs(user_id, workout_log_id);
create index if not exists fitness_set_logs_user_exercise_idx on public.fitness_set_logs(user_id, exercise_id);

do $$
declare
  table_name text;
  tables text[] := array[
    'fitness_profiles', 'custom_exercises', 'fitness_routines', 'fitness_routine_exercises',
    'fitness_plans', 'fitness_plan_days', 'fitness_workout_logs', 'fitness_set_logs',
    'fitness_weekly_checkins'
  ];
begin
  foreach table_name in array tables loop
    execute format('alter table public.%I enable row level security', table_name);
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = table_name and policyname = table_name || '_select_own') then
      execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name || '_select_own', table_name);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = table_name and policyname = table_name || '_insert_own') then
      execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name || '_insert_own', table_name);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = table_name and policyname = table_name || '_update_own') then
      execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name || '_update_own', table_name);
    end if;
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = table_name and policyname = table_name || '_delete_own') then
      execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name || '_delete_own', table_name);
    end if;
  end loop;
end $$;

-- Extend the existing atomic import without removing any To-Do or Finance support.
create or replace function public.import_life_tracker_data(payload jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null then raise exception 'Sign in before importing tracker data.' using errcode = '28000'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text, 0));
  if exists (select 1 from public.habits where user_id=owner_id)
    or exists (select 1 from public.goals where user_id=owner_id)
    or exists (select 1 from public.mood_entries where user_id=owner_id)
    or exists (select 1 from public.workouts where user_id=owner_id)
    or exists (select 1 from public.daily_health where user_id=owner_id)
    or exists (select 1 from public.transactions where user_id=owner_id)
    or exists (select 1 from public.todo_series where user_id=owner_id)
    or exists (select 1 from public.todos where user_id=owner_id)
    or exists (select 1 from public.todo_subtasks where user_id=owner_id)
    or exists (select 1 from public.wallets where user_id=owner_id)
    or exists (select 1 from public.recurring_transaction_series where user_id=owner_id)
    or exists (select 1 from public.wallet_transfers where user_id=owner_id)
    or exists (select 1 from public.loans where user_id=owner_id)
    or exists (select 1 from public.loan_payments where user_id=owner_id)
    or exists (select 1 from public.budgets where user_id=owner_id)
    or exists (select 1 from public.finance_settings where user_id=owner_id)
    or exists (select 1 from public.savings_goals where user_id=owner_id)
    or exists (select 1 from public.savings_contributions where user_id=owner_id)
    or exists (select 1 from public.fitness_profiles where user_id=owner_id)
    or exists (select 1 from public.custom_exercises where user_id=owner_id)
    or exists (select 1 from public.fitness_routines where user_id=owner_id)
    or exists (select 1 from public.fitness_routine_exercises where user_id=owner_id)
    or exists (select 1 from public.fitness_plans where user_id=owner_id)
    or exists (select 1 from public.fitness_plan_days where user_id=owner_id)
    or exists (select 1 from public.fitness_workout_logs where user_id=owner_id)
    or exists (select 1 from public.fitness_set_logs where user_id=owner_id)
    or exists (select 1 from public.fitness_weekly_checkins where user_id=owner_id) then
    raise exception 'Cloud data already exists. Import is disabled to prevent overwriting it.' using errcode = '23505';
  end if;

  insert into public.habits(user_id,id,name,icon,color,frequency,created_at)
  select owner_id,r.id,r.name,r.icon,r.color,r.frequency,r.created_at from pg_catalog.jsonb_to_recordset(coalesce(payload->'habits','[]'::jsonb)) as r(id text,name text,icon text,color text,frequency text,created_at date);
  insert into public.habit_completions(user_id,id,habit_id,completed_date)
  select owner_id,r.id,r.habit_id,r.completed_date from pg_catalog.jsonb_to_recordset(coalesce(payload->'habit_completions','[]'::jsonb)) as r(id text,habit_id text,completed_date date);
  insert into public.goals(user_id,id,title,description,category,target_date,created_at,completed)
  select owner_id,r.id,r.title,r.description,r.category,r.target_date,r.created_at,r.completed from pg_catalog.jsonb_to_recordset(coalesce(payload->'goals','[]'::jsonb)) as r(id text,title text,description text,category text,target_date date,created_at date,completed boolean);
  insert into public.goal_milestones(user_id,id,goal_id,title,completed,created_at)
  select owner_id,r.id,r.goal_id,r.title,r.completed,r.created_at from pg_catalog.jsonb_to_recordset(coalesce(payload->'goal_milestones','[]'::jsonb)) as r(id text,goal_id text,title text,completed boolean,created_at date);
  insert into public.mood_entries(user_id,id,entry_date,mood,note,tags)
  select owner_id,r.id,r.entry_date,r.mood,r.note,coalesce(r.tags,'{}'::text[]) from pg_catalog.jsonb_to_recordset(coalesce(payload->'mood_entries','[]'::jsonb)) as r(id text,entry_date date,mood smallint,note text,tags text[]);
  insert into public.workouts(user_id,id,type,name,duration,calories,workout_date,notes)
  select owner_id,r.id,r.type,r.name,r.duration,r.calories,r.workout_date,r.notes from pg_catalog.jsonb_to_recordset(coalesce(payload->'workouts','[]'::jsonb)) as r(id text,type text,name text,duration integer,calories integer,workout_date date,notes text);
  insert into public.daily_health(user_id,health_date,sleep_hours,water_glasses)
  select owner_id,r.health_date,r.sleep_hours,r.water_glasses from pg_catalog.jsonb_to_recordset(coalesce(payload->'daily_health','[]'::jsonb)) as r(health_date date,sleep_hours numeric,water_glasses integer);
  insert into public.todo_series(user_id,id,title,notes,task_time,priority,category,reminder_enabled,recurrence,subtasks_template,weekdays,starts_on,ends_on,active,created_at)
  select owner_id,r.id,r.title,coalesce(r.notes,''),r.task_time,coalesce(r.priority,'medium'),r.category,coalesce(r.reminder_enabled,false),r.recurrence,coalesce(r.subtasks_template,'[]'::jsonb),coalesce(r.weekdays,'{}'::smallint[]),r.starts_on,r.ends_on,coalesce(r.active,true),coalesce(r.created_at,now()) from pg_catalog.jsonb_to_recordset(coalesce(payload->'todo_series','[]'::jsonb)) as r(id text,title text,notes text,task_time time,priority text,category text,reminder_enabled boolean,recurrence text,subtasks_template jsonb,weekdays smallint[],starts_on date,ends_on date,active boolean,created_at timestamptz);
  insert into public.todos(user_id,id,series_id,title,notes,task_date,task_time,priority,category,position,reminder_enabled,created_at,completed_at)
  select owner_id,r.id,r.series_id,r.title,coalesce(r.notes,''),r.task_date,r.task_time,coalesce(r.priority,'medium'),r.category,coalesce(r.position,0),coalesce(r.reminder_enabled,false),coalesce(r.created_at,now()),r.completed_at from pg_catalog.jsonb_to_recordset(coalesce(payload->'todos','[]'::jsonb)) as r(id text,series_id text,title text,notes text,task_date date,task_time time,priority text,category text,position integer,reminder_enabled boolean,created_at timestamptz,completed_at timestamptz);
  insert into public.todo_subtasks(user_id,id,todo_id,title,completed,position,created_at)
  select owner_id,r.id,r.todo_id,r.title,coalesce(r.completed,false),coalesce(r.position,0),coalesce(r.created_at,now()) from pg_catalog.jsonb_to_recordset(coalesce(payload->'todo_subtasks','[]'::jsonb)) as r(id text,todo_id text,title text,completed boolean,position integer,created_at timestamptz);
  insert into public.wallets(user_id,id,name,opening_balance,archived_at,created_at,updated_at)
  select owner_id,r.id,r.name,coalesce(r.opening_balance,0),r.archived_at,coalesce(r.created_at,now()),coalesce(r.updated_at,now()) from pg_catalog.jsonb_to_recordset(coalesce(payload->'wallets','[]'::jsonb)) as r(id text,name text,opening_balance numeric,archived_at timestamptz,created_at timestamptz,updated_at timestamptz);
  insert into public.recurring_transaction_series(user_id,id,type,amount,category,description,wallet_id,frequency,starts_on,ends_on,active,created_at)
  select owner_id,r.id,r.type,r.amount,r.category,coalesce(r.description,''),r.wallet_id,r.frequency,r.starts_on,r.ends_on,coalesce(r.active,true),coalesce(r.created_at,now()) from pg_catalog.jsonb_to_recordset(coalesce(payload->'recurring_transaction_series','[]'::jsonb)) as r(id text,type text,amount numeric,category text,description text,wallet_id text,frequency text,starts_on date,ends_on date,active boolean,created_at timestamptz);
  insert into public.transactions(user_id,id,type,amount,category,description,transaction_date,wallet_id,recurring_series_id,split_total_amount)
  select owner_id,r.id,r.type,r.amount,r.category,coalesce(r.description,''),r.transaction_date,r.wallet_id,r.recurring_series_id,r.split_total_amount from pg_catalog.jsonb_to_recordset(coalesce(payload->'transactions','[]'::jsonb)) as r(id text,type text,amount numeric,category text,description text,transaction_date date,wallet_id text,recurring_series_id text,split_total_amount numeric);
  insert into public.wallet_transfers(user_id,id,from_wallet_id,to_wallet_id,amount,transfer_date,note,created_at)
  select owner_id,r.id,r.from_wallet_id,r.to_wallet_id,r.amount,r.transfer_date,coalesce(r.note,''),coalesce(r.created_at,now()) from pg_catalog.jsonb_to_recordset(coalesce(payload->'wallet_transfers','[]'::jsonb)) as r(id text,from_wallet_id text,to_wallet_id text,amount numeric,transfer_date date,note text,created_at timestamptz);
  insert into public.loans(user_id,id,direction,person,amount,loan_date,due_date,note,wallet_id,linked_transaction_id,created_at,updated_at)
  select owner_id,r.id,r.direction,r.person,r.amount,r.loan_date,r.due_date,coalesce(r.note,''),r.wallet_id,r.linked_transaction_id,coalesce(r.created_at,now()),coalesce(r.updated_at,now()) from pg_catalog.jsonb_to_recordset(coalesce(payload->'loans','[]'::jsonb)) as r(id text,direction text,person text,amount numeric,loan_date date,due_date date,note text,wallet_id text,linked_transaction_id text,created_at timestamptz,updated_at timestamptz);
  insert into public.loan_payments(user_id,id,loan_id,wallet_id,amount,payment_date,note,created_at)
  select owner_id,r.id,r.loan_id,r.wallet_id,r.amount,r.payment_date,coalesce(r.note,''),coalesce(r.created_at,now()) from pg_catalog.jsonb_to_recordset(coalesce(payload->'loan_payments','[]'::jsonb)) as r(id text,loan_id text,wallet_id text,amount numeric,payment_date date,note text,created_at timestamptz);
  insert into public.budgets(user_id,id,month_start,category,amount,created_at)
  select owner_id,r.id,r.month_start,r.category,r.amount,coalesce(r.created_at,now()) from pg_catalog.jsonb_to_recordset(coalesce(payload->'budgets','[]'::jsonb)) as r(id text,month_start date,category text,amount numeric,created_at timestamptz);
  insert into public.finance_settings(user_id,currency,overall_monthly_budget,keyword_rules,updated_at)
  select owner_id,coalesce(r.currency,'INR'),r.overall_monthly_budget,coalesce(r.keyword_rules,'[]'::jsonb),coalesce(r.updated_at,now()) from pg_catalog.jsonb_to_recordset(coalesce(payload->'finance_settings','[]'::jsonb)) as r(currency text,overall_monthly_budget numeric,keyword_rules jsonb,updated_at timestamptz);
  insert into public.savings_goals(user_id,id,name,target_amount,target_date,created_at,updated_at)
  select owner_id,r.id,r.name,r.target_amount,r.target_date,coalesce(r.created_at,now()),coalesce(r.updated_at,now()) from pg_catalog.jsonb_to_recordset(coalesce(payload->'savings_goals','[]'::jsonb)) as r(id text,name text,target_amount numeric,target_date date,created_at timestamptz,updated_at timestamptz);
  insert into public.savings_contributions(user_id,id,goal_id,wallet_id,amount,contribution_date,note,created_at)
  select owner_id,r.id,r.goal_id,r.wallet_id,r.amount,r.contribution_date,coalesce(r.note,''),coalesce(r.created_at,now()) from pg_catalog.jsonb_to_recordset(coalesce(payload->'savings_contributions','[]'::jsonb)) as r(id text,goal_id text,wallet_id text,amount numeric,contribution_date date,note text,created_at timestamptz);

  insert into public.fitness_profiles(user_id,goal_mode,experience,training_days_per_week,equipment,units,confirmed_18_or_older,hide_weight,created_at,updated_at)
  select owner_id,r.goal_mode,r.experience,r.training_days_per_week,r.equipment,r.units,coalesce(r.confirmed_18_or_older,false),coalesce(r.hide_weight,false),coalesce(r.created_at,now()),coalesce(r.updated_at,now()) from pg_catalog.jsonb_to_recordset(coalesce(payload->'fitness_profiles','[]'::jsonb)) as r(goal_mode text,experience text,training_days_per_week smallint,equipment text,units text,confirmed_18_or_older boolean,hide_weight boolean,created_at timestamptz,updated_at timestamptz);
  insert into public.custom_exercises(user_id,id,name,muscle_group,equipment,is_bodyweight,form_cues,substitutes,created_at)
  select owner_id,r.id,r.name,r.muscle_group,r.equipment,coalesce(r.is_bodyweight,false),coalesce(r.form_cues,'{}'::text[]),coalesce(r.substitutes,'{}'::text[]),coalesce(r.created_at,now()) from pg_catalog.jsonb_to_recordset(coalesce(payload->'custom_exercises','[]'::jsonb)) as r(id text,name text,muscle_group text,equipment text,is_bodyweight boolean,form_cues text[],substitutes text[],created_at timestamptz);
  insert into public.fitness_routines(user_id,id,name,notes,created_at,updated_at)
  select owner_id,r.id,r.name,coalesce(r.notes,''),coalesce(r.created_at,now()),coalesce(r.updated_at,now()) from pg_catalog.jsonb_to_recordset(coalesce(payload->'fitness_routines','[]'::jsonb)) as r(id text,name text,notes text,created_at timestamptz,updated_at timestamptz);
  insert into public.fitness_routine_exercises(user_id,id,routine_id,exercise_id,target_sets,min_reps,max_reps,target_weight,position,created_at)
  select owner_id,r.id,r.routine_id,r.exercise_id,r.target_sets,r.min_reps,r.max_reps,r.target_weight,coalesce(r.position,0),coalesce(r.created_at,now()) from pg_catalog.jsonb_to_recordset(coalesce(payload->'fitness_routine_exercises','[]'::jsonb)) as r(id text,routine_id text,exercise_id text,target_sets smallint,min_reps smallint,max_reps smallint,target_weight numeric,position smallint,created_at timestamptz);
  insert into public.fitness_plans(user_id,id,week_start_date,goal_mode,notes,created_at,updated_at)
  select owner_id,r.id,r.week_start_date,r.goal_mode,coalesce(r.notes,''),coalesce(r.created_at,now()),coalesce(r.updated_at,now()) from pg_catalog.jsonb_to_recordset(coalesce(payload->'fitness_plans','[]'::jsonb)) as r(id text,week_start_date date,goal_mode text,notes text,created_at timestamptz,updated_at timestamptz);
  insert into public.fitness_plan_days(user_id,id,plan_id,day_of_week,scheduled_date,name,exercises,is_skipped,position,created_at)
  select owner_id,r.id,r.plan_id,r.day_of_week,r.scheduled_date,r.name,coalesce(r.exercises,'[]'::jsonb),coalesce(r.is_skipped,false),coalesce(r.position,0),coalesce(r.created_at,now()) from pg_catalog.jsonb_to_recordset(coalesce(payload->'fitness_plan_days','[]'::jsonb)) as r(id text,plan_id text,day_of_week smallint,scheduled_date date,name text,exercises jsonb,is_skipped boolean,position smallint,created_at timestamptz);
  insert into public.fitness_workout_logs(user_id,id,plan_day_id,routine_id,name,workout_date,started_at,completed_at,notes,created_at)
  select owner_id,r.id,r.plan_day_id,r.routine_id,r.name,r.workout_date,r.started_at,r.completed_at,coalesce(r.notes,''),coalesce(r.created_at,now()) from pg_catalog.jsonb_to_recordset(coalesce(payload->'fitness_workout_logs','[]'::jsonb)) as r(id text,plan_day_id text,routine_id text,name text,workout_date date,started_at timestamptz,completed_at timestamptz,notes text,created_at timestamptz);
  insert into public.fitness_set_logs(user_id,id,workout_log_id,exercise_id,set_number,reps,weight,completed,is_pr,created_at)
  select owner_id,r.id,r.workout_log_id,r.exercise_id,r.set_number,r.reps,r.weight,coalesce(r.completed,true),coalesce(r.is_pr,false),coalesce(r.created_at,now()) from pg_catalog.jsonb_to_recordset(coalesce(payload->'fitness_set_logs','[]'::jsonb)) as r(id text,workout_log_id text,exercise_id text,set_number smallint,reps smallint,weight numeric,completed boolean,is_pr boolean,created_at timestamptz);
  insert into public.fitness_weekly_checkins(user_id,id,week_start_date,workouts_completed,workouts_planned,energy,sleep,hunger,soreness,weight,adjustments,created_at)
  select owner_id,r.id,r.week_start_date,r.workouts_completed,r.workouts_planned,r.energy,r.sleep,r.hunger,r.soreness,r.weight,coalesce(r.adjustments,'[]'::jsonb),coalesce(r.created_at,now()) from pg_catalog.jsonb_to_recordset(coalesce(payload->'fitness_weekly_checkins','[]'::jsonb)) as r(id text,week_start_date date,workouts_completed smallint,workouts_planned smallint,energy smallint,sleep smallint,hunger smallint,soreness smallint,weight numeric,adjustments jsonb,created_at timestamptz);
end $$;
revoke all on function public.import_life_tracker_data(jsonb) from public, anon;
grant execute on function public.import_life_tracker_data(jsonb) to authenticated;
