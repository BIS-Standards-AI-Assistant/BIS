/**
 * The Ashoka Chakra — the 24-spoke wheel from the Indian national flag,
 * used here (not the Lion Capital State Emblem) as the "Government of
 * India" mark in the top government bar: it's geometrically exact to
 * render (24 spokes at 15° intervals) and is the same national symbol
 * used for this purpose across most Indian government web portals.
 */
export function AshokaChakra({ className }: { className?: string }) {
  const spokes = Array.from({ length: 24 }, (_, i) => i * 15);

  return (
    <svg viewBox="0 0 48 48" role="img" aria-label="Ashoka Chakra — Government of India" className={className}>
      <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="24" cy="24" r="2.4" fill="currentColor" />
      {spokes.map((deg) => (
        <line
          key={deg}
          x1="24"
          y1="24"
          x2="24"
          y2="4.5"
          stroke="currentColor"
          strokeWidth="1.1"
          transform={`rotate(${deg} 24 24)`}
        />
      ))}
    </svg>
  );
}
