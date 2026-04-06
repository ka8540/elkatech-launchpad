import ProductCategoryPage, {
  type ProductCategoryProduct,
} from "@/components/ProductCategoryPage";

const intro =
  "We are a leading wholesaler of 1325CCD Laser Engraving Cutting Machine from Ahmedabad, India.";

const products: ProductCategoryProduct[] = [
  {
    id: "1325ccd",
    name: "1325CCD Laser Engraving Cutting Machine",
    price: "₹ 6,50,000 / Piece",
    brochureUrl:
      "https://elkatech-brochure.s3.us-east-1.amazonaws.com/1325CCD+Laser+Engraving+Cutting+Machine+-+PDF+Catalogue.pdf",
    images: [
      "images/1325CCD Laser Engraving Cutting Machine/8-1.webp",
      "images/1325CCD Laser Engraving Cutting Machine/8-2.webp",
    ],
    specs: [
      ["Laser Power", "180 W"],
      ["Model Name/Number", "1325CCD"],
      ["Size", "1300 × 2500 mm"],
      ["Compatible Software", "CorelDRAW, Photoshop, AutoCAD"],
      ["Net Weight", "750 KG"],
      ["Working Area", "1300 × 2500 mm"],
      ["Laser Tube", "Sealed CO₂ Laser Tube (150–180W)"],
      ["Controller", "Ruida Controller"],
      ["Recognition System", "CCD High Precision Visual Recognition System"],
      ["Worktable", "Knife Blade Worktable"],
      ["Cooling", "Water Cooling & Protection System (Chiller)"],
      ["Drive System", "X with Belt, Y with Rack & Pinion"],
      ["Graphic Format Support", "BMP, PLT, DXI, AI"],
    ],
    highlights: [
      "1300 × 2500 mm working area",
      "Knife blade worktable",
      "Sealed CO₂ laser tube (150–180W)",
      "Water cooling & protection chiller",
      "Ruida controller",
      "CCD visual recognition system",
      "Air pump + exhaust fan included",
      "Supports CorelDRAW / Photoshop / AutoCAD",
      "Formats: BMP, PLT, DXI, AI",
      "X belt drive + Y rack & pinion",
      "Net weight: 750 KG",
    ],
  },
];

export default function LaserCuttingMachinesPage() {
  return (
    <ProductCategoryPage
      title="Laser Cutting Machines"
      intro={intro}
      products={products}
    />
  );
}
