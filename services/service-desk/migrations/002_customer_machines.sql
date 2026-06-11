-- Customer machines: one row per physical purchased/installed product owned
-- by one customer. Admin-controlled only — customers never insert or edit
-- these. A customer who owns three identical printers has three rows here,
-- each with its own unit label, site, and (admin-only) internal serial number.
--
-- customer_id is the auth.users id. We keep it as a bare uuid (no cross-schema
-- FK) to match the existing service_desk.requests.customer_id convention —
-- ownership is enforced in the application layer, consistent with the rest of
-- this codebase's microservice boundaries.

create table if not exists service_desk.customer_machines (
  id uuid primary key,
  customer_id uuid not null,
  product_id text not null,
  -- Snapshot of the catalog product at assignment time so the label/category
  -- stays stable even if the catalog entry later changes or is removed.
  product_snapshot jsonb not null,
  display_label text not null,
  unit_number text,
  -- Admin/engineer-only. Never returned to the customer-facing machine list
  -- or the customer Create Request form.
  internal_serial_number text,
  site_name text,
  site_location text not null,
  contact_phone text,
  purchase_date date,
  install_date date,
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_machines_customer_idx
  on service_desk.customer_machines (customer_id);
create index if not exists customer_machines_product_idx
  on service_desk.customer_machines (product_id);
create index if not exists customer_machines_status_idx
  on service_desk.customer_machines (status);
create index if not exists customer_machines_customer_status_idx
  on service_desk.customer_machines (customer_id, status);
