import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import StableReveal from "@/components/StableReveal";
import SectionEyebrow from "@/components/SectionEyebrow";
import ScrollReveal from "@/components/ScrollReveal";
import ParallaxLayer from "@/components/ParallaxLayer";
import { toPublicAsset } from "@/lib/assets";

const categories = [
  {
    title: "Solvent & Eco-Solvent Printers",
    description:
      "Wide-format printing for outdoor advertising, flex banners, vinyl, and vehicle wraps.",
    applications: ["Flex Banners", "Vinyl Printing", "Outdoor Signage", "Vehicle Wraps"],
    industries: ["Advertising Agencies", "Print Houses", "Signage Companies"],
    image: "images/Solvent.png",
    href: "/solvent-printers",
  },
  {
    title: "UV Printers (Roll-to-Roll / Mesh Belt)",
    description:
      "UV printing for flexible media with instant curing—ideal for signage and specialty applications.",
    applications: ["Backlit Media", "Flex & Vinyl", "Wall Graphics", "Promotional Prints"],
    industries: ["Signage Manufacturers", "Commercial Printers", "Branding Agencies"],
    image:
      "https://img.freepik.com/premium-photo/view-beautiful-digital-uv-printing-machine_994615-885.jpg",
    href: "/uv-printers",
  },
  {
    title: "Laser Engraving & Cutting Machines (CO2)",
    description:
      "High-precision CO2 laser cutting & engraving for acrylic, MDF, wood, fabric, and more.",
    applications: ["Acrylic Cutting", "Wood Engraving", "Signage Components", "Fabric Cutting"],
    industries: ["Gift & Trophy Makers", "Sign Makers", "Industrial Manufacturers"],
    image:
      "https://www.re-thinkingthefuture.com/wp-content/uploads/2025/06/gp5043-How-Fiber-Laser-Cutting-Machines-Are-Revolutionizing-Metal-Furniture-Manufacturing-web.jpg?w=999",
    href: "/laser-cutting-machines",
  },
  {
    title: "Lamination Machines (Cold / Heat)",
    description:
      "Print finishing and protection for banners, posters, and signage—durability that lasts.",
    applications: ["Cold Lamination", "Heat Lamination", "Poster Protection", "Print Finishing"],
    industries: ["Print Houses", "Photo Studios", "Commercial Printers"],
    image: "images/Laminatiom.png",
    href: "/lamination-machines",
  },
  {
    title: "Desktop UV Printer (A3)",
    description:
      "Compact UV printer for personalized printing on rigid items—phone cases, gifts, tiles, bottles.",
    applications: ["Phone Cases", "Tiles", "Glass Bottles", "Acrylic & Wood"],
    industries: ["Gift Shops", "Custom Printing", "Small Businesses"],
    image: "images/Desktop_Image.png",
    href: "/desktop-uv-printer",
  },
  {
    title: "Giant Format Inkjet Printer (5M)",
    description:
      "High-speed, large-width inkjet printing for banners, hoardings, and large commercial jobs.",
    applications: ["Hoardings", "Banners", "Outdoor Branding", "Large Format Signage"],
    industries: ["Outdoor Advertising", "Commercial Printers", "Signage Companies"],
    image: "images/inject.png",
    href: "/inkjet-printer",
  },
  {
    title: "UV Flatbed Printer (2513)",
    description:
      "Industrial flatbed UV printing on rigid substrates like acrylic, glass, PVC, wood, metal, boards.",
    applications: ["Acrylic Boards", "PVC Boards", "Glass Printing", "Wood & Metal Printing"],
    industries: ["Interior Fabrication", "Signage Manufacturers", "Acrylic Fabricators"],
    image: "images/Flatbed.png",
    href: "/flatbed-uv-printer",
  },
];

const WorkSolutionsSection = () => {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      id="work"
      className="relative overflow-hidden bg-navy-gradient py-24 md:py-32"
    >
      <div className="absolute inset-x-0 top-0 h-px section-divider" />
      <div className="pointer-events-none absolute inset-0 ambient-surface-right" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.16) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage:
            "radial-gradient(ellipse at 50% 35%, black 30%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 35%, black 30%, transparent 78%)",
        }}
      />
      <ParallaxLayer
        target={sectionRef}
        offset={-80}
        className="pointer-events-none absolute right-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-accent/5 blur-3xl"
      >
        <span className="sr-only" />
      </ParallaxLayer>
      <ParallaxLayer
        target={sectionRef}
        offset={80}
        className="pointer-events-none absolute bottom-[-10%] left-[-8%] h-80 w-80 rounded-full bg-accent/[0.04] blur-3xl"
      >
        <span className="sr-only" />
      </ParallaxLayer>

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <ScrollReveal variant="rise" className="flex justify-center" distance={18}>
            <SectionEyebrow tone="navy">Work &amp; Solutions</SectionEyebrow>
          </ScrollReveal>
          <ScrollReveal variant="blur-rise" delay={0.08} distance={30}>
            <h2 className="mb-4 font-display text-3xl font-semibold tracking-tight text-white md:text-4xl lg:text-5xl">
              Complete Industrial <span className="text-accent">Machinery Solutions</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal variant="rise" delay={0.16} distance={22}>
            <p className="text-lg text-white/70">
              Explore our machinery categories tailored for commercial printing, signage, and
              fabrication workflows.
            </p>
          </ScrollReveal>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {categories.map((category, index) => (
            <StableReveal
              key={category.title}
              variant="card"
              delay={Math.min(index * 0.06, 0.24)}
              className="group relative isolate overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 backdrop-blur-sm transition-[border-color,box-shadow,background-color] duration-300 ease-out hover:border-accent/50 hover:bg-slate-900/70 hover:shadow-[0_30px_90px_-30px_rgba(14,165,233,0.45)]"
            >
              <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-400/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="pointer-events-none absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="relative z-10 h-72 overflow-hidden md:h-80">
                <img
                  src={toPublicAsset(category.image)}
                  alt={category.title}
                  className="h-full w-full object-cover transition-[filter,transform] duration-700 ease-out group-hover:scale-[1.02] group-hover:brightness-110 group-hover:contrast-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[hsl(215,60%,8%)] via-[hsl(215,60%,8%)]/45 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-[left,opacity] duration-700 ease-out group-hover:left-full group-hover:opacity-100" />
              </div>

              <div className="relative z-10 p-6 md:p-8">
                <div className="mb-4">
                  <h3 className="mb-2 font-display text-xl font-semibold text-white">
                    {category.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-white/70">
                    {category.description}
                  </p>
                </div>

                <div className="mb-4">
                  <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-white/55">
                    Typical Applications
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {category.applications.map((app) => (
                      <span
                        key={app}
                        className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/80 transition-colors duration-300 group-hover:bg-white/15 group-hover:text-white"
                      >
                        {app}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-5">
                  <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-white/55">
                    Industries Served
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {category.industries.map((ind) => (
                      <span
                        key={ind}
                        className="rounded-full border border-accent/30 px-2.5 py-1 text-xs text-accent transition-colors duration-300 group-hover:border-accent/50 group-hover:bg-accent/10"
                      >
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>

                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="group/btn border-white/20 bg-white/10 text-white hover:border-accent/60 hover:bg-white/15"
                >
                  <Link to={category.href}>
                    Explore Products
                    <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-1" />
                  </Link>
                </Button>
              </div>
            </StableReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WorkSolutionsSection;
