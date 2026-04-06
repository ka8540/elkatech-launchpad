import ProductCategoryPage, {
  type ProductCategoryProduct,
} from "@/components/ProductCategoryPage";

const intro =
  "Leading Wholesaler of Allwin E520-8H 5M Giant Inkjet Printer and Allwin C8 Pro Inkjet Printer from Ahmedabad.";

const products: ProductCategoryProduct[] = [
  {
    id: "allwin-e520-8h",
    name: "Allwin E520-8H 5M Giant Inkjet Printer",
    price: "₹ 26,00,000 / Piece",
    brochureUrl:
      "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Allwin+E520-8H+5M+Giant+Inkjet+Printer+-+PDF+Catalogue.pdf",
    images: [
      "images/Inkjet Printer/12-1.webp",
      "images/Inkjet Printer/12-2.webp",
    ],
    specs: [
      ["Max Printing Width", "5285 mm"],
      ["Brand", "Allwin"],
      ["Model Name/Number", "E520-8H"],
      ["Print Speed", "280 m²/h"],
      ["Printing Resolution", "360 dpi"],
      ["Weight", "2350 kg"],
      ["Number Of Print Heads", "8"],
      ["Power", "13595 W"],
      ["Size", "7800(L) × 1200(W) × 1650(H) mm"],
      ["Rated Frequency", "50 Hz"],
      ["Voltage", "220 V"],
    ],
    highlights: [
      "5m-class wide output for high-volume production",
      "8 print heads for faster throughput",
      "360 dpi production resolution",
      "Industrial build and stable chassis",
    ],
  },
  {
    id: "allwin-c8-pro",
    name: "Allwin C8 Pro Inkjet Printer",
    price: "₹ 11,00,000 / Piece",
    brochureUrl:
      "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Allwin+C8+Pro+Inkjet+Printer+-+PDF+Catalogue.pdf",
    images: [
      "images/Inkjet Printer/13-1.webp",
      "images/Inkjet Printer/13-2.webp",
    ],
    specs: [
      ["Brand", "Allwin"],
      ["Model", "C8 Pro"],
      ["Print Width", "3300 mm"],
      ["Printhead Quantity", "8"],
      ["Printing Speed", "280 m²/h"],
      ["Printing Resolution", "360 dpi"],
      ["Machine Max Power", "9095 W"],
      ["Gross Weight", "975 kg"],
      ["Machine Size", "4450(L) × 940(W) × 1300(H) mm"],
      ["Rated Frequency", "50 Hz"],
      ["Voltage", "220 V"],
    ],
    highlights: [
      "3.3m printing width for signage work",
      "8-head configuration for speed",
      "Efficient power footprint vs 5m class",
      "Compact industrial form factor",
    ],
  },
];

export default function InkjetPrintersPage() {
  return (
    <ProductCategoryPage
      title="Inkjet Printers"
      intro={intro}
      products={products}
    />
  );
}
