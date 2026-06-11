-- Link service requests to the customer machine they were raised against, and
-- record a simple issue type chosen by the customer.
--
-- Backward compatible: existing requests keep customer_machine_id = null and
-- continue to display from their own product_snapshot / site_location /
-- serial_number columns. New customer-created requests will always carry a
-- customer_machine_id; the product, location, serial and contact phone are
-- copied from the machine at creation time (so the NOT NULL columns on
-- service_desk.requests stay satisfied without the customer typing them).

alter table service_desk.requests
  add column if not exists customer_machine_id uuid;

alter table service_desk.requests
  add column if not exists issue_type text;

create index if not exists requests_customer_machine_idx
  on service_desk.requests (customer_machine_id);
