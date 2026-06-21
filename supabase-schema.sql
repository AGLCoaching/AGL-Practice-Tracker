-- AGL Practice Tracker — Database Schema
-- Run this in Supabase > SQL Editor > New Query

-- USERS (coaches + admin)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  first_name text not null,
  last_name text not null,
  company_name text,
  logo_url text,
  phone text,
  timezone text not null default 'America/New_York',
  role text not null default 'coach' check (role in ('admin', 'coach')),
  is_active boolean not null default true,
  invited_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- CLIENTS
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.users(id),
  first_name text not null,
  last_name text not null,
  company_name text,
  title text,
  email text not null,
  phone text,
  timezone text not null default 'America/New_York',
  preferred_contact text not null default 'email' check (preferred_contact in ('sms', 'email')),
  notes text,
  dashboard_token uuid not null default gen_random_uuid() unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- PRACTICE METRICS
create table public.practice_metrics (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  coach_id uuid not null references public.users(id),
  name text not null,
  prompt_text text not null,
  unit_label text not null default 'Times per day',
  response_type text not null default 'number' check (response_type in ('number', 'yesno')),
  start_date date not null,
  end_date date not null,
  recurrence_value integer not null default 1,
  recurrence_unit text not null default 'days' check (recurrence_unit in ('days', 'weeks', 'months')),
  send_days text[],
  send_time time not null default '08:00',
  delivery_method text not null default 'email' check (delivery_method in ('sms', 'email')),
  has_goal boolean not null default false,
  goal_start numeric,
  goal_end numeric,
  goal_direction text check (goal_direction in ('meet_or_exceed', 'meet_or_below')),
  graph_min numeric,
  graph_max numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- PRACTICE LOGS
create table public.practice_logs (
  id uuid primary key default gen_random_uuid(),
  metric_id uuid not null references public.practice_metrics(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  logged_value numeric not null,
  logged_at timestamptz not null default now(),
  source text not null default 'manual' check (source in ('sms', 'email', 'manual')),
  raw_response text,
  created_at timestamptz not null default now()
);

-- REMINDER JOBS
create table public.reminder_jobs (
  id uuid primary key default gen_random_uuid(),
  metric_id uuid not null references public.practice_metrics(id) on delete cascade,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  response_received boolean not null default false,
  created_at timestamptz not null default now()
);

-- INDEXES
create index on public.clients(coach_id);
create index on public.practice_metrics(client_id);
create index on public.practice_metrics(coach_id);
create index on public.practice_logs(metric_id);
create index on public.practice_logs(client_id);
create index on public.reminder_jobs(metric_id);
create index on public.reminder_jobs(status, scheduled_for);

-- ROW LEVEL SECURITY
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.practice_metrics enable row level security;
alter table public.practice_logs enable row level security;
alter table public.reminder_jobs enable row level security;

-- RLS POLICIES: users
create policy "Users can read own profile" on public.users
  for select using (auth.uid() = id);

create policy "Admins can read all users" on public.users
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

create policy "Admins can insert users" on public.users
  for insert with check (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- RLS POLICIES: clients
create policy "Coaches see own clients" on public.clients
  for select using (
    coach_id = auth.uid() or
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create policy "Coaches insert own clients" on public.clients
  for insert with check (coach_id = auth.uid());

create policy "Coaches update own clients" on public.clients
  for update using (
    coach_id = auth.uid() or
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- Public access for client dashboard (by token)
create policy "Public dashboard by token" on public.clients
  for select using (true);

-- RLS POLICIES: practice_metrics
create policy "Coach or admin can access metrics" on public.practice_metrics
  for all using (
    coach_id = auth.uid() or
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- RLS POLICIES: practice_logs
create policy "Coach or admin can access logs" on public.practice_logs
  for all using (
    exists (
      select 1 from public.practice_metrics m
      where m.id = metric_id and (
        m.coach_id = auth.uid() or
        exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
      )
    )
  );

-- Public log insert (for email/sms responses — handled via API)
create policy "Public can insert logs" on public.practice_logs
  for insert with check (true);

-- RLS POLICIES: reminder_jobs
create policy "Coach or admin can access reminder jobs" on public.reminder_jobs
  for all using (
    exists (
      select 1 from public.practice_metrics m
      where m.id = metric_id and (
        m.coach_id = auth.uid() or
        exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
      )
    )
  );
