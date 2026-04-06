import ProductCategoryPage, {
  type ProductCategoryProduct,
} from "@/components/ProductCategoryPage";

const intro =
  "Leading Wholesaler of Molor ML1600K Cold Heat Lamination Machine and Inca L4-1700 Electric Laminating Machine from Ahmedabad.";

const products: ProductCategoryProduct[] = [
  {
    id: "molor-ml1600k",
    name: "Molor ML1600K Cold Heat Lamination Machine",
    price: "₹ 1,25,000 / Piece",
    brochureUrl:
      "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Molor+ML1600K+Cold+Heat+Lamination+Machine%2C+1630mm+(64+Inch)+-+PDF+Catalogue.pdf",
    images: [
      "images/Molor ML1600K Cold Heat Lamination Machine/9-1.webp",
      "images/Molor ML1600K Cold Heat Lamination Machine/9-2.webp",
      "images/Molor ML1600K Cold Heat Lamination Machine/9-3.webp",
      "images/Molor ML1600K Cold Heat Lamination Machine/9-4.webp",
    ],
    specs: [
      ["Lamination Width", "1630 mm (64 Inch)"],
      ["Roller Type", "Silicone Rollers"],
      ["Feeding Mechanism", "Manual"],
      ["Model", "ML1600K"],
      ["Brand", "Molor"],
      ["Lamination Thickness", "35 mm (1.4 Inch)"],
      ["Voltage", "240 V"],
      ["Weight", "230 Kgs"],
      ["Preheating Time", "10 min"],
      ["Roller Lifting", "Air cylinder"],
    ],
    highlights: [
      "Durable laminator designed to reduce material cost and improve efficiency",
      "Works with post-printing materials, rigid displays, packing board, car wrapping, graphics, banners",
      "Compatible with common cold laminating films (bottom paper, bottom-free paper, polymer film)",
      "Heated upper roller (up to 60°C) for better lamination in low temp environments",
    ],
  },
  {
    id: "inca-l4-1700",
    name: "Inca L4-1700 Electric Laminating Machine",
    price: "₹ 17,00,000 / Piece",
    brochureUrl:
      "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Automatic+Inca+L4-1700+Electric+Laminating+Machine+-+PDF+Catalogue.pdf",
    images: [
      "images/Inca L4-1700 Electric Laminating Machine/10-1.webp",
      "images/Inca L4-1700 Electric Laminating Machine/10-2.webp",
      "images/Inca L4-1700 Electric Laminating Machine/10-3.webp",
    ],
    specs: [
      ["Automation Grade", "Automatic"],
      ["Number Of Rollers", "1"],
      ["Max Speed", "24 m/min"],
      ["Max Width", "1630 mm / 64 in."],
      ["Lifting Height", "40 mm / 1.5 in."],
      ["Motor Type", "250W motor"],
      ["Silicone Roller", "120 mm / 4.7 in."],
      ["Cutter Type", "4 ceramic knives (knob control)"],
      ["Pedal Type", "2 multi-functional foot pedal"],
      ["Winding Diameter", "200 mm / 8 in."],
      ["Model", "L4-1700"],
      ["Transmission", "Chain drive"],
    ],
    highlights: [
      "Automatic laminating workflow for consistent output",
      "High speed (up to 24 m/min) for production environments",
      "Integrated cutter + foot pedal controls",
      "Wide format (64 in.) support",
    ],
  },
];

export default function LaminationMachinesPage() {
  return (
    <ProductCategoryPage
      title="Lamination Machines"
      intro={intro}
      products={products}
    />
  );
}
