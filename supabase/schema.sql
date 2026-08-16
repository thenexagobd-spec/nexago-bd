-- NexaGo Supabase schema
-- Run this in Supabase Dashboard → SQL Editor (project: kylilwhfwstqgqcwcffh)

create table if not exists nexago_stores (
  key text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists nexago_security (
  name text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Store payloads can be large; jsonb handles that fine.
alter table nexago_stores enable row level security;
alter table nexago_security enable row level security;

-- Only the service role (server-side) reads/writes these tables.
create policy "service role only" on nexago_stores for all using (auth.role() = 'service_role');
create policy "service role only" on nexago_security for all using (auth.role() = 'service_role');
