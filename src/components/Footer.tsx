import { motion } from "framer-motion";
import { Mail, MapPin, Phone } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { label: "Home", href: "#home" },
    { label: "About", href: "#about" },
    { label: "Solutions", href: "#solutions" },
    { label: "Work", href: "#work" },
    { label: "Contact", href: "#contact" },
  ];

  const solutions = [
    { label: "Solvent Printers", href: "#work" },
    { label: "UV Printers", href: "#work" },
    { label: "CNC Routers", href: "#work" },
    { label: "Laser Machines", href: "#work" },
    { label: "Lamination", href: "#work" },
  ];

  return (
    <footer className="bg-navy-gradient text-primary-foreground">
      <div className="container mx-auto px-4 md:px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <span className="text-accent font-bold text-lg">E</span>
              </div>
              <span className="font-display text-2xl font-bold">Elkatech</span>
            </div>
            <p className="text-primary-foreground/70 text-sm leading-relaxed mb-4">
              Your trusted partner for industrial printing and signage machinery. 
              Importer, wholesaler, and distributor serving businesses across India.
            </p>
            <p className="text-xs text-primary-foreground/50">
              Ahmedabad, Gujarat, India
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold text-base mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-accent transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <h4 className="font-display font-semibold text-base mb-4">
              Solutions
            </h4>
            <ul className="space-y-2.5">
              {solutions.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-accent transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold text-base mb-4">
              Contact
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <a
                  href="mailto:elkatech2021@gmail.com"
                  className="text-sm text-primary-foreground/70 hover:text-accent transition-colors duration-200"
                >
                  elkatech2021@gmail.com
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <span className="text-sm text-primary-foreground/70">
                  Ahmedabad, Gujarat<br />India
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-primary-foreground/10 my-10" />

        {/* Bottom Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="text-sm text-primary-foreground/70">
              © {currentYear} ELKATECH INDIA PRIVATE LIMITED
            </p>
            <p className="text-xs text-primary-foreground/50 mt-1">
              All rights reserved.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-primary-foreground/70">
            <span>ROC: Ahmedabad</span>
            <span className="w-1 h-1 rounded-full bg-primary-foreground/50" />
            <span className="text-accent">Active Status</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
