import { MapPin, Navigation } from "lucide-react";
import type { GasStation } from "@/hooks/useGasStations";
import ReportPriceDialog from "./ReportPriceDialog";
import logoCopec from "@/assets/logo-copec.png";
import logoShell from "@/assets/logo-shell.png";
import logoAramco from "@/assets/logo-aramco.png";

interface StationCardProps {
  station: GasStation;
  onNavigate?: (station: GasStation) => void;
  onNavigateGoogle?: (station: GasStation) => void;
}

const BRAND_STYLES: Record<string, { border: string; bg: string; accent: string; badge: string; logo: string }> = {
  Copec: {
    border: "border-[hsl(var(--brand-copec))]",
    bg: "bg-[hsl(var(--brand-copec)/0.06)]",
    accent: "text-[hsl(var(--brand-copec))]",
    badge: "bg-[hsl(var(--brand-copec))] text-white",
    logo: logoCopec,
  },
  Shell: {
    border: "border-[hsl(var(--brand-shell))]",
    bg: "bg-[hsl(var(--brand-shell)/0.06)]",
    accent: "text-[hsl(var(--brand-shell))]",
    badge: "bg-[hsl(var(--brand-shell))] text-white",
    logo: logoShell,
  },
  Aramco: {
    border: "border-[hsl(var(--brand-aramco))]",
    bg: "bg-[hsl(var(--brand-aramco)/0.06)]",
    accent: "text-[hsl(var(--brand-aramco))]",
    badge: "bg-[hsl(var(--brand-aramco))] text-white",
    logo: logoAramco,
  },
};

export const BRAND_LOGOS: Record<string, string> = {
  Copec: logoCopec,
  Shell: logoShell,
  Aramco: logoAramco,
};

const isFeaturedBrand = (brand: string) => brand in BRAND_STYLES;

const StationCard = ({ station, onNavigate, onNavigateGoogle }: StationCardProps) => {
  const featured = isFeaturedBrand(station.brand);
  const style = BRAND_STYLES[station.brand];

  return (
    <div
      className={`rounded-xl p-4 shadow-sm border transition-all ${
        featured
          ? `${style.bg} ${style.border} border-2 shadow-md`
          : "bg-card border-border"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {featured && (
            <img
              src={style.logo}
              alt={`${station.brand} logo`}
              loading="lazy"
              width={40}
              height={40}
              className="w-10 h-10 rounded-lg object-contain bg-white p-1 shadow-sm shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {featured && (
                <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                  {station.brand}
                </span>
              )}
              <h3 className={`font-heading font-semibold text-sm truncate ${featured ? style.accent : "text-foreground"}`}>
                {station.name}
              </h3>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  station.isOpen ? "bg-fuel-green animate-pulse-green" : "bg-fuel-red"
                }`}
              />
            </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" />
            {station.address}
          </p>
          {station.distance !== undefined && (
            <p className="text-xs text-fuel-blue font-medium mt-1">
              <Navigation className="w-3 h-3 inline mr-1" />
              {station.distance} km
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
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

      <div className="grid grid-cols-4 gap-2 mt-3">
        {[
          { label: "93", price: station.prices.gasoline93 },
          { label: "95", price: station.prices.gasoline95 },
          { label: "97", price: station.prices.gasoline97 },
          { label: "Diésel", price: station.prices.diesel },
        ].map((item) => (
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
