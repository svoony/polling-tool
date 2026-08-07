-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)

create table sessions (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  status text default 'waiting',
  created_at timestamp with time zone default now()
);

create table participants (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references sessions(id) on delete cascade not null,
  name text not null,
  joined_at timestamp with time zone default now()
);

-- Row Level Security
alter table sessions enable row level security;
alter table participants enable row level security;

create policy "Anyone can read sessions"    on sessions    for select using (true);
create policy "Anyone can create sessions"  on sessions    for insert with check (true);
-- Needed so the host can edit questions from the lobby screen
create policy "Anyone can update sessions"  on sessions    for update using (true) with check (true);
create policy "Anyone can read participants" on participants for select using (true);
create policy "Anyone can join"             on participants for insert with check (true);

-- Enable Realtime for the participants table
-- After running the SQL above, also go to:
-- Supabase Dashboard > Database > Replication > supabase_realtime publication
-- and toggle ON the "participants" table.
