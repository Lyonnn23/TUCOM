import { memo, useMemo, useState } from "react";
import { Trophy, MapPin, Navigation, Fuel, ChevronDown, ChevronUp, Zap, Clock } from "lucide-react";
import type { GasStation } from "@/hooks/useGasStations";
import { formatRelativeTime } from "@/hooks/useGasStations";
import BrandLogo from "./BrandLogo";

const FUEL_TYPES = [
  { key: "gasoline93" as const, label: "Bencina 93", short: "93" },
  { key: "gasoline95" as const, label: "Bencina 95", short: "95" },
  { key: "gasoline97" as const, label: "Bencina 97", short: "97" },
  { key: "diesel" as const, label: "Diésel", short: "Diésel" },
  { key: "electric" as const, label: "Eléctrico", short: "⚡ EV" },
];

const MEDAL_COLORS = [
  "bg-[hsl(45,93%,47%)] text-white",
  "bg-[hsl(0,0%,75%)] text-white",
  "bg-[hsl(29,60%,45%)] text-white",
];

const BRAND_ACCENT: Record<string, string> = {
  Copec: "text-[hsl(var(--brand-copec))]",
  Shell: "text-[hsl(var(--brand-shell))]",
  Aramco: "text-[hsl(var(--brand-aramco))]",
};

interface NearbyRankingProps {
  stations: (GasStation & { distance?: number })[];
  userLocation: { lat: number; lng: number } | null;
  onNavigate?: (station: GasStation) => void;
}

const NearbyRanking = ({ stations, userLocation, onNavigate }: NearbyRankingProps) => {
  const [activeFuel, setActiveFuel] = useState<(typeof FUEL_TYPES)[number]["key"]>("gasoline93");
  const [expanded, setExpanded] = useState(true);

  const isElectric = activeFuel === "electric";

  const ranking = useMemo(() => {
    if (!userLocation) return [];
    return stations
      .filter((s) => s.distance !== undefined && s.distance <= 10)
      .filter((s) => {
        if (activeFuel === "electric") return s.hasEvCharging && (s.prices.electric ?? 0) > 0;
        return (s.prices[activeFuel] ?? 0) > 0;
      })
      .sort((a, b) => a.prices[activeFuel] - b.prices[activeFuel])
      .slice(0, 5);
  }, [stations, userLocation, activeFuel]);

  if (!userLocation) return null;
  if (ranking.length === 0 && activeFuel !== "electric") return null;

  const fuelInfo = FUEL_TYPES.find((f) => f.key === activeFuel)!;

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(45,93%,47%)] to-[hsl(35,90%,50%)] flex items-center justify-center shadow-sm">
            <Trophy className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="text-left">
            <p className="font-heading font-bold text-sm text-foreground">Top 5 Más Baratas</p>
            <p className="text-[10px] text-muted-foreground">
              Estaciones en 10 km · {fuelInfo.label}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {FUEL_TYPES.map((fuel) => (
              <button
                key={fuel.key}
                onClick={() => setActiveFuel(fuel.key)}
                className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                  activeFuel === fuel.key
                    ? fuel.key === "electric"
                      ? "bg-[hsl(142,70%,45%)] text-white"
                      : "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {fuel.short}
              </button>
            ))}
          </div>

          {ranking.length === 0 ? (
            <div className="text-center py-4">
              <Zap className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">No hay electrolineras cercanas aún</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ranking.map((station, idx) => {
                const brandAccent = BRAND_ACCENT[station.brand];
                return (
                  <div
                    key={station.id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                      idx === 0
                        ? "bg-[hsl(45,93%,47%,0.08)] border border-[hsl(45,93%,47%,0.25)]"
                        : "bg-muted/40"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        idx < 3 ? MEDAL_COLORS[idx] : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {idx + 1}
                    </div>

                    <BrandLogo brand={station.brand} size={24} />

                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${brandAccent || "text-foreground"}`}>
                        {station.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                          {station.brand}
                        </span>
                        {station.distance !== undefined && (
                          <span className="text-[10px] text-fuel-blue font-medium flex items-center gap-0.5 shrink-0">
                            <Navigation className="w-2.5 h-2.5" />
                            {station.distance} km
                          </span>
                        )}
                        {station.lastUpdated && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                            <Clock className="w-2.5 h-2.5" />
                            {formatRelativeTime(station.lastUpdated)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${idx === 0 ? "text-[hsl(var(--fuel-green))]" : "text-foreground"}`}>
                        ${station.prices[activeFuel]}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {isElectric ? "CLP/kWh" : "CLP/L"}
                      </p>
                      {isElectric && station.electricEstimated && (
                        <p className="text-[8px] text-muted-foreground/80 leading-none">Est.</p>
                      )}
                    </div>

                    {onNavigate && (
                      <button
                        onClick={() => onNavigate(station)}
                        className="shrink-0 p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        title="Ir con Waze"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(NearbyRanking);
