import { MapPin, Navigation, Star, Zap, Clock, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { GasStation } from "@/hooks/useGasStations";
import ReportPriceDialog from "./ReportPriceDialog";
import BrandLogo from "./BrandLogo";
import FavoriteButton from "./FavoriteButton";
import CommunityReportBadge from "./CommunityReportBadge";
import { analytics } from "@/lib/analytics";
import { formatPrice, formatKm, formatRelativeTime } from "@/lib/format";
import { useStationDiscounts } from "@/hooks/useStationDiscounts";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { getBestDiscount, DISCOUNT_DISCLAIMER } from "@/lib/discounts";

interface StationCardProps {
  station: GasStation;
  onNavigate?: (station: GasStation) => void;
  onNavigateGoogle?: (station: GasStation) => void;
  lastCommunityReport?: string | null;
  rating?: { avg: number; count: number } | null;
}

const BRAND_STYLES: Record<string, { ring: string; accent: string; badge: string }> = {
  Copec: {
    ring: "ring-[hsl(var(--brand-copec))]/40",
    accent: "text-[hsl(var(--brand-copec))]",
    badge: "bg-[hsl(var(--brand-copec))] text-white",
  },
  Shell: {
    ring: "ring-[hsl(var(--brand-shell))]/40",
    accent: "text-[hsl(var(--brand-shell))]",
    badge: "bg-[hsl(var(--brand-shell))] text-white",
  },
  Aramco: {
    ring: "ring-[hsl(var(--brand-aramco))]/40",
    accent: "text-[hsl(var(--brand-aramco))]",
    badge: "bg-[hsl(var(--brand-aramco))] text-white",
  },
};

const isFeaturedBrand = (brand: string) => brand in BRAND_STYLES;

const StationCard = ({ station, onNavigate, onNavigateGoogle, lastCommunityReport, rating }: StationCardProps) => {
  const navigate = useNavigate();
  const featured = isFeaturedBrand(station.brand);
  const style = BRAND_STYLES[station.brand];
  const { data: discounts } = useStationDiscounts();
  const { preferences } = useUserPreferences();
  const userMethods = preferences?.payment_methods ?? [];

  const fuelItems: { label: string; price: number; estimated?: boolean }[] = [
    { label: "93", price: station.prices.gasoline93 },
    { label: "95", price: station.prices.gasoline95 },
    { label: "97", price: station.prices.gasoline97 },
    { label: "Diésel", price: station.prices.diesel },
  ];

  if (station.hasEvCharging && station.prices.electric > 0) {
    fuelItems.push({ label: "⚡ kWh", price: station.prices.electric, estimated: station.electricEstimated });
  }

  const headline = station.prices.gasoline93
    ? { label: "93", price: station.prices.gasoline93, fuelType: "gasoline93" }
    : (() => {
        const f = fuelItems.find((x) => x.price > 0) || fuelItems[0];
        const map: Record<string, string> = { "93": "gasoline93", "95": "gasoline95", "97": "gasoline97", "Diésel": "diesel" };
        return { label: f.label, price: f.price, fuelType: map[f.label] ?? "gasoline95" };
      })();

  const best = getBestDiscount(discounts, station.brand, userMethods, headline.fuelType, headline.price);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${station.brand} ${station.name}, ${station.address}${station.distance !== undefined ? `, ${formatKm(station.distance)}` : ""}. Ver detalle de la estación.`}
      onClick={() => { analytics.stationClick(station.id, station.brand); navigate(`/station/${station.id}`); }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          analytics.stationClick(station.id, station.brand);
          navigate(`/station/${station.id}`);
        }
      }}
      className={`group relative rounded-2xl bg-card border border-border shadow-soft hover:shadow-elegant transition-all duration-300 hover-scale overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        featured ? `ring-1 ${style.ring}` : ""
      }`}
    >
      {/* Favorite (top right floating) */}
      <div className="absolute top-2.5 right-2.5 z-10">
        <FavoriteButton stationId={station.id} size="sm" variant="surface" />
      </div>

      {/* Top: brand + headline price */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <BrandLogo brand={station.brand} size={28} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3
                  className={`font-heading font-semibold text-sm leading-tight truncate ${
                    featured ? style.accent : "text-foreground"
                  }`}
                  title={station.name}
                >
                  {station.name}
                </h3>
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    station.isOpen ? "bg-fuel-green" : "bg-fuel-red"
                  }`}
                  role="img"
                  aria-label={station.isOpen ? "Estación abierta" : "Estación cerrada"}
                />
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 min-w-0" title={station.address}>
                <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{station.address}</span>
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">
              {headline.label}
            </p>
            <p
              className="font-heading tabular-nums font-extrabold text-[2.5rem] leading-none text-accent"
              aria-live="polite"
              aria-label={`Precio de ${headline.label}: ${formatPrice(headline.price)} por litro`}
            >
              {headline.price ? formatPrice(headline.price) : "—"}
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap mt-2">
          {featured && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
              <Star className="w-2.5 h-2.5" aria-hidden="true" /> {station.brand}
            </span>
          )}
          {station.hasEvCharging && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[hsl(142,70%,45%)] text-white" aria-label="Carga eléctrica disponible">
              <Zap className="w-2.5 h-2.5" aria-hidden="true" /> EV
            </span>
          )}
          {station.distance !== undefined && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary" aria-label={`Distancia: ${formatKm(station.distance)}`}>
              <Navigation className="w-2.5 h-2.5" aria-hidden="true" /> {formatKm(station.distance)}
            </span>
          )}
          {rating && rating.count > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent" aria-label={`Calificación promedio: ${rating.avg.toFixed(1)} de 5, basada en ${rating.count} reseñas`}>
              <Star className="w-2.5 h-2.5 fill-current" aria-hidden="true" />
              {rating.avg.toFixed(1).replace(".", ",")}
              <span className="opacity-70 ml-0.5">({rating.count})</span>
            </span>
          )}
          {station.lastUpdated && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
              <Clock className="w-2.5 h-2.5" aria-hidden="true" />
              <span>Actualizado {formatRelativeTime(station.lastUpdated)}</span>
            </span>
          )}
        {lastCommunityReport && (
          <div className="mt-2">
            <CommunityReportBadge reportedAt={lastCommunityReport} />
          </div>
        )}
      </div>
      </div>

      {/* All fuel prices */}
      <div className={`grid gap-1.5 px-4 ${fuelItems.length > 4 ? "grid-cols-5" : "grid-cols-4"}`}>
        {fuelItems.map((item) => {
          const isHero = item.label === headline.label;
          return (
            <div
              key={item.label}
              className={`text-center rounded-lg py-1.5 px-1 ${
                isHero ? "bg-accent/15 ring-1 ring-accent/40" : "bg-muted"
              }`}
            >
              <p className="text-[10px] text-muted-foreground font-medium">{item.label}</p>
              <p className={`text-xs font-bold tabular-nums ${isHero ? "text-accent" : "text-foreground"}`}>
                {item.price ? formatPrice(item.price) : "—"}
              </p>
              {item.estimated && (
                <p className="text-[8px] text-muted-foreground leading-none mt-0.5">Est.</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 p-3 pt-3" onClick={(e) => e.stopPropagation()}>
        <ReportPriceDialog station={station} />
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate?.(station); }}
          className="bg-muted hover:bg-muted/70 text-foreground rounded-xl px-3 py-2 text-xs font-semibold press-scale transition-colors min-h-11"
          aria-label={`Abrir ${station.name} en Waze`}
        >
          Waze
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onNavigateGoogle?.(station); }}
          className="flex-1 bg-gradient-primary text-primary-foreground rounded-xl px-3 py-2 text-xs font-semibold press-scale shadow-soft hover:shadow-glow transition-all flex items-center justify-center gap-1.5 min-h-11"
          aria-label={`Cómo llegar a ${station.name} con Google Maps`}
        >
          <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
          Cómo llegar
        </button>
      </div>
    </div>
  );
};

export default StationCard;
