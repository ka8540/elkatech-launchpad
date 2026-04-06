import { LogOut, ShieldCheck, Ticket, UserPlus, Wrench } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { useSession } from "@/hooks/use-session";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";

const PortalShell = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useSession();

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("/api/auth/logout", { method: "POST" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      navigate("/login");
    },
  });

  const user = data?.user;
  const isStaff = user?.role === "engineer" || user?.role === "admin";

  return (
    <div className="min-h-screen bg-background">
      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <div className="fixed left-0 right-0 top-0 z-40 flex justify-center px-4 pt-3">
        <header className="w-full max-w-6xl rounded-2xl border border-border/60 bg-background/85 px-5 shadow-soft backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between gap-4">

            {/* Logo — clicking takes you back to the marketing homepage */}
            <Link
              to="/"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
              title="Back to homepage"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <p className="font-display text-base font-semibold leading-none text-foreground">
                  Elkatech
                </p>
                <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Service Platform
                </p>
              </div>
            </Link>

            {/* Center nav links */}
            <nav className="hidden items-center gap-1 md:flex">
              <NavLink
                to="/app/requests"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeClassName="bg-muted text-foreground"
              >
                <Ticket className="h-4 w-4" />
                Requests
              </NavLink>

              {isStaff && (
                <NavLink
                  to="/app/queue"
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  activeClassName="bg-muted text-foreground"
                >
                  <Wrench className="h-4 w-4" />
                  Queue
                </NavLink>
              )}

              {user?.role === "admin" && (
                <NavLink
                  to="/app/users"
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  activeClassName="bg-muted text-foreground"
                >
                  <UserPlus className="h-4 w-4" />
                  Users
                </NavLink>
              )}
            </nav>

            {/* Right side: user info + actions */}
            <div className="flex items-center gap-3">
              {user && (
                <div className="hidden flex-col items-end leading-tight md:flex">
                  <span className="text-sm font-medium text-foreground">
                    {user.displayName}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-accent">
                    {user.role}
                  </span>
                </div>
              )}
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="mr-1.5 h-4 w-4" />
                Logout
              </Button>
            </div>

          </div>
        </header>
      </div>

      {/* ── Page content ───────────────────────────────────────────────────── */}
      <main className="container mx-auto px-4 pb-12 pt-24 md:px-6 md:pt-28">
        <Outlet />
      </main>
    </div>
  );
};

export default PortalShell;
