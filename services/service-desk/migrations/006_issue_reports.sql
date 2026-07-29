-- Customer-submitted issue reports: platform/service problems raised from the
-- portal and tracked by staff through new → working → resolved.
--
-- Privacy shape. `reporter_user_id` is the real owner key and is used ONLY for
-- authorization ("is this your report?") and for the audited admin lookup; it
-- is never selected into a staff-facing payload. Everything staff see is keyed
-- by `reporter_reference` — a keyed, one-way digest of the user id, stored on
-- the row rather than derived at read time so that (a) searching by reference
-- is an indexed equality match and (b) rotating REPORT_REFERENCE_SECRET does
-- not silently rewrite the references on historical reports.
--
-- `reporter_user_id` is deliberately nullable: when an account is permanently
-- deleted the id is nulled while the reference stays, so the report survives as
-- an anonymous artifact with no path back to a person.
--
-- The tables mirror the existing request_* shapes (history, notes/messages,
-- attachments) so the same transaction and audit conventions apply.

create table if not exists service_desk.issue_reports (
  id uuid primary key,
  report_number text not null unique,
  reporter_user_id uuid,
  reporter_reference text not null,
  title text not null,
  description text not null,
  exact_error text,
  steps_to_reproduce text,
  application_area text not null check (
    application_area in (
      'login', 'account', 'service_requests', 'attachments',
      'machines', 'dashboard', 'notifications', 'other'
    )
  ),
  severity text not null check (severity in ('low', 'medium', 'high', 'blocking')),
  status text not null default 'new' check (status in ('new', 'working', 'resolved')),
  assigned_user_id uuid,
  related_request_id uuid,
  related_machine_id uuid,
  -- Safe technical context only. Deliberately no raw user agent and no full
  -- URL: `route` is a scrubbed path and browser/os are coarse families.
  route text,
  browser text,
  operating_system text,
  app_version text,
  correlation_id text,
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists issue_reports_status_idx on service_desk.issue_reports (status);
create index if not exists issue_reports_severity_idx on service_desk.issue_reports (severity);
create index if not exists issue_reports_area_idx on service_desk.issue_reports (application_area);
create index if not exists issue_reports_assigned_idx on service_desk.issue_reports (assigned_user_id);
create index if not exists issue_reports_reporter_idx on service_desk.issue_reports (reporter_user_id);
create index if not exists issue_reports_reference_idx on service_desk.issue_reports (reporter_reference);
create index if not exists issue_reports_created_idx on service_desk.issue_reports (created_at desc);

-- Audit trail. Same shape as service_desk.request_history: every domain write
-- inserts its history row inside the caller's transaction, so a report can
-- never change without a matching record.
create table if not exists service_desk.issue_report_history (
  id uuid primary key,
  report_id uuid not null references service_desk.issue_reports(id) on delete cascade,
  actor_id uuid not null,
  actor_role text not null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists issue_report_history_report_idx
  on service_desk.issue_report_history (report_id, created_at);

-- Staff notes. `internal_note` rows are never included in any customer-facing
-- projection; `customer_visible` rows are the public staff response.
create table if not exists service_desk.issue_report_notes (
  id uuid primary key,
  report_id uuid not null references service_desk.issue_reports(id) on delete cascade,
  author_user_id uuid not null,
  author_role text not null,
  visibility text not null check (visibility in ('customer_visible', 'internal_note')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists issue_report_notes_report_idx
  on service_desk.issue_report_notes (report_id, created_at);

-- Evidence screenshots. Only the R2 object key is persisted; the read URL is
-- always a short-lived signed URL derived at read time.
create table if not exists service_desk.issue_report_attachments (
  id uuid primary key,
  report_id uuid not null references service_desk.issue_reports(id) on delete cascade,
  uploaded_by uuid not null,
  object_key text not null unique,
  file_name text not null,
  content_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists issue_report_attachments_report_idx
  on service_desk.issue_report_attachments (report_id);

-- Per-year counter behind RPT-2026-000124. A single
-- `insert ... on conflict do update ... returning` bumps and reads it
-- atomically inside the creating transaction, so concurrent submissions can
-- never collide on a number without advisory locks. The existing
-- buildRequestNumber() (timestamp + random) cannot produce a dense sequence.
create table if not exists service_desk.issue_report_counters (
  year integer primary key,
  last_value bigint not null default 0
);
