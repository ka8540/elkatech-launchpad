-- Firebase Authentication linking + admin approval workflow.

-- 1. Allow null password_hash and add firebase_uid + approval status columns.
alter table auth.users
  add column if not exists firebase_uid text;

alter table auth.users
  add column if not exists approval_status text not null default 'approved';

alter table auth.users
  add column if not exists approved_at timestamptz;

alter table auth.users
  add column if not exists approved_by uuid;

alter table auth.users
  add column if not exists rejected_at timestamptz;

alter table auth.users
  add column if not exists rejected_by uuid;

alter table auth.users
  add column if not exists suspended_at timestamptz;

alter table auth.users
  add column if not exists suspended_by uuid;

-- 2. Constrain approval_status values once the column exists.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'auth_users_approval_status_check'
  ) then
    alter table auth.users
      add constraint auth_users_approval_status_check
      check (approval_status in ('pending_approval', 'approved', 'rejected', 'suspended'));
  end if;
end $$;

-- 3. Enforce uniqueness on firebase_uid where present (idempotent).
create unique index if not exists auth_users_firebase_uid_idx
  on auth.users (firebase_uid)
  where firebase_uid is not null;

-- 4. Existing accounts predate this workflow → they stay approved.
update auth.users
set approval_status = 'approved'
where approval_status is null;
