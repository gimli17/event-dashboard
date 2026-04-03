-- Activity log table
-- Run this in Supabase SQL Editor

create table activity_log (
  id uuid default gen_random_uuid() primary key,
  actor text not null,
  action text not null,
  target_type text,
  target_id text,
  target_title text,
  details text,
  created_at timestamptz default now()
);

alter table activity_log enable row level security;
create policy "Public read" on activity_log for select using (true);
create policy "Public write" on activity_log for insert with check (true);

create index idx_activity_log_created on activity_log(created_at desc);
