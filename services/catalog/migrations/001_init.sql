create schema if not exists catalog;

create table if not exists catalog.categories (
  id text primary key,
  slug text not null unique,
  route_path text not null unique,
  name text not null,
  intro text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists catalog.products (
  id text primary key,
  category_id text not null references catalog.categories(id) on delete cascade,
  category_slug text not null,
  slug text not null unique,
  name text not null,
  price_display text not null,
  brochure_url text,
  images jsonb not null default '[]'::jsonb,
  specs jsonb not null default '[]'::jsonb,
  highlights jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
