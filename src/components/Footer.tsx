import { Mail, MapPin, Phone, MessageCircle } from "lucide-react";

const PHONE_NUMBER = "+917203033486";
const WHATSAPP_NUMBER = "917203033486";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { label: "Home", href: "#home" },
    { label: "About", href: "#about" },
    { label: "Work & Solutions", href: "#work" },
    { label: "Contact", href: "#contact" },
  ];

  // Match what you actually sell on the site right now
  const solutions = [
    { label: "Solvent & Eco-Solvent Printers", href: "/solvent-printers" },
    { label: "UV Printers (RTR / Mesh Belt)", href: "/uv-printers" },
    { label: "Laser Cutting Machines (CO2)", href: "/laser-cutting-machines" },
    { label: "Lamination Machines", href: "/lamination-machines" },
    { label: "Desktop UV Printer (A3)", href: "/desktop-uv-printer" },
    { label: "Giant Inkjet Printer (5M)", href: "/inject-printer" },
    { label: "UV Flatbed Printer (2513)", href: "/flatbed-uv-printer" },
  ];

  return (
    <footer className="bg-navy-gradient text-white">
      <div className="container mx-auto px-4 md:px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <a href="#home" className="flex items-center gap-2 text-white">
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

                <span className="font-display text-lg font-bold text-white">
                  Elkatech
                </span>
              </a>
            </div>

            <p className="text-white/70 text-sm leading-relaxed mb-4">
              Your trusted partner for industrial printing and signage machinery.
              Importer, wholesaler, and distributor serving businesses across India.
            </p>

            <p className="text-xs text-white/50">Ahmedabad, Gujarat, India</p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold text-base mb-4 text-white">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-white/70 hover:text-accent transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <h4 className="font-display font-semibold text-base mb-4 text-white">
              Solutions
            </h4>
            <ul className="space-y-2.5">
              {solutions.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-white/70 hover:text-accent transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold text-base mb-4 text-white">
              Contact
            </h4>
            <ul className="space-y-3">
              {/* Email */}
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <a
                  href="mailto:elkatech2021@gmail.com"
                  className="text-sm text-white/70 hover:text-accent transition-colors duration-200"
                >
                  elkatech2021@gmail.com
                </a>
              </li>

              {/* Phone */}
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <a
                  href={`tel:${PHONE_NUMBER}`}
                  className="text-sm text-white/70 hover:text-accent transition-colors duration-200"
                >
                  {PHONE_NUMBER}
                </a>
              </li>

              {/* WhatsApp */}
              <li className="flex items-start gap-2.5">
                <MessageCircle className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                    "Hi Elkatech, I am interested in your machinery. Please share details."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/70 hover:text-accent transition-colors duration-200"
                >
                  WhatsApp Chat
                </a>
              </li>

              {/* Location */}
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <span className="text-sm text-white/70">
                  Ahmedabad, Gujarat
                  <br />
                  India
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/10 my-10" />

        {/* Bottom Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="text-sm text-white/70">
              © {currentYear} ELKATECH INDIA PRIVATE LIMITED
            </p>
            <p className="text-xs text-white/50 mt-1">All rights reserved.</p>
          </div>

          <div className="flex items-center gap-4 text-xs text-white/70">
            <span>ROC: Ahmedabad</span>
            <span className="w-1 h-1 rounded-full bg-white/50" />
            <span className="text-accent">Active Status</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
