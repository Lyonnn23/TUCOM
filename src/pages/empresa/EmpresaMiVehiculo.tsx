import { Link, Navigate } from "react-router-dom";
import { useOrganization, useFleetBreakdown } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { useFuelLogs } from "@/hooks/useFuelLogs";
import { formatPrice } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Car, Plus, TrendingUp, TrendingDown } from "lucide-react";

export default function EmpresaMiVehiculo() {
  const { user } = useAuth();
  const { org, role, isLoading } = useOrganization();
  const { data: rows = [], isLoading: rowsLoading } = useFleetBreakdown(org?.id);
  const { logs } = useFuelLogs();

  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />;
  if (!org) return <Navigate to="/empresa" replace />;

  const myRows = rows.filter((r) => r.driver_id === user?.id);

  // Personal trend: compare this month vs last month
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const myLogs = logs.filter((l) => myRows.some((r) => r.vehicle_id === l.vehicle_id));
  const thisMonth = myLogs.filter((l) => new Date(l.logged_at) >= thisMonthStart).reduce((s, l) => s + l.total_cost, 0);
  const lastMonth = myLogs.filter((l) => {
    const d = new Date(l.logged_at);
    return d >= lastMonthStart && d < thisMonthStart;
  }).reduce((s, l) => s + l.total_cost, 0);
  const trend = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Mi vehículo</h1>
        <p className="text-sm text-muted-foreground">Gestiona tus cargas y revisa tu consumo personal.</p>
      </div>

      {trend != null && (
        <div className={`rounded-2xl border p-4 flex items-start gap-3 ${
          trend > 10 ? "bg-destructive/5 border-destructive/30" :
          trend < -5 ? "bg-emerald-500/5 border-emerald-500/30" :
          "bg-muted/40 border-border"
        }`}>
          {trend > 0 ? <TrendingUp className="h-5 w-5 text-destructive mt-0.5" /> : <TrendingDown className="h-5 w-5 text-emerald-600 mt-0.5" />}
          <div className="text-sm">
            <div className="font-semibold">
              Tu consumo {trend > 0 ? "subió" : "bajó"} un {Math.abs(trend)}% este mes
            </div>
            <div className="text-muted-foreground text-xs">
              {formatPrice(thisMonth)} este mes vs {formatPrice(lastMonth)} el mes pasado.
            </div>
          </div>
        </div>
      )}

      {rowsLoading ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : myRows.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-6 text-center space-y-3">
          <Car className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            Aún no tienes vehículos asignados a esta empresa. Agrega uno desde tu perfil.
          </p>
          <Button asChild className="bg-gradient-to-r from-primary to-[hsl(245,75%,60%)]">
            <Link to="/perfil">Ir a mi perfil</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {myRows.map((v) => (
            <div key={v.vehicle_id} className="bg-card rounded-2xl border border-border p-5 shadow-soft">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{v.nickname ?? `${v.brand} ${v.model}`}</h3>
                  <p className="text-xs text-muted-foreground">{v.brand} {v.model}</p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link to="/mis-cargas"><Plus className="h-4 w-4 mr-1" /> Carga</Link>
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-xs text-muted-foreground">Mes actual</div>
                  <div className="font-semibold">{formatPrice(v.month_spend)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Km</div>
                  <div className="font-semibold">{v.total_km > 0 ? `${v.total_km.toLocaleString("es-CL")}` : "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">$/km</div>
                  <div className="font-semibold">{v.cost_per_km != null ? `$${Math.round(v.cost_per_km)}` : "—"}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-center text-muted-foreground">
        Como conductor solo puedes ver tus propios datos. El administrador de la empresa ve los totales agregados de la flota.
      </p>
    </div>
  );
}
