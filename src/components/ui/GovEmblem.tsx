/**
 * Abstract placeholder mark for the "Government of India" footer slot —
 * intentionally not a reproduction of the State Emblem. Swap for the
 * official asset when available.
 */
export function GovEmblem({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" role="img" aria-label="Government of India" className={className}>
      <circle cx="24" cy="16" r="6" fill="none" stroke="#063b73" strokeWidth="2" />
      <path d="M10 44V30a14 14 0 0 1 28 0v14" fill="none" stroke="#063b73" strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="44" x2="42" y2="44" stroke="#063b73" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
