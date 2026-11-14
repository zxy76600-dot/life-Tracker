-- Additive finance upgrade. Review and apply separately; this file does not
-- modify the connected Supabase project.

create table if not exists public.wallets (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  opening_balance numeric(12, 2) not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  check (length(btrim(name)) > 0)
);

create table if not exists public.recurring_transaction_series (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(12, 2) not null check (amount > 0),
  category text not null,
  description text not null default '',
  wallet_id text,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  starts_on date not null,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  check (ends_on is null or ends_on >= starts_on),
  foreign key (user_id, wallet_id) references public.wallets(user_id, id)
);

alter table public.transactions
  add column if not exists wallet_id text,
  add column if not exists recurring_series_id text,
  add column if not exists split_total_amount numeric(12, 2);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_amount_positive_check') then
    alter table public.transactions add constraint transactions_amount_positive_check check (amount > 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_split_total_positive_check') then
    alter table public.transactions add constraint transactions_split_total_positive_check check (split_total_amount is null or split_total_amount > 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_user_wallet_fkey') then
    alter table public.transactions add constraint transactions_user_wallet_fkey
      foreign key (user_id, wallet_id) references public.wallets(user_id, id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_user_series_fkey') then
    alter table public.transactions add constraint transactions_user_series_fkey
      foreign key (user_id, recurring_series_id) references public.recurring_transaction_series(user_id, id);
  end if;
end $$;

create table if not exists public.wallet_transfers (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  from_wallet_id text not null,
  to_wallet_id text not null,
  amount numeric(12, 2) not null check (amount > 0),
  transfer_date date not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  check (from_wallet_id <> to_wallet_id),
  foreign key (user_id, from_wallet_id) references public.wallets(user_id, id),
  foreign key (user_id, to_wallet_id) references public.wallets(user_id, id)
);

create table if not exists public.loans (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  direction text not null check (direction in ('lent', 'borrowed')),
  person text not null,
  amount numeric(12, 2) not null check (amount > 0),
  loan_date date not null,
  due_date date,
  note text not null default '',
  wallet_id text,
  linked_transaction_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  check (length(btrim(person)) > 0),
  foreign key (user_id, wallet_id) references public.wallets(user_id, id),
  foreign key (user_id, linked_transaction_id) references public.transactions(user_id, id)
);

create table if not exists public.loan_payments (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  loan_id text not null,
  wallet_id text,
  amount numeric(12, 2) not null check (amount > 0),
  payment_date date not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, loan_id) references public.loans(user_id, id) on delete cascade,
  foreign key (user_id, wallet_id) references public.wallets(user_id, id)
);

create table if not exists public.budgets (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  month_start date not null,
  category text not null,
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  check (month_start = date_trunc('month', month_start)::date),
  check (length(btrim(category)) > 0)
);

create table if not exists public.finance_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  currency text not null default 'INR' check (currency in ('INR', 'NPR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SGD', 'NZD', 'CHF', 'CNY', 'AED', 'BDT', 'PKR', 'ZAR')),
  overall_monthly_budget numeric(12, 2) check (overall_monthly_budget is null or overall_monthly_budget > 0),
  keyword_rules jsonb not null default '[]'::jsonb check (jsonb_typeof(keyword_rules) = 'array'),
  updated_at timestamptz not null default now()
);

create table if not exists public.savings_goals (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  target_amount numeric(12, 2) not null check (target_amount > 0),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  check (length(btrim(name)) > 0)
);

create table if not exists public.savings_contributions (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  goal_id text not null,
  wallet_id text not null,
  amount numeric(12, 2) not null check (amount > 0),
  contribution_date date not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, goal_id) references public.savings_goals(user_id, id) on delete cascade,
  foreign key (user_id, wallet_id) references public.wallets(user_id, id)
);

create index if not exists transactions_user_wallet_date_idx on public.transactions(user_id, wallet_id, transaction_date desc);
create unique index if not exists transactions_user_series_date_uidx on public.transactions(user_id, recurring_series_id, transaction_date) where recurring_series_id is not null;
create index if not exists finance_series_user_wallet_idx on public.recurring_transaction_series(user_id, wallet_id) where wallet_id is not null;
create index if not exists wallet_transfers_user_from_date_idx on public.wallet_transfers(user_id, from_wallet_id, transfer_date desc);
create index if not exists wallet_transfers_user_to_date_idx on public.wallet_transfers(user_id, to_wallet_id, transfer_date desc);
create index if not exists loans_user_wallet_idx on public.loans(user_id, wallet_id) where wallet_id is not null;
create index if not exists loans_user_linked_transaction_idx on public.loans(user_id, linked_transaction_id) where linked_transaction_id is not null;
create index if not exists loan_payments_user_loan_date_idx on public.loan_payments(user_id, loan_id, payment_date desc);
create index if not exists loan_payments_user_wallet_idx on public.loan_payments(user_id, wallet_id) where wallet_id is not null;
create unique index if not exists budgets_user_month_category_uidx on public.budgets(user_id, month_start, lower(category));
create index if not exists savings_contributions_user_goal_date_idx on public.savings_contributions(user_id, goal_id, contribution_date desc);
create index if not exists savings_contributions_user_wallet_idx on public.savings_contributions(user_id, wallet_id);

