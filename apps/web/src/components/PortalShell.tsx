import { useState, useEffect, useRef } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleUser,
  ClipboardList,
  Gauge,
  Inbox,
  LogOut,
  Menu,
  Moon,
  Sun,
  SunMoon,
  Users,
  PlusCircle,
  X,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { firebaseSignOut } from "@/lib/firebase";
import { useSession } from "@/hooks/use-session";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

/* ── Types ───────────────────────────────────────────────────────────────── */
type NavItem = {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  exact?: boolean;
  activeWhen?: (pathname: string) => boolean;
};

/* ── Real ElkaTech SVG logo mark (copper accent, matches premium brand) ──── */
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
        stroke="var(--lp-accent)"
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
        stroke="var(--lp-accent)"
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
      <circle cx="68" cy="50" r="6" fill="var(--lp-accent)" />
    </svg>
  );
}

/* ── Theme selector with selectable Light / Dark / System dropdown ───────── */
const THEME_OPTIONS = [
  { value: "light" as const, icon: Sun, label: "Light" },
  { value: "dark" as const, icon: Moon, label: "Dark" },
  { value: "system" as const, icon: SunMoon, label: "System" },
];

function ThemeSelector({
  compact = false,
  showLabel = false,
  menuSide = "right",
}: {
  compact?: boolean;
  showLabel?: boolean;
  menuSide?: "right" | "bottom";
}) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current =
    THEME_OPTIONS.find((o) => o.value === theme) ?? THEME_OPTIONS[2];
  const CurrentIcon = current.icon;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={compact ? `Theme: ${current.label}` : undefined}
        aria-label={compact ? `Theme: ${current.label}` : undefined}
        className={cn(
          "flex items-center rounded-lg border border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)] transition-colors duration-150",
          "hover:border-[var(--lp-accent)]/45 hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/40",
          compact
            ? "h-9 w-9 justify-center px-0"
            : "h-10 w-full items-center justify-start gap-2 px-3 py-2",
        )}
      >
        <span className="flex items-center gap-2">
          <CurrentIcon className="h-[15px] w-[15px] shrink-0" />
        </span>
        {showLabel && (
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--lp-faint)]">
            {current.label}
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                open && "rotate-90",
              )}
            />
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Select theme"
          className={cn(
            "absolute z-[60] w-44 overflow-hidden rounded-xl border border-[var(--lp-line-strong)] p-1",
            "bg-[var(--lp-panel)] text-[var(--lp-ink)] shadow-[0_16px_36px_-18px_rgba(0,0,0,0.55)]",
            /* Collapsed-sidebar popover: attach to the right of the trigger,
               vertically centered, with a clear gap so it reads as part of
               the sidebar rather than a floating block. */
            compact && menuSide === "right" && "left-full top-1/2 ml-2 -translate-y-1/2",
            compact && menuSide === "bottom" && "right-0 top-full mt-2",
            !compact && "bottom-full left-0 right-0 mb-2 w-auto",
          )}
        >
          {THEME_OPTIONS.map((opt) => {
            const OptIcon = opt.icon;
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setTheme(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/40",
                  active
                    ? "bg-[var(--lp-accent)]/14 text-[var(--lp-accent)]"
                    : "text-[var(--lp-ink-soft)] hover:bg-[var(--lp-panel-2)] hover:text-[var(--lp-ink)]",
                )}
              >
                <OptIcon className="h-[15px] w-[15px] shrink-0" />
                <span className="flex-1 text-left">{opt.label}</span>
                {active && <Check className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
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
  const isActive = item.activeWhen
    ? item.activeWhen(location.pathname)
    : item.exact
    ? location.pathname === item.to
    : location.pathname.startsWith(item.to);
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/45",
        isActive
          ? "bg-[var(--lp-accent)]/[0.12] text-[var(--lp-ink)] shadow-[inset_0_0_0_1px_var(--lp-accent)]"
          : "text-[var(--lp-ink-soft)] hover:bg-[var(--lp-panel-2)] hover:text-[var(--lp-ink)]",
        collapsed && "justify-center px-2.5",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      {/* Active copper edge indicator */}
      {isActive && !collapsed && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--lp-accent)]"
        />
      )}
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          isActive
            ? "text-[var(--lp-accent)]"
            : "text-[var(--lp-faint)] group-hover:text-[var(--lp-ink)]",
        )}
      />
      {!collapsed && <span className="truncate leading-none">{item.label}</span>}
    </Link>
  );
}

/* ── Persisted sidebar collapsed state ───────────────────────────────────── */
const SIDEBAR_COLLAPSED_KEY = "elkatech-portal-sidebar-collapsed";

function readInitialCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

