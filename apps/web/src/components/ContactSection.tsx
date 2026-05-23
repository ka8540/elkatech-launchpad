import { Mail, Phone, MapPin, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import StableReveal from "@/components/StableReveal";
import SectionEyebrow from "@/components/SectionEyebrow";
import ScrollReveal from "@/components/ScrollReveal";

const WHATSAPP_NUMBER = "917203033486";
const PHONE_NUMBER = "+917203033486";

const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    phone: "",
    productInterest: "",
    message: "",
  });

  const inquiryBody = [
    "Hi Elkatech,",
    "",
    `Name: ${formData.name || "-"}`,
    `Company: ${formData.company || "-"}`,
    `Phone: ${formData.phone || "-"}`,
    `Interest: ${formData.productInterest || "-"}`,
    "",
    "Message:",
    formData.message || "-",
  ].join("\n");

  const inquiryEmail = `mailto:elkatech2021@gmail.com?subject=${encodeURIComponent(
    `Machinery inquiry from ${formData.name || "Website visitor"}`
  )}&body=${encodeURIComponent(inquiryBody)}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    toast.success("Opening your email client with a pre-filled inquiry.");
    window.location.href = inquiryEmail;
  };

  const whatsappPrefill = encodeURIComponent(inquiryBody);

  return (
    <section id="contact" className="landing-anchor relative overflow-hidden bg-navy-gradient py-24 md:py-32">
      {/* Background elements */}
      <div className="absolute inset-x-0 top-0 h-px section-divider" />
      <div className="pointer-events-none absolute inset-0 ambient-surface-left" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/3 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left Column - Info */}
          <div>
            <ScrollReveal variant="rise" distance={18}>
              <SectionEyebrow tone="navy">Contact Us</SectionEyebrow>
            </ScrollReveal>
            <ScrollReveal variant="blur-rise" delay={0.08} distance={30}>
              <h2 className="mb-6 font-display text-3xl font-semibold tracking-tight text-white md:text-4xl lg:text-5xl">
                Let's Start a <span className="text-accent">Conversation</span>
              </h2>
            </ScrollReveal>
            <ScrollReveal variant="rise" delay={0.16} distance={22}>
              <p className="text-white/70 text-lg mb-8 leading-relaxed">
                Ready to explore the right machinery for your business? Our team is here to understand
                your needs and provide honest, practical guidance.
              </p>
            </ScrollReveal>

            {/* Contact Info */}
            <div className="space-y-4 mb-8">
              {/* Email */}
              <StableReveal
                variant="card"
                delay={0.18}
                className="group relative isolate flex items-center gap-4 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 transition-[border-color,box-shadow,background-color] duration-300 ease-out hover:border-blue-400/40 hover:bg-white/[0.07] hover:shadow-[0_20px_70px_rgba(14,165,233,0.12)]"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-400/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative z-10 w-11 h-11 rounded-lg bg-accent/20 flex items-center justify-center transition-shadow duration-300 group-hover:shadow-glow">
                  <Mail className="w-5 h-5 text-accent" />
                </div>
                <div className="relative z-10">
                  <p className="text-sm text-white/60">Email</p>
                  <a
                    href="mailto:elkatech2021@gmail.com"
                    className="text-white font-medium hover:text-accent transition-colors"
                  >
                    elkatech2021@gmail.com
                  </a>
                </div>
              </StableReveal>

              {/* Phone */}
              <StableReveal
                variant="card"
                delay={0.22}
                className="group relative isolate flex items-center gap-4 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 transition-[border-color,box-shadow,background-color] duration-300 ease-out hover:border-blue-400/40 hover:bg-white/[0.07] hover:shadow-[0_20px_70px_rgba(14,165,233,0.12)]"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-400/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative z-10 w-11 h-11 rounded-lg bg-accent/20 flex items-center justify-center transition-shadow duration-300 group-hover:shadow-glow">
                  <Phone className="w-5 h-5 text-accent" />
                </div>
                <div className="relative z-10">
                  <p className="text-sm text-white/60">Phone</p>
                  <a
                    href={`tel:${PHONE_NUMBER}`}
                    className="text-white font-medium hover:text-accent transition-colors"
                  >
                    {PHONE_NUMBER}
                  </a>
                </div>
              </StableReveal>

              {/* Location */}
              <StableReveal
                variant="card"
                delay={0.24}
                className="group relative isolate flex items-center gap-4 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 transition-[border-color,box-shadow,background-color] duration-300 ease-out hover:border-blue-400/40 hover:bg-white/[0.07] hover:shadow-[0_20px_70px_rgba(14,165,233,0.12)]"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-400/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative z-10 w-11 h-11 rounded-lg bg-accent/20 flex items-center justify-center transition-shadow duration-300 group-hover:shadow-glow">
                  <MapPin className="w-5 h-5 text-accent" />
                </div>
                <div className="relative z-10">
                  <p className="text-sm text-white/60">Location</p>
                  <p className="text-white font-medium">Ahmedabad, Gujarat, India</p>
                </div>
              </StableReveal>
            </div>

            {/* WhatsApp Button */}
            <StableReveal variant="fade" delay={0.24}>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-accent/50 text-accent hover:bg-accent/10 hover:border-accent"
              >
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappPrefill}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="mr-2 w-5 h-5" />
                  Chat on WhatsApp
                </a>
              </Button>
            </StableReveal>
          </div>

          {/* Right Column - Form */}
          <StableReveal
            variant="card"
            delay={0.12}
            className="relative isolate overflow-hidden rounded-2xl"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-400/5 opacity-80" />
            <form
              onSubmit={handleSubmit}
              className="relative z-10 bg-card rounded-2xl p-8 border border-border shadow-elevated"
            >
              <h3 className="font-display text-xl font-semibold text-foreground mb-6">
                Send an Inquiry
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Your Name *
                  </label>
                  <Input
                    placeholder="Your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="bg-background"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Company Name
                  </label>
                  <Input
                    placeholder="Your company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="bg-background"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Phone Number *
                  </label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="bg-background"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Product Interest
                  </label>
                  <Input
                    placeholder="e.g., UV Printer, CNC Router"
                    value={formData.productInterest}
                    onChange={(e) =>
                      setFormData({ ...formData, productInterest: e.target.value })
                    }
                    className="bg-background"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Message *
                  </label>
                  <Textarea
                    placeholder="Tell us about your requirements..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                    rows={4}
                    className="bg-background resize-none"
                  />
                </div>

                <Button type="submit" variant="cta" size="lg" className="w-full group">
                  Send Inquiry
                  <Send className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>

                {/* Optional: One-click WhatsApp using form data */}
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full border-accent/50 text-accent hover:bg-accent/10 hover:border-accent"
                >
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappPrefill}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="mr-2 w-5 h-5" />
                    Send via WhatsApp Instead
                  </a>
                </Button>
              </div>
            </form>
          </StableReveal>
        </div>

        {/* Google Maps Embed */}
        <StableReveal
          variant="card"
          className="mt-16 rounded-2xl overflow-hidden border border-white/10"
        >
          <iframe
            src="https://www.google.com/maps?q=3GWW%2B237%20Vandematram%20Prime%20Gota%20Ahmedabad&z=18&output=embed"
            width="100%"
            height="400"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Elkatech Office Location – Vandematram Prime, Gota, Ahmedabad"
            className="w-full"
          />
        </StableReveal>
      </div>
    </section>
  );
};

export default ContactSection;
