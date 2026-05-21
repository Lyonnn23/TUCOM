import { formatPrice } from "@/lib/format";
import { Car, Users, TrendingUp, Gauge } from "lucide-react";

interface Props {
  stats?: {
    vehicle_count: number;
    driver_count: number;
    month_spend: number;
    avg_cost_per_km: number | null;
    total_km: number;
  };
  topVehicle?: { nickname: string | null; brand: string; model: string; month_spend: number } | null;
}

export function FleetSummaryCards({ stats, topVehicle }: Props) {
  const cards = [
    {
      label: "Gasto del mes",
      value: stats ? formatPrice(stats.month_spend) : "—",
      icon: TrendingUp,
      tint: "from-primary to-[hsl(245,75%,60%)]",
    },
    {
      label: "Costo promedio /km",
      value: stats?.avg_cost_per_km ? `$${Math.round(stats.avg_cost_per_km)}/km` : "—",
      icon: Gauge,
      tint: "from-[hsl(190,90%,55%)] to-primary",
    },
    {
      label: "Vehículos",
      value: stats ? `${stats.vehicle_count}` : "—",
      icon: Car,
      tint: "from-[hsl(330,80%,60%)] to-primary",
    },
    {
      label: "Conductores",
      value: stats ? `${stats.driver_count}` : "—",
      icon: Users,
      tint: "from-[hsl(245,75%,60%)] to-[hsl(190,90%,55%)]",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="bg-card rounded-2xl border border-border p-4 shadow-soft">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.tint} flex items-center justify-center mb-2`}>
            <c.icon className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="text-xs text-muted-foreground">{c.label}</div>
          <div className="text-xl font-bold text-foreground">{c.value}</div>
        </div>
      ))}
      {topVehicle && (
        <div className="col-span-2 lg:col-span-4 bg-gradient-to-r from-primary/10 to-[hsl(245,75%,60%)]/10 rounded-2xl border border-primary/20 p-4">
          <div className="text-xs text-muted-foreground">Vehículo con mayor gasto este mes</div>
          <div className="font-semibold text-foreground">
            {topVehicle.nickname ?? `${topVehicle.brand} ${topVehicle.model}`} —{" "}
            <span className="text-primary">{formatPrice(topVehicle.month_spend)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
