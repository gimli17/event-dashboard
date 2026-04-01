-- Make session_id nullable so topics can exist without session assignment
-- Run this in Supabase SQL Editor

alter table bc_topics alter column session_id drop not null;

-- Clear session assignments — topics are unassigned for now
update bc_topics set session_id = null;
