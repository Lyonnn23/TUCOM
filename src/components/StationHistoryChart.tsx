import { useEffect, useMemo, useState } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";

type FuelKey = "gasoline93" | "gasoline95" | "gasoline97" | "diesel";

const FUELS: { key: FuelKey; label: string; color: string }[] = [
  { key: "gasoline93", label: "93", color: "hsl(258 90% 60%)" },
  { key: "gasoline95", label: "95", color: "hsl(199 89% 48%)" },
  { key: "gasoline97", label: "97", color: "hsl(330 81% 60%)" },
  { key: "diesel",     label: "Diésel", color: "hsl(36 90% 50%)" },
];

interface Props {
  stationId: string;
  currentPrices: Partial<Record<FuelKey, number>>;
  /** Regional average per fuel — typically computed from stations within 10km. */
  regionalAverages?: Partial<Record<FuelKey, number>>;
}

interface ChartRow {
  date: string;
  ts: number;
  gasoline93?: number;
  gasoline95?: number;
  gasoline97?: number;
  diesel?: number;
}

const formatDate = (d: Date) =>
  d.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" });

/** Compute the last 4 Thursdays including the most recent past Thursday. */
function lastFourThursdays(now = new Date()): Date[] {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  // 4 = Thursday
  const dow = d.getDay();
  const back = (dow - 4 + 7) % 7;
  d.setDate(d.getDate() - back);
  const out: Date[] = [];
  for (let i = 0; i < 4; i++) {
    const t = new Date(d);
    t.setDate(d.getDate() - 7 * i);
    out.unshift(t);
  }
  return out;
}

const StationHistoryChart = ({ stationId, currentPrices, regionalAverages }: Props) => {
  const [rows, setRows] = useState<{ recorded_at: string; fuel_type: string; price: number }[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - 35);
    supabase
      .from("station_price_history")
      .select("recorded_at, fuel_type, price")
      .eq("station_id", stationId)
      .gte("recorded_at", since.toISOString())
      .order("recorded_at", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        setRows(error ? [] : (data ?? []));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [stationId]);

  const chartData = useMemo<ChartRow[]>(() => {
    if (!rows || rows.length === 0) return [];
    const thursdays = lastFourThursdays();
    // For each Thursday, take the most recent reading on or before that Thursday (within 7 days).
    return thursdays.map((th) => {
      const cutoff = new Date(th);
      cutoff.setHours(23, 59, 59, 999);
      const windowStart = new Date(th);
      windowStart.setDate(th.getDate() - 7);
      const row: ChartRow = { date: formatDate(th), ts: th.getTime() };
      for (const f of FUELS) {
        const candidates = rows.filter(
          (r) => r.fuel_type === f.key && new Date(r.recorded_at) <= cutoff && new Date(r.recorded_at) >= windowStart,
        );
        if (candidates.length) {
          row[f.key] = candidates[candidates.length - 1].price;
        }
      }
      return row;
    }).filter((r) => FUELS.some((f) => r[f.key] !== undefined));
  }, [rows]);

  // Hide the section if the history table simply has nothing for this station
  if (!loading && (rows?.length ?? 0) === 0) return null;

  const dataPoints = chartData.length;

  return (
    <section className="bg-card border border-border rounded-2xl shadow-soft p-5">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="font-heading font-bold text-foreground">Historial de precios</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Últimas 4 actualizaciones MEPCO (jueves)</p>
        </div>
      </div>

      {/* Trend badges + vs avg per fuel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {FUELS.map((f) => {
          const series = chartData
            .map((r) => r[f.key])
            .filter((v): v is number => typeof v === "number");
          const last = series[series.length - 1] ?? currentPrices[f.key];
          const prev = series[series.length - 2];
          let trend: "down" | "up" | "flat" | null = null;
          let delta = 0;
          if (typeof last === "number" && typeof prev === "number") {
            delta = last - prev;
            trend = Math.abs(delta) < 20 ? "flat" : delta < 0 ? "down" : "up";
          }
          const avg = regionalAverages?.[f.key];
          const diff = typeof last === "number" && typeof avg === "number" ? last - avg : null;
          return (
            <div key={f.key} className="rounded-xl border border-border bg-muted/30 p-2.5">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  {f.label}
                </span>
                {trend && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      trend === "down"
                        ? "bg-fuel-green/15 text-fuel-green"
                        : trend === "up"
                        ? "bg-fuel-red/15 text-fuel-red"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {trend === "down" && <TrendingDown className="w-3 h-3" />}
                    {trend === "up" && <TrendingUp className="w-3 h-3" />}
                    {trend === "flat" && <Minus className="w-3 h-3" />}
                    {trend === "down" ? "Bajando" : trend === "up" ? "Subiendo" : "Estable"}
                  </span>
                )}
              </div>
              <p className="font-heading font-bold text-base tabular-nums mt-0.5">
                {typeof last === "number" ? formatPrice(last) : "—"}
              </p>
              {diff !== null && Math.abs(diff) >= 1 && (
                <p className={`text-[10px] mt-0.5 ${diff < 0 ? "text-fuel-green" : "text-fuel-red"}`}>
                  {diff < 0 ? `$${Math.abs(Math.round(diff))} más barato` : `$${Math.round(diff)} más caro`} que el promedio regional
                </p>
              )}
            </div>
          );
        })}
      </div>

      {dataPoints < 2 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Sin historial disponible aún</p>
      ) : (
        <div className="h-40 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                domain={["dataMin - 20", "dataMax + 20"]}
                tickFormatter={(v) => `$${v}`}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                formatter={(v: number, name: string) => [`$${v}`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
              {FUELS.map((f) => (
                <Line
                  key={f.key}
                  type="monotone"
                  dataKey={f.key}
                  name={f.label}
                  stroke={f.color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: f.color }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
};

export default StationHistoryChart;
