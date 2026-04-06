create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key,
  email text not null unique,
  display_name text not null,
  role text not null check (role in ('customer', 'engineer', 'admin')),
  password_hash text,
  email_verified boolean not null default false,
  status text not null default 'active' check (status in ('active', 'invited')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists auth.sessions (
  id uuid primary key,
  token_hash text not null unique,
  csrf_token text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_agent text,
  ip_address text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists auth.tokens (
  id uuid primary key,
  token_hash text not null unique,
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  role text check (role in ('customer', 'engineer', 'admin')),
  purpose text not null check (purpose in ('verify_email', 'reset_password', 'invite_signup')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists auth.outbox (
  id uuid primary key,
  aggregate_type text not null,
  aggregate_id text not null,
  event_type text not null,
  payload jsonb not null,
  occurred_at timestamptz not null default now(),
  processed_at timestamptz
);
