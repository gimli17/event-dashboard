-- Add soft delete to master_tasks
-- Run this in Supabase SQL Editor

alter table master_tasks add column deleted_at timestamptz;
