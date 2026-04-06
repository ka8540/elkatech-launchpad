import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { AlertTriangle, Home, ArrowLeft, Wrench } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Blueprint grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(circle at 30% 20%, black 0%, transparent 60%)",
          WebkitMaskImage:
            "radial-gradient(circle at 30% 20%, black 0%, transparent 60%)",
        }}
      />

      {/* Soft radial glow */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-muted/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-muted/40 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-16">
        <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Left: Copy */}
          <div className="lg:col-span-6">
            {/* Caution badge */}
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm">
              <AlertTriangle className="h-4 w-4 text-foreground" />
              <span className="text-muted-foreground">
                Route not found:{" "}
                <span className="font-medium text-foreground">
                  {location.pathname}
                </span>
              </span>
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">
              Page Not Found
            </h1>

            <p className="mt-3 max-w-xl text-base text-muted-foreground md:text-lg">
              The page you’re trying to access doesn’t exist, moved, or the URL
              is incorrect. This is a navigation issue — not a server crash.
            </p>

            {/* Action buttons */}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background hover:opacity-90"
              >
                <Home className="h-4 w-4" />
                Return to Home
              </Link>

              <button
                type="button"
                onClick={() => window.history.back()}
                className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold hover:bg-muted"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </button>
            </div>

            {/* Helpful links (industrial-style “quick access”) */}
            <div className="mt-10 rounded-2xl border bg-card p-5">
              <p className="text-sm font-semibold">Quick Access</p>
              <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                <a
                  href="/solvent-printers"
                  className="rounded-lg border bg-muted/20 px-3 py-2 hover:bg-muted"
                >
                  Solvent Printers
                </a>
                <a
                  href="/#brands"
                  className="rounded-lg border bg-muted/20 px-3 py-2 hover:bg-muted"
                >
                  Brands
                </a>
                <a
                  href="/#work"
                  className="rounded-lg border bg-muted/20 px-3 py-2 hover:bg-muted"
                >
                  Work & Solutions
                </a>
                <a
                  href="/#contact"
                  className="rounded-lg border bg-muted/20 px-3 py-2 hover:bg-muted"
                >
                  Contact
                </a>
              </div>
            </div>
          </div>

          {/* Right: Industrial “machine offline” visual */}
          <div className="lg:col-span-6">
            <div className="relative overflow-hidden rounded-3xl border bg-card p-6 md:p-8">
              {/* caution stripe header */}
              <div className="flex items-center justify-between gap-3 rounded-2xl border bg-muted/20 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-foreground/70" />
                  <div className="h-2 w-2 rounded-full bg-foreground/50" />
                  <div className="h-2 w-2 rounded-full bg-foreground/30" />
                </div>
                <div className="text-xs font-medium text-muted-foreground">
                  SYSTEM STATUS
                </div>
                <div className="text-xs font-semibold">OFFLINE</div>
              </div>

              {/* big 404 stamp */}
              <div className="mt-8">
                <div className="inline-flex items-center gap-2 rounded-xl border bg-muted/20 px-3 py-2 text-xs font-semibold tracking-wider">
                  <Wrench className="h-4 w-4" />
                  MACHINE NOT FOUND
                </div>

                <div className="mt-6 flex items-baseline gap-3">
                  <div className="text-7xl font-extrabold tracking-tight md:text-8xl">
                    404
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Error Code
                  </div>
                </div>

                <p className="mt-4 text-sm text-muted-foreground">
                  Diagnostic: The requested route doesn’t exist in the current
                  build. Check navigation links or route definitions.
                </p>
              </div>

              {/* fake “industrial panel” */}
              <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Possible Causes
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <li>• Mistyped URL</li>
                    <li>• Page moved/renamed</li>
                    <li>• Old bookmark</li>
                  </ul>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Recommended Fix
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <li>• Use Home navigation</li>
                    <li>• Try Products / Contact</li>
                    <li>• Go back and retry</li>
                  </ul>
                </div>
              </div>

              {/* subtle diagonal “caution” overlay */}
              <div
                className="pointer-events-none absolute -right-24 top-10 h-48 w-96 rotate-12 opacity-10"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, hsl(var(--foreground)) 0 12px, transparent 12px 24px)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
