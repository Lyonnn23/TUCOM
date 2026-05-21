import { formatPrice } from "@/lib/format";
import { AlertTriangle } from "lucide-react";
import type { FleetVehicleRow } from "@/hooks/useOrganization";

interface Props {
  rows: FleetVehicleRow[];
}

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short" }).format(new Date(iso));
};

export function FleetVehiclesTable({ rows }: Props) {
  // Anomaly: vehicles whose cost_per_km > 1.2 × fleet avg
  const withCpk = rows.filter((r) => r.cost_per_km != null && r.cost_per_km > 0);
  const fleetAvg = withCpk.length
    ? withCpk.reduce((s, r) => s + (r.cost_per_km ?? 0), 0) / withCpk.length
    : 0;
  const threshold = fleetAvg * 1.2;

  if (rows.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
        Aún no hay vehículos en la flota. Pide a tus conductores que se unan con el código de empresa.
      </div>
    );
  }

  return (
    <section className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden" aria-label="Vehículos de la flota">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Vehículos de la flota</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Vehículo</th>
              <th className="text-right px-4 py-2 font-medium">Gasto mes</th>
              <th className="text-right px-4 py-2 font-medium">Km</th>
              <th className="text-right px-4 py-2 font-medium">$/km</th>
              <th className="text-right px-4 py-2 font-medium">Última carga</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const anomaly = r.cost_per_km != null && fleetAvg > 0 && r.cost_per_km > threshold;
              return (
                <tr key={r.vehicle_id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{r.nickname ?? `${r.brand} ${r.model}`}</div>
                    <div className="text-xs text-muted-foreground">{r.brand} {r.model}</div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatPrice(r.month_spend)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.total_km > 0 ? `${r.total_km.toLocaleString("es-CL")} km` : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.cost_per_km != null ? (
                      <span className={anomaly ? "text-destructive font-semibold inline-flex items-center gap-1" : ""}>
                        {anomaly && <AlertTriangle className="h-3.5 w-3.5" />}
                        ${Math.round(r.cost_per_km)}/km
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatDate(r.last_log_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {withCpk.some((r) => (r.cost_per_km ?? 0) > threshold) && (
        <div className="border-t border-border bg-destructive/5 px-4 py-3 text-xs text-destructive flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Algunos vehículos superan en más de 20% el costo promedio por km de la flota (
            ${Math.round(fleetAvg)}/km). Revisa el mantenimiento o el estilo de conducción.
          </span>
        </div>
      )}
    </section>
  );
}
