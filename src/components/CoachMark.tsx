import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "tucom_coach_marks_v1";

function getSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function markSeen(id: string) {
  try {
    const seen = getSeen();
    seen.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seen)));
  } catch {
    /* ignore */
  }
}

export function hasSeenCoachMark(id: string) {
  return getSeen().has(id);
}

interface CoachMarkProps {
  /** Unique identifier — won't show again once dismissed. */
  id: string;
  /** Tooltip copy in Spanish. */
  message: string;
  /** When true, the mark is eligible to appear. */
  enabled?: boolean;
  /** ms before auto-dismiss. Default 4000. 0 disables auto-dismiss. */
  autoDismissMs?: number;
  /** Tooltip placement relative to the trigger. */
  side?: "top" | "bottom" | "left" | "right";
  /** Children render the target element wrapped in a relative container. */
  children: React.ReactNode;
}

/**
 * Lightweight, dependency-free coach-mark. Wraps its target and overlays a
 * pulsing ring + tooltip the first time `enabled` becomes true. Persists the
 * dismissal in localStorage so each id only ever shows once per device.
 */
const CoachMark = ({
  id,
  message,
  enabled = true,
  autoDismissMs = 4000,
  side = "bottom",
  children,
}: CoachMarkProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (hasSeenCoachMark(id)) return;
    // Small delay so the target has time to mount before pulsing
    const show = setTimeout(() => setOpen(true), 350);
    return () => clearTimeout(show);
  }, [enabled, id]);

  useEffect(() => {
    if (!open || autoDismissMs <= 0) return;
    const t = setTimeout(() => dismiss(), autoDismissMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoDismissMs]);

  const dismiss = () => {
    markSeen(id);
    setOpen(false);
  };

  const tooltipPos =
    side === "top"
      ? "bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2"
      : side === "left"
        ? "right-[calc(100%+12px)] top-1/2 -translate-y-1/2"
        : side === "right"
          ? "left-[calc(100%+12px)] top-1/2 -translate-y-1/2"
          : "top-[calc(100%+12px)] left-1/2 -translate-x-1/2";

  return (
    <div className="relative inline-flex" onClickCapture={() => open && dismiss()}>
      {children}
      {open && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-primary animate-pulse"
          />
          <div
            role="tooltip"
            className={`absolute z-50 w-56 rounded-xl bg-foreground text-background shadow-elegant px-3 py-2 text-xs font-medium leading-snug animate-fade-in ${tooltipPos}`}
          >
            <div className="flex items-start gap-2">
              <span className="flex-1">{message}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss();
                }}
                className="opacity-70 hover:opacity-100"
                aria-label="Cerrar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CoachMark;
