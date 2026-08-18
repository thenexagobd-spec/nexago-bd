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

-- Single Account Rule: every real-world identity (phone / Gmail) may belong to
-- exactly one platform account across ALL stores. Server-side registration and
-- signup check this registry before creating an account, so a customer cannot
-- re-register with a phone/Gmail already claimed by another customer, a driver,
-- a store admin, or a staff member.
create table if not exists nexago_identities (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  platform_key text not null default 'nexago-main',
  identity_id text not null,
  name text default '',
  phone text default '',
  phone_norm text default '',
  email text default '',
  email_norm text default '',
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table nexago_identities enable row level security;
create policy "service role only" on nexago_identities for all using (auth.role() = 'service_role');

-- A role account may only exist once.
create unique index if not exists nexago_identities_role_id_uniq on nexago_identities (role, identity_id);
-- One phone globally (normalized, digits only / 11-digit BD format).
create unique index if not exists nexago_identities_phone_uniq on nexago_identities (phone_norm) where phone_norm <> '';
-- One Gmail globally (normalized, trimmed lowercase).
create unique index if not exists nexago_identities_email_uniq on nexago_identities (email_norm) where email_norm <> '';
