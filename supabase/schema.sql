-- =========================================================================
-- Training Programs App — Supabase schema
-- Run this once in Supabase Studio: Project > SQL Editor > New query > Run
-- =========================================================================
-- All tables are created first, then all RLS policies are added at the end.
-- (Policies on `programs`/`workouts`/`exercises` reference `assignments`,
-- so `assignments` must exist before any policy is created.)
-- =========================================================================

-- ---------------------------------------------------------------------
-- 1. PROFILES
-- One row per auth user. Created automatically on signup via trigger.
-- role is 'user' by default; promote someone to 'admin' manually (see
-- bottom of this file) after they've signed up once.
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. PROGRAMS  (a named training program, e.g. "12-Week Strength Block")
-- ---------------------------------------------------------------------
create table if not exists programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. WORKOUTS  (a day/session within a program, e.g. "Day 1 - Push")
-- ---------------------------------------------------------------------
create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  name text not null,
  day_order int not null default 0,
  notes text
);

-- ---------------------------------------------------------------------
-- 4. EXERCISES  (a single exercise within a workout)
-- ---------------------------------------------------------------------
create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references workouts(id) on delete cascade,
  name text not null,
  sets int,
  reps text,          -- text so it can hold things like "8-10" or "AMRAP"
  target_weight text, -- text so it can hold "bodyweight" or "60kg"
  rest_seconds int,
  order_index int not null default 0,
  notes text
);

-- ---------------------------------------------------------------------
-- 5. ASSIGNMENTS  (which user is assigned which program)
-- ---------------------------------------------------------------------
create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references programs(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  assigned_by uuid references profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  start_date date default current_date,
  unique (program_id, user_id)
);

-- ---------------------------------------------------------------------
-- 6. LOGS  (a user's recorded performance for one exercise on one date)
-- ---------------------------------------------------------------------
create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  exercise_id uuid not null references exercises(id) on delete cascade,
  workout_id uuid references workouts(id) on delete cascade,
  log_date date not null default current_date,
  sets_completed int,
  reps_completed text,
  weight_used text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Indexes for the joins/filters the app does most often
-- ---------------------------------------------------------------------
create index if not exists idx_workouts_program on workouts(program_id);
create index if not exists idx_exercises_workout on exercises(workout_id);
create index if not exists idx_assignments_user on assignments(user_id);
create index if not exists idx_assignments_program on assignments(program_id);
create index if not exists idx_logs_user on logs(user_id);
create index if not exists idx_logs_exercise on logs(exercise_id);

-- ---------------------------------------------------------------------
-- Signup trigger: auto-create a profile row whenever someone signs up
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper used inside policies to check the caller's role without recursion.
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- =========================================================================
-- ROW LEVEL SECURITY — enabled + policies for every table, now that all
-- tables referenced by any policy already exist.
-- =========================================================================

alter table profiles enable row level security;
alter table programs enable row level security;
alter table workouts enable row level security;
alter table exercises enable row level security;
alter table assignments enable row level security;
alter table logs enable row level security;

-- profiles ---------------------------------------------------------------
create policy "profiles: read own" on profiles
  for select using (auth.uid() = id);

create policy "profiles: admin reads all" on profiles
  for select using (public.is_admin());

create policy "profiles: user updates own name" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id and role = (select role from profiles where id = auth.uid()));

create policy "profiles: admin updates any" on profiles
  for update using (public.is_admin());

-- programs -----------------------------------------------------------------
create policy "programs: admin full access" on programs
  for all using (public.is_admin()) with check (public.is_admin());

create policy "programs: assigned users can read" on programs
  for select using (
    exists (
      select 1 from assignments a
      where a.program_id = programs.id and a.user_id = auth.uid()
    )
  );

-- workouts -----------------------------------------------------------------
create policy "workouts: admin full access" on workouts
  for all using (public.is_admin()) with check (public.is_admin());

create policy "workouts: assigned users can read" on workouts
  for select using (
    exists (
      select 1 from assignments a
      where a.program_id = workouts.program_id and a.user_id = auth.uid()
    )
  );

-- exercises ------------------------------------------------------------------
create policy "exercises: admin full access" on exercises
  for all using (public.is_admin()) with check (public.is_admin());

create policy "exercises: assigned users can read" on exercises
  for select using (
    exists (
      select 1 from workouts w
      join assignments a on a.program_id = w.program_id
      where w.id = exercises.workout_id and a.user_id = auth.uid()
    )
  );

-- assignments ----------------------------------------------------------------
create policy "assignments: admin full access" on assignments
  for all using (public.is_admin()) with check (public.is_admin());

create policy "assignments: user reads own" on assignments
  for select using (auth.uid() = user_id);

-- logs -------------------------------------------------------------------------
create policy "logs: user full access to own" on logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "logs: admin reads all" on logs
  for select using (public.is_admin());

-- =========================================================================
-- AFTER RUNNING THIS FILE:
-- 1. Sign up in the app once with the account you want to be the admin.
-- 2. In Supabase Studio > Table Editor > profiles, find that row and
--    change its "role" column from 'user' to 'admin'. (Or run:)
--
--    update profiles set role = 'admin' where email = 'you@example.com';
--
-- 3. In Authentication > Providers, Email is enabled by default. If you
--    don't want a public "confirm your email" step while testing, you can
--    turn off "Confirm email" under Authentication > Providers > Email.
-- =========================================================================
