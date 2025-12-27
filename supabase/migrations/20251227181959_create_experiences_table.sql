-- Create the experiences table
create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now() not null,
  code text not null,
  json_schema jsonb
);

-- Enable Row Level Security
alter table public.experiences enable row level security;

-- Allow anyone with a link (the ID) to read the experience
create policy "Allow public read access"
  on public.experiences for select
  to anon
  using (true);

-- Allow the app to save new experiences
create policy "Allow public insert access"
  on public.experiences for insert
  to anon
  with check (true);

