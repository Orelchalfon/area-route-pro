import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import CountUp from "react-countup";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function")
      return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * A whole number that eases to its new value instead of snapping.
 *
 * `preserveValue` makes later changes animate from the figure already on screen,
 * so switching technician or month eases from the old count rather than
 * restarting at 0.
 *
 * Always renders with `tabular-nums`: proportional digits have different widths
 * (1 is narrower than 8), so a counting number would otherwise shift the text
 * beside it on every frame.
 */
export function AnimatedCount({
  value,
  duration = 0.8,
  className,
}: {
  value: number;
  /** Seconds. */
  duration?: number;
  className?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <span className={cn("tabular-nums", className)}>
      {reducedMotion ? (
        value
      ) : (
        <CountUp end={value} duration={duration} preserveValue />
      )}
    </span>
  );
}
