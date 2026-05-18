-- OAuth identity linking table
-- Links external OAuth providers (Google, etc.) to local auth.users

create table if not exists auth.oauth_identities (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_user_id text not null,
  provider_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_user_id)
);
