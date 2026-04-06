import ProductCategoryPage, {
  type ProductCategoryProduct,
} from "@/components/ProductCategoryPage";

const intro =
  "Offering you a complete choice of products which include Gongzheng DC1800UV Mesh Belt 1.8M UV Inkjet Printer, Allwin Giant Hybrid UV Printer and Allwin 3.2 Double Rows Pinch Roller UV Printer.";

const products: ProductCategoryProduct[] = [
  {
    id: "dc1800uv",
    name: "Gongzheng DC1800UV Mesh Belt 1.8M UV Inkjet Printer",
    price: "₹ 14,00,000 / Piece",
    brochureUrl:
      "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Gongzheng+DC1800UV+Mesh+Belt+1.8M+UV+Inkjet+Printer+-+PDF+Catalogue.pdf",
    images: [
      "images/Gongzheng DC1800UV Mesh Belt 1.8M UV Inkjet Printer/5-1.webp",
      "images/Gongzheng DC1800UV Mesh Belt 1.8M UV Inkjet Printer/5-2.webp",
      "images/Gongzheng DC1800UV Mesh Belt 1.8M UV Inkjet Printer/5-3.webp",
      "images/Gongzheng DC1800UV Mesh Belt 1.8M UV Inkjet Printer/5-4.webp",
    ],
    specs: [
      [
        "Usage/Application",
        "Roll: Ceiling Film, Vinyl, Backlit, Fabric, Wall paper, Leather, etc. Flat: PVC board, Foam board",
      ],
      ["Printing Width (mm)", "1800 mm"],
      ["Ink Type", "Flexible UV Ink"],
      ["Brand", "Gongzheng"],
      ["Print Head", "8"],
      ["Weight", "1366 kgs"],
      [
        "Power Consumption",
        "Single phase, 50Hz/AC, 220V±10%, 5A (Printer + UV Controller)",
      ],
      ["Model", "ThunderJet DC1800UV"],
      ["Ink Tank", "1000 ml"],
      ["Roll Diameter", "Max. 300 mm"],
      ["Roll Weight", "Max. 50 kgs"],
      ["Printing Speed", "720×1800 dpi"],
    ],
    highlights: [
      "Mesh Belt System",
      "Multi-layer Printing Application",
      "White Ink Recirculation System",
      "Intelligent Heating Unit",
    ],
  },
  {
    id: "allwin-giant-hybrid",
    name: "Allwin Giant Hybrid UV Printer",
    price: "₹ 35,00,000 / Piece",
    brochureUrl:
      "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Allwin+Giant+Hybrid+UV+Printer+-+PDF+Catalogue.pdf",
    images: [
      "images/Allwin Giant Hybrid UV Printer/6-1.webp",
      "images/Allwin Giant Hybrid UV Printer/6-2.webp",
    ],
    specs: [
      ["Usage/Application", "Posters Printing"],
      ["Printing Width", "6.6 m"],
      ["Print Resolution", "2160 dpi"],
      ["Print Speed", "235 m2/h"],
      ["Printheads", "40"],
      ["Printhead Cleaning System", "Automatic"],
      ["Voltage", "440 V"],
      ["Power", "10 kW"],
    ],
    highlights: [
      "6.6m ultra-wide production",
      "2160 dpi output",
      "235 m2/h speed",
      "Automatic printhead cleaning",
    ],
  },
  {
    id: "allwin-3-2-pinch-roller",
    name: "Allwin 3.2 Double Rows Pinch Roller UV Printer",
    price: "₹ 21,00,000 / Piece",
    brochureUrl:
      "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Allwin+3.2+Double+Rows+Pinch+Roller+UV+Printer+-+PDF+Catalogue.pdf",
    images: [
      "images/Allwin 3.2 Double Rows Pinch Roller UV Printer/7-1.webp",
      "images/Allwin 3.2 Double Rows Pinch Roller UV Printer/7-2.webp",
    ],
    specs: [
      ["Usage/Application", "Posters Printing"],
      ["Printing Width (mm)", "3.2 m"],
      ["Ink Type", "UV Ink"],
      ["Brand", "Allwin"],
      ["Print Head", "KONICA10241-6PL / 10241-13PL / 1024A"],
      ["Weight", "1135 kg"],
      ["Power Consumption", "220 VAC, 50 Hz"],
      ["Printing Resolution", "2160 dpi"],
    ],
    highlights: [
      "3.2m width for large media",
      "Konica head options",
      "2160 dpi resolution",
      "Production-ready UV workflow",
    ],
  },
];

export default function UVPrintersPage() {
  return (
    <ProductCategoryPage
      title="UV Printers"
      intro={intro}
      products={products}
    />
  );
}
