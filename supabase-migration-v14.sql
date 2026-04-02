-- Add created_by tracking
-- Run this in Supabase SQL Editor

alter table master_tasks add column created_by text;