/* ── Main PortalShell ────────────────────────────────────────────────────── */
const PortalShell = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useSession();
  // Initialise from localStorage synchronously so the first paint already
  // reflects the user's last choice — no expand-then-collapse flicker on
  // refresh.
  const [collapsed, setCollapsedState] = useState<boolean>(() => readInitialCollapsed());
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const setCollapsed = (next: boolean) => {
    setCollapsedState(next);
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "true" : "false");
    } catch {
      // localStorage may be disabled (private mode, etc.); ignore.
    }
  };

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/auth/logout", { method: "POST" });
      try {
        await firebaseSignOut();
      } catch {
        // Server session is already gone; ignore Firebase cleanup failures.
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      navigate("/login");
    },
  });

  const user = data?.user;
  const isStaff = user?.role === "engineer" || user?.role === "admin";

  const requestsItem: NavItem = {
    to: "/app/requests",
    icon: ClipboardList,
    label: "Requests",
    activeWhen: (pathname) =>
      pathname === "/app/requests" ||
      (pathname.startsWith("/app/requests/") && pathname !== "/app/requests/new"),
  };

  const createRequestItem: NavItem = {
    to: "/app/requests/new",
    icon: PlusCircle,
    label: "Create Request",
    exact: true,
  };

  const navItems: NavItem[] = [
    requestsItem,
    createRequestItem,
    ...(isStaff
      ? [{ to: "/app/queue", icon: Inbox, label: "Queue" }]
      : []),
    ...(user?.role === "admin"
      ? [
          { to: "/app/admin", icon: Gauge, label: "Admin" },
          { to: "/app/users", icon: Users, label: "Users" },
        ]
      : []),
  ];

  const sidebarWidth = collapsed ? "76px" : "276px";

  /* ── Sidebar content (shared desktop + mobile drawer) ──────────────────── */
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex h-full flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      {collapsed && !isMobile ? (
        /* Collapsed: clean centered logo mark. The collapse/expand control now
           lives as a floating button on the sidebar edge (see desktop aside). */
        <div className="flex items-center justify-center border-b border-[var(--lp-line)] px-3 py-5">
          <Link
            to="/app/requests"
            title="ElkaTech"
            aria-label="ElkaTech"
            className="flex h-11 w-11 items-center justify-center text-[var(--lp-ink)] transition-opacity hover:opacity-80"
          >
            <ElkaTechMark size={40} />
          </Link>
        </div>
      ) : (
        /* Expanded / mobile: brand block. */
        <div className="relative border-b border-[var(--lp-line)] px-5 py-5">
          <Link
            to="/app/requests"
            title="ElkaTech"
            className="flex items-center gap-3 text-[var(--lp-ink)] transition-opacity hover:opacity-80"
          >
            <span className="shrink-0">
              <ElkaTechMark size={38} />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="lp-display text-base font-bold leading-none text-[var(--lp-ink)]">
                ElkaTech
              </p>
              <p className="lp-mono mt-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--lp-faint)]">
                Service Platform
              </p>
            </div>
          </Link>

          {isMobile && (
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--lp-line)] bg-[var(--lp-panel)]/70 text-[var(--lp-ink-soft)] shadow-sm transition-colors backdrop-blur-md",
                "hover:border-[var(--lp-line-strong)] hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/45",
              )}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

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
      <div className="space-y-0 border-t border-[var(--lp-line)] pb-4 pt-3">

        {/* ── Group A: Theme selector ───────────────────────────────────── */}
        <div className="px-3 pb-3">
          {collapsed && !isMobile ? (
            <div className="flex justify-center">
              <ThemeSelector compact />
            </div>
          ) : (
            <ThemeSelector showLabel />
          )}
        </div>

        {/* Divider A→B */}
        <div className="mx-3 border-t border-[var(--lp-line)]" />

        {/* ── Group B: User profile ──────────────────────────────────────── */}
        {user && (
          <div className="px-3 pb-2 pt-3">
            {collapsed && !isMobile ? (
              /* Collapsed: just avatar with tooltip */
              <div className="flex justify-center">
                <div
                  title={`${user.displayName} — ${user.role}`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--lp-accent)] to-[var(--lp-accent-2)] text-xs font-bold text-[#08090b]"
                >
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              </div>
            ) : (
              /* Expanded: full profile block */
              <div className="flex items-center gap-2.5 rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/60 px-3 py-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--lp-accent)] to-[var(--lp-accent-2)] text-xs font-bold text-[#08090b]">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[var(--lp-ink)]">
                    {user.displayName}
                  </p>
                  <p className="truncate text-[11px] text-[var(--lp-faint)]">
                    {user.email}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Divider B→Account */}
        <div className="mx-3 border-t border-[var(--lp-line)]" />

        {/* ── Group C: My Account ────────────────────────────────────────── */}
        <div className="px-3 pt-3">
          {collapsed && !isMobile ? (
            <div className="flex justify-center">
              <Link
                to="/app/account"
                title="My Account"
                aria-label="My Account"
                aria-current={location.pathname.startsWith("/app/account") ? "page" : undefined}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl border transition-all",
                  location.pathname.startsWith("/app/account")
                    ? "border-[var(--lp-accent)]/55 bg-[var(--lp-accent)]/12 text-[var(--lp-accent)]"
                    : "border-[var(--lp-line)] bg-[var(--lp-panel)]/50 text-[var(--lp-faint)] hover:border-[var(--lp-accent)]/45 hover:text-[var(--lp-accent)]",
                )}
              >
                <CircleUser className="h-[15px] w-[15px]" />
              </Link>
            </div>
          ) : (
            <Link
              to="/app/account"
              aria-current={location.pathname.startsWith("/app/account") ? "page" : undefined}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition-all",
                location.pathname.startsWith("/app/account")
                  ? "border-[var(--lp-accent)]/55 bg-[var(--lp-accent)]/12 text-[var(--lp-accent)]"
                  : "border-[var(--lp-line)] bg-[var(--lp-panel)]/50 text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/45 hover:text-[var(--lp-accent)]",
              )}
            >
              <CircleUser className="h-[15px] w-[15px] shrink-0" />
              <span>My Account</span>
            </Link>
          )}
        </div>

        {/* Divider Account→Logout */}
        <div className="mx-3 mt-3 border-t border-[var(--lp-line)]" />

        {/* ── Group D: Logout ────────────────────────────────────────────── */}
        <div className="px-3 pt-3">
          {collapsed && !isMobile ? (
            <div className="flex justify-center">
              <button
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
                title="Log out"
                aria-label="Log out"
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel)]/50 text-[var(--lp-faint)] transition-all",
                  "hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-400",
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
                "flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel)]/50 px-3 py-2 text-[13px] font-medium text-[var(--lp-ink-soft)] transition-all",
                "hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-400",
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
    <div className="lp lp-portal-bg relative flex min-h-screen text-[var(--lp-ink)]">

      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside
        style={{ width: sidebarWidth }}
        className="relative z-30 hidden shrink-0 flex-col transition-[width] duration-200 ease-in-out lg:flex"
        aria-label="Main navigation"
      >
        <div
          className="fixed z-30 flex h-screen overflow-visible flex-col border-r border-[var(--lp-line-strong)] bg-[var(--lp-panel)] shadow-[1px_0_24px_rgba(0,0,0,0.16)] transition-[width] duration-200 ease-in-out"
          style={{ width: sidebarWidth }}
        >
          {/* Restrained blueprint grid only — no copper glow, no shine */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 lp-grid-fine opacity-[0.18]"
            style={{
              maskImage: "linear-gradient(to bottom, black, transparent 70%)",
              WebkitMaskImage: "linear-gradient(to bottom, black, transparent 70%)",
            }}
          />
          <div className="relative z-10 flex h-full flex-col">
            <SidebarContent />
          </div>

          {/* ── Floating collapse / expand control, centered beside the logo. */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className={cn(
              "absolute right-0 top-[44px] z-30 flex h-8 w-8 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full",
              "border border-[var(--lp-line-strong)] bg-[var(--lp-panel)]/95 text-[var(--lp-ink-soft)] shadow-[0_6px_22px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all duration-150",
              "hover:border-[var(--lp-accent)] hover:text-[var(--lp-accent)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/45 focus-visible:ring-offset-0",
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
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
          "fixed inset-y-0 left-0 z-50 w-[276px] flex-col border-r border-[var(--lp-line-strong)] bg-[var(--lp-panel)] shadow-[2px_0_24px_rgba(0,0,0,0.28)] transition-transform duration-200 ease-in-out lg:hidden",
          mobileOpen ? "flex translate-x-0" : "-translate-x-full",
        )}
        aria-label="Mobile navigation"
      >
        <SidebarContent isMobile />
      </div>

      {/* ── Main content area ────────────────────────────────────────────── */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Restrained blueprint grid only — no copper top glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 lp-grid opacity-[0.22]"
          style={{
            maskImage: "linear-gradient(to bottom, black, transparent 75%)",
            WebkitMaskImage: "linear-gradient(to bottom, black, transparent 75%)",
          }}
        />

        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--lp-line)] bg-[var(--lp-bg)]/85 px-4 py-3 backdrop-blur-xl lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel)]/60 text-[var(--lp-ink-soft)] transition-all",
              "hover:border-[var(--lp-line-strong)] hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]",
            )}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/" className="flex items-center gap-2" title="Back to homepage">
            <span className="text-[var(--lp-ink)]">
              <ElkaTechMark size={28} />
            </span>
            <div className="leading-tight">
              <p className="lp-display text-[13px] font-bold text-[var(--lp-ink)]">ElkaTech</p>
              <p className="lp-mono text-[9px] uppercase tracking-[0.16em] text-[var(--lp-faint)]">
                Service Platform
              </p>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <ThemeSelector compact menuSide="bottom" />
            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--lp-line)] bg-[var(--lp-panel)]/60 text-[var(--lp-faint)] transition-all",
                "hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-400",
              )}
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="relative z-10 flex-1 overflow-x-hidden px-4 py-8 md:px-6 md:py-10 lg:px-8 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PortalShell;
