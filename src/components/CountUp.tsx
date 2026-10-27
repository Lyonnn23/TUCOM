import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}

/** Animates a number from its previous value to the new value on change.
 *  First mount animates from 0. Respects prefers-reduced-motion. */
const CountUp = ({ value, duration = 600, format, className }: Props) => {
  const [n, setN] = useState(0);
  const prevRef = useRef<number>(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduce || !Number.isFinite(value)) {
      setN(value);
      prevRef.current = value;
      return;
    }

    const from = prevRef.current;
    prevRef.current = value;
    const delta = value - from;
    const start = performance.now();
    let raf = 0;

    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setN(from + delta * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setN(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const display = format ? format(n) : Math.round(n).toLocaleString("es-CL");
  return <span className={className}>{display}</span>;
};

export default CountUp;
