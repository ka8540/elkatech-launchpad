import { motion } from "framer-motion";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { label: "Home", href: "#home" },
    { label: "Solutions", href: "#solutions" },
    { label: "Why Us", href: "#why-us" },
    { label: "Contact", href: "#contact" },
  ];

  return (
    <footer className="bg-navy-gradient text-primary-foreground">
      <div className="container mx-auto px-4 md:px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <span className="text-accent font-bold text-lg">E</span>
              </div>
              <span className="font-display text-2xl font-bold">Elkatech</span>
            </div>
            <p className="text-steel-medium max-w-sm mb-6 leading-relaxed">
              Your trusted partner for industrial printing and signage solutions.
              Delivering precision, performance, and reliability since 2021.
            </p>
            <p className="text-sm text-steel-medium">
              <strong className="text-primary-foreground">Legal Name:</strong>{" "}
              ELKATECH INDIA PRIVATE LIMITED
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-4">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-steel-medium hover:text-accent transition-colors duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-semibold text-lg mb-4">Contact</h4>
            <ul className="space-y-3 text-steel-medium">
              <li>
                <a
                  href="mailto:elkatech2021@gmail.com"
                  className="hover:text-accent transition-colors duration-200"
                >
                  elkatech2021@gmail.com
                </a>
              </li>
              <li>Ahmedabad, Gujarat</li>
              <li>India</li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-primary-foreground/10 my-10" />

        {/* Bottom Row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-steel-medium">
          <p>© {currentYear} ELKATECH INDIA PRIVATE LIMITED. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span>ROC: Ahmedabad</span>
            <span className="w-1 h-1 rounded-full bg-steel-medium" />
            <span className="text-accent">Active Status</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
