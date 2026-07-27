import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChevronDown, Lock, MoreHorizontal, Search, UserPlus, Users2 } from "lucide-react";
import type {
  AccountOrigin,
  ApprovalStatus,
  AuthUser,
  Role,
} from "@elkatech/contracts";
import { ApiError, apiRequest } from "@/lib/api";
import { PAGE_CONTAINER, PAGE_PRIMARY_ACTION } from "@/lib/page-layout";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { customerMachineProfileState } from "@/lib/customer-machine-navigation";
import PageHeader from "@/components/PageHeader";
import InviteStaffDialog from "@/components/users/InviteStaffDialog";
import EditUserDetailsDialog from "@/components/users/EditUserDetailsDialog";
import ManageRoleDialog from "@/components/users/ManageRoleDialog";
import UserDetailsDrawer from "@/components/users/UserDetailsDrawer";
import {
  ORIGIN_LABELS,
  ROLE_LABELS,
  STATUS_LABELS,
  USER_TABS,
  actionsFor,
  canDecideApprovalFor,
  canEditDetailsFor,
  canManageRoleFor,
  canReactivateFor,
  filterUsers,
  formatJoined,
  initialsFor,
  isProtectedAccount,
  originLabel,
  profileLabel,
  resolveSystemAdminId,
  sortUsers,
  summarise,
  tabCounts,
  type ActorContext,
  type OriginFilter,
  type RoleFilter,
  type StatusFilter,
  type UserActionId,
  type UserTabId,
} from "@/components/users/user-access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ApprovalAction = "approve" | "reject" | "suspend" | "reactivate";

const STATUS_AFTER_ACTION: Record<ApprovalAction, ApprovalStatus> = {
  approve: "approved",
  reject: "rejected",
  suspend: "suspended",
  reactivate: "approved",
};

const PAGE_SIZE = 20;

const ROLE_OPTIONS: Array<{ value: RoleFilter; label: string }> = [
  { value: "all", label: "All roles" },
  ...(["customer", "engineer", "support", "owner", "admin"] as Role[]).map((role) => ({
    value: role as RoleFilter,
    label: ROLE_LABELS[role],
  })),
];

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All statuses" },
  ...(
    ["approved", "pending_approval", "suspended", "rejected"] as ApprovalStatus[]
  ).map((status) => ({ value: status as StatusFilter, label: STATUS_LABELS[status] })),
];

const ORIGIN_OPTIONS: Array<{ value: OriginFilter; label: string }> = [
  { value: "all", label: "All account types" },
  ...(
    ["self_signup", "firebase_google", "admin_invite", "legacy"] as AccountOrigin[]
  ).map((origin) => ({ value: origin as OriginFilter, label: ORIGIN_LABELS[origin] })),
];

const ACTION_LABELS: Record<UserActionId, string> = {
  details: "View details",
  machines: "View machines",
  role: "Manage role",
  approve: "Approve",
  reject: "Reject",
  suspend: "Suspend",
  reactivate: "Reactivate",
  remove: "Remove user",
};

type ConfirmState = {
  user: AuthUser;
  action: Exclude<UserActionId, "details" | "machines" | "role">;
} | null;

