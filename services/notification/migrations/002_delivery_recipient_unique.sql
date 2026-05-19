-- A single outbox event can produce more than one email (e.g. request.created
-- notifies both the admin and the customer). The original UNIQUE(event_id)
-- constraint rejected the second delivery row, which rolled back the whole
-- transaction so the event was never marked processed and emails were resent
-- on every poll. Scope uniqueness to one row per recipient per event instead.

alter table notification.deliveries
  drop constraint if exists deliveries_event_id_key;

alter table notification.deliveries
  drop constraint if exists deliveries_event_recipient_key;

alter table notification.deliveries
  add constraint deliveries_event_recipient_key unique (event_id, recipient_email);
