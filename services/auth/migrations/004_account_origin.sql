-- Track how each account was created so the admin UI can distinguish
-- self-signups (locked to the customer role) from staff-managed accounts
-- (eligible for engineer/admin promotion).

alter table auth.users
  add column if not exists account_origin text not null default 'self_signup';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'auth_users_account_origin_check'
  ) then
    alter table auth.users
      add constraint auth_users_account_origin_check
      check (account_origin in (
        'self_signup',
        'admin_invite',
        'firebase_google',
        'legacy'
      ));
  end if;
end $$;

-- Backfill: any pre-existing staff account is treated as admin-invited so
-- it stays eligible for role management. Pre-existing customer accounts are
-- marked 'legacy' so an admin can opt-in to staff-managing them later if
-- needed, but they still satisfy the "do not auto-promote self_signup" rule.
update auth.users
set account_origin = 'admin_invite'
where role in ('engineer', 'admin')
  and account_origin = 'self_signup';

update auth.users
set account_origin = 'legacy'
where role = 'customer'
  and account_origin = 'self_signup'
  and created_at < now() - interval '1 second';
