import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import type { ActivityMachine, ActivityPersonDetail, Role } from "@elkatech/contracts";
import { canAssignRequests, canManageOperational } from "@elkatech/contracts";
import { ApiError, apiRequest } from "@/lib/api";
import { PAGE_CONTAINER, PAGE_CONTAINER_READING } from "@/lib/page-layout";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import {
  APPROVAL_LABELS,
  ORIGIN_LABELS,
  TAB_EVENT_TYPES,
  describeCurrentWork,
  formatDate,
  formatRelative,
  personMetrics,
  personName,
  roleLabel,
  tabsForRole,
  type PersonTabId,
} from "@/lib/activity";
import ActivityHistoryTable from "@/components/activity/ActivityHistoryTable";
import TaskTable from "@/components/activity/TaskTable";
import {
  ApprovalBadge,
  RoleBadge,
  SkeletonRows,
  TableMessage,
  TableShell,
  Td,
  Th,
  Tr,
} from "@/components/activity/entities";

function Breadcrumbs({ role, name }: { role: Role; name: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[var(--lp-faint)]">
      <Link
        to="/app/activity"
        className="rounded-sm hover:text-[var(--lp-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/45"
      >
        Activity
      </Link>
      <ChevronRight className="h-3 w-3" aria-hidden="true" />
      <span>{roleLabel(role)}</span>
      <ChevronRight className="h-3 w-3" aria-hidden="true" />
      <span className="text-[var(--lp-ink-soft)]">{name}</span>
    </nav>
  );
}

function MachinesTable({ userId }: { userId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["activity-machines", userId],
    queryFn: () =>
      apiRequest<{ machines: ActivityMachine[] }>(`/api/activity/people/${userId}/machines`),
  });
  const machines = data?.machines ?? [];

  return (
    <TableShell>
      <table className="w-full min-w-[680px] table-fixed text-sm">
        <colgroup>
          <col className="w-[24%]" />
          <col className="w-[26%]" />
          <col className="w-[11%]" />
          <col className="w-[27%]" />
          <col className="w-[12%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-[var(--lp-line)]">
            <Th>Machine</Th>
            <Th>Product</Th>
            <Th>Unit</Th>
            <Th>Site</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading && <SkeletonRows colSpan={5} rows={3} />}
          {isError && !isLoading && (
            <TableMessage colSpan={5} tone="error">
              Could not load machines.
            </TableMessage>
          )}
          {!isLoading && !isError && machines.length === 0 && (
            <TableMessage colSpan={5}>No machines are linked to this account.</TableMessage>
          )}
          {machines.map((machine) => (
            <Tr key={machine.id}>
              <Td className="truncate font-medium text-[var(--lp-ink)]">{machine.displayLabel}</Td>
              <Td className="truncate text-[var(--lp-ink-soft)]">{machine.productName}</Td>
              <Td className="truncate text-[var(--lp-ink-soft)]">{machine.unitNumber ?? "—"}</Td>
              <Td className="truncate text-[var(--lp-ink-soft)]">
                {machine.siteName ? `${machine.siteName} · ` : ""}
                {machine.siteLocation}
              </Td>
              <Td>
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                    machine.status === "active"
                      ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300"
                      : "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-faint)]",
                  )}
                >
                  {machine.status}
                </span>
              </Td>
            </Tr>
          ))}
        </tbody>
      </table>
    </TableShell>
  );
}

