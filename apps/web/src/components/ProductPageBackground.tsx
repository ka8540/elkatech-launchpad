const PARTICLES = [
  { left: "8%", top: "18%", size: 3, delay: "0s", duration: "18s" },
  { left: "16%", top: "58%", size: 4, delay: "1.5s", duration: "21s" },
  { left: "24%", top: "34%", size: 2, delay: "0.8s", duration: "16s" },
  { left: "38%", top: "14%", size: 3, delay: "2.4s", duration: "22s" },
  { left: "48%", top: "72%", size: 4, delay: "1.2s", duration: "19s" },
  { left: "58%", top: "28%", size: 2, delay: "2.8s", duration: "17s" },
  { left: "68%", top: "62%", size: 3, delay: "0.4s", duration: "24s" },
  { left: "78%", top: "18%", size: 4, delay: "1.8s", duration: "20s" },
  { left: "86%", top: "44%", size: 2, delay: "3.1s", duration: "18s" },
  { left: "92%", top: "76%", size: 3, delay: "2.1s", duration: "23s" },
];

const ProductPageBackground = () => {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 product-page-base" />
      <div className="absolute inset-0 product-page-radials" />
      <div className="absolute inset-0 product-page-grid" />
      <div className="absolute inset-x-0 top-0 h-56 product-page-top-glow" />
      <div className="absolute inset-x-0 bottom-0 h-72 product-page-bottom-glow" />

      {PARTICLES.map((particle, index) => (
        <span
          key={`${particle.left}-${particle.top}-${index}`}
          className="product-page-particle"
          style={{
            left: particle.left,
            top: particle.top,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
          }}
        />
      ))}
    </div>
  );
};

export default ProductPageBackground;
