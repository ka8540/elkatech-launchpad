-- Add the new portal roles `owner` and `support`. Migration 001 created the
-- role check inline, so Postgres auto-named the constraints users_role_check
-- and tokens_role_check. We relax both to allow the five-role model. Existing
-- rows (customer / engineer / admin) stay valid — no user roles are changed.

alter table auth.users drop constraint if exists users_role_check;
alter table auth.users
  add constraint users_role_check
  check (role in ('customer', 'engineer', 'support', 'owner', 'admin'));

alter table auth.tokens drop constraint if exists tokens_role_check;
alter table auth.tokens
  add constraint tokens_role_check
  check (role in ('customer', 'engineer', 'support', 'owner', 'admin'));
