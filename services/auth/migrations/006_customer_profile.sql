-- Customer service profile: contact + workshop details collected during
-- onboarding so the support team can reach and locate a customer quickly.
-- These live on auth.users (not a separate table) so they flow through the
-- existing session-resolve / mapUser path with no extra join.
--
-- "Machine ownership" is deliberately NOT modelled here — that is admin-
-- controlled data in service_desk.customer_machines. Profile = who/where the
-- customer is; machines = what admin assigned to them. The two stay separate.

alter table auth.users
  add column if not exists company_name text;

alter table auth.users
  add column if not exists contact_phone text;

alter table auth.users
  add column if not exists alternate_phone text;

alter table auth.users
  add column if not exists address_line1 text;

alter table auth.users
  add column if not exists address_line2 text;

alter table auth.users
  add column if not exists city text;

alter table auth.users
  add column if not exists state text;

alter table auth.users
  add column if not exists postal_code text;

alter table auth.users
  add column if not exists country text default 'India';

alter table auth.users
  add column if not exists profile_completed boolean not null default false;

alter table auth.users
  add column if not exists profile_completed_at timestamptz;

-- Grandfather every account that already exists at migration time so we never
-- lock current users out of the portal. New signups insert with the column
-- default (false) and must complete the profile before creating requests.
update auth.users
set profile_completed = true,
    profile_completed_at = coalesce(profile_completed_at, now())
where profile_completed = false;
