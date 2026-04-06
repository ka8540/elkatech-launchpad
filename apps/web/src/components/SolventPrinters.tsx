import ProductCategoryPage, {
  type ProductCategoryProduct,
} from "@/components/ProductCategoryPage";

const intro =
  "Providing you the best range of Gongzheng GZM3202ET Solvent Inkjet Printer, Gongzheng C3202SG Starfire Solvent Inkjet Printer, Allwin A180 Epson 13200 Eco Solvent Printer and Gongzheng GZM3204SG Starfire Solvent Inkjet Printer with effective & timely delivery.";

const products: ProductCategoryProduct[] = [
  {
    id: "gzm3202et",
    name: "Gongzheng GZM3202ET Solvent Inkjet Printer",
    price: "₹ 18,00,000 / Piece",
    brochureUrl:
      "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Gongzheng+GZM3202ET+Solvent+Inkjet+Printer+-+PDF+Catalogue.pdf",
    images: [
      "/images/Gongzheng GZM3202ET Solvent Inkjet Printer/1.webp",
      "/images/Gongzheng GZM3202ET Solvent Inkjet Printer/3.webp",
      "/images/Gongzheng GZM3202ET Solvent Inkjet Printer/5.webp",
    ],
    specs: [
      ["Printing Width", "3200 mm"],
      ["Data Interface", "External: Ethernet; Internal: Fiber Optical"],
      [
        "Drying System",
        "Pre, Mid, Post and Extended Heater + Intelligent IR Drying System",
      ],
      ["Working Environment", "Temp. 23℃~29℃, Humidity: 50%~80%"],
      ["Model", "GZM3202ET"],
      ["Brand", "Gongzheng"],
      [
        "Print Head",
        "4 Epson T3200-U3-S Print Heads / 2 Epson T3200-U3-S Print Heads",
      ],
      ["Ink Supply System", "GnTek Negative Pressure Recirculation System"],
      ["Media Type", "Banner, Frontlit, Backlit, Vinyl, Film..."],
      ["Printing Speed", "300x1800dpi 60㎡/h"],
      ["Power", "50Hz / AC, 220V+10% 10A(Printer) + 31A(IR Drying System)"],
      ["Gross Weight", "1924 KGS"],
      ["Type", "Eco Solvent"],
      ["Voltage", "220 V"],
    ],
    highlights: [
      "GnTek Negative Pressure Recirculation System",
      "Accurate Pneumatic Shaft Taking Up",
      "Intelligent Energy-Saving IR Drier",
      "High Speed, Photo-Quality Print",
      "Reinforced Structure with High Stability",
      "Revolutionary Print Head with Heater Integrated",
    ],
  },
  {
    id: "c3202sg",
    name: "Gongzheng C3202SG Starfire Solvent Inkjet Printer",
    price: "₹ 13,00,000/Piece",
    brochureUrl:
      "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Gongzheng+C3202SG+Starfire+Solvent+Inkjet+Printer+-+PDF+Catalogue.pdf",
    images: [
      "/images/Gongzheng C3202SG Starfire Solvent Inkjet Printer/2-1.webp",
      "/images/Gongzheng C3202SG Starfire Solvent Inkjet Printer/2-2.webp",
      "/images/Gongzheng C3202SG Starfire Solvent Inkjet Printer/2-3.webp",
      "/images/Gongzheng C3202SG Starfire Solvent Inkjet Printer/2-4.webp",
    ],
    specs: [
      ["Printing Width", "3200 mm"],
      ["Type", "Eco Solvent"],
      ["Media Type", "Banner, Frontlit, Backlit, Viny, Film..."],
      ["Data Interface", "External: USB2.0; Internal: High-Speed SCSI"],
      ["Brand/Make", "Gongzheng"],
      ["Model/Type", "C3202SG"],
      ["Working Environment", "Temp. 23℃~29℃, Humidity: 50%~80%"],
      ["Voltage", "220 V"],
      ["Drying System", "Pre, Mid, Post and Extended Heater Plus Smart IR Drier"],
      ["Print Head", "2 Starfire 1024"],
      ["Ink Supply System", "Gntek Negative Pressure Recirculation System"],
      ["Feeding System", "Automatic Media Feeding and Taking up System with Air Shaft"],
      ["Printing Speed", "300x400dpi 129㎡/h"],
      ["Gross Weight", "1150KGS"],
    ],
    highlights: [
      "Maximum Four Print Heads in Staggered Way",
      "Extreme Speed Up to 234㎡/h",
      "Durable 400w Ac Servo System",
      "More Precise Carriage Belt System",
      "Gntek Negative Pressure Recirculation System",
      "Smart Energy-saving Ir Dryer",
      "Dismountable Design for Low Transportation Cost!",
    ],
  },
  {
    id: "allwin-a180",
    name: "Allwin A180 Epson 13200 Eco Solvent Printer",
    price: "₹ 4,00,000/Piece",
    brochureUrl:
      "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Allwin+A180+Epson+13200+Eco+Solvent+Printer+-+PDF+Catalogue.pdf",
    images: [
      "images/Allwin A180 Epson 13200 Eco Solvent Printer/3-1.webp",
      "images/Allwin A180 Epson 13200 Eco Solvent Printer/3-2.webp",
    ],
    specs: [
      ["Printing Width", "31 m"],
      ["Type", "Eco Solvent"],
      ["Brand/Make", "Allwin"],
      ["Model/Type", "A180"],
      ["Maximum Resolution", "1440 dpi"],
    ],
    highlights: [
      "Suitable for i3200 head or DX5 head",
      "Silent guide rail, high precision and stable operation, to ensure perfect printing quality",
      "All aluminum platform, high precision and durability",
      "Standard equipped infrared heating + air drying system",
      "Standard equipped feeding and collecting system.",
    ],
  },
  {
    id: "gzm3204sg",
    name: "Gongzheng GZM3204SG Starfire Solvent Inkjet Printer",
    price: "₹ 17,50,000/Piece",
    brochureUrl:
      "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Gongzheng+GZM3204SG+Starfire+Solvent+Inkjet+Printer+-+PDF+Catalogue.pdf",
    images: ["images/Gongzheng GZM3204SG Starfire Solvent Inkjet Printer/4-1.webp"],
    specs: [
      ["Printing Width", "3200 mm"],
      ["Type", "Eco Solvent"],
      ["Media Type", "Banner, Frontlit, Backlit, Vinyl, Film"],
      ["Data Interface", "External: USB 2.0, Internal: High-Speed SCSI"],
      ["Brand / Make", "Gongzheng"],
      ["Model / Type", "GZM3204SG"],
      ["Working Environment", "23–29°C, 50–80% Humidity"],
      ["Voltage", "220 V"],
      ["Drying System", "Pre, Mid, Post & Extended Heater + Intelligent IR"],
      ["Printhead", "4 × Starfire 1024 (25pl)"],
      ["Ink Supply System", "Gntek Negative Pressure Recirculation"],
      ["Feeding System", "Automatic Media Feeding & Take-up (Pneumatic Shaft)"],
      ["Printing Speed", "300×400 dpi — 229 m²/h"],
      ["Gross Weight", "1345 kg"],
    ],
    highlights: [
      "Extreme speed up to 229㎡/h",
      "Enhanced rigid body for higher precision and durability",
      "Upgraded 400W AC servo drive system",
      "Gntek negative pressure ink recirculation system",
      "Intelligent energy-saving thermal drying system",
      "Advanced color management software",
      "Optional separate take-up system",
      "Optional mesh printing kit",
    ],
  },
];

export default function SolventPrintersPage() {
  return (
    <ProductCategoryPage
      title="Solvent Printers"
      intro={intro}
      products={products}
    />
  );
}
