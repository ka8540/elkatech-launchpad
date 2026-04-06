import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

type SiteHeaderProps = {
  useHomeAnchors?: boolean;
};

const SECTION_HASHES = [
  { label: "Home", hash: "#home" },
  { label: "About", hash: "#about" },
  { label: "Work & Solutions", hash: "#work" },
  { label: "Brands", hash: "#brands" },
  { label: "Why Us", hash: "#why-us" },
  { label: "Contact", hash: "#contact" },
];

const SiteHeader = ({ useHomeAnchors = false }: SiteHeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = SECTION_HASHES.map(({ label, hash }) => ({
    label,
    href: useHomeAnchors ? hash : `/${hash}`,
  }));

  return (
    <div className="fixed left-0 right-0 top-0 z-40 lg:flex lg:justify-center lg:px-4 lg:pt-3">
      <header
        className={`px-4 transition-all duration-300 md:px-6 lg:rounded-full ${
          isScrolled
            ? "bg-background/80 shadow-soft backdrop-blur-xl lg:border lg:border-border/50"
            : "bg-background/30 backdrop-blur-sm lg:border lg:border-transparent"
        }`}
      >
        <div className="flex h-12 items-center justify-between gap-4 md:h-14 md:gap-8">
          <a href={useHomeAnchors ? "#home" : "/"} className="flex items-center gap-2">
            <svg
              width="32"
              height="32"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
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
                stroke="hsl(var(--foreground))"
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
                stroke="hsl(var(--foreground))"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M30 30 L30 70"
                stroke="hsl(var(--foreground))"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="68" cy="50" r="6" fill="hsl(var(--accent))" />
            </svg>
            <span className="font-display text-lg font-bold text-foreground">
              Elkatech
            </span>
          </a>

          <nav className="hidden items-center gap-8 lg:flex">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-4 md:flex">
            <a
              href="/login"
              className="rounded-full border border-border bg-transparent px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Service Portal
            </a>
            <ThemeToggle />
          </div>

          <button
            className="rounded-lg p-2 transition-colors hover:bg-muted lg:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            type="button"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>

        {isMenuOpen && (
          <div
            className="rounded-b-2xl border-t border-border bg-background py-4 lg:hidden"
          >
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <a
                href="/login"
                className="mt-2 block w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-center text-sm font-medium text-foreground transition-colors hover:bg-muted"
                onClick={() => setIsMenuOpen(false)}
              >
                Service Portal
              </a>
              <div className="flex items-center gap-2 px-3 pt-3">
                <ThemeToggle />
              </div>
            </nav>
          </div>
        )}
      </header>
    </div>
  );
};

export default SiteHeader;
