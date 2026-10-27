import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Pull-to-refresh gesture for mobile.
 * Triggers `onRefresh` when user pulls down ≥ threshold px from the top of the page.
 * Returns `isPulling` (true while dragging) and `pullProgress` (0–1).
 */
export function usePullToRefresh(
  onRefresh: () => void,
  { threshold = 80, disabled = false } = {},
) {
  const startY = useRef(0);
  const pulling = useRef(false);
  const [pullProgress, setPullProgress] = useState(0);

  const handleRefresh = useCallback(() => {
    onRefresh();
    if ("vibrate" in navigator) navigator.vibrate(10);
  }, [onRefresh]);

  useEffect(() => {
    if (disabled) return;

    const onTouchStart = (e: TouchEvent) => {
      const scrollTop =
        document.documentElement.scrollTop || document.body.scrollTop;
      if (scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy < 0) {
        pulling.current = false;
        setPullProgress(0);
        return;
      }
      setPullProgress(Math.min(dy / threshold, 1));
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!pulling.current) return;
      const dy = e.changedTouches[0].clientY - startY.current;
      pulling.current = false;
      setPullProgress(0);
      if (dy >= threshold) handleRefresh();
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [disabled, threshold, handleRefresh]);

  return { pullProgress, isPulling: pullProgress > 0 };
}
