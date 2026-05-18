-- Phase 2 MVP — meals table for manual food logging.

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  eaten_at timestamptz not null default now(),
  name text not null,
  calories integer not null check (calories >= 0),
  protein_g numeric check (protein_g is null or protein_g >= 0),
  carbs_g numeric check (carbs_g is null or carbs_g >= 0),
  fat_g numeric check (fat_g is null or fat_g >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index meals_user_eaten_idx on public.meals (user_id, eaten_at desc);

alter table public.meals enable row level security;

create policy "Users can view their own meals"
  on public.meals for select
  using (auth.uid() = user_id);

create policy "Users can insert their own meals"
  on public.meals for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own meals"
  on public.meals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own meals"
  on public.meals for delete
  using (auth.uid() = user_id);
