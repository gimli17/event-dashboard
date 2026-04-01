-- Bold Conversations topics and founder selections
-- Run this in Supabase SQL Editor

create table bc_topics (
  id text primary key,
  session_id text references events(id) on delete cascade not null,
  track text not null check (track in ('health', 'culture', 'tech')),
  title text not null,
  description text,
  facilitator text,
  expert_guest text,
  capacity int default 15,
  created_at timestamptz default now()
);

create table bc_selections (
  id uuid default gen_random_uuid() primary key,
  topic_id text references bc_topics(id) on delete cascade not null,
  founder_name text not null,
  selected_at timestamptz default now(),
  unique(topic_id, founder_name)
);

alter table bc_topics enable row level security;
alter table bc_selections enable row level security;

create policy "Public read" on bc_topics for select using (true);
create policy "Public write" on bc_topics for all using (true);
create policy "Public read" on bc_selections for select using (true);
create policy "Public write" on bc_selections for all using (true);

-- Seed topics for all 4 sessions (3 tracks each = 12 topics)
insert into bc_topics (id, session_id, track, title, description) values
  ('ws1-health', 'wed-bold-s1', 'health', 'Founder Burnout & Recovery', 'Strategies for maintaining mental and physical health while scaling'),
  ('ws1-culture', 'wed-bold-s1', 'culture', 'Building Inclusive Teams', 'How to create cultures that attract and retain diverse talent'),
  ('ws1-tech', 'wed-bold-s1', 'tech', 'AI in Early-Stage Companies', 'Practical applications of AI for startups with limited resources'),

  ('ws2-health', 'wed-bold-s2', 'health', 'Work-Life Integration', 'Moving beyond balance to sustainable integration of work and life'),
  ('ws2-culture', 'wed-bold-s2', 'culture', 'Community-Led Growth', 'Leveraging community as a growth engine and feedback loop'),
  ('ws2-tech', 'wed-bold-s2', 'tech', 'Data Privacy & Trust', 'Building products that respect user privacy while delivering value'),

  ('ts3-health', 'thu-bold-s3', 'health', 'Resilience Under Pressure', 'Mental frameworks for navigating high-stakes decisions'),
  ('ts3-culture', 'thu-bold-s3', 'culture', 'Storytelling & Brand Identity', 'Using narrative to differentiate and connect with audiences'),
  ('ts3-tech', 'thu-bold-s3', 'tech', 'Scaling Infrastructure', 'When and how to invest in technical infrastructure ahead of growth'),

  ('ts4-health', 'thu-bold-s4', 'health', 'Mindful Leadership', 'Practices for leading with presence and intention'),
  ('ts4-culture', 'thu-bold-s4', 'culture', 'Impact Beyond Profit', 'Building businesses that create lasting social and environmental impact'),
  ('ts4-tech', 'thu-bold-s4', 'tech', 'Emerging Platforms & Distribution', 'Identifying the next wave of platforms before they go mainstream');
