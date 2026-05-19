import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Inbox,
  LogOut,
  Menu,
  Moon,
  Sun,
  SunMoon,
  Users,
  X,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { useSession } from "@/hooks/use-session";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

/* ── Types ───────────────────────────────────────────────────────────────── */
type NavItem = {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  exact?: boolean;
};

/* ── Real ElkaTech SVG logo mark (matches SiteHeader) ─────────────────── */
function ElkaTechMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="12"
        y="12"
        width="76"
        height="76"
        rx="12"
        stroke="hsl(var(--accent))"
        strokeWidth="2.5"
        fill="none"
      />
      <path
        d="M30 30 L55 30"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M30 50 L50 50"
        stroke="hsl(var(--accent))"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M30 70 L55 70"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M30 30 L30 70"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="68" cy="50" r="6" fill="hsl(var(--accent))" />
    </svg>
  );
}

/* ── Inline theme cycle button (no dropdown, avoids popover z-index issues) */
function ThemeCycleButton({
  compact = false,
  showLabel = false,
}: {
  compact?: boolean;
  showLabel?: boolean;
}) {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "light" as const, icon: Sun, label: "Light" },
    { value: "dark" as const, icon: Moon, label: "Dark" },
    { value: "system" as const, icon: SunMoon, label: "System" },
  ];

  const current = options.find((o) => o.value === theme) ?? options[2];
  const Icon = current.icon;

  const cycle = () => {
    const idx = options.findIndex((o) => o.value === theme);
    setTheme(options[(idx + 1) % options.length].value);
  };

  return (
    <button
      onClick={cycle}
      title={`Theme: ${current.label} — click to cycle`}
      aria-label={`Current theme: ${current.label}. Click to cycle.`}
      className={cn(
        "flex items-center gap-2 rounded-xl border transition-all duration-150",
        "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        "dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-slate-200",
        compact
          ? "h-8 w-8 justify-center px-0"
          : "h-9 w-full justify-start px-3 py-2",
      )}
    >
      <Icon className="h-[15px] w-[15px] shrink-0" />
      {showLabel && (
        <span className="text-[13px] font-medium">{current.label}</span>
      )}
    </button>
  );
}

/* ── Sidebar nav item ────────────────────────────────────────────────────── */
function SidebarNavItem({
  item,
  collapsed,
  onClick,
}: {
  item: NavItem;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const location = useLocation();
  const isActive = item.exact
    ? location.pathname === item.to
    : location.pathname.startsWith(item.to);
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
        isActive
          ? [
              // Dark active
              "dark:bg-[#1a3a5c] dark:text-white dark:shadow-[0_0_0_1px_rgba(59,130,246,0.25)]",
              // Light active
              "bg-blue-50 text-blue-700 shadow-[0_0_0_1px_rgba(59,130,246,0.18)] border border-blue-200",
            ]
          : [
              // Dark inactive
              "dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-100",
              // Light inactive
              "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent",
            ],
        collapsed && "justify-center px-2.5",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          isActive
            ? "dark:text-blue-300 text-blue-600"
            : "dark:text-slate-500 dark:group-hover:text-slate-300 text-slate-400 group-hover:text-slate-700",
        )}
      />
      {!collapsed && <span className="truncate leading-none">{item.label}</span>}
    </Link>
  );
}

