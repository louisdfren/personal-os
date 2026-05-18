-- Phase 4 — Google Calendar OAuth tokens + synced events.

create table public.calendar_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_email text,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calendar_tokens enable row level security;

create policy "Users can view their own calendar tokens"
  on public.calendar_tokens for select using (auth.uid() = user_id);
create policy "Users can insert their own calendar tokens"
  on public.calendar_tokens for insert with check (auth.uid() = user_id);
create policy "Users can update their own calendar tokens"
  on public.calendar_tokens for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own calendar tokens"
  on public.calendar_tokens for delete using (auth.uid() = user_id);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  google_calendar_id text not null,
  google_calendar_name text,
  google_event_id text not null,
  summary text,
  description text,
  location text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  status text,
  html_link text,
  organizer_email text,
  attendees jsonb,
  event_updated_at timestamptz,
  raw jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, google_calendar_id, google_event_id)
);

create index calendar_events_user_start_idx
  on public.calendar_events (user_id, start_at desc);

alter table public.calendar_events enable row level security;

create policy "Users can view their own calendar events"
  on public.calendar_events for select using (auth.uid() = user_id);
create policy "Users can insert their own calendar events"
  on public.calendar_events for insert with check (auth.uid() = user_id);
create policy "Users can update their own calendar events"
  on public.calendar_events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own calendar events"
  on public.calendar_events for delete using (auth.uid() = user_id);
