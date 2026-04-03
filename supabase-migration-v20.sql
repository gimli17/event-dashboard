-- Social media workspace tables
-- Run this in Supabase SQL Editor

create table social_posts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  copy text not null,
  platform text not null check (platform in ('instagram', 'linkedin', 'tiktok', 'all')),
  status text default 'draft' check (status in ('draft', 'review', 'approved', 'posted')),
  author text,
  assigned_to text,
  content_links text,
  hashtags text,
  scheduled_date date,
  posted_date timestamptz,
  posted_url text,
  engagement_likes int default 0,
  engagement_comments int default 0,
  engagement_shares int default 0,
  engagement_views int default 0,
  notes text,
  dan_feedback text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table social_posts enable row level security;
create policy "Public read" on social_posts for select using (true);
create policy "Public write" on social_posts for all using (true);
