/**
 * CoachMarkFixed — igual que CoachMark pero se posiciona en coordenadas
 * fijas de pantalla (para marcar FABs u otros elementos fixed).
 * Muestra un tooltip flotante con puntero pulsante.
 */
import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "tucom_coach_marks_v1";

function getSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}
function markSeen(id: string) {
  try {
    const seen = getSeen();
    seen.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seen)));
  } catch {}
}

interface Props {
  id: string;
  message: string;
  /** CSS values for the pulsing dot position (bottom/right from viewport) */
  bottom: string;
  right: string;
  autoDismissMs?: number;
  enabled?: boolean;
  /** Extra ms to wait before showing (for staggering multiple coach marks) */
  delayMs?: number;
}

const CoachMarkFixed = ({
  id,
  message,
  bottom,
  right,
  autoDismissMs = 5000,
  enabled = true,
  delayMs = 600,
}: Props) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (getSeen().has(id)) return;
    const t = setTimeout(() => setOpen(true), delayMs);
    return () => clearTimeout(t);
  }, [id, enabled, delayMs]);

  useEffect(() => {
    if (!open || !autoDismissMs) return;
    const t = setTimeout(() => { markSeen(id); setOpen(false); }, autoDismissMs);
    return () => clearTimeout(t);
  }, [open, autoDismissMs, id]);

  const dismiss = () => { markSeen(id); setOpen(false); };

  if (!open) return null;

  return (
    <div
      className="fixed z-[9998] pointer-events-none"
      style={{ bottom, right }}
    >
      {/* Pulsing ring */}
      <span
        aria-hidden
        className="absolute inset-0 w-14 h-14 rounded-full ring-2 ring-primary animate-pulse -translate-x-1/2 -translate-y-1/2"
        style={{ left: "50%", top: "50%" }}
      />
      {/* Tooltip above-left */}
      <div
        role="tooltip"
        className="pointer-events-auto absolute bottom-full right-0 mb-3 w-52 rounded-xl bg-foreground text-background shadow-elegant px-3 py-2.5 text-xs font-medium leading-snug animate-fade-in"
      >
        <div className="flex items-start gap-2">
          <span className="flex-1">{message}</span>
          <button
            onClick={dismiss}
            className="opacity-70 hover:opacity-100 shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Arrow */}
        <span
          aria-hidden
          className="absolute top-full right-6 border-4 border-transparent border-t-foreground"
        />
      </div>
    </div>
  );
};

export default CoachMarkFixed;
