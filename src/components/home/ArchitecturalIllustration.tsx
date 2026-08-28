/** Subtle line-art suggestive of a domed government building — low-opacity hero backdrop, never the focal point. */
export function ArchitecturalIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 900 420"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M450 150c0-33 27-60 60-60s60 27 60 60" strokeLinecap="round" />
      <rect x="500" y="82" width="20" height="18" />
      <line x1="510" y1="60" x2="510" y2="82" />
      <circle cx="510" cy="55" r="5" />
      <rect x="430" y="150" width="160" height="14" />
      {Array.from({ length: 11 }).map((_, i) => {
        const x = 442 + i * 14;
        return <line key={i} x1={x} y1={164} x2={x} y2={300} />;
      })}
      <rect x="430" y="300" width="160" height="12" />
      <rect x="400" y="312" width="220" height="14" />
      <path d="M350 326h320" strokeWidth="1" />

      <path d="M270 220 320 178 370 220" strokeLinejoin="round" />
      <rect x="270" y="220" width="100" height="10" />
      {Array.from({ length: 6 }).map((_, i) => {
        const x = 280 + i * 16;
        return <line key={`l-${i}`} x1={x} y1={230} x2={x} y2={300} />;
      })}
      <rect x="270" y="300" width="100" height="10" />

      <path d="M650 220 700 178 750 220" strokeLinejoin="round" />
      <rect x="650" y="220" width="100" height="10" />
      {Array.from({ length: 6 }).map((_, i) => {
        const x = 660 + i * 16;
        return <line key={`r-${i}`} x1={x} y1={230} x2={x} y2={300} />;
      })}
      <rect x="650" y="300" width="100" height="10" />

      <line x1="150" y1="326" x2="820" y2="326" strokeWidth="1" />
    </svg>
  );
}
