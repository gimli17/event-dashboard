-- Daily priorities for per-person priorities dashboard
-- Run this in Supabase SQL Editor

create table daily_priorities (
  id text primary key,
  owner text not null,
  title text not null,
  stream text,
  master_task_id text,
  sort_order int default 0,
  completed boolean default false,
  priority text default 'medium' check (priority in ('ultra-high', 'high', 'medium', 'low', 'backlog')),
  deadline text,
  notes text,
  comments jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create index daily_priorities_owner_idx on daily_priorities (owner) where deleted_at is null;
create index daily_priorities_sort_idx on daily_priorities (owner, sort_order);

alter table daily_priorities enable row level security;
create policy "Public read" on daily_priorities for select using (true);
create policy "Public write" on daily_priorities for all using (true);
