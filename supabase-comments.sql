create table comments (
  id uuid default gen_random_uuid() primary key,
  author text not null,
  message text not null,
  created_at timestamptz default now()
);
alter table comments enable row level security;
create policy "Public read access" on comments for select using (true);
create policy "Public write access" on comments for insert with check (true);
