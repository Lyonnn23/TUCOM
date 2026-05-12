import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, Calendar } from "lucide-react";
import { usePriceHistory, type PriceHistoryPoint } from "@/hooks/usePriceHistory";
import { Skeleton } from "@/components/ui/skeleton";
import UnofficialBanner from "@/components/UnofficialBanner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const FUEL_CONFIG: { key: string; name: string; color: string }[] = [
  { key: "gasoline93", name: "Bencina 93", color: "hsl(158, 65%, 42%)" },
  { key: "gasoline95", name: "Bencina 95", color: "hsl(38, 95%, 55%)" },
  { key: "gasoline97", name: "Bencina 97", color: "hsl(262, 70%, 58%)" },
  { key: "diesel", name: "Diésel", color: "hsl(215, 80%, 55%)" },
  { key: "electric", name: "Eléctrico", color: "hsl(142, 70%, 45%)" },
];

const PERIOD_OPTIONS = [
  { value: 7, label: "7 días" },
  { value: 14, label: "14 días" },
  { value: 30, label: "30 días" },
  { value: 90, label: "3 meses" },
];

function formatPrice(v: number) {
  return `$${v.toLocaleString("es-CL")}`;
}

function buildChartData(points: PriceHistoryPoint[]) {
  const dateMap = new Map<string, Record<string, number>>();

  for (const p of points) {
    if (!dateMap.has(p.snapshot_date)) {
      dateMap.set(p.snapshot_date, {});
    }
    dateMap.get(p.snapshot_date)![p.fuel_type] = p.avg_price;
  }

  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, fuels]) => ({
      date,
      label: new Date(date + "T12:00:00").toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "short",
      }),
      ...fuels,
    }));
}

const PriceHistory = () => {
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [activeFuels, setActiveFuels] = useState<Set<string>>(
    new Set(FUEL_CONFIG.map((f) => f.key))
  );
  const { data: history, isLoading } = usePriceHistory(days);

  const chartData = history ? buildChartData(history) : [];

  const toggleFuel = (key: string) => {
    setActiveFuels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-r from-primary to-secondary px-4 pt-[env(safe-area-inset-top)] sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-3 py-3 max-w-md mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-heading font-extrabold text-white text-lg leading-tight">
              Historial de Precios
            </h1>
            <p className="text-[10px] text-white/70">Evolución semanal de combustibles</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-5 space-y-4">
        <UnofficialBanner />
        {/* Period selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <div className="flex gap-1.5">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDays(opt.value)}
                className={`text-[11px] font-medium px-3 py-1.5 rounded-full transition-colors ${
                  days === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fuel toggles */}
        <div className="flex gap-2 flex-wrap">
          {FUEL_CONFIG.map((fuel) => (
            <button
              key={fuel.key}
              onClick={() => toggleFuel(fuel.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                activeFuels.has(fuel.key)
                  ? "border-transparent text-white shadow-sm"
                  : "border-border text-muted-foreground bg-card"
              }`}
              style={
                activeFuels.has(fuel.key)
                  ? { backgroundColor: fuel.color }
                  : undefined
              }
            >
              {fuel.name}
            </button>
          ))}
        </div>

        {isLoading ? (
          <Skeleton className="h-64 rounded-2xl" />
        ) : chartData.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Sin datos históricos aún</p>
            <p className="text-xs text-muted-foreground mt-1">
              Los precios se registran diariamente con cada sincronización
            </p>
          </div>
        ) : (
          <>
            {/* Line chart */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Evolución de Precios ($/L)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(245, 18%, 90%)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => `$${v}`}
                      domain={["dataMin - 30", "dataMax + 30"]}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid hsl(245, 18%, 90%)",
                        fontSize: "12px",
                      }}
                      formatter={(value: number, name: string) => {
                        const fuel = FUEL_CONFIG.find((f) => f.key === name);
                        return [formatPrice(value), fuel?.name || name];
                      }}
                      labelFormatter={(label) => `Fecha: ${label}`}
                    />
                    <Legend
                      formatter={(value) => {
                        const fuel = FUEL_CONFIG.find((f) => f.key === value);
                        return fuel?.name || value;
                      }}
                      iconType="circle"
                      wrapperStyle={{ fontSize: "11px" }}
                    />
                    {FUEL_CONFIG.filter((f) => activeFuels.has(f.key)).map((fuel) => (
                      <Line
                        key={fuel.key}
                        type="monotone"
                        dataKey={fuel.key}
                        stroke={fuel.color}
                        strokeWidth={2.5}
                        dot={{ r: 3, strokeWidth: 2 }}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Summary table */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <h3 className="text-sm font-semibold text-foreground">Resumen del período</h3>
              </div>
              <div className="divide-y divide-border">
                {FUEL_CONFIG.filter((f) => activeFuels.has(f.key)).map((fuel) => {
                  const fuelPoints = (history ?? []).filter(
                    (p) => p.fuel_type === fuel.key
                  );
                  if (fuelPoints.length === 0) return null;

                  const prices = fuelPoints.map((p) => p.avg_price);
                  const first = prices[0];
                  const last = prices[prices.length - 1];
                  const diff = last - first;
                  const min = Math.min(...fuelPoints.map((p) => p.min_price));
                  const max = Math.max(...fuelPoints.map((p) => p.max_price));

                  return (
                    <div key={fuel.key} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: fuel.color }}
                          />
                          <span className="text-xs font-semibold text-foreground">
                            {fuel.name}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-bold ${
                            diff < 0
                              ? "text-fuel-green"
                              : diff > 0
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }`}
                        >
                          {diff > 0 ? "+" : ""}
                          {formatPrice(diff)}
                        </span>
                      </div>
                      <div className="flex gap-4 text-[10px] text-muted-foreground">
                        <span>Actual: <strong className="text-foreground">{formatPrice(last)}</strong></span>
                        <span>Mín: <strong className="text-fuel-green">{formatPrice(min)}</strong></span>
                        <span>Máx: <strong className="text-destructive">{formatPrice(max)}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <div className="bg-muted/50 rounded-2xl p-3 border border-border">
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            Los datos se actualizan automáticamente cada 6 horas con información oficial de la CNE.
          </p>
        </div>
      </main>
    </div>
  );
};

export default PriceHistory;
