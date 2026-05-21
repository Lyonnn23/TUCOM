import { Zap, Navigation, MapPin, Plug, CircleDot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { GasStation } from "@/hooks/useGasStations";
import { formatPrice, formatKm, formatRelativeTime } from "@/lib/format";
import FavoriteButton from "./FavoriteButton";
import { powerTier, EV_NETWORK_BRAND } from "@/lib/evPresets";

interface Props {
  station: GasStation;
  onNavigate?: (s: GasStation) => void;
}

function networkName(operator: string | null, brand: string): string {
  const key = (operator ?? brand ?? "").toLowerCase().trim();
  for (const [k, v] of Object.entries(EV_NETWORK_BRAND)) {
    if (key.includes(k)) return v;
  }
  return operator ?? brand ?? "Red eléctrica";
}

const STATUS_LABEL: Record<string, { label: string; dot: string }> = {
  available: { label: "Disponible", dot: "bg-emerald-500" },
  occupied:  { label: "Ocupado",    dot: "bg-amber-500" },
  offline:   { label: "Fuera de servicio", dot: "bg-red-500" },
  unknown:   { label: "Último reporte", dot: "bg-muted-foreground" },
};

const EVChargerCard = ({ station, onNavigate }: Props) => {
  const navigate = useNavigate();
  const tier = powerTier(station.evPowerKw);
  const status = STATUS_LABEL.unknown; // sin telemetría real: marcamos como "último reporte"
  const connectors = station.evConnectorTypes ?? [];
  const pricePerKwh = station.prices.electric || 0;
  const name = networkName(station.evOperator, station.brand);

  return (
    <article className="bg-card border border-border rounded-2xl shadow-soft p-4 space-y-3 hover:shadow-md transition-shadow">
      <header className="flex items-start justify-between gap-2">
        <button
          onClick={() => navigate(`/station/${station.id}`)}
          className="text-left flex-1 min-w-0"
        >
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
              <Zap className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-bold text-foreground text-sm truncate">{name}</h3>
              <p className="text-[11px] text-muted-foreground truncate">{station.name}</p>
            </div>
          </div>
        </button>
        <FavoriteButton stationId={station.id} />
      </header>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MapPin className="w-3 h-3" aria-hidden="true" />
        <span className="truncate">{station.address}</span>
        {station.distance !== undefined && (
          <span className="ml-auto shrink-0 font-medium text-foreground">{formatKm(station.distance)}</span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${tier.className}`}>
          <Zap className="w-2.5 h-2.5" aria-hidden="true" />
          {station.evPowerKw ? `${station.evPowerKw} kW` : "—"} · {tier.label}
        </span>
        {connectors.length === 0 ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            <Plug className="w-2.5 h-2.5" aria-hidden="true" /> Conector no informado
          </span>
        ) : connectors.map((c) => (
          <span key={c} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-foreground border border-border">
            <Plug className="w-2.5 h-2.5" aria-hidden="true" /> {c}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2.5">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tarifa estimada</p>
          <p className="font-heading font-extrabold text-foreground text-lg" aria-live="polite">
            {pricePerKwh > 0 ? `${formatPrice(pricePerKwh)}/kWh` : "Consultar"}
          </p>
          {station.electricEstimated && pricePerKwh > 0 && (
            <p className="text-[10px] text-muted-foreground">Valor referencial</p>
          )}
        </div>
        <div className="text-right">
          <p className="inline-flex items-center gap-1 text-[10px] font-medium">
            <CircleDot className={`w-2.5 h-2.5 ${status.dot.replace("bg-", "text-")}`} aria-hidden="true" />
            {status.label}
          </p>
          {station.lastUpdated && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{formatRelativeTime(station.lastUpdated)}</p>
          )}
        </div>
      </div>

      <button
        onClick={() => onNavigate?.(station)}
        className="w-full h-11 rounded-xl bg-gradient-primary text-white font-semibold text-sm inline-flex items-center justify-center gap-2 press-scale"
        aria-label={`Iniciar navegación a ${name}`}
      >
        <Navigation className="w-4 h-4" aria-hidden="true" /> Iniciar navegación
      </button>
    </article>
  );
};

export default EVChargerCard;
