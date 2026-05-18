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
      setIsScrolled(window.scrollY > 16);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = SECTION_HASHES.map(({ label, hash }) => ({
    label,
    href: useHomeAnchors ? hash : `/${hash}`,
  }));
  const hasGlassShell = isScrolled || isMenuOpen;

  return (
    <div className="fixed left-0 right-0 top-4 z-50 px-4 lg:flex lg:justify-center">
      <header
        className={`relative w-full max-w-6xl overflow-hidden rounded-full border px-4 transition-all duration-300 ease-out before:pointer-events-none before:absolute before:inset-x-5 before:top-px before:h-px before:bg-white/15 before:transition-opacity before:duration-300 before:content-[''] md:px-5 ${
          hasGlassShell
            ? "border-white/10 bg-[#07111f]/75 shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur-2xl before:opacity-100"
            : "border-transparent bg-[#020817]/25 shadow-none backdrop-blur-sm before:opacity-0"
        }`}
      >
        <div className="flex h-12 items-center justify-between gap-4 md:h-14 md:gap-6">
          <a href={useHomeAnchors ? "#home" : "/"} className="flex items-center gap-2">
            <svg
              width="30"
              height="30"
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
                stroke="white"
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
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path
                d="M30 30 L30 70"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="68" cy="50" r="6" fill="hsl(var(--accent))" />
            </svg>
            <span className="font-display text-lg font-bold text-white">
              Elkatech
            </span>
          </a>

          <nav className="hidden items-center gap-6 lg:flex">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-white/75 transition-colors duration-200 hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-4 md:flex [&_button:hover]:bg-white/10 [&_button]:text-white">
            <a
              href="/login"
              className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:border-white/25 hover:bg-white/10"
            >
              Service Portal
            </a>
            <ThemeToggle />
          </div>

          <button
            className="rounded-full border border-white/10 p-2 text-white transition-colors hover:bg-white/10 lg:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            type="button"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {isMenuOpen && (
          <div
            className={`py-3 lg:hidden ${hasGlassShell ? "border-t border-white/10" : "border-t border-transparent"}`}
          >
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="rounded-2xl px-3 py-2.5 text-sm font-medium text-white/75 transition-colors duration-200 hover:bg-white/10 hover:text-white"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <a
                href="/login"
                className="mt-2 block w-full rounded-2xl border border-white/15 bg-white/[0.03] px-3 py-2.5 text-center text-sm font-medium text-white transition-colors hover:border-white/25 hover:bg-white/10"
                onClick={() => setIsMenuOpen(false)}
              >
                Service Portal
              </a>
              <div className="flex items-center gap-2 px-3 pt-3 [&_button:hover]:bg-white/10 [&_button]:text-white">
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
