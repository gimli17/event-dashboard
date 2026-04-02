-- Add "review" status to master_tasks and event_tasks
-- Add links field to master_tasks
-- Run this in Supabase SQL Editor

-- Drop and recreate the check constraint on master_tasks
alter table master_tasks drop constraint if exists master_tasks_status_check;
alter table master_tasks add constraint master_tasks_status_check check (status in ('not-started', 'in-progress', 'review', 'blocked', 'complete'));

-- Drop and recreate the check constraint on event_tasks
alter table event_tasks drop constraint if exists event_tasks_status_check;
alter table event_tasks add constraint event_tasks_status_check check (status in ('not-started', 'in-progress', 'review', 'complete'));

-- Add links field
alter table master_tasks add column links text;
