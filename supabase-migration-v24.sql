-- Add a 'for_daily' flag so items can be hand-picked for The Daily
-- Run this in Supabase SQL Editor

alter table master_tasks add column for_daily boolean default false;
alter table daily_priorities add column for_daily boolean default false;

create index master_tasks_for_daily_idx on master_tasks (for_daily) where for_daily = true and deleted_at is null;
create index daily_priorities_for_daily_idx on daily_priorities (for_daily) where for_daily = true and deleted_at is null;
