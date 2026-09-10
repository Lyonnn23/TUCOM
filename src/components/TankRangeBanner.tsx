import { AlertTriangle, X } from "lucide-react";
import { useTankRange } from "@/hooks/useTankRange";
import { useState } from "react";

const TankRangeBanner = ({ onActivate }: { onActivate?: () => void }) => {
  const range = useTankRange();
  const [dismissed, setDismissed] = useState(false);

  if (!range || range.remainingKm >= 50 || dismissed) return null;

  return (
    <div
      className="relative bg-gradient-to-r from-orange-500 to-rose-500 text-primary-foreground rounded-2xl p-4 pr-12 shadow-elegant"
      aria-label="Te queda poco combustible, ver estaciones cercanas"
    >
      <button type="button" onClick={onActivate} className="card-interactive w-full cursor-pointer text-left flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-foreground/15 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Bencina baja · ~{range.remainingKm} km</p>
          <p className="text-xs opacity-90">Ver estaciones cercanas ahora</p>
        </div>
      </button>
      <button type="button" onClick={() => setDismissed(true)} className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl hover:bg-primary-foreground/15" aria-label="Ocultar aviso durante esta sesión">
        <X className="h-4 w-4 mx-auto" />
      </button>
    </div>
  );
};

export default TankRangeBanner;
