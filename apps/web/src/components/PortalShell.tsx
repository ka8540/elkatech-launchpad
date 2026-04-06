import { LogOut, ShieldCheck, Ticket, UserPlus, Wrench } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Outlet, useNavigate } from "react-router-dom";
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
      <div className="fixed left-0 right-0 top-0 z-40 lg:flex lg:justify-center lg:px-4 lg:pt-3">
        <header className="w-full bg-background/85 px-4 shadow-soft backdrop-blur-xl md:px-6 lg:max-w-6xl lg:rounded-full lg:border lg:border-border/60">
          <div className="flex h-14 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-foreground">Elkatech</p>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Service Platform
                </p>
              </div>
            </div>

            <nav className="hidden items-center gap-2 md:flex">
              <NavLink
                to="/app/requests"
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeClassName="bg-muted text-foreground"
              >
                <span className="inline-flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  Requests
                </span>
              </NavLink>
              {isStaff && (
                <NavLink
                  to="/app/queue"
                  className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  activeClassName="bg-muted text-foreground"
                >
                  <span className="inline-flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Queue
                  </span>
                </NavLink>
              )}
              {user?.role === "admin" && (
                <NavLink
                  to="/app/users"
                  className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  activeClassName="bg-muted text-foreground"
                >
                  <span className="inline-flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Users
                  </span>
                </NavLink>
              )}
            </nav>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </header>
      </div>

      <main className="container mx-auto px-4 pb-12 pt-24 md:px-6 md:pt-28">
        <div className="mb-8 rounded-3xl border bg-card p-6 shadow-soft">
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <h1 className="font-display text-3xl font-bold text-foreground">{user?.displayName}</h1>
          <p className="mt-2 text-sm uppercase tracking-[0.2em] text-accent">{user?.role}</p>
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default PortalShell;