/* ── Small building blocks ───────────────────────────────────────────────── */

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="lp-mono text-[10px] uppercase tracking-[0.14em] text-[var(--lp-faint)]">
        {label}
      </dt>
      <dd className="lp-display text-base font-bold text-[var(--lp-ink)]">{value}</dd>
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "accent" | "violet" | "sky" | "emerald" | "amber" | "rose" | "neutral";
}) {
  const tones: Record<typeof tone, string> = {
    accent: "border-[var(--lp-accent)]/35 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]",
    violet: "border-violet-400/35 bg-violet-400/10 text-violet-700 dark:text-violet-300",
    sky: "border-sky-400/35 bg-sky-400/10 text-sky-700 dark:text-sky-300",
    emerald: "border-emerald-400/35 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300",
    amber: "border-amber-400/35 bg-amber-400/10 text-amber-700 dark:text-amber-300",
    rose: "border-rose-400/35 bg-rose-400/10 text-rose-700 dark:text-rose-300",
    neutral: "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]",
  };
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

const ROLE_TONE: Record<Role, "accent" | "violet" | "sky" | "emerald" | "neutral"> = {
  admin: "accent",
  owner: "violet",
  support: "sky",
  engineer: "emerald",
  customer: "neutral",
};

const STATUS_TONE: Record<ApprovalStatus, "emerald" | "amber" | "rose" | "neutral"> = {
  approved: "emerald",
  pending_approval: "amber",
  rejected: "rose",
  suspended: "neutral",
};

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="relative w-full sm:w-[172px]">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="lp-field h-10 w-full cursor-pointer appearance-none rounded-md border pl-3 pr-9 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--lp-faint)]"
      />
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

const UsersPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession();
  const actorRole = (sessionData?.user?.role ?? "admin") as Role;
  const actorId = sessionData?.user?.id ?? "";

  const [tab, setTab] = useState<UserTabId>("all");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");
  const [page, setPage] = useState(0);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState<AuthUser | null>(null);
  const [editDetailsUser, setEditDetailsUser] = useState<AuthUser | null>(null);
  const [roleUser, setRoleUser] = useState<AuthUser | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const { data: users = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiRequest<AuthUser[]>("/api/admin/users"),
  });
  const selectedDetailsUser = detailsUser
    ? users.find((candidate) => candidate.id === detailsUser.id) ?? detailsUser
    : null;
  const selectedEditDetailsUser = editDetailsUser
    ? users.find((candidate) => candidate.id === editDetailsUser.id) ??
      editDetailsUser
    : null;

  const actor: ActorContext = useMemo(
    () => ({ role: actorRole, id: actorId, systemAdminId: resolveSystemAdminId(users) }),
    [actorRole, actorId, users],
  );

  const counts = useMemo(() => tabCounts(users), [users]);
  const summary = useMemo(() => summarise(users), [users]);

  const rows = useMemo(
    () =>
      sortUsers(
        filterUsers(users, {
          tab,
          search,
          role: roleFilter,
          status: statusFilter,
          origin: originFilter,
        }),
      ),
    [users, tab, search, roleFilter, statusFilter, originFilter],
  );

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);
  const hasFilters =
    search.trim().length > 0 ||
    roleFilter !== "all" ||
    statusFilter !== "all" ||
    originFilter !== "all" ||
    tab !== "all";

  async function invalidate() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "users", "summary"] }),
    ]);
  }

  const approvalMutation = useMutation({
    mutationFn: ({ userId, action }: { userId: string; action: ApprovalAction }) =>
      apiRequest<{ user?: AuthUser }>(`/api/admin/users/${userId}/${action}`, {
        method: "POST",
        body: "{}",
      }),
    onSuccess: async (data, variables) => {
      queryClient.setQueryData<AuthUser[]>(["admin-users"], (old) =>
        old?.map((user) =>
          user.id === variables.userId
            ? data.user ?? { ...user, approvalStatus: STATUS_AFTER_ACTION[variables.action] }
            : user,
        ),
      );
      await invalidate();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : "Unable to update this account."),
  });

  const removeMutation = useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      apiRequest(`/api/admin/users/${userId}`, { method: "DELETE" }),
    onSuccess: async (_data, variables) => {
      queryClient.setQueryData<AuthUser[]>(["admin-users"], (old) =>
        old ? old.filter((u) => u.id !== variables.userId) : old,
      );
      await invalidate();
    },
    onError: (error: unknown) => {
      const raw = error instanceof ApiError ? error.message : "";
      const technical = /FST_ERR|Bad Request|application\/json/i.test(raw);
      toast.error(raw && !technical ? raw : "Could not remove this user. Please try again.");
    },
  });

  function runAction(user: AuthUser, action: UserActionId) {
    if (action === "details") return setDetailsUser(user);
    if (action === "machines") {
      navigate(`/app/machines/${encodeURIComponent(user.id)}`, {
        state: customerMachineProfileState(location.pathname, location.search),
      });
      return;
    }
    // Role changes get their own two-step dialog, never a single confirm.
    if (action === "role") return setRoleUser(user);
    // Everything else changes access, so it goes through a confirmation.
    setConfirm({ user, action });
  }

  function confirmAction() {
    if (!confirm) return;
    const { user, action } = confirm;
    if (action === "remove") {
      removeMutation.mutate(
        { userId: user.id },
        { onSuccess: () => toast.success(`${user.displayName} removed.`) },
      );
    } else {
      const past: Record<ApprovalAction, string> = {
        approve: "approved",
        reject: "rejected",
        suspend: "suspended",
        reactivate: "reactivated",
      };
      approvalMutation.mutate(
        { userId: user.id, action },
        { onSuccess: () => toast.success(`${user.displayName} ${past[action]}.`) },
      );
    }
    setConfirm(null);
  }

  function resetFilters() {
    setTab("all");
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setOriginFilter("all");
    setPage(0);
  }

  const confirmCopy: Record<string, { title: string; description: string; label: string }> = {
    approve: {
      title: "Approve this account?",
      description:
        "This customer will be allowed to access the service portal and create service requests.",
      label: "Approve account",
    },
    reject: {
      title: "Reject this account?",
      description:
        "This account will remain unable to use the service portal. This action can be reviewed later if reactivation is supported.",
      label: "Reject account",
    },
    suspend: {
      title: `Suspend ${confirm?.user.displayName ?? ""}?`,
      description: "They lose access until reactivated. Their data is kept.",
      label: "Suspend",
    },
    reactivate: {
      title: `Reactivate ${confirm?.user.displayName ?? ""}?`,
      description: "Access is restored immediately.",
      label: "Reactivate",
    },
    remove: {
      title: `Remove ${confirm?.user.displayName ?? ""} permanently?`,
      description:
        "This permanently deletes the account, active sessions, and all related service request data. This cannot be undone.",
      label: "Remove user",
    },
  };

  const destructive = confirm?.action === "remove" || confirm?.action === "reject" || confirm?.action === "suspend";

  return (
    // Full available width — no narrow max-width, so the table uses whatever
    // space the sidebar leaves in either state.
    <div className={PAGE_CONTAINER}>
      {/* Header */}
      <PageHeader
        icon={Users2}
        title="Users & Access"
        description="Manage customer accounts, user invitations, approvals, and access status."
        action={
          <Button
            type="button"
            className={PAGE_PRIMARY_ACTION}
            onClick={() => setInviteOpen(true)}
          >
            <UserPlus className="mr-1.5 h-4 w-4" />
            Invite user
          </Button>
        }
      />

      {/* Compact metrics — one line on desktop, wraps below */}
      <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/50 px-4 py-3">
        <Metric label="Total users" value={summary.total} />
        <Metric label="Customers" value={summary.customers} />
        <Metric label="Active staff" value={summary.activeStaff} />
        <Metric label="Pending approval" value={summary.pending} />
        <Metric label="Suspended" value={summary.suspended} />
      </dl>

      {/* One account-management surface: tabs → toolbar → table → pagination */}
      <section className="overflow-hidden rounded-xl border border-[var(--lp-line)] lp-card">
        <div
          role="tablist"
          aria-label="Filter accounts"
          className="flex flex-wrap gap-1 border-b border-[var(--lp-line)] px-3 pt-3"
        >
          {USER_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => {
                setTab(item.id);
                setPage(0);
              }}
              className={cn(
                "-mb-px rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/45",
                tab === item.id
                  ? "border-[var(--lp-accent)] text-[var(--lp-ink)]"
                  : "border-transparent text-[var(--lp-faint)] hover:text-[var(--lp-ink)]",
              )}
            >
              {item.label}
              <span className="ml-1.5 tabular-nums text-[var(--lp-faint)]">{counts[item.id]}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 border-b border-[var(--lp-line)] p-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--lp-faint)]"
            />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              placeholder="Search by name or email…"
              aria-label="Search users"
              className="lp-field pl-9"
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <FilterSelect
              label="Filter by role"
              value={roleFilter}
              options={ROLE_OPTIONS}
              onChange={(value) => {
                setRoleFilter(value);
                setPage(0);
              }}
            />
            <FilterSelect
              label="Filter by status"
              value={statusFilter}
              options={STATUS_OPTIONS}
              onChange={(value) => {
                setStatusFilter(value);
                setPage(0);
              }}
            />
            <FilterSelect
              label="Filter by account type"
              value={originFilter}
              options={ORIGIN_OPTIONS}
              onChange={(value) => {
                setOriginFilter(value);
                setPage(0);
              }}
            />
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[840px] table-fixed text-sm">
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[11%]" />
              <col className="w-[15%]" />
              <col className="w-[13%]" />
              <col className="w-[12%]" />
              <col className="w-[15%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[var(--lp-line)]">
                {["User", "Role", "Account type", "Status", "Profile", "Joined", ""].map(
                  (heading, index) => (
                    <th
                      key={heading || index}
                      scope="col"
                      className={cn(
                        "px-3 py-2.5 text-left align-bottom lp-mono text-[10px] font-medium uppercase leading-[1.3] tracking-[0.14em] text-[var(--lp-faint)]",
                        index === 6 && "text-right",
                      )}
                    >
                      {heading || <span className="sr-only">Actions</span>}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-b border-[var(--lp-line)] last:border-0">
                    <td colSpan={7} className="px-3 py-3">
                      <div
                        aria-hidden="true"
                        className="h-6 w-full animate-pulse rounded bg-[var(--lp-panel-2)]"
                      />
                    </td>
                  </tr>
                ))}

              {isError && !isLoading && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-sm">
                    <p className="font-medium text-rose-600 dark:text-rose-300">
                      Could not load users.
                    </p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
                      Retry
                    </Button>
                  </td>
                </tr>
              )}

              {!isLoading && !isError && pageRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-sm">
                    {hasFilters ? (
                      <>
                        <p className="font-medium text-[var(--lp-ink)]">
                          No accounts match these filters.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          onClick={resetFilters}
                        >
                          Clear filters
                        </Button>
                      </>
                    ) : (
                      <p className="font-medium text-[var(--lp-ink)]">No accounts yet.</p>
                    )}
                  </td>
                </tr>
              )}

              {!isLoading &&
                !isError &&
                pageRows.map((user) => {
                  const protectedAccount = isProtectedAccount(user, actor);
                  const actions = actionsFor(user, actor);
                  const isSelf = user.id === actorId;
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-[var(--lp-line)] transition-colors last:border-0 hover:bg-[var(--lp-panel-2)]/50"
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            aria-hidden="true"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[11px] font-semibold text-[var(--lp-ink-soft)]"
                          >
                            {initialsFor(user.displayName)}
                          </span>
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span className="truncate font-medium text-[var(--lp-ink)]">
                                {user.displayName}
                              </span>
                              {isSelf && <Badge tone="accent">You</Badge>}
                            </div>
                            <p className="truncate text-xs text-[var(--lp-faint)]">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge tone={ROLE_TONE[user.role]}>{ROLE_LABELS[user.role]}</Badge>
                      </td>
                      <td className="truncate px-3 py-2.5 text-[13px] text-[var(--lp-ink-soft)]">
                        {originLabel(user, protectedAccount)}
                      </td>
                      <td className="px-3 py-2.5">
                        {protectedAccount ? (
                          <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--lp-ink-soft)]">
                            <Lock aria-hidden="true" className="h-3.5 w-3.5" />
                            Protected account
                          </span>
                        ) : (
                          <Badge tone={STATUS_TONE[user.approvalStatus]}>
                            {STATUS_LABELS[user.approvalStatus]}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-[var(--lp-ink-soft)]">
                        {profileLabel(user)}
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-[var(--lp-faint)]">
                        {formatJoined(user.createdAt)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {actions.length > 0 && (
                          <RowActions
                            user={user}
                            actions={actions}
                            onSelect={(action) => runAction(user, action)}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Mobile list — compact stacked rows, not oversized cards */}
        <ul className="divide-y divide-[var(--lp-line)] md:hidden">
          {isLoading &&
            Array.from({ length: 4 }).map((_, index) => (
              <li key={index} className="p-3">
                <div
                  aria-hidden="true"
                  className="h-12 w-full animate-pulse rounded bg-[var(--lp-panel-2)]"
                />
              </li>
            ))}

          {!isLoading && !isError && pageRows.length === 0 && (
            <li className="p-8 text-center text-sm text-[var(--lp-faint)]">
              {hasFilters ? "No accounts match these filters." : "No accounts yet."}
            </li>
          )}

          {!isLoading &&
            !isError &&
            pageRows.map((user) => {
              const protectedAccount = isProtectedAccount(user, actor);
              const actions = actionsFor(user, actor);
              return (
                <li key={user.id} className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--lp-ink)]">{user.displayName}</p>
                    <p className="truncate text-xs text-[var(--lp-faint)]">{user.email}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge tone={ROLE_TONE[user.role]}>{ROLE_LABELS[user.role]}</Badge>
                      {protectedAccount ? (
                        <Badge tone="neutral">Protected</Badge>
                      ) : (
                        <Badge tone={STATUS_TONE[user.approvalStatus]}>
                          {STATUS_LABELS[user.approvalStatus]}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {actions.length > 0 && (
                    <RowActions
                      user={user}
                      actions={actions}
                      onSelect={(action) => runAction(user, action)}
                    />
                  )}
                </li>
              );
            })}
        </ul>

        {!isLoading && !isError && rows.length > PAGE_SIZE && (
          <div className="flex flex-col items-center justify-between gap-2 border-t border-[var(--lp-line)] p-3 text-sm sm:flex-row">
            <p className="text-[var(--lp-ink-soft)]">
              Showing {currentPage * PAGE_SIZE + 1}–
              {Math.min((currentPage + 1) * PAGE_SIZE, rows.length)} of {rows.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                Previous
              </Button>
              <span className="text-xs text-[var(--lp-faint)]">
                Page {currentPage + 1} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={currentPage >= pageCount - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </section>

      <InviteStaffDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={invalidate}
        actorRole={actorRole}
      />

      <UserDetailsDrawer
        user={selectedDetailsUser}
        open={detailsUser !== null}
        onOpenChange={(open) => {
          if (!open) setDetailsUser(null);
        }}
        canDecideApproval={
          selectedDetailsUser ? canDecideApprovalFor(selectedDetailsUser, actor) : false
        }
        canReactivate={
          selectedDetailsUser ? canReactivateFor(selectedDetailsUser, actor) : false
        }
        isUpdatingAccess={approvalMutation.isPending}
        onAccessAction={(action) => {
          if (selectedDetailsUser) runAction(selectedDetailsUser, action);
        }}
        canManageRole={
          selectedDetailsUser ? canManageRoleFor(selectedDetailsUser, actor) : false
        }
        onManageRole={() => {
          // Reuse the same dialog rather than duplicating the workflow.
          const target = selectedDetailsUser;
          setDetailsUser(null);
          setRoleUser(target);
        }}
        canEditDetails={
          selectedDetailsUser
            ? canEditDetailsFor(selectedDetailsUser, actor)
            : false
        }
        onEditDetails={() => {
          if (selectedDetailsUser) setEditDetailsUser(selectedDetailsUser);
        }}
      />

      <EditUserDetailsDialog
        user={selectedEditDetailsUser}
        open={selectedEditDetailsUser !== null}
        onOpenChange={(open) => {
          if (!open) setEditDetailsUser(null);
        }}
        onSaved={async (response) => {
          queryClient.setQueryData<AuthUser[]>(["admin-users"], (current) =>
            current?.map((candidate) =>
              candidate.id === response.user.id ? response.user : candidate,
            ),
          );
          await Promise.all([
            invalidate(),
            queryClient.invalidateQueries({
              queryKey: ["user-details", response.user.id],
            }),
            queryClient.invalidateQueries({
              queryKey: ["admin", "user", response.user.id, "profile"],
            }),
            queryClient.invalidateQueries({
              queryKey: ["admin", "customer-picker"],
            }),
          ]);
        }}
      />

      <ManageRoleDialog
        user={roleUser}
        actor={actor}
        open={roleUser !== null}
        onOpenChange={(open) => {
          if (!open) setRoleUser(null);
        }}
        onChanged={invalidate}
      />

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm ? confirmCopy[confirm.action].title : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm ? confirmCopy[confirm.action].description : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={cn(
                destructive
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : "bg-[var(--lp-accent)] text-[#fbfaf6] hover:bg-[var(--lp-accent-2)]",
              )}
            >
              {confirm ? confirmCopy[confirm.action].label : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/** One overflow menu per row — never a wall of inline buttons. */
function RowActions({
  user,
  actions,
  onSelect,
}: {
  user: AuthUser;
  actions: UserActionId[];
  onSelect: (action: UserActionId) => void;
}) {
  // Agreed order: details → machines → manage role │ suspend/reactivate → remove
  const SAFE_ORDER: UserActionId[] = ["details", "machines", "role", "reactivate"];
  const RISKY_ORDER: UserActionId[] = ["suspend", "remove"];
  const safe = SAFE_ORDER.filter((action) => actions.includes(action));
  const risky = RISKY_ORDER.filter((action) => actions.includes(action));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${user.displayName}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--lp-line)] text-[var(--lp-ink-soft)] transition-colors hover:border-[var(--lp-accent)]/50 hover:text-[var(--lp-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/45"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      {/* Hairline border, matte panel, restrained depth — the same language as
          the table cards. The shadcn defaults rendered loose with a blue focus
          wash that fought the copper accent. */}
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        collisionPadding={12}
        className="w-[184px] rounded-lg border-[var(--lp-line-strong)] bg-[var(--lp-panel)] p-1 text-[var(--lp-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_28px_-14px_rgba(0,0,0,0.28)]"
      >
        {safe.map((action) => (
          <DropdownMenuItem
            key={action}
            onSelect={() => onSelect(action)}
            className="cursor-pointer rounded-md px-2.5 py-[7px] text-[13px] font-medium leading-5 text-[var(--lp-ink-soft)] transition-colors focus:bg-[var(--lp-panel-2)] focus:text-[var(--lp-ink)]"
          >
            {ACTION_LABELS[action]}
          </DropdownMenuItem>
        ))}
        {safe.length > 0 && risky.length > 0 && (
          <DropdownMenuSeparator className="-mx-1 my-1 h-px bg-[var(--lp-line)]" />
        )}
        {risky.map((action) => (
          <DropdownMenuItem
            key={action}
            onSelect={() => onSelect(action)}
            className={cn(
              "cursor-pointer rounded-md px-2.5 py-[7px] text-[13px] font-medium leading-5 transition-colors",
              action === "remove"
                ? "text-rose-600 focus:bg-rose-500/[0.08] focus:text-rose-600 dark:text-rose-300 dark:focus:text-rose-200"
                : "text-amber-700 focus:bg-amber-500/[0.08] focus:text-amber-700 dark:text-amber-300 dark:focus:text-amber-200",
            )}
          >
            {ACTION_LABELS[action]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UsersPage;
