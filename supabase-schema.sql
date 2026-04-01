-- Run this in the Supabase SQL Editor to create your tables

create table events (
  id text primary key,
  title text not null,
  day text not null,
  day_label text not null,
  date date not null,
  start_time text not null,
  end_time text not null,
  location text not null,
  description text,
  status text default 'planning' check (status in ('planning', 'in-progress', 'confirmed', 'complete')),
  access text not null check (access in ('founders', 'founders-premium', 'all-access', 'sponsor-private')),
  sponsorship_available boolean default false,
  sponsor_name text,
  time_block text not null,
  created_at timestamptz default now()
);

create table event_tasks (
  id text primary key,
  event_id text references events(id) on delete cascade not null,
  title text not null,
  category text not null check (category in ('venue', 'talent', 'sponsorship', 'logistics', 'marketing', 'production')),
  status text default 'not-started' check (status in ('not-started', 'in-progress', 'complete')),
  assignee text,
  notes text,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table events enable row level security;
alter table event_tasks enable row level security;

-- Allow public read access
create policy "Public read access" on events for select using (true);
create policy "Public read access" on event_tasks for select using (true);

-- Allow authenticated write access
create policy "Authenticated write access" on events for all using (true);
create policy "Authenticated write access" on event_tasks for all using (true);

-- Indexes
create index idx_event_tasks_event_id on event_tasks(event_id);
create index idx_events_date on events(date);
create index idx_events_day on events(day);
