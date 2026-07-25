-- Migration 001 declared request_history.actor_role and
-- request_messages.author_role with inline CHECKs, so Postgres auto-named the
-- constraints request_history_actor_role_check and
-- request_messages_author_role_check. Both predate the five-role model that
-- auth migration 008 introduced, so they still reject 'support' and 'owner':
-- a support user assigning a request or replying to a customer fails the
-- insert, and (before the write paths became transactional) left the request
-- row already updated while the endpoint returned 500.
--
-- Relax both to the full role set, mirroring auth/008. No table shape change
-- and no data change -- every existing row (customer / engineer / admin)
-- remains valid under the wider set, so validation is a no-op.

alter table service_desk.request_history
  drop constraint if exists request_history_actor_role_check;

alter table service_desk.request_history
  add constraint request_history_actor_role_check
  check (actor_role in ('customer', 'engineer', 'support', 'owner', 'admin'));

alter table service_desk.request_messages
  drop constraint if exists request_messages_author_role_check;

alter table service_desk.request_messages
  add constraint request_messages_author_role_check
  check (author_role in ('customer', 'engineer', 'support', 'owner', 'admin'));
