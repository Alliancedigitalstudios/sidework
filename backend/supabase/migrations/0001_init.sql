-- Opt-in backend: exists only for Plaid. RLS on every table. No shifts/tips ever stored here.
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(), tier text default 'free', comp boolean default false, last_seen_at timestamptz default now()
);
create table if not exists plaid_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
  item_id text unique not null, access_token_enc bytea not null, key_id text not null, cursor text,
  institution text, status text default 'active', last_sync_at timestamptz, created_at timestamptz default now()
);
create table if not exists synced_deposits (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade,
  item_id text not null, plaid_txn_id text unique not null, date date not null, amount numeric(12,2) not null,
  pending boolean default false, account_mask text, created_at timestamptz default now()
);
create table if not exists audit_events (
  id bigserial primary key, user_id uuid references users(id) on delete set null, event text not null, ts timestamptz default now()
);
alter table users enable row level security;
alter table plaid_items enable row level security;
alter table synced_deposits enable row level security;
alter table audit_events enable row level security;
create policy "own user" on users for select using (auth.uid() = id);
create policy "own deposits" on synced_deposits for select using (auth.uid() = user_id);
create policy "own audit" on audit_events for select using (auth.uid() = user_id);
-- plaid_items: no client access at all; only service role inside Edge Functions.
