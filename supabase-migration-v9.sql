-- Allow tasks without events (general tasks from chat)
-- Run this in Supabase SQL Editor

alter table event_tasks alter column event_id drop not null;
