-- Allow multiple delivery rows per outbox event so notifications with
-- multiple recipients (e.g. "request claimed" → customer + engineer)
-- can be recorded independently. Uniqueness is preserved at the
-- (event_id, recipient_email) tuple so retry idempotency still works.

alter table notification.deliveries
  drop constraint if exists deliveries_event_id_key;

create unique index if not exists deliveries_event_recipient_uidx
  on notification.deliveries (event_id, recipient_email);
