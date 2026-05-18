-- Phase 3 — Whoop OAuth tokens + per-endpoint data tables.
-- Schema mirrors Whoop v2 API response shapes (see whoopopenapi.json).
-- Each data table stores extracted columns for the dashboard plus the raw
-- payload as jsonb so future fields can be read without a migration.

-- Tokens: one row per Supabase user.

create table public.whoop_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  whoop_user_id bigint,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.whoop_tokens enable row level security;

create policy "Users can view their own whoop tokens"
  on public.whoop_tokens for select
  using (auth.uid() = user_id);

create policy "Users can insert their own whoop tokens"
  on public.whoop_tokens for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own whoop tokens"
  on public.whoop_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own whoop tokens"
  on public.whoop_tokens for delete
  using (auth.uid() = user_id);

-- Recovery: one per physiological cycle.

create table public.whoop_recovery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  whoop_cycle_id bigint not null,
  whoop_sleep_id uuid,
  score_state text not null,
  user_calibrating boolean,
  recovery_score numeric,
  resting_heart_rate numeric,
  hrv_rmssd_milli numeric,
  spo2_percentage numeric,
  skin_temp_celsius numeric,
  period_start timestamptz not null,
  whoop_created_at timestamptz not null,
  whoop_updated_at timestamptz not null,
  raw jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, whoop_cycle_id)
);

create index whoop_recovery_user_period_idx
  on public.whoop_recovery (user_id, period_start desc);

alter table public.whoop_recovery enable row level security;

create policy "Users can view their own whoop recovery"
  on public.whoop_recovery for select
  using (auth.uid() = user_id);

create policy "Users can insert their own whoop recovery"
  on public.whoop_recovery for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own whoop recovery"
  on public.whoop_recovery for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own whoop recovery"
  on public.whoop_recovery for delete
  using (auth.uid() = user_id);

-- Sleep: one row per sleep/nap activity.

create table public.whoop_sleep (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  whoop_sleep_id uuid not null,
  whoop_cycle_id bigint,
  nap boolean not null,
  score_state text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  timezone_offset text,
  sleep_performance_pct numeric,
  sleep_consistency_pct numeric,
  sleep_efficiency_pct numeric,
  respiratory_rate numeric,
  total_in_bed_ms bigint,
  total_awake_ms bigint,
  total_light_sleep_ms bigint,
  total_slow_wave_ms bigint,
  total_rem_sleep_ms bigint,
  sleep_cycle_count integer,
  disturbance_count integer,
  period_start timestamptz not null,
  whoop_created_at timestamptz not null,
  whoop_updated_at timestamptz not null,
  raw jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, whoop_sleep_id)
);

create index whoop_sleep_user_period_idx
  on public.whoop_sleep (user_id, period_start desc);

alter table public.whoop_sleep enable row level security;

create policy "Users can view their own whoop sleep"
  on public.whoop_sleep for select
  using (auth.uid() = user_id);

create policy "Users can insert their own whoop sleep"
  on public.whoop_sleep for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own whoop sleep"
  on public.whoop_sleep for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own whoop sleep"
  on public.whoop_sleep for delete
  using (auth.uid() = user_id);

-- Workouts.

create table public.whoop_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  whoop_workout_id uuid not null,
  sport_name text not null,
  score_state text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  timezone_offset text,
  strain numeric,
  average_heart_rate integer,
  max_heart_rate integer,
  kilojoule numeric,
  percent_recorded numeric,
  distance_meter numeric,
  altitude_gain_meter numeric,
  zone_zero_ms bigint,
  zone_one_ms bigint,
  zone_two_ms bigint,
  zone_three_ms bigint,
  zone_four_ms bigint,
  zone_five_ms bigint,
  period_start timestamptz not null,
  whoop_created_at timestamptz not null,
  whoop_updated_at timestamptz not null,
  raw jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, whoop_workout_id)
);

create index whoop_workouts_user_period_idx
  on public.whoop_workouts (user_id, period_start desc);

alter table public.whoop_workouts enable row level security;

create policy "Users can view their own whoop workouts"
  on public.whoop_workouts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own whoop workouts"
  on public.whoop_workouts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own whoop workouts"
  on public.whoop_workouts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own whoop workouts"
  on public.whoop_workouts for delete
  using (auth.uid() = user_id);

-- Cycles (physiological cycles ~ days).

create table public.whoop_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  whoop_cycle_id bigint not null,
  score_state text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  timezone_offset text,
  strain numeric,
  kilojoule numeric,
  average_heart_rate integer,
  max_heart_rate integer,
  period_start timestamptz not null,
  whoop_created_at timestamptz not null,
  whoop_updated_at timestamptz not null,
  raw jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, whoop_cycle_id)
);

create index whoop_cycles_user_period_idx
  on public.whoop_cycles (user_id, period_start desc);

alter table public.whoop_cycles enable row level security;

create policy "Users can view their own whoop cycles"
  on public.whoop_cycles for select
  using (auth.uid() = user_id);

create policy "Users can insert their own whoop cycles"
  on public.whoop_cycles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own whoop cycles"
  on public.whoop_cycles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own whoop cycles"
  on public.whoop_cycles for delete
  using (auth.uid() = user_id);
