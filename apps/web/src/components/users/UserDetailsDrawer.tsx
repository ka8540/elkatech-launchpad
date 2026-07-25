import { useQuery } from "@tanstack/react-query";
import type { ActivityPersonDetail, AuthUser } from "@elkatech/contracts";
import { Info, Pencil } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  canDecideApproval = false,
  canReactivate = false,
  isUpdatingAccess = false,
  onAccessAction,
  canManageRole = false,
  onManageRole,
  canEditDetails = false,
  onEditDetails,
}: {
  user: AuthUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Approval and reactivation permissions are derived by the caller's shared RBAC helpers. */
  canDecideApproval?: boolean;
  canReactivate?: boolean;
  isUpdatingAccess?: boolean;
  onAccessAction?: (action: "approve" | "reject" | "reactivate") => void;
  /** Caller decides via the shared RBAC helpers; the drawer never re-derives it. */
  canManageRole?: boolean;
  /** Hands off to the page's ManageRoleDialog — no duplicate role logic here. */
  onManageRole?: () => void;
  /** Approved-profile editing permission is derived by the caller's shared RBAC helper. */
  canEditDetails?: boolean;
  /** Opens the focused profile-edit dialog; access fields remain separate. */
  onEditDetails?: () => void;
}) {
  const [approvalTipOpen, setApprovalTipOpen] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["user-details", user?.id],
    queryFn: () => apiRequest<ActivityPersonDetail>(`/api/activity/people/${user!.id}`),
    enabled: open && Boolean(user?.id),
    retry: false,
  });

  const extended = data?.person;
  const workload = extended?.workload;

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setApprovalTipOpen(false);
        onOpenChange(nextOpen);
      }}
    >
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Account details</SheetTitle>
          <SheetDescription className="sr-only">
            Review this account&apos;s information, status, and permitted management actions.
          </SheetDescription>
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

            {canEditDetails && onEditDetails && (
              <section className="border-t border-[var(--lp-line)] pt-5">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={onEditDetails}
                >
                  <Pencil className="h-4 w-4" />
                  Edit user details
                </Button>
              </section>
            )}

            {canDecideApproval && onAccessAction && (
              <section
                aria-labelledby="approval-decision-title"
                className="space-y-3 border-t border-[var(--lp-line)] pt-5"
              >
                <div className="flex items-center gap-1.5">
                  <h3
                    id="approval-decision-title"
                    className="text-sm font-semibold text-[var(--lp-ink)]"
                  >
                    Approval decision
                  </h3>
                  <TooltipProvider delayDuration={100}>
                    <Tooltip open={approvalTipOpen}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="About approval decisions"
                          onPointerEnter={() => setApprovalTipOpen(true)}
                          onPointerLeave={() => setApprovalTipOpen(false)}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--lp-faint)] transition-colors hover:text-[var(--lp-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/45"
                        >
                          <Info aria-hidden="true" className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-[220px] px-2 py-1 text-xs leading-4"
                      >
                        Review details first. Role changes require confirmation.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="cta"
                    disabled={isUpdatingAccess}
                    onClick={() => onAccessAction("approve")}
                  >
                    Approve account
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-rose-300 text-rose-700 hover:border-rose-400 hover:bg-rose-500/[0.08] hover:text-rose-700 dark:border-rose-700 dark:text-rose-300 dark:hover:text-rose-200"
                    disabled={isUpdatingAccess}
                    onClick={() => onAccessAction("reject")}
                  >
                    Reject account
                  </Button>
                </div>
              </section>
            )}

            {canReactivate && onAccessAction && (
              <section
                aria-labelledby="reactivate-account-title"
                className="space-y-3 border-t border-[var(--lp-line)] pt-5"
              >
                <div className="space-y-1">
                  <h3
                    id="reactivate-account-title"
                    className="text-sm font-semibold text-[var(--lp-ink)]"
                  >
                    Account access
                  </h3>
                  <p className="text-xs leading-5 text-[var(--lp-faint)]">
                    Restore this account&apos;s access to the service portal.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="cta"
                  className="w-full"
                  disabled={isUpdatingAccess}
                  onClick={() => onAccessAction("reactivate")}
                >
                  Reactivate account
                </Button>
              </section>
            )}

            {canManageRole && onManageRole ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={onManageRole}
              >
                Manage role
              </Button>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