/* ── Main PortalShell ────────────────────────────────────────────────────── */
const PortalShell = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("/api/auth/logout", { method: "POST" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      navigate("/login");
    },
  });

  const user = data?.user;
  const isStaff = user?.role === "engineer" || user?.role === "admin";

  const navItems: NavItem[] = [
    {
      to: "/app/requests",
      icon: ClipboardList,
      label: user?.role === "customer" ? "My Requests" : "Requests",
    },
    ...(isStaff
      ? [{ to: "/app/queue", icon: Inbox, label: "Queue" }]
      : []),
    ...(user?.role === "admin"
      ? [{ to: "/app/users", icon: Users, label: "Users" }]
      : []),
  ];

  const sidebarWidth = collapsed ? "72px" : "272px";

  /* ── Sidebar content (shared desktop + mobile drawer) ──────────────────── */
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex h-full flex-col">

      {/* ── Header: brand left, collapse right ────────────────────────────── */}
      <div
        className={cn(
          "flex items-center border-b px-5 py-5",
          "border-slate-200 dark:border-white/10",
          collapsed && !isMobile ? "justify-center px-3 py-4" : "justify-between gap-4",
        )}
      >
        {/* Brand block */}
        <Link
          to="/"
          title="Back to homepage"
          className={cn(
            "flex items-center gap-2.5 transition-opacity hover:opacity-80",
            "text-slate-950 dark:text-white",
            collapsed && !isMobile && "justify-center",
          )}
        >
          <span className="shrink-0">
            <ElkaTechMark size={collapsed && !isMobile ? 28 : 32} />
          </span>
          {(!collapsed || isMobile) && (
            <div className="min-w-0 leading-tight">
              <p className="font-display text-[15px] font-bold leading-none text-slate-950 dark:text-white">
                ElkaTech
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                Service Platform
              </p>
            </div>
          )}
        </Link>

        {/* Collapse toggle – desktop only */}
        {!isMobile && (
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all",
              "border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700",
              "dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-slate-200",
              collapsed && "mt-0",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        )}

        {/* Close button – mobile only */}
        {isMobile && (
          <button
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg border transition-all",
              "border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700",
              "dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-slate-200",
            )}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Nav items ─────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Portal navigation">
        <div className="space-y-1">
          {navItems.map((item) => (
            <SidebarNavItem
              key={item.to}
              item={item}
              collapsed={collapsed && !isMobile}
              onClick={isMobile ? () => setMobileOpen(false) : undefined}
            />
          ))}
        </div>
      </nav>

      {/* ── Bottom section ─────────────────────────────────────────────────── */}
      <div className={cn(
        "border-t space-y-0 pb-4 pt-3",
        "border-slate-200 dark:border-white/10",
      )}>

        {/* ── Group A: Utility controls ─────────────────────────────────── */}
        <div className={cn(
          "px-3 pb-3",
          collapsed && !isMobile ? "space-y-1.5" : "space-y-1",
        )}>
          {/* Theme cycle */}
          {collapsed && !isMobile ? (
            <div className="flex justify-center">
              <ThemeCycleButton compact />
            </div>
          ) : (
            <ThemeCycleButton showLabel />
          )}

          {/* Back to website */}
          {collapsed && !isMobile ? (
            <div className="flex justify-center">
              <Link
                to="/"
                title="View public site"
                aria-label="View public site"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl border transition-all",
                  "border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700",
                  "dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-slate-200",
                )}
              >
                <ExternalLink className="h-[15px] w-[15px]" />
              </Link>
            </div>
          ) : (
            <Link
              to="/"
              className={cn(
                "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition-all",
                "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800",
                "dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-slate-200",
              )}
            >
              <ExternalLink className="h-[15px] w-[15px] shrink-0" />
              <span>Back to website</span>
            </Link>
          )}
        </div>

        {/* Divider A→B */}
        <div className="mx-3 border-t border-slate-200 dark:border-white/[0.07]" />

        {/* ── Group B: User profile ──────────────────────────────────────── */}
        {user && (
          <div className="px-3 pt-3 pb-2">
            {collapsed && !isMobile ? (
              /* Collapsed: just avatar with tooltip */
              <div className="flex justify-center">
                <div
                  title={`${user.displayName} — ${user.role}`}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold",
                    "bg-gradient-to-br from-blue-500/40 to-emerald-500/30 text-white",
                  )}
                >
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              </div>
            ) : (
              /* Expanded: full profile block */
              <div className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2.5",
                "bg-slate-100 dark:bg-white/[0.04]",
              )}>
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                  "bg-gradient-to-br from-blue-500/40 to-emerald-500/30 text-white",
                )}>
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-200">
                    {user.displayName}
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-blue-500 dark:text-blue-400">
                    {user.role}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Divider B→C */}
        <div className="mx-3 border-t border-slate-200 dark:border-white/[0.07]" />

        {/* ── Group C: Logout ────────────────────────────────────────────── */}
        <div className="px-3 pt-3">
          {collapsed && !isMobile ? (
            <div className="flex justify-center">
              <button
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                title="Log out"
                aria-label="Log out"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl border transition-all",
                  "border-slate-200 bg-slate-50 text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600",
                  "dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-300",
                  "disabled:opacity-50",
                )}
              >
                <LogOut className="h-[15px] w-[15px]" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition-all",
                "border-slate-200 bg-slate-50 text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600",
                "dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-300",
                "disabled:opacity-50",
              )}
            >
              <LogOut className="h-[15px] w-[15px] shrink-0" />
              <span>Log out</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#060e1a]">

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside
        style={{ width: sidebarWidth }}
        className={cn(
          "hidden shrink-0 flex-col border-r transition-[width] duration-200 ease-in-out lg:flex",
          "border-slate-200 bg-white dark:border-white/[0.07] dark:bg-[#070f1d]",
        )}
        aria-label="Main navigation"
      >
        <div className="fixed flex h-screen flex-col" style={{ width: sidebarWidth }}>
          <SidebarContent />
        </div>
      </aside>

      {/* ── Mobile overlay + drawer ──────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[272px] flex-col border-r transition-transform duration-200 ease-in-out lg:hidden",
          "border-slate-200 bg-white dark:border-white/[0.07] dark:bg-[#070f1d]",
          mobileOpen ? "flex translate-x-0" : "-translate-x-full",
        )}
        aria-label="Mobile navigation"
      >
        <SidebarContent isMobile />
      </div>

      {/* ── Main content area ────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">

        {/* Mobile top bar */}
        <div className={cn(
          "sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-3 backdrop-blur-sm lg:hidden",
          "border-slate-200 bg-white/90 dark:border-white/[0.07] dark:bg-[#070f1d]/90",
        )}>
          <button
            onClick={() => setMobileOpen(true)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl border transition-all",
              "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900",
              "dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-slate-200",
            )}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/" className="flex items-center gap-2" title="Back to homepage">
            <span className="text-slate-950 dark:text-white">
              <ElkaTechMark size={28} />
            </span>
            <div className="leading-tight">
              <p className="text-[13px] font-bold text-slate-950 dark:text-white">ElkaTech</p>
              <p className="text-[9px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                Service Platform
              </p>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <ThemeCycleButton compact />
            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border transition-all",
                "border-slate-200 bg-slate-50 text-slate-400 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600",
                "dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300",
              )}
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden px-4 py-8 md:px-6 md:py-10 lg:px-8 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PortalShell;
