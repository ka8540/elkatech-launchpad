import { useQuery } from "@tanstack/react-query";
import type { ActivityPersonDetail, AuthUser } from "@elkatech/contracts";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  ORIGIN_LABELS,
  ROLE_LABELS,
  STATUS_LABELS,
  formatJoined,
  initialsFor,
  profileLabel,
} from "./user-access";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--lp-line)] py-2.5 last:border-0">
      <dt className="text-xs text-[var(--lp-faint)]">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] font-medium text-[var(--lp-ink)]">{value}</dd>
    </div>
  );
}

/**
 * Extended account detail. The list endpoint deliberately stays lean, so the
 * richer figures (company, last seen, machine and request counts) are fetched
 * once here when the drawer opens — never per table row.
 */
export default function UserDetailsDrawer({
  user,
  open,
  onOpenChange,
  canManageRole = false,
  onManageRole,
}: {
  user: AuthUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Caller decides via the shared RBAC helpers; the drawer never re-derives it. */
  canManageRole?: boolean;
  /** Hands off to the page's ManageRoleDialog — no duplicate role logic here. */
  onManageRole?: () => void;
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["user-details", user?.id],
    queryFn: () => apiRequest<ActivityPersonDetail>(`/api/activity/people/${user!.id}`),
    enabled: open && Boolean(user?.id),
    retry: false,
  });

  const extended = data?.person;
  const workload = extended?.workload;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Account details</SheetTitle>
        </SheetHeader>

        {user && (
          <div className="mt-5 space-y-5">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-sm font-semibold text-[var(--lp-ink-soft)]"
              >
                {initialsFor(user.displayName)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-[var(--lp-ink)]">{user.displayName}</p>
                <p className="truncate text-sm text-[var(--lp-ink-soft)]">{user.email}</p>
              </div>
            </div>

            <dl>
              <Row label="Current role" value={ROLE_LABELS[user.role]} />
              <Row label="Account status" value={STATUS_LABELS[user.approvalStatus]} />
              <Row
                label="Account type"
                value={ORIGIN_LABELS[user.accountOrigin] ?? "Public signup"}
              />
              <Row label="Email verified" value={user.emailVerified ? "Yes" : "No"} />
              <Row label="Profile" value={profileLabel(user)} />
              <Row label="Joined" value={formatJoined(user.createdAt)} />

              {isLoading && <Row label="Loading" value="Fetching account activity…" />}
              {isError && !isLoading && (
                <Row label="Activity" value={<span className="text-[var(--lp-faint)]">Unavailable</span>} />
              )}

              {extended && (
                <>
                  {extended.companyName && <Row label="Company" value={extended.companyName} />}
                  <Row
                    label="Last seen"
                    value={
                      extended.lastSeenAt
                        ? formatJoined(extended.lastSeenAt)
                        : <span className="text-[var(--lp-faint)]">Never</span>
                    }
                  />
                  {user.role === "customer" && (
                    <>
                      <Row label="Machines" value={data!.machineCount} />
                      <Row label="Requests filed" value={workload?.asCustomer.total ?? 0} />
                      <Row label="Open requests" value={workload?.asCustomer.open ?? 0} />
                      <Row label="Completed requests" value={workload?.asCustomer.completed ?? 0} />
                    </>
                  )}
                  {user.role === "engineer" && (
                    <>
                      <Row label="Assigned requests" value={workload?.asEngineer.total ?? 0} />
                      <Row label="Open assignments" value={workload?.asEngineer.open ?? 0} />
                      <Row label="Completed" value={workload?.asEngineer.completed ?? 0} />
                    </>
                  )}
                  <Row label="Recorded actions" value={workload?.recordedEvents ?? 0} />
                </>
              )}
            </dl>

            {canManageRole && onManageRole ? (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={onManageRole}
                >
                  Manage role
                </Button>
                <p className="text-xs leading-5 text-[var(--lp-faint)]">
                  Role changes open a confirmation step before anything is applied.
                </p>
              </div>
            ) : (
              <p className="text-xs leading-5 text-[var(--lp-faint)]">
                Role changes are available through the account actions menu when permitted.
              </p>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
