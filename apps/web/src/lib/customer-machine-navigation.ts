export const CUSTOMER_MACHINE_PROFILE_RETURN_KEY =
  "customerMachineProfileReturnTo" as const;

export type CustomerMachineProfileLocationState = {
  [CUSTOMER_MACHINE_PROFILE_RETURN_KEY]?: string;
};

/** Preserve the exact in-portal page (including filters) that opened a profile. */
export function customerMachineProfileState(
  pathname: string,
  search = "",
): CustomerMachineProfileLocationState {
  return {
    [CUSTOMER_MACHINE_PROFILE_RETURN_KEY]: `${pathname}${search}`,
  };
}

/** Never let arbitrary location state turn the Back control into an external link. */
export function customerMachineProfileReturnTo(
  state: unknown,
  fallback = "/app/machines",
): string {
  if (!state || typeof state !== "object") return fallback;
  const candidate = (state as CustomerMachineProfileLocationState)[
    CUSTOMER_MACHINE_PROFILE_RETURN_KEY
  ];
  return typeof candidate === "string" && candidate.startsWith("/app/")
    ? candidate
    : fallback;
}
