-- Add event_id, task_id, and type columns to comments table
-- Run this in Supabase SQL Editor

alter table comments add column event_id text references events(id) on delete set null;
alter table comments add column task_id text references event_tasks(id) on delete set null;
alter table comments add column type text default 'chat' check (type in ('chat', 'task-update'));
