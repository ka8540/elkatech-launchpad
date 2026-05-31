-- Soft-delete marker for user removal. Distinct from approval_status so a
-- suspended-but-restorable user is not confused with a removed user that
-- should disappear from the platform accounts list.

alter table auth.users
  add column if not exists removed_at timestamptz;

alter table auth.users
  add column if not exists removed_by uuid;

create index if not exists auth_users_removed_at_idx
  on auth.users (removed_at)
  where removed_at is null;
