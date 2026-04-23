-- Add manual completion flag to milestones
-- Run this in Supabase SQL Editor

alter table milestones add column completed_at timestamptz;
