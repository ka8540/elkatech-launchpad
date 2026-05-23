import { Link } from "react-router-dom";
import { CONTACT, PRODUCT_CATEGORIES } from "@/components/landing/landingData";

const QUICK_LINKS = [
  { label: "Products", href: "#products" },
  { label: "Why ElkaTech", href: "#strengths" },
  { label: "Applications", href: "#applications" },
  { label: "Service & Support", href: "#service" },
  { label: "Contact", href: "#contact" },
];

const LandingFooter = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t" style={{ background: "var(--lp-bg-2)", borderColor: "var(--lp-line)" }}>
      <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 lg:px-10">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="flex items-center gap-2.5">
              <svg width="30" height="30" viewBox="0 0 100 100" fill="none" aria-hidden>
                <rect x="12" y="12" width="76" height="76" rx="10" stroke="var(--lp-accent)" strokeWidth="2.5" fill="none" />
                <path d="M30 30 L55 30" stroke="var(--lp-ink)" strokeWidth="4" strokeLinecap="round" />
                <path d="M30 50 L50 50" stroke="var(--lp-accent)" strokeWidth="4" strokeLinecap="round" />
                <path d="M30 70 L55 70" stroke="var(--lp-ink)" strokeWidth="4" strokeLinecap="round" />
                <path d="M30 30 L30 70" stroke="var(--lp-ink)" strokeWidth="4" strokeLinecap="round" />
                <circle cx="68" cy="50" r="6" fill="var(--lp-accent)" />
              </svg>
              <span
                className="lp-display text-lg font-extrabold uppercase tracking-[0.14em]"
                style={{ color: "var(--lp-ink)" }}
              >
                Elkatech
              </span>
            </span>
            <p className="mt-4 max-w-xs text-sm leading-relaxed" style={{ color: "var(--lp-faint)" }}>
              Importer, wholesaler and distributor of industrial printing and signage machinery.
              The rebranded identity of V J Enterprise.
            </p>
            <p className="lp-mono mt-4 text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--lp-faint)" }}>
              {CONTACT.location}
            </p>
          </div>

          <div>
            <h4 className="lp-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--lp-faint)" }}>
              Explore
            </h4>
            <ul className="mt-4 space-y-2.5">
              {QUICK_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-sm transition-colors hover:underline" style={{ color: "var(--lp-ink-soft)" }}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="lp-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--lp-faint)" }}>
              Machinery
            </h4>
            <ul className="mt-4 space-y-2.5">
              {PRODUCT_CATEGORIES.map((c) => (
                <li key={c.href}>
                  <Link to={c.href} className="text-sm transition-colors hover:underline" style={{ color: "var(--lp-ink-soft)" }}>
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="lp-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--lp-faint)" }}>
              Contact
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm" style={{ color: "var(--lp-ink-soft)" }}>
              <li>
                <a href={`tel:${CONTACT.phoneTel}`} className="transition-colors hover:underline">
                  {CONTACT.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={`mailto:${CONTACT.email}`} className="transition-colors hover:underline">
                  {CONTACT.email}
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${CONTACT.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:underline"
                >
                  WhatsApp Chat
                </a>
              </li>
              <li>
                <Link to="/login" className="transition-colors hover:underline">
                  Service Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="mt-12 flex flex-col items-center justify-between gap-3 border-t pt-6 md:flex-row"
          style={{ borderColor: "var(--lp-line)" }}
        >
          <p className="text-xs" style={{ color: "var(--lp-faint)" }}>
            © {year} ELKATECH INDIA PRIVATE LIMITED. All rights reserved.
          </p>
          <p className="lp-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--lp-faint)" }}>
            ROC: Ahmedabad · Active Status
          </p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
