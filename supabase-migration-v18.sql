-- Add parent_id for threaded comments on board
-- Run this in Supabase SQL Editor

alter table comments add column parent_id uuid references comments(id) on delete cascade;
