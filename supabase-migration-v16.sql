-- Add "low" priority option
-- Run this in Supabase SQL Editor

alter table master_tasks drop constraint if exists master_tasks_priority_check;
alter table master_tasks add constraint master_tasks_priority_check check (priority in ('ultra-high', 'high', 'medium', 'low', 'backlog'));

-- Move everything currently in backlog to low
update master_tasks set priority = 'low' where priority = 'backlog' and deleted_at is null;
