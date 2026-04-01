-- Add event linking and week tracking to master tasks
-- Run this in Supabase SQL Editor

alter table master_tasks add column event_id text references events(id) on delete set null;
alter table master_tasks add column week_of text;

-- Set week for current tasks
update master_tasks set week_of = '2026-03-30' where deadline is not null;

-- Link master tasks to events
update master_tasks set event_id = 'weekend-lounge' where id = 'mt-13';
update master_tasks set event_id = 'fri-endeavor' where id = 'mt-23';
update master_tasks set event_id = 'wed-film' where id = 'mt-b1';
update master_tasks set event_id = 'fri-cocktail' where id = 'mt-17';
update master_tasks set event_id = 'thu-opening' where id = 'mt-6';
update master_tasks set event_id = 'fri-performing-arts' where id = 'mt-b6';
