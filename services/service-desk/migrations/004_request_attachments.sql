-- Photo/video evidence attached to a service request. Only metadata + the R2
-- object key live in Postgres; the bytes themselves are stored in Cloudflare
-- R2. The public/signed URL is derived from object_key at read time, never
-- persisted, so rotating the bucket or its base URL needs no data migration.

create table if not exists service_desk.request_attachments (
  id uuid primary key,
  request_id uuid not null references service_desk.requests(id) on delete cascade,
  uploaded_by uuid not null,
  object_key text not null unique,
  file_name text not null,
  content_type text not null,
  size_bytes bigint not null,
  kind text not null check (kind in ('image', 'video')),
  created_at timestamptz not null default now()
);

create index if not exists request_attachments_request_idx
  on service_desk.request_attachments (request_id);
