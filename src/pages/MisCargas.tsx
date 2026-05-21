import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Gauge, Coins, TrendingDown, Pencil, Trash2, Fuel } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useFuelLogs, type FuelLog } from "@/hooks/useFuelLogs";
import { useUserVehicles } from "@/hooks/useUserVehicles";
import { useConsumptionStats, useMarketAvgPrice } from "@/hooks/useFuelStats";
import FuelLogDialog from "@/components/FuelLogDialog";
import FuelLogFAB from "@/components/FuelLogFAB";
import MonthlySpendChart from "@/components/MonthlySpendChart";
import ExportFuelLogButton from "@/components/ExportFuelLogButton";
import { formatPrice, formatSmartDate } from "@/lib/format";
import { toast } from "sonner";

const FUEL_LABEL: Record<string, string> = {
  gasoline93: "Bencina 93",
  gasoline95: "Bencina 95",
  gasoline97: "Bencina 97",
  diesel: "Diésel",
  electric: "Eléctrico",
};

const MisCargas = () => {
  const navigate = useNavigate();
  const { logs, isLoading, remove } = useFuelLogs();
  const { primary } = useUserVehicles();
  const { data: stats } = useConsumptionStats(primary?.id ?? null);

  const lastFuel = logs[0]?.fuel_type ?? primary?.fuel_type ?? null;
  const { data: marketAvg } = useMarketAvgPrice(lastFuel as any);

  const [editLog, setEditLog] = useState<FuelLog | null>(null);

  const savingsPct = useMemo(() => {
    if (!stats?.avg_price_paid || !marketAvg) return null;
    return Math.round(((marketAvg - stats.avg_price_paid) / marketAvg) * 100);
  }, [stats, marketAvg]);

  return (
    <div className="min-h-screen bg-background pb-32">
      <Helmet>
        <title>Mis cargas — Consumo y bitácora | TÜcom</title>
        <meta
          name="description"
          content="Registra tus cargas de combustible y analiza tu consumo real, gasto mensual y ahorros."
        />
      </Helmet>

      <header className="sticky top-0 z-30 bg-card/85 backdrop-blur-xl border-b border-border">
        <div className="max-w-md mx-auto flex items-center gap-2 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-lg hover:bg-muted press-scale"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-heading font-bold text-lg flex-1">Mis cargas</h1>
          <ExportFuelLogButton />
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Gauge className="w-4 h-4" />}
            label="Consumo real"
            value={stats?.real_kml ? `${stats.real_kml.toFixed(1)} km/L` : "—"}
            sub={
              primary && stats?.real_kml
                ? `Ficha: ${primary.consumption_kml} km/L`
                : "Carga 2+ veces con odómetro"
            }
          />
          <StatCard
            icon={<Coins className="w-4 h-4" />}
            label="Costo por km"
            value={stats?.cost_per_km ? formatPrice(stats.cost_per_km) : "—"}
            sub="últimos 6 meses"
          />
          <StatCard
            icon={<Fuel className="w-4 h-4" />}
            label="Precio promedio pagado"
            value={stats?.avg_price_paid ? formatPrice(stats.avg_price_paid) : "—"}
            sub={marketAvg ? `Mercado: ${formatPrice(marketAvg)}` : "—"}
          />
          <StatCard
            icon={<TrendingDown className="w-4 h-4" />}
            label="vs. mercado"
            value={
              savingsPct == null
                ? "—"
                : savingsPct > 0
                  ? `${savingsPct}% más barato`
                  : `${Math.abs(savingsPct)}% más caro`
            }
            sub={savingsPct != null && savingsPct > 0 ? "¡Buen ojo!" : "este mes"}
            highlight={savingsPct != null && savingsPct > 0}
          />
        </div>

        <MonthlySpendChart />

        {/* Logs list */}
        <section className="bg-card rounded-2xl border border-border shadow-soft">
          <header className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Historial</h2>
          </header>
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Aún no tienes cargas registradas.
              <br />
              Toca el botón <strong>+</strong> para agregar la primera.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {logs.map((l) => (
                <li key={l.id} className="flex items-start gap-3 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {formatPrice(l.total_cost)}
                      <span className="text-muted-foreground font-normal">
                        {" · "}{Number(l.liters).toFixed(2)} L · {FUEL_LABEL[l.fuel_type]}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatSmartDate(l.logged_at)}
                      {l.odometer_km != null ? ` · ${l.odometer_km.toLocaleString("es-CL")} km` : ""}
                    </p>
                    {l.note && (
                      <p className="text-xs text-muted-foreground italic mt-1 truncate">
                        {l.note}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setEditLog(l)}
                    className="p-2 rounded-lg hover:bg-muted press-scale"
                    aria-label="Editar carga"
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="p-2 rounded-lg hover:bg-destructive/10 press-scale"
                        aria-label="Eliminar carga"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar esta carga?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            try {
                              await remove.mutateAsync(l.id);
                              toast.success("Carga eliminada");
                            } catch {
                              toast.error("No se pudo eliminar");
                            }
                          }}
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <FuelLogDialog
        open={!!editLog}
        onOpenChange={(o) => { if (!o) setEditLog(null); }}
        log={editLog}
      />
      <FuelLogFAB />
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}
const StatCard = ({ icon, label, value, sub, highlight }: StatCardProps) => (
  <div className={`rounded-2xl p-4 border shadow-soft ${highlight ? "bg-gradient-primary text-primary-foreground border-transparent" : "bg-card border-border"}`}>
    <div className="flex items-center gap-1.5 text-xs opacity-80">
      {icon}
      <span>{label}</span>
    </div>
    <p className="text-xl font-extrabold font-heading mt-1.5 tabular-nums">{value}</p>
    {sub && <p className="text-[11px] opacity-70 mt-0.5">{sub}</p>}
  </div>
);

export default MisCargas;
