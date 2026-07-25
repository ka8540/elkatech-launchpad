import {
  Activity,
  Bug,
  ClipboardList,
  Gauge,
  HardDrive,
  Inbox,
  MessageSquareWarning,
  Users,
  Users2,
} from "lucide-react";
import {
  canAccessAdminPanel,
  canManageOperational,
  canManageUsers,
  canViewCustomerActivity,
  canViewReports,
  canViewSupportDashboard,
  type Role,
} from "@elkatech/contracts";

export type NavItem = {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  exact?: boolean;
  activeWhen?: (pathname: string) => boolean;
};

const requestsItem: NavItem = {
  to: "/app/requests",
  icon: ClipboardList,
  label: "Requests",
  // `/app/requests/new` lives under this entry. The standalone "Create
  // Request" item was removed (the Requests page already links to it), so the
  // create page must light up Requests instead of leaving nothing active.
  activeWhen: (pathname) =>
    pathname === "/app/requests" || pathname.startsWith("/app/requests/"),
};

/**
 * Build the portal sidebar for a role. Each entry is gated by the same
 * permission helper the gateway enforces, so the sidebar never offers a page
 * the API would 403. Lives outside `PortalShell.tsx` so it can be unit-tested
 * without mounting the shell (and so fast-refresh keeps working).
 */
export function buildNavItems(role: Role | undefined): NavItem[] {
  // Staff = anyone who works the queue (engineer, support, owner, admin).
  const isStaff =
    role === "engineer" || role === "support" || role === "owner" || role === "admin";

  return [
    // The admin's operational landing page leads their list.
    ...(role && canAccessAdminPanel(role)
      ? [{ to: "/app/admin", icon: Gauge, label: "Overview" }]
      : []),
    requestsItem,
    ...(isStaff ? [{ to: "/app/queue", icon: Inbox, label: "Queue" }] : []),
    // Admin-only staff console. Customer-owned reports use My Reports below.
    ...(role && canViewReports(role)
      ? [
          {
            to: "/app/reports",
            icon: Bug,
            label: "Issue Reports",
            // `/app/reports/new` and the detail page live under this entry.
            activeWhen: (pathname: string) =>
              pathname === "/app/reports" || pathname.startsWith("/app/reports/"),
          },
        ]
      : []),
    // Customers get their own list instead; "Report a problem" lives on it.
    ...(role === "customer"
      ? [
          {
            to: "/app/my-reports",
            icon: MessageSquareWarning,
            label: "My Reports",
            activeWhen: (pathname: string) =>
              pathname === "/app/my-reports" ||
              pathname.startsWith("/app/my-reports/") ||
              pathname === "/app/reports/new",
          },
        ]
      : []),
    ...(role && canViewSupportDashboard(role)
      ? [
          {
            to: "/app/activity",
            icon: Activity,
            label: "Activity",
            // Person pages live under this entry.
            activeWhen: (pathname: string) =>
              pathname === "/app/activity" || pathname.startsWith("/app/activity/"),
          },
        ]
      : []),
    // Customer Activity is folded into Activity for admins only. Support and
    // owner keep the entry, and the route itself stays mounted for every
    // permitted role (admin included) so existing direct links keep working.
    ...(role && role !== "admin" && canViewCustomerActivity(role)
      ? [{ to: "/app/customer-activity", icon: Users2, label: "Customer Activity" }]
      : []),
    ...(role && canManageOperational(role)
      ? [{ to: "/app/machines", icon: HardDrive, label: "Customer Machines" }]
      : []),
    ...(role && canManageUsers(role)
      ? [{ to: "/app/users", icon: Users, label: "Users" }]
      : []),
  ];
}