const PersonActivityPage = () => {
  const { userId = "" } = useParams();
  const { data: sessionData } = useSession();
  const actorRole = (sessionData?.user?.role ?? "customer") as Role;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["activity-person", userId],
    queryFn: () => apiRequest<ActivityPersonDetail>(`/api/activity/people/${userId}`),
    retry: false,
  });

  const tabs = useMemo(() => (data ? tabsForRole(data.person.role) : []), [data]);
  const [activeTab, setActiveTab] = useState<PersonTabId>("overview");
  const currentTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : "overview";

  if (isLoading) {
    return (
      <div className={PAGE_CONTAINER}>
        <div className="h-4 w-48 animate-pulse rounded bg-[var(--lp-panel-2)]" aria-hidden />
        <div className="h-24 animate-pulse rounded-xl bg-[var(--lp-panel-2)]" aria-hidden />
        <div className="h-64 animate-pulse rounded-xl bg-[var(--lp-panel-2)]" aria-hidden />
        <span className="sr-only" role="status">
          Loading person activity…
        </span>
      </div>
    );
  }

  if (isError) {
    const status = error instanceof ApiError ? error.status : 0;
    const forbidden = status === 403;
    return (
      <div className={PAGE_CONTAINER_READING}>
        <div className="rounded-xl border border-[var(--lp-line)] lp-card p-8 text-center">
          <h1 className="lp-display text-lg font-bold text-[var(--lp-ink)]">
            {forbidden ? "You cannot view this person" : "Could not load this person"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--lp-ink-soft)]">
            {forbidden
              ? "Your role only allows access to your own activity page."
              : status === 404
                ? "This account no longer exists."
                : "Something went wrong loading this activity page."}
          </p>
          <Link
            to="/app/requests"
            className="mt-4 inline-flex rounded-md border border-[var(--lp-line-strong)] px-3 py-1.5 text-sm font-medium text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:text-[var(--lp-accent)]"
          >
            Back to portal
          </Link>
        </div>
      </div>
    );
  }

  const person = data!.person;
  const isCustomer = person.role === "customer";
  const canAssign = canAssignRequests(actorRole);
  const canViewMachines = canManageOperational(actorRole);
  const metrics = personMetrics(person);
  const priorityEntries = Object.entries(data!.priorityDistribution ?? {});

  return (
    <div className={PAGE_CONTAINER}>
      <Breadcrumbs role={person.role} name={personName(person.displayName)} />

      {/* Identity header */}
      <header className="rounded-xl border border-[var(--lp-line)] lp-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="lp-display text-xl font-bold text-[var(--lp-ink)]">
                {personName(person.displayName)}
              </h1>
              <RoleBadge role={person.role} />
              <ApprovalBadge status={person.approvalStatus} />
            </div>
            <p className="mt-1 text-sm text-[var(--lp-ink-soft)]">{person.email}</p>
            {person.companyName && (
              <p className="text-sm text-[var(--lp-faint)]">{person.companyName}</p>
            )}
          </div>
          <Link
            to="/app/activity"
            className="w-fit shrink-0 rounded-md border border-[var(--lp-line-strong)] px-3 py-1.5 text-xs font-medium text-[var(--lp-ink-soft)] transition-colors hover:border-[var(--lp-accent)]/50 hover:text-[var(--lp-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/45"
          >
            Back to Activity
          </Link>
        </div>

        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--lp-line)] pt-3">
          {[
            { label: "Current role", value: roleLabel(person.role) },
            { label: "Account", value: APPROVAL_LABELS[person.approvalStatus] },
            { label: "Origin", value: ORIGIN_LABELS[person.accountOrigin] ?? person.accountOrigin },
            { label: "Joined", value: formatDate(person.createdAt) },
            { label: "Last seen", value: formatRelative(person.lastSeenAt) },
            {
              label: "Last recorded activity",
              value: person.lastRecordedActivityAt
                ? formatRelative(person.lastRecordedActivityAt)
                : "No recorded actions",
            },
            {
              label: "Current work",
              value: describeCurrentWork(person.state, person.stateCount ?? 0),
            },
          ].map((item) => (
            <div key={item.label}>
              <dt className="lp-mono text-[10px] uppercase tracking-[0.14em] text-[var(--lp-faint)]">
                {item.label}
              </dt>
              <dd className="mt-0.5 text-[13px] font-medium text-[var(--lp-ink)]">{item.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Person sections"
        className="flex flex-wrap gap-1 border-b border-[var(--lp-line)]"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={currentTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "-mb-px rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/45",
              currentTab === tab.id
                ? "border-[var(--lp-accent)] text-[var(--lp-ink)]"
                : "border-transparent text-[var(--lp-faint)] hover:text-[var(--lp-ink)]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {currentTab === "overview" && (
          <div className="space-y-4">
            <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/50 px-4 py-3">
              {metrics.map((metric) => (
                <div key={metric.label} className="flex items-baseline gap-2">
                  <dt className="lp-mono text-[10px] uppercase tracking-[0.14em] text-[var(--lp-faint)]">
                    {metric.label}
                  </dt>
                  <dd className="lp-display text-base font-bold text-[var(--lp-ink)]">
                    {metric.value}
                  </dd>
                </div>
              ))}
              {isCustomer && (
                <div className="flex items-baseline gap-2">
                  <dt className="lp-mono text-[10px] uppercase tracking-[0.14em] text-[var(--lp-faint)]">
                    Machines
                  </dt>
                  <dd className="lp-display text-base font-bold text-[var(--lp-ink)]">
                    {data!.machineCount}
                  </dd>
                </div>
              )}
            </dl>

            {priorityEntries.length > 0 && (
              <div className="rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/50 px-4 py-3">
                <p className="lp-mono mb-2 text-[10px] uppercase tracking-[0.14em] text-[var(--lp-faint)]">
                  Priority of active work
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                  {priorityEntries.map(([priority, count]) => (
                    <span key={priority} className="text-[13px] text-[var(--lp-ink-soft)]">
                      <span className="capitalize">{priority}</span>
                      <span className="ml-1.5 font-semibold text-[var(--lp-ink)]">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs leading-5 text-[var(--lp-faint)]">
              Activity history covers service actions recorded against requests. Account changes
              such as role edits, invites, approvals and suspensions are not recorded with an actor
              and timestamp, so they are not shown here.
            </p>
          </div>
        )}

        {currentTab === "tasks" && (
          <TaskTable
            userId={person.id}
            rel="engineer"
            canAssign={canAssign}
            canViewMachines={canViewMachines}
          />
        )}

        {currentTab === "requests" && (
          <TaskTable
            userId={person.id}
            rel="customer"
            canAssign={false}
            canViewMachines={canViewMachines}
          />
        )}

        {currentTab === "machines" && <MachinesTable userId={person.id} />}

        {(currentTab === "service" ||
          currentTab === "assignments" ||
          currentTab === "messages" ||
          currentTab === "operations") && (
          <ActivityHistoryTable
            userId={person.id}
            eventTypes={TAB_EVENT_TYPES[currentTab]}
            emptyMessage={
              currentTab === "assignments"
                ? "No assignments or reassignments recorded."
                : currentTab === "messages"
                  ? "No messages or internal notes recorded."
                  : "No service actions recorded."
            }
          />
        )}

        {currentTab === "history" && <ActivityHistoryTable userId={person.id} />}
      </div>
    </div>
  );
};

export default PersonActivityPage;
