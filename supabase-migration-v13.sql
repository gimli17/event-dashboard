-- Add checklist field for Dan's review items
-- Run this in Supabase SQL Editor

alter table master_tasks add column dan_checklist jsonb default '[]';