do $$
declare table_name text;
begin
  foreach table_name in array array['wallets','recurring_transaction_series','wallet_transfers','loans','loan_payments','budgets','finance_settings','savings_goals','savings_contributions'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=table_name and policyname=table_name || '_select_own') then
      execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name || '_select_own', table_name);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=table_name and policyname=table_name || '_insert_own') then
      execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name || '_insert_own', table_name);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=table_name and policyname=table_name || '_update_own') then
      execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name || '_update_own', table_name);
    end if;
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=table_name and policyname=table_name || '_delete_own') then
      execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name || '_delete_own', table_name);
    end if;
  end loop;
end $$;

-- Atomic repayment: serialize against other payments and enforce the balance.
create or replace function public.add_loan_payment(p_payment jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  loan_row public.loans%rowtype;
  paid numeric(12, 2);
  payment_amount numeric(12, 2) := (p_payment->>'amount')::numeric(12, 2);
begin
  if owner_id is null then raise exception 'Sign in before recording a repayment.' using errcode = '28000'; end if;
  if payment_amount is null or payment_amount <= 0 then raise exception 'Repayment amount must be greater than zero.'; end if;
  select * into loan_row from public.loans where user_id=owner_id and id=p_payment->>'loan_id' for update;
  if not found then raise exception 'Loan not found.'; end if;
  select coalesce(sum(amount), 0) into paid from public.loan_payments where user_id=owner_id and loan_id=loan_row.id;
  if payment_amount > loan_row.amount - paid then raise exception 'Repayment cannot exceed the remaining loan amount.'; end if;
  insert into public.loan_payments(user_id,id,loan_id,wallet_id,amount,payment_date,note)
  values(owner_id,p_payment->>'id',loan_row.id,nullif(p_payment->>'wallet_id',''),payment_amount,(p_payment->>'payment_date')::date,coalesce(p_payment->>'note',''));
end $$;
revoke all on function public.add_loan_payment(jsonb) from public, anon;
grant execute on function public.add_loan_payment(jsonb) to authenticated;

-- Create the user's expense and each friend receivable as one atomic action.
create or replace function public.create_split_expense(p_transaction jsonb, p_shares jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  own_amount numeric(12, 2) := (p_transaction->>'amount')::numeric(12, 2);
  bill_total numeric(12, 2) := coalesce((p_transaction->>'split_total_amount')::numeric(12, 2), own_amount);
  share_total numeric(12, 2);
begin
  if owner_id is null then raise exception 'Sign in before saving a split expense.' using errcode = '28000'; end if;
  if jsonb_typeof(p_shares) <> 'array' then raise exception 'Split shares must be a list.'; end if;
  select coalesce(sum((item->>'amount')::numeric(12, 2)), 0) into share_total from pg_catalog.jsonb_array_elements(p_shares) item;
  if own_amount <= 0 or bill_total <= 0 or share_total + own_amount <> bill_total then
    raise exception 'Your share and friend shares must add up to the bill total.';
  end if;
  insert into public.transactions(user_id,id,type,amount,category,description,transaction_date,wallet_id,split_total_amount)
  values(owner_id,p_transaction->>'id','expense',own_amount,p_transaction->>'category',coalesce(p_transaction->>'description',''),
    (p_transaction->>'transaction_date')::date,nullif(p_transaction->>'wallet_id',''),bill_total);
  insert into public.loans(user_id,id,direction,person,amount,loan_date,due_date,note,wallet_id,linked_transaction_id)
  select owner_id,item->>'id','lent',btrim(item->>'person'),(item->>'amount')::numeric(12, 2),
    (p_transaction->>'transaction_date')::date,nullif(item->>'due_date',''),'',nullif(p_transaction->>'wallet_id',''),p_transaction->>'id'
  from pg_catalog.jsonb_array_elements(p_shares) item;
end $$;
revoke all on function public.create_split_expense(jsonb, jsonb) from public, anon;
grant execute on function public.create_split_expense(jsonb, jsonb) to authenticated;

-- Extend the existing atomic import without removing any To-Do support.
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
    or exists (select 1 from public.savings_contributions where user_id=owner_id) then
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
end $$;
revoke all on function public.import_life_tracker_data(jsonb) from public, anon;
grant execute on function public.import_life_tracker_data(jsonb) to authenticated;
