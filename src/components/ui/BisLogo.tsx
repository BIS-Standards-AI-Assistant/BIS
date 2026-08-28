/**
 * High-fidelity official Bureau of Indian Standards (BIS) emblem, matching
 * the standard logo geometry and Sanskrit motto (मानकः पथप्रदर्शकः).
 */
export function BisLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 450 350"
      role="img"
      aria-label="Bureau of Indian Standards emblem"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Blue Logo Triangle */}
      <path
        d="M225,18 L382,236 C397,257 382,286 356,286 L265,286 L225,246 L185,286 L94,286 C68,286 53,257 68,236 L225,18 Z"
        fill="#1e5cb3"
      />
      
      {/* Inner White Triangle Cutout */}
      <path
        d="M225,90 L305,210 C315,225 305,246 287,246 L163,246 C145,246 135,225 145,210 L225,90 Z"
        fill="#ffffff"
      />
      
      {/* Central Red Circular Dot */}
      <circle cx="225" cy="175" r="28" fill="#e22e2e" />
      
      {/* Motto: मानकः पथप्रदर्शकः */}
      <text
        x="225"
        y="318"
        fill="#e22e2e"
        fontFamily="'Noto Sans Devanagari', 'Kokila', 'Arial', sans-serif"
        fontSize="26"
        fontWeight="bold"
        textAnchor="middle"
        letterSpacing="1"
      >
        मानकः पथप्रदर्शकः
      </text>
      
      {/* Lower Blue Wing Arch */}
      <path
        d="M20,300 C100,350 350,350 430,300 C390,320 260,335 225,335 C190,335 60,320 20,300 Z"
        fill="#1e5cb3"
      />
    </svg>
  );
}


