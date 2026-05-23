const ProductPageBackground = () => {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 product-page-base" />
      <div className="absolute inset-0 product-page-grid" />
      <div className="absolute inset-x-0 top-0 h-56 product-page-top-glow" />
      <div className="absolute inset-x-0 bottom-0 h-72 product-page-bottom-glow" />
    </div>
  );
};

export default ProductPageBackground;
