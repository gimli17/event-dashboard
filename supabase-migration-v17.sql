-- Add viewed_by tracking for bulletin board
-- Run this in Supabase SQL Editor

alter table comments add column viewed_by jsonb default '[]';
alter table comments add column tagged jsonb default '[]';
