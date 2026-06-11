-- Migration 006 originally grandfathered existing accounts as profile-complete
-- so nobody got locked out. Now that onboarding is the expected customer flow,
-- recalculate the persisted flag from the same required fields used by the
-- auth service and complete-profile form.

with recalculated as (
  select
    id,
    (
      nullif(trim(display_name), '') is not null
      and nullif(trim(coalesce(company_name, '')), '') is not null
      and nullif(trim(coalesce(contact_phone, '')), '') is not null
      and nullif(trim(coalesce(address_line1, '')), '') is not null
      and nullif(trim(coalesce(city, '')), '') is not null
      and nullif(trim(coalesce(state, '')), '') is not null
    ) as complete
  from auth.users
  where role = 'customer'
)
update auth.users as users
set
  profile_completed = recalculated.complete,
  profile_completed_at = case
    when recalculated.complete then coalesce(users.profile_completed_at, now())
    else null
  end,
  updated_at = now()
from recalculated
where users.id = recalculated.id
  and (
    users.profile_completed is distinct from recalculated.complete
    or (recalculated.complete and users.profile_completed_at is null)
    or (not recalculated.complete and users.profile_completed_at is not null)
  );
