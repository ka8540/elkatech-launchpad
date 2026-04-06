import type { ReactNode } from "react";
import SiteHeader from "@/components/SiteHeader";

type AuthPageShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

const AuthPageShell = ({ title, subtitle, children }: AuthPageShellProps) => {
  return (
    <div className="min-h-screen bg-steel-gradient">
      <SiteHeader />
      <div className="container mx-auto px-4 pb-16 pt-28 md:px-6 md:pt-32">
        <div className="mx-auto max-w-md rounded-3xl border bg-card p-8 shadow-elevated">
          <div className="mb-8">
            <p className="mb-3 inline-block rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
              Elkatech Service Platform
            </p>
            <h1 className="font-display text-3xl font-bold text-foreground">{title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthPageShell;
