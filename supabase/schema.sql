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
drop policy if exists "service role only" on nexago_stores;
drop policy if exists "service role only" on nexago_security;
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
drop policy if exists "service role only" on nexago_identities;
create policy "service role only" on nexago_identities for all using (auth.role() = 'service_role');

-- A role account may only exist once.
create unique index if not exists nexago_identities_role_id_uniq on nexago_identities (role, identity_id);
-- One phone globally (normalized, digits only / 11-digit BD format).
create unique index if not exists nexago_identities_phone_uniq on nexago_identities (phone_norm) where phone_norm <> '';
-- One Gmail globally (normalized, trimmed lowercase).
create unique index if not exists nexago_identities_email_uniq on nexago_identities (email_norm) where email_norm <> '';

-- Unified ID + Permanent Cloud: normalized per-customer records survive across
-- devices and browsers. The permanent ID (NEX...) is the row key; wallet balance
-- and history are separate rows so a wiped browser never loses money data.
create table if not exists nexago_customers (
  customer_id text primary key,
  name text default '',
  phone text default '',
  phone_norm text default '',
  email text default '',
  email_norm text default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists nexago_customers_phone_uniq on nexago_customers (phone_norm) where phone_norm <> '';
create unique index if not exists nexago_customers_email_uniq on nexago_customers (email_norm) where email_norm <> '';

create table if not exists nexago_wallets (
  customer_id text primary key references nexago_customers(customer_id) on delete cascade,
  balance numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists nexago_wallet_txns (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null references nexago_customers(customer_id) on delete cascade,
  txn_ref text default '',
  type text not null,
  amount numeric not null default 0,
  status text not null default 'Completed',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists nexago_wallet_txns_customer_idx on nexago_wallet_txns (customer_id, created_at desc);

-- Immutable append-only audit trail. Nothing is ever updated or deleted here —
-- every action (login, approval, staff action, order change) becomes one row.
create table if not exists nexago_audit_log (
  id uuid primary key default gen_random_uuid(),
  platform_key text not null default 'nexago-main',
  audit_id text not null,
  actor text default '',
  role text default '',
  action text not null,
  store_id text default '',
  branch_id text default '',
  ip text default '',
  device text default '',
  reason text default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists nexago_audit_log_audit_id_uniq on nexago_audit_log (audit_id);

alter table nexago_customers enable row level security;
alter table nexago_wallets enable row level security;
alter table nexago_wallet_txns enable row level security;
alter table nexago_audit_log enable row level security;

drop policy if exists "service role only" on nexago_customers;
drop policy if exists "service role only" on nexago_wallets;
drop policy if exists "service role only" on nexago_wallet_txns;
drop policy if exists "service role only" on nexago_audit_log;
create policy "service role only" on nexago_customers for all using (auth.role() = 'service_role');
create policy "service role only" on nexago_wallets for all using (auth.role() = 'service_role');
create policy "service role only" on nexago_wallet_txns for all using (auth.role() = 'service_role');
create policy "service role only" on nexago_audit_log for all using (auth.role() = 'service_role');

-- Permanent encrypted document/file storage. Staff KYC files, store admin
-- documents, delivery proofs, receipts, PDF uploads and all other secure files
-- are mirrored here in addition to local encrypted relay files.
create table if not exists nexago_files (
  id uuid primary key default gen_random_uuid(),
  file_id text not null unique,
  platform_key text not null default 'nexago-main',
  owner_id text default '',
  role text default '',
  store_id text default '',
  branch_id text default '',
  name text default '',
  mime_type text default '',
  sha256 text default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists nexago_files_platform_idx on nexago_files (platform_key, created_at desc);
create index if not exists nexago_files_store_branch_idx on nexago_files (store_id, branch_id, created_at desc);

alter table nexago_files enable row level security;
drop policy if exists "service role only" on nexago_files;
create policy "service role only" on nexago_files for all using (auth.role() = 'service_role');
