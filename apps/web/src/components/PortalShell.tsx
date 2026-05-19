import { useState, useEffect, useRef } from "react";
import {
  Check,
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
          "flex items-center rounded-xl border transition-all duration-150",
          "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          "dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-slate-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
          compact
            ? "h-8 w-8 justify-center px-0"
            : "h-9 w-full justify-between gap-2 px-3 py-2",
        )}
      >
        <span className="flex items-center gap-2">
          <CurrentIcon className="h-[15px] w-[15px] shrink-0" />
          {showLabel && (
            <span className="text-[13px] font-medium">Theme</span>
          )}
        </span>
        {showLabel && (
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-slate-400 dark:text-slate-500">
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
            "absolute z-[60] w-44 overflow-hidden rounded-2xl border p-1.5",
            "bg-white text-slate-900 border-slate-200 shadow-lg",
            "dark:bg-[#07111f] dark:text-white dark:border-white/10 dark:shadow-[0_18px_50px_rgba(0,0,0,0.35)]",
            compact && menuSide === "right" && "bottom-0 left-full ml-3",
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
                  "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
                  active
                    ? "bg-blue-50 text-blue-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                    : "hover:bg-slate-100 dark:hover:bg-white/[0.08]",
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

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      {collapsed && !isMobile ? (
        /* Collapsed: expand button on top, logo centered below */
        <div className="flex flex-col items-center border-b border-slate-200 px-3 py-4 dark:border-white/10">
          <button
            onClick={() => setCollapsed(false)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border transition-all",
              "border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700",
              "dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-slate-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
            )}
            aria-label="Expand sidebar"
            aria-expanded={false}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <Link
            to="/"
            title="Back to homepage"
            aria-label="ElkaTech"
            className="mt-5 flex items-center justify-center text-slate-950 transition-opacity hover:opacity-80 dark:text-white"
          >
            <ElkaTechMark size={42} />
          </Link>
        </div>
      ) : (
        /* Expanded / mobile: control row on top, brand block below */
        <div className="border-b border-slate-200 px-5 py-5 dark:border-white/10">
          <div className="flex justify-end">
            {isMobile ? (
              <button
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg border transition-all",
                  "border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700",
                  "dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-slate-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
                )}
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => setCollapsed(true)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg border transition-all",
                  "border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-700",
                  "dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:bg-white/[0.08] dark:hover:text-slate-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
                )}
                aria-label="Collapse sidebar"
                aria-expanded
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>
          <Link
            to="/"
            title="Back to homepage"
            className="mt-4 flex items-center gap-3 text-slate-950 transition-opacity hover:opacity-80 dark:text-white"
          >
            <span className="shrink-0">
              <ElkaTechMark size={38} />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="font-display text-base font-bold leading-none text-slate-950 dark:text-white">
                ElkaTech
              </p>
              <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Service Platform
              </p>
            </div>
          </Link>
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
      <div className={cn(
        "border-t space-y-0 pb-4 pt-3",
        "border-slate-200 dark:border-white/10",
      )}>

        {/* ── Group A: Utility controls ─────────────────────────────────── */}
        <div className={cn(
          "px-3 pb-3",
          collapsed && !isMobile ? "space-y-1.5" : "space-y-1",
        )}>
          {/* Theme selector */}
          {collapsed && !isMobile ? (
            <div className="flex justify-center">
              <ThemeSelector compact />
            </div>
          ) : (
            <ThemeSelector showLabel />
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
            <ThemeSelector compact menuSide="bottom" />
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
