-- Phase 3b — daily macros targets per user.

create table public.macros_targets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_calories integer not null check (daily_calories >= 0),
  protein_g numeric not null check (protein_g >= 0),
  carbs_g numeric not null check (carbs_g >= 0),
  fat_g numeric not null check (fat_g >= 0),
  updated_at timestamptz not null default now()
);

alter table public.macros_targets enable row level security;

create policy "Users can view their own macros targets"
  on public.macros_targets for select using (auth.uid() = user_id);
create policy "Users can insert their own macros targets"
  on public.macros_targets for insert with check (auth.uid() = user_id);
create policy "Users can update their own macros targets"
  on public.macros_targets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own macros targets"
  on public.macros_targets for delete using (auth.uid() = user_id);
