import ProductCategoryPage, {
  type ProductCategoryProduct,
} from "@/components/ProductCategoryPage";

const intro =
  "Pioneers in the industry, we offer Allwin Ricoh 2513 UV Flatbed Printer from India.";

const products: ProductCategoryProduct[] = [
  {
    id: "allwin-ricoh-2513",
    name: "Allwin Ricoh 2513 UV Flatbed Printer",
    price: "₹ 21,00,000 / Piece",
    brochureUrl:
      "https://elkatech-brochure.s3.us-east-1.amazonaws.com/1200+dpi+4+Allwin+Ricoh+2513+UV+Flatbed+Printer%2C+60+m2_h+-+PDF+Catalogue.pdf",
    images: ["/images/Flatbed.png"],
    specs: [
      ["Printing Width", "2500 mm"],
      ["Print Resolution", "1200 dpi"],
      ["Print Speed", "60 m²/h"],
      ["Printheads", "4"],
      ["Printhead Cleaning System", "Automatic"],
      ["Media Thickness", "100 mm"],
      ["Voltage", "220 V"],
      ["Power", "3600 W"],
    ],
    highlights: [
      "2.5m flatbed format for rigid boards",
      "1200 dpi resolution for sharp output",
      "Up to 60 m²/h production speed",
      "Automatic printhead cleaning system",
      "Supports media thickness up to 100 mm",
    ],
  },
];

export default function UVFlatbedPrinterPage() {
  return (
    <ProductCategoryPage
      title="UV Flatbed Printer"
      intro={intro}
      products={products}
    />
  );
}
