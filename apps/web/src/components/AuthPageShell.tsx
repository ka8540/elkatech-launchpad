import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

type AuthPageShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

const AuthPageShell = ({ title, subtitle, children }: AuthPageShellProps) => {
  return (
    <div className="auth-industrial lp lp-grain relative isolate min-h-screen overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 auth-industrial-bg" />
        <div className="absolute inset-0 auth-industrial-grid" />
        <div className="absolute -right-[12%] top-[-18%] h-[620px] w-[620px] rounded-full bg-[rgba(210,130,63,0.18)] blur-[120px]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-[var(--lp-bg)]" />
      </div>

      <Link
        to="/"
        className="fixed left-4 top-4 z-50 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-[var(--lp-on-graphite)] shadow-[0_18px_50px_-28px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-colors hover:border-[var(--lp-accent)] hover:bg-white/[0.08] sm:left-6 sm:top-6"
      >
        <ArrowLeft className="h-4 w-4 text-[var(--lp-accent)]" />
        Back to home
      </Link>

      <main className="mx-auto grid min-h-screen max-w-[1120px] items-center gap-10 px-5 py-24 sm:px-8 lg:grid-cols-[0.9fr_1fr] lg:px-10">
        <section className="hidden max-w-md text-[var(--lp-on-graphite)] lg:block">
          <p className="lp-mono mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-[11px] uppercase tracking-[0.22em] text-[var(--lp-on-graphite-soft)]">
            <span className="h-2 w-2 rounded-full bg-[var(--lp-accent)]" />
            Service Portal
          </p>
          <h2 className="text-5xl font-extrabold leading-[1.02] tracking-normal">
            Machine support, matched to production.
          </h2>
          <p className="mt-5 text-base leading-8 text-[var(--lp-on-graphite-soft)]">
            Create service requests, track follow-ups and keep ElkaTech support connected to your machinery workflow.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-[8px] border border-white/10 bg-white/[0.06]">
            {["Requests", "Engineers", "Uptime"].map((item) => (
              <div key={item} className="bg-black/35 px-4 py-4">
                <p className="text-sm font-bold text-[var(--lp-on-graphite)]">{item}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.13em] text-[rgba(241,239,233,0.5)]">
                  Portal
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="auth-card rounded-[8px] border p-6 shadow-[0_28px_90px_-50px_rgba(0,0,0,0.85)] sm:p-8">
            <div className="mb-8">
              <div className="mb-6 flex items-center gap-2.5">
                <svg width="34" height="34" viewBox="0 0 100 100" fill="none" aria-hidden>
                  <rect x="12" y="12" width="76" height="76" rx="10" stroke="var(--lp-accent)" strokeWidth="2.5" />
                  <path d="M30 30 L55 30" stroke="var(--lp-on-graphite)" strokeWidth="4" strokeLinecap="round" />
                  <path d="M30 50 L50 50" stroke="var(--lp-accent)" strokeWidth="4" strokeLinecap="round" />
                  <path d="M30 70 L55 70" stroke="var(--lp-on-graphite)" strokeWidth="4" strokeLinecap="round" />
                  <path d="M30 30 L30 70" stroke="var(--lp-on-graphite)" strokeWidth="4" strokeLinecap="round" />
                  <circle cx="68" cy="50" r="6" fill="var(--lp-accent)" />
                </svg>
                <span className="text-[1.05rem] font-extrabold uppercase tracking-[0.14em] text-[var(--lp-on-graphite)]">
                  Elkatech
                </span>
              </div>
              <p className="mb-3 inline-block rounded-full border border-[rgba(210,130,63,0.26)] bg-[rgba(210,130,63,0.14)] px-3 py-1 text-sm font-semibold text-[var(--lp-accent)]">
                Elkatech Service Platform
              </p>
              <h1 className="text-3xl font-bold tracking-normal text-foreground">{title}</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            </div>
            {children}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AuthPageShell;
