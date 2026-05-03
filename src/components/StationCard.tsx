import { MapPin, Navigation, Star, Zap, Fuel } from "lucide-react";
import type { GasStation } from "@/hooks/useGasStations";
import ReportPriceDialog from "./ReportPriceDialog";

interface StationCardProps {
  station: GasStation;
  onNavigate?: (station: GasStation) => void;
  onNavigateGoogle?: (station: GasStation) => void;
}

const BRAND_STYLES: Record<string, { border: string; bg: string; accent: string; badge: string }> = {
  Copec: {
    border: "border-[hsl(var(--brand-copec))]",
    bg: "bg-[hsl(var(--brand-copec)/0.06)]",
    accent: "text-[hsl(var(--brand-copec))]",
    badge: "bg-[hsl(var(--brand-copec))] text-white",
  },
  Shell: {
    border: "border-[hsl(var(--brand-shell))]",
    bg: "bg-[hsl(var(--brand-shell)/0.06)]",
    accent: "text-[hsl(var(--brand-shell))]",
    badge: "bg-[hsl(var(--brand-shell))] text-white",
  },
  Aramco: {
    border: "border-[hsl(var(--brand-aramco))]",
    bg: "bg-[hsl(var(--brand-aramco)/0.06)]",
    accent: "text-[hsl(var(--brand-aramco))]",
    badge: "bg-[hsl(var(--brand-aramco))] text-white",
  },
};

const isFeaturedBrand = (brand: string) => brand in BRAND_STYLES;

const StationCard = ({ station, onNavigate, onNavigateGoogle }: StationCardProps) => {
  const featured = isFeaturedBrand(station.brand);
  const style = BRAND_STYLES[station.brand];

  const fuelItems = [
    { label: "93", price: station.prices.gasoline93 },
    { label: "95", price: station.prices.gasoline95 },
    { label: "97", price: station.prices.gasoline97 },
    { label: "Diésel", price: station.prices.diesel },
  ];

  // Add electric if station has EV charging
  if (station.hasEvCharging && station.prices.electric > 0) {
    fuelItems.push({ label: "⚡ kWh", price: station.prices.electric });
  }

  return (
    <div
      className={`rounded-xl p-4 shadow-sm border transition-all ${
        featured
          ? `${style.bg} ${style.border} border-2 shadow-md`
          : "bg-card border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {featured && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${style.badge}`}>
                <Star className="w-3 h-3" />
                {station.brand}
              </span>
            )}
            {station.hasEvCharging && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[hsl(142,70%,45%)] text-white shrink-0">
                <Zap className="w-3 h-3" />
                EV
              </span>
            )}
            <h3 className={`font-heading font-semibold text-sm truncate min-w-0 flex-1 ${featured ? style.accent : "text-foreground"}`} title={station.name}>
              {station.name}
            </h3>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                station.isOpen ? "bg-fuel-green animate-pulse-green" : "bg-fuel-red"
              }`}
            />
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 min-w-0" title={station.address}>
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{station.address}</span>
          </p>
          {station.distance !== undefined && (
            <p className="text-xs text-fuel-blue font-medium mt-1 truncate">
              <Fuel className="w-3 h-3 inline mr-1" />
              {station.distance} km
            </p>
          )}
          {station.hasEvCharging && station.evPowerKw && (
            <p className="text-[10px] text-[hsl(142,70%,45%)] font-medium mt-1 truncate">
              <Zap className="w-3 h-3 inline mr-0.5" />
              {station.evPowerKw} kW · {station.evConnectorTypes.slice(0, 2).join(", ")}
              {station.evOperator ? ` · ${station.evOperator}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ReportPriceDialog station={station} />
          <button
            onClick={() => onNavigateGoogle?.(station)}
            className="bg-muted text-foreground rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-muted/80 transition-colors"
          >
            Maps
          </button>
          <button
            onClick={() => onNavigate?.(station)}
            className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            Waze
          </button>
        </div>
      </div>

      <div className={`grid gap-2 mt-3 ${fuelItems.length > 4 ? "grid-cols-5" : "grid-cols-4"}`}>
        {fuelItems.map((item) => (
          <div
            key={item.label}
            className={`text-center rounded-lg py-1.5 px-1 ${
              featured ? "bg-white/60 dark:bg-white/10" : "bg-muted"
            }`}
          >
            <p className="text-[10px] text-muted-foreground font-medium">{item.label}</p>
            <p className={`text-xs font-bold ${featured ? style.accent : "text-foreground"}`}>
              ${item.price}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StationCard;
