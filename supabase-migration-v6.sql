-- Master task manager tables
-- Run this in Supabase SQL Editor

create table master_tasks (
  id text primary key,
  title text not null,
  assignee text,
  priority text default 'medium' check (priority in ('ultra-high', 'high', 'medium', 'backlog')),
  status text default 'not-started' check (status in ('not-started', 'in-progress', 'blocked', 'complete')),
  deadline text,
  current_status text,
  overview text,
  action_items text,
  dan_comments text,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table master_task_comments (
  id uuid default gen_random_uuid() primary key,
  task_id text references master_tasks(id) on delete cascade not null,
  author text not null,
  message text not null,
  created_at timestamptz default now()
);

alter table master_tasks enable row level security;
alter table master_task_comments enable row level security;

create policy "Public read" on master_tasks for select using (true);
create policy "Public write" on master_tasks for all using (true);
create policy "Public read" on master_task_comments for select using (true);
create policy "Public write" on master_task_comments for all using (true);

create index idx_master_task_comments_task on master_task_comments(task_id);
