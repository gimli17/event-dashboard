-- Add memo fields for review workflow
-- Run this in Supabase SQL Editor

alter table master_tasks add column update_to_dan text;
alter table master_tasks add column dan_feedback text;
