-- Scheduled reprioritization table
-- Run this in Supabase SQL Editor

create table scheduled_reprioritizations (
  id uuid default gen_random_uuid() primary key,
  task_id text references master_tasks(id) on delete cascade not null,
  new_priority text not null check (new_priority in ('ultra-high', 'high', 'medium', 'backlog')),
  effective_date date not null,
  reason text,
  applied boolean default false,
  created_at timestamptz default now()
);

alter table scheduled_reprioritizations enable row level security;
create policy "Public read" on scheduled_reprioritizations for select using (true);
create policy "Public write" on scheduled_reprioritizations for all using (true);

-- Seed the scheduled changes from Dan's comments
insert into scheduled_reprioritizations (task_id, new_priority, effective_date, reason) values
  ('mt-6', 'ultra-high', '2026-04-06', 'Dan: very high priority after this week'),
  ('mt-15', 'high', '2026-04-06', 'Dan: Move to high next week'),
  ('mt-19', 'ultra-high', '2026-04-06', 'Dan: Move to Very High priority next week'),
  ('mt-23', 'high', '2026-04-06', 'Dan: High next week'),
  ('mt-21', 'high', '2026-04-13', 'Dan: will soon move to high'),
  ('mt-22', 'high', '2026-04-13', 'Dan: will soon move to high');
