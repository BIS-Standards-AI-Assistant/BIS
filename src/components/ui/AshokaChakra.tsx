/* eslint-disable @next/next/no-img-element */
/**
 * State Emblem of India (Lion Capital of Ashoka with Satyameva Jayate)
 * Rendered in place of the Ashoka Chakra as the authoritative Government of India mark.
 */
export function AshokaChakra({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "white" | "dark";
}) {
  if (variant === "white") {
    return (
      <span className={`inline-block relative shrink-0 ${className ?? "h-5 w-auto"}`}>
        <img
          src="/emblem_india_white.png"
          alt="State Emblem of India — Government of India"
          className="h-full w-auto object-contain"
        />
      </span>
    );
  }

  if (variant === "dark") {
    return (
      <span className={`inline-block relative shrink-0 ${className ?? "h-5 w-auto"}`}>
        <img
          src="/emblem_india.png"
          alt="State Emblem of India — Government of India"
          className="h-full w-auto object-contain"
        />
      </span>
    );
  }

  return (
    <span className={`inline-block relative shrink-0 ${className ?? "h-5 w-auto"}`}>
      <img
        src="/emblem_india.png"
        alt="State Emblem of India — Government of India"
        className="h-full w-auto object-contain dark:hidden"
      />
      <img
        src="/emblem_india_white.png"
        alt="State Emblem of India — Government of India"
        className="h-full w-auto object-contain hidden dark:inline-block"
      />
    </span>
  );
}
