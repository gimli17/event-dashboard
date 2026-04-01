-- Add sponsor slot tracking to events
-- Run this in Supabase SQL Editor

alter table events add column sponsor_slots_total int default 0;
alter table events add column sponsor_slots_filled int default 0;

-- Set Bold Conversations slots: each session has ~4 slots (topics), but you mentioned 15 total
-- We'll spread them: 4 per session = 16, or we can set total at the series level
-- For now, set each session to have slots that add up to 15 total
update events set sponsor_slots_total = 4, sponsor_slots_filled = 0 where id = 'wed-bold-s1';
update events set sponsor_slots_total = 4, sponsor_slots_filled = 0 where id = 'wed-bold-s2';
update events set sponsor_slots_total = 4, sponsor_slots_filled = 0 where id = 'thu-bold-s3';
update events set sponsor_slots_total = 3, sponsor_slots_filled = 0 where id = 'thu-bold-s4';
