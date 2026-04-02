-- Add deadline to event_tasks
-- Run this in Supabase SQL Editor

alter table event_tasks add column deadline text;
alter table event_tasks add column assigned_at timestamptz;
