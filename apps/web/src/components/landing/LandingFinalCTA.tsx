import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { CONTACT } from "@/components/landing/landingData";

const ease = [0.22, 1, 0.36, 1] as const;
const COPPER = "#d2823f";

const whatsappHref = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(
  "Hi ElkaTech, I am interested in your machinery. Please share details.",
)}`;

const LandingFinalCTA = () => {
  const reduce = useReducedMotion();

  const methods = [
    { icon: Phone, label: "Call us", value: CONTACT.phoneDisplay, href: `tel:${CONTACT.phoneTel}` },
    { icon: MessageCircle, label: "WhatsApp", value: "Chat with our team", href: whatsappHref },
    { icon: Mail, label: "Email", value: CONTACT.email, href: `mailto:${CONTACT.email}` },
    { icon: MapPin, label: "Visit", value: CONTACT.location, href: undefined },
  ];

  return (
    <section
      id="contact"
      className="lp-grain relative scroll-mt-24 overflow-hidden py-20 md:py-28"
      style={{
        background:
          "radial-gradient(120% 90% at 80% 0%, var(--lp-graphite-2), var(--lp-graphite) 72%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 bottom-0 h-80 w-80 rounded-full blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(210,130,63,0.22), transparent 64%)" }}
      />
      <div
        aria-hidden
        className="lp-grid-fine pointer-events-none absolute inset-0 opacity-30"
        style={{ "--lp-line": "rgba(255,255,255,0.05)" } as CSSProperties}
      />

      <div className="relative mx-auto max-w-[1100px] px-5 text-center sm:px-8">
        <motion.span
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: reduce ? 0.2 : 0.5, ease }}
          className="lp-mono text-[11px] uppercase tracking-[0.26em]"
          style={{ color: COPPER }}
        >
          Let&apos;s build your line
        </motion.span>
        <motion.h2
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 22, filter: "blur(6px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: reduce ? 0.2 : 0.7, ease, delay: reduce ? 0 : 0.08 }}
          className="lp-display mx-auto mt-4 max-w-3xl text-3xl font-extrabold leading-[1.05] md:text-5xl"
          style={{ color: "#f1efe9" }}
        >
          Ready to scale your printing &amp; signage production?
        </motion.h2>
        <motion.p
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: reduce ? 0.2 : 0.6, ease, delay: reduce ? 0 : 0.16 }}
          className="mx-auto mt-5 max-w-xl text-base leading-relaxed"
          style={{ color: "rgba(241,239,233,0.7)" }}
        >
          Tell us about your media, volume and budget — we&apos;ll recommend the right machine and
          walk you through pricing, dispatch and installation.
        </motion.p>

        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: reduce ? 0.2 : 0.6, ease, delay: reduce ? 0 : 0.24 }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-[0_20px_50px_-16px_rgba(210,130,63,0.7)] transition-transform hover:-translate-y-0.5"
            style={{ background: COPPER }}
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp our team
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 rounded-full border px-7 py-3.5 text-sm font-semibold transition-colors hover:bg-white/[0.06]"
            style={{ color: "#f1efe9", borderColor: "rgba(241,239,233,0.26)" }}
          >
            Open Service Portal
          </Link>
        </motion.div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {methods.map((m) => {
            const inner = (
              <>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                  style={{
                    borderColor: "rgba(210,130,63,0.32)",
                    background: "rgba(210,130,63,0.12)",
                    color: COPPER,
                  }}
                >
                  <m.icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="lp-mono block text-[10px] uppercase tracking-[0.18em]"
                    style={{ color: "rgba(241,239,233,0.46)" }}
                  >
                    {m.label}
                  </span>
                  <span
                    className="mt-1 block break-words text-[15px] font-semibold leading-snug"
                    style={{ color: "#f1efe9" }}
                  >
                    {m.value}
                  </span>
                </span>
              </>
            );
            return m.href ? (
              <a
                key={m.label}
                href={m.href}
                target={m.href.startsWith("http") ? "_blank" : undefined}
                rel={m.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="group flex min-h-[104px] items-center gap-3 rounded-2xl border p-4 text-left transition-[background-color,border-color,transform] hover:-translate-y-0.5"
                style={{
                  borderColor: "rgba(241,239,233,0.12)",
                  background: "rgba(8,9,11,0.48)",
                }}
              >
                {inner}
              </a>
            ) : (
              <div
                key={m.label}
                className="flex min-h-[104px] items-center gap-3 rounded-2xl border p-4 text-left"
                style={{
                  borderColor: "rgba(241,239,233,0.12)",
                  background: "rgba(8,9,11,0.48)",
                }}
              >
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default LandingFinalCTA;
