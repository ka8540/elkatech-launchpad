import ProductCategoryPage, {
  type ProductCategoryProduct,
} from "@/components/ProductCategoryPage";

const intro =
  "Providing you the best range of Gongzheng A3 HD Desktop UV Printer with effective & timely delivery.";

const products: ProductCategoryProduct[] = [
  {
    id: "gongzheng-a3hd",
    name: "Gongzheng A3 HD Desktop UV Printer",
    price: "₹ 7,00,000 / Piece",
    brochureUrl:
      "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Gongzheng+A3+HD+Desktop+UV+Printer+-+PDF+Catalogue.pdf",
    images: [
      "images/Gongzheng A3 HD Desktop UV Printer/11-1.webp",
      "images/Gongzheng A3 HD Desktop UV Printer/11-2.webp",
      "images/Gongzheng A3 HD Desktop UV Printer/11-3.webp",
      "images/Gongzheng A3 HD Desktop UV Printer/11-4.webp",
      "images/Gongzheng A3 HD Desktop UV Printer/11-5.webp",
    ],
    specs: [
      [
        "Usage / Application",
        "Acrylic, Aluminum Sheet, Foam Board, PVC Board, Leather, Glass Bottle, Wood, Ceramic Tile, etc",
      ],
      ["Printing Width", "420 mm"],
      ["Ink Type", "Specific REI-3 UV Ink (Greenguard Gold Certified)"],
      ["Brand", "Gongzheng"],
      ["Print Head", "1 × Epson I3200(8)-U1HD"],
      ["Weight", "212 kgs"],
      ["Power Consumption", "Single-Phase, AC220V±10%, 50Hz, 10A"],
      ["Model", "A3HD"],
      ["Curing System", "1 Air Cooling LED UV Lamp"],
      ["Color Configuration", "CMYKLcLm + W + V"],
      ["Media Thickness", "Up to 60 mm"],
      ["Printing Speed", "720×1800 dpi"],
      ["Data Interface", "Gigabit Ethernet"],
    ],
    highlights: [
      "Epson I3200(8)-U1HD printhead",
      "Compact, unique body design",
      "Auto height detection up to 60 mm",
      "Constant printhead heater",
      "Powerful suction platform",
      "Touch screen panel",
    ],
  },
];

export default function DesktopUVPrinterPage() {
  return (
    <ProductCategoryPage
      title="Desktop UV Printer"
      intro={intro}
      products={products}
    />
  );
}
