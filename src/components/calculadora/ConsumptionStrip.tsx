import { ExternalLink } from "lucide-react";
import type { CatalogVehicle } from "@/hooks/useVehiclesCatalog";

interface Props {
  vehicle: CatalogVehicle;
}

const ConsumptionStrip = ({ vehicle }: Props) => {
  const isElectric = vehicle.fuel_type === "electric";
  const searchUrl = `https://www.consumovehicular.cl/buscador?marca=${encodeURIComponent(vehicle.brand)}&modelo=${encodeURIComponent(vehicle.model)}&ano=${vehicle.year}`;

  if (isElectric) {
    const kmPerKwh = vehicle.kwh_per_km && vehicle.kwh_per_km > 0 ? 1 / vehicle.kwh_per_km : null;
    return (
      <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-wider font-bold text-primary">
          Datos oficiales · Ministerio de Energía · consumovehicular.cl
        </p>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-card p-2.5">
            <p className="text-[10px] text-muted-foreground">Consumo</p>
            <p className="font-heading font-extrabold text-foreground">
              {vehicle.kwh_per_km ? `${(vehicle.kwh_per_km * 100).toFixed(1)} kWh/100km` : "—"}
            </p>
          </div>
          <div className="rounded-xl bg-primary/10 p-2.5 ring-2 ring-primary/40">
            <p className="text-[10px] text-primary">Autonomía</p>
            <p className="font-heading font-extrabold text-foreground">
              {kmPerKwh ? `${kmPerKwh.toFixed(1)} km/kWh` : "—"}
            </p>
          </div>
        </div>
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          Ver etiqueta oficial <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-3 space-y-2">
      <p className="text-[10px] uppercase tracking-wider font-bold text-primary">
        Datos oficiales · Ministerio de Energía · consumovehicular.cl
      </p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-card p-2.5">
          <p className="text-[10px] text-muted-foreground">Ciudad</p>
          <p className="font-heading font-extrabold text-foreground tabular-nums">
            {vehicle.consumption_city?.toFixed(1) ?? "—"}
          </p>
          <p className="text-[9px] text-muted-foreground">km/L</p>
        </div>
        <div className="rounded-xl bg-primary/10 p-2.5 ring-2 ring-primary/40">
          <p className="text-[10px] text-primary">Mixto ★</p>
          <p className="font-heading font-extrabold text-foreground tabular-nums">
            {vehicle.consumption_mixed?.toFixed(1) ?? "—"}
          </p>
          <p className="text-[9px] text-primary">km/L</p>
        </div>
        <div className="rounded-xl bg-card p-2.5">
          <p className="text-[10px] text-muted-foreground">Carretera</p>
          <p className="font-heading font-extrabold text-foreground tabular-nums">
            {vehicle.consumption_hwy?.toFixed(1) ?? "—"}
          </p>
          <p className="text-[9px] text-muted-foreground">km/L</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        {vehicle.co2_mixed != null && (
          <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
            {vehicle.co2_mixed.toFixed(0)} g/km CO₂
          </span>
        )}
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          Ver etiqueta oficial <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

export default ConsumptionStrip;
