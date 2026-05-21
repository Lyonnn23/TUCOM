import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}

/** Animates a number from 0 to value on mount. Respects prefers-reduced-motion. */
const CountUp = ({ value, duration = 600, format, className }: Props) => {
  const [n, setN] = useState(value);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      setN(value);
      return;
    }
    startedRef.current = true;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !Number.isFinite(value)) {
      setN(value);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setN(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setN(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const display = format ? format(n) : Math.round(n).toLocaleString("es-CL");
  return <span className={className}>{display}</span>;
};

export default CountUp;
