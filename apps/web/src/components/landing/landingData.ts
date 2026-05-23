// Central data for the premium ElkaTech landing page.
// Image paths map to real assets under apps/web/public/images.
// "render" images are graphite studio renders (full-bleed friendly);
// "shot" images are catalogue product photos on light backgrounds and
// are treated with a graphite scrim so every card stays cohesive.

export type CategoryImageKind = "render" | "shot";

export type ProductCategory = {
  index: string;
  title: string;
  short: string;
  description: string;
  href: string;
  image: string;
  imageKind: CategoryImageKind;
  tags: string[];
};

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    index: "01",
    title: "Solvent & Eco-Solvent Printers",
    short: "Wide-format outdoor",
    description:
      "Production wide-format printing for flex banners, vinyl, vehicle wraps and outdoor advertising at commercial volume.",
    href: "/solvent-printers",
    image: "images/Solvent.png",
    imageKind: "render",
    tags: ["Flex Banners", "Vinyl", "Vehicle Wraps"],
  },
  {
    index: "02",
    title: "UV Roll-to-Roll Printers",
    short: "Instant-cure UV",
    description:
      "Mesh-belt and pinch-roller UV printing with instant curing for backlit media, soft signage and specialty rolls.",
    href: "/uv-printers",
    image: "images/Gongzheng DC1800UV Mesh Belt 1.8M UV Inkjet Printer/5-1.webp",
    imageKind: "shot",
    tags: ["Backlit Media", "Soft Signage", "Roll Media"],
  },
  {
    index: "03",
    title: "Laser Cutting & Engraving",
    short: "CO₂ precision",
    description:
      "High-precision CO₂ laser systems for cutting and engraving acrylic, MDF, wood, fabric and signage components.",
    href: "/laser-cutting-machines",
    image: "images/1325CCD Laser Engraving Cutting Machine/8-1.webp",
    imageKind: "shot",
    tags: ["Acrylic", "Wood & MDF", "Engraving"],
  },
  {
    index: "04",
    title: "Lamination Machines",
    short: "Cold & heat finishing",
    description:
      "Cold and heat lamination that protects and finishes banners, posters and signage for durability that lasts.",
    href: "/lamination-machines",
    image: "images/Laminatiom.png",
    imageKind: "render",
    tags: ["Cold Lamination", "Heat Lamination", "Finishing"],
  },
  {
    index: "05",
    title: "Desktop UV Printer (A3)",
    short: "Personalised rigid",
    description:
      "Compact A3 UV printing on phone cases, gifts, tiles, glass and wood — high-margin personalised production.",
    href: "/desktop-uv-printer",
    image: "images/Desktop_Image.png",
    imageKind: "render",
    tags: ["Phone Cases", "Gifts & Tiles", "Glass & Wood"],
  },
  {
    index: "06",
    title: "Giant Inkjet Printer (5M)",
    short: "Large-width speed",
    description:
      "High-speed five-metre inkjet printing for hoardings, banners and large-format outdoor branding jobs.",
    href: "/inkjet-printer",
    image: "images/inject.png",
    imageKind: "render",
    tags: ["Hoardings", "Banners", "Outdoor"],
  },
  {
    index: "07",
    title: "UV Flatbed Printer (2513)",
    short: "Rigid substrate UV",
    description:
      "Industrial flatbed UV printing on acrylic, glass, PVC, wood, metal and rigid boards with edge-to-edge detail.",
    href: "/flatbed-uv-printer",
    image: "images/Flatbed.png",
    imageKind: "render",
    tags: ["Acrylic & Glass", "PVC Boards", "Wood & Metal"],
  },
];

export const CAPABILITIES = [
  "Solvent Printers",
  "Eco-Solvent",
  "UV Roll-to-Roll",
  "UV Flatbed",
  "Laser Cutting",
  "CO₂ Engraving",
  "Lamination",
  "Desktop UV",
  "Giant Inkjet",
  "Printer Parts",
  "Inks",
  "Accessories",
];

export const BRANDS = ["Allwin", "Gongzheng", "Inca", "Molor", "Starfire", "Epson Heads"];

export const TRUST_STATS = [
  { value: "7+", label: "Years in the field" },
  { value: "10+", label: "International brands" },
  { value: "Pan-India", label: "Dispatch coverage" },
  { value: "12+", label: "Machine categories" },
];

// Service & support process — backed by the how-we-work photo set.
export const SERVICE_STEPS = [
  {
    step: "01",
    title: "Discovery & sizing",
    description:
      "We map your media, volume and substrates, then shortlist the machine that fits your floor and budget.",
    image: "images/how-we-work/machine-matching.webp",
  },
  {
    step: "02",
    title: "Dispatch & logistics",
    description:
      "Crated, insured and tracked dispatch across India with clear timelines and on-ground coordination.",
    image: "images/how-we-work/dispatch-logistics.webp",
  },
  {
    step: "03",
    title: "Install & training",
    description:
      "On-site installation, calibration and hands-on operator training so production starts the right way.",
    image: "images/how-we-work/install-training.webp",
  },
  {
    step: "04",
    title: "Support & uptime",
    description:
      "Genuine parts, ink and responsive after-sales support that keeps your machines running and earning.",
    image: "images/how-we-work/support-uptime.webp",
  },
];

export const APPLICATIONS = [
  {
    title: "Outdoor Advertising",
    description: "Hoardings, flex banners and large-format branding produced at scale.",
  },
  {
    title: "Signage Production",
    description: "Backlit boards, acrylic letters and architectural signage finishing.",
  },
  {
    title: "Vehicle Wraps",
    description: "Durable solvent and UV graphics engineered for the road.",
  },
  {
    title: "Interior & Décor",
    description: "Wall graphics, glass and rigid-board printing for interiors.",
  },
  {
    title: "Fabrication & Cutting",
    description: "Acrylic, wood and MDF cut and engraved to precise tolerances.",
  },
  {
    title: "Personalised Goods",
    description: "Phone cases, gifts, tiles and bottles on compact UV systems.",
  },
];

export const CONTACT = {
  phoneDisplay: "+91 72030 33486",
  phoneTel: "+917203033486",
  whatsapp: "917203033486",
  email: "elkatech2021@gmail.com",
  location: "Ahmedabad, Gujarat, India",
};
