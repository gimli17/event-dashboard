-- Track which master tasks have been exported to Notion
-- Run this in Supabase SQL Editor

alter table master_tasks add column notion_page_url text;
