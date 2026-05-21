import { Fuel } from "lucide-react";
import { useTankRange } from "@/hooks/useTankRange";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Link } from "react-router-dom";

const TankRangeBanner = () => {
  const range = useTankRange();
  const { preferences } = useUserPreferences();
  const threshold = preferences?.low_fuel_threshold_km ?? 80;

  if (!range) return null;
  if (range.remainingKm > threshold) return null;

  return (
    <Link
      to="/?tab=stations&sort=price"
      className="block bg-gradient-primary text-primary-foreground rounded-2xl p-4 shadow-elegant press-scale"
      aria-label="Te queda poco combustible, ver estaciones cercanas"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
          <Fuel className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            Te quedan ~{range.remainingKm} km estimados
          </p>
          <p className="text-xs opacity-90">
            Toca para ver estaciones más baratas cerca tuyo.
          </p>
        </div>
      </div>
    </Link>
  );
};

export default TankRangeBanner;
