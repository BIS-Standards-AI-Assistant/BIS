/**
 * Placeholder emblem — no official BIS logo asset exists in /public yet.
 * Swap for the official mark (e.g. public/bis-logo.svg) when available;
 * every consumer just renders <BisLogo />, so the swap is one file.
 */
export function BisLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" role="img" aria-label="Bureau of Indian Standards emblem" className={className}>
      <path
        d="M24 5 43 39H5L24 5Z"
        fill="none"
        stroke="#063b73"
        strokeWidth="3.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M24 16 32.5 31H15.5L24 16Z"
        fill="none"
        stroke="#063b73"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="24" cy="27" r="3" fill="#e8622a" />
    </svg>
  );
}
