create schema if not exists service_desk;

create table if not exists service_desk.requests (
  id uuid primary key,
  request_number text not null unique,
  customer_id uuid not null,
  customer_email text not null,
  product_id text not null,
  product_snapshot jsonb not null,
  subject text not null,
  description text not null,
  contact_phone text not null,
  site_location text not null,
  serial_number text,
  priority text not null check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null check (status in ('new', 'triaged', 'assigned', 'in_progress', 'waiting_for_customer', 'resolved', 'closed')),
  assigned_engineer_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists service_desk.request_messages (
  id uuid primary key,
  request_id uuid not null references service_desk.requests(id) on delete cascade,
  author_id uuid not null,
  author_role text not null check (author_role in ('customer', 'engineer', 'admin')),
  visibility text not null check (visibility in ('customer_visible', 'internal_note')),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists service_desk.request_history (
  id uuid primary key,
  request_id uuid not null references service_desk.requests(id) on delete cascade,
  actor_id uuid not null,
  actor_role text not null check (actor_role in ('customer', 'engineer', 'admin')),
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists service_desk.outbox (
  id uuid primary key,
  aggregate_type text not null,
  aggregate_id text not null,
  event_type text not null,
  payload jsonb not null,
  occurred_at timestamptz not null default now(),
  processed_at timestamptz
);
