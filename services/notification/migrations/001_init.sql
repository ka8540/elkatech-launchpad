create schema if not exists notification;

create table if not exists notification.deliveries (
  id uuid primary key,
  event_id uuid not null unique,
  event_type text not null,
  recipient_email text not null,
  subject text not null,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  attempts integer not null default 1,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
