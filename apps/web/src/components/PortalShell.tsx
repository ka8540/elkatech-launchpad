import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Inbox,
  LogOut,
  Menu,
  Monitor,
  ShieldCheck,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { useSession } from "@/hooks/use-session";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

/* ── Types ───────────────────────────────────────────────────────────────── */
type NavItem = {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  exact?: boolean;
};

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
          ? "bg-[#1a3a5c] text-white shadow-[0_0_0_1px_rgba(59,130,246,0.25)]"
          : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100",
        collapsed && "justify-center px-2.5",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors",
          isActive ? "text-blue-300" : "text-slate-500 group-hover:text-slate-300",
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

  const sidebarWidth = collapsed ? "88px" : "280px";

  /* ── Sidebar content (shared desktop + mobile drawer) ──────────────────── */
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex h-full flex-col">
      {/* Brand block */}
      <div
        className={cn(
          "flex items-center gap-3 border-b border-white/10 px-4 py-5",
          collapsed && !isMobile && "justify-center px-3",
        )}
      >
        <Link
          to="/"
          title="Back to homepage"
          className={cn(
            "flex items-center gap-3 transition-opacity hover:opacity-80",
            collapsed && !isMobile && "justify-center",
          )}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          {(!collapsed || isMobile) && (
            <div className="min-w-0 leading-tight">
              <p className="font-display text-[15px] font-bold leading-none text-white">
                ElkaTech
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
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
              "ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 transition hover:bg-white/[0.08] hover:text-slate-200",
              collapsed && "ml-0",
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
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
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

      {/* Bottom: user + theme + logout */}
      <div className="border-t border-white/10 px-3 pb-4 pt-3">
        {/* User info */}
        {user && (!collapsed || isMobile) && (
          <div className="mb-3 flex items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/40 to-emerald-500/30 text-xs font-bold text-white">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-slate-200">
                {user.displayName}
              </p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-blue-400">
                {user.role}
              </p>
            </div>
          </div>
        )}

        <div
          className={cn(
            "flex items-center gap-2",
            collapsed && !isMobile ? "flex-col" : "flex-row",
          )}
        >
          {/* Theme toggle */}
          <div
            className={cn(
              "flex items-center justify-center",
              collapsed && !isMobile ? "w-full" : "",
            )}
          >
            <ThemeToggle />
          </div>

          {/* Monitor (preview) icon – desktop portal link */}
          {(!collapsed || isMobile) && (
            <Link
              to="/"
              title="View public site"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 transition hover:bg-white/[0.08] hover:text-slate-200"
            >
              <Monitor className="h-4 w-4" />
            </Link>
          )}

          {/* Logout */}
          <button
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            title="Log out"
            className={cn(
              "flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] font-medium text-slate-400 transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50",
              collapsed && !isMobile
                ? "w-full justify-center px-0"
                : "flex-1 justify-center",
            )}
          >
            <LogOut className="h-[15px] w-[15px] shrink-0" />
            {(!collapsed || isMobile) && <span>Log out</span>}
          </button>
        </div>

        {/* Collapsed: show user initial */}
        {collapsed && !isMobile && user && (
          <div className="mt-2 flex w-full justify-center">
            <div
              title={user.displayName}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/40 to-emerald-500/30 text-xs font-bold text-white"
            >
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#060e1a]">
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside
        style={{ width: sidebarWidth }}
        className="hidden shrink-0 flex-col border-r border-white/[0.07] bg-[#070f1d] transition-[width] duration-200 ease-in-out lg:flex"
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
          "fixed inset-y-0 left-0 z-50 w-[280px] flex-col border-r border-white/[0.07] bg-[#070f1d] transition-transform duration-200 ease-in-out lg:hidden",
          mobileOpen ? "flex translate-x-0" : "-translate-x-full",
        )}
        aria-label="Mobile navigation"
      >
        <SidebarContent isMobile />
      </div>

      {/* ── Main content area ────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/[0.07] bg-[#070f1d]/90 px-4 py-3 backdrop-blur-sm lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 transition hover:bg-white/[0.08] hover:text-slate-200"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link to="/" className="flex items-center gap-2.5" title="Back to homepage">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/10 text-blue-300">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="text-[13px] font-bold text-white">ElkaTech</p>
              <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">
                Service Platform
              </p>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300"
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
