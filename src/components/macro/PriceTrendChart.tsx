import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useMepco } from "@/hooks/useMepco";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  stationId: string;
  fuelType: string;
  currentPrice?: number;
}

interface Point {
  date: string;
  actual?: number;
  projected?: number;
}

const FUEL_KEY: Record<string, string> = {
  gasoline93: "gasoline93",
  gasoline95: "gasoline95",
  gasoline97: "gasoline97",
  diesel: "diesel",
};

function linearRegression(xs: number[], ys: number[]) {
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export default function PriceTrendChart({ stationId, fuelType, currentPrice }: Props) {
  const [history, setHistory] = useState<{ recorded_at: string; price: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: mepcoData } = useMepco(1);
  const nextMepco = mepcoData?.[0];

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();
      const { data } = await supabase
        .from("station_price_history")
        .select("recorded_at, price")
        .eq("station_id", stationId)
        .eq("fuel_type", fuelType)
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: true });
      if (cancel) return;
      setHistory((data ?? []) as { recorded_at: string; price: number }[]);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [stationId, fuelType]);

  const { chartData, scenarios } = useMemo(() => {
    if (history.length === 0 && !currentPrice) {
      return { chartData: [] as Point[], scenarios: null };
    }

    const points = history.map((h) => ({
      t: new Date(h.recorded_at).getTime(),
      price: h.price,
    }));

    // Ensure today's anchor
    const baseline =
      points[points.length - 1]?.price ?? currentPrice ?? 0;

    // Last 14 days for regression
    const cutoff = Date.now() - 14 * 86400_000;
    const recent = points.filter((p) => p.t >= cutoff);
    let slope = 0;
    let intercept = baseline;
    if (recent.length >= 2) {
      const t0 = recent[0].t;
      const xs = recent.map((p) => (p.t - t0) / 86400_000);
      const ys = recent.map((p) => p.price);
      const reg = linearRegression(xs, ys);
      slope = reg.slope;
      intercept = reg.intercept;
    }

    const dayMs = 86400_000;
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const fuelKey = FUEL_KEY[fuelType];
    const mepcoDelta =
      nextMepco && fuelKey && nextMepco.fuel_changes?.[fuelKey] !== undefined
        ? Number(nextMepco.fuel_changes[fuelKey])
        : 0;
    const mepcoEffectiveDate = nextMepco?.week_of
      ? new Date(`${nextMepco.week_of}T12:00:00Z`).getTime()
      : null;

    const series: Point[] = [];
    points.forEach((p) => {
      series.push({
        date: new Date(p.t).toLocaleDateString("es-CL", { day: "numeric", month: "short" }),
        actual: p.price,
      });
    });

    // 7-day projection starting tomorrow
    const lastT = points[points.length - 1]?.t ?? today.getTime();
    const t0Reg = recent[0]?.t ?? lastT;
    for (let i = 1; i <= 7; i++) {
      const t = lastT + i * dayMs;
      const xDays = (t - t0Reg) / dayMs;
      let projected = recent.length >= 2 ? intercept + slope * xDays : baseline;
      if (mepcoEffectiveDate && t >= mepcoEffectiveDate) {
        projected += mepcoDelta;
      }
      series.push({
        date: new Date(t).toLocaleDateString("es-CL", { day: "numeric", month: "short" }),
        projected: Math.round(projected),
      });
    }

    // FX sensitivity heuristic: ~0.7 CLP / 1% USD move per liter
    const finalProj = (series[series.length - 1]?.projected ?? baseline) as number;
    const fxSens = 0.7;
    const scenarios = {
      up: Math.round(finalProj + 2 * fxSens * 10), // 2% × 7 CLP scaler
      flat: Math.round(finalProj),
      down: Math.round(finalProj - 2 * fxSens * 10),
    };

    return { chartData: series, scenarios };
  }, [history, currentPrice, fuelType, nextMepco]);

  if (loading) {
    return (
      <section className="bg-card border border-border rounded-2xl shadow-soft p-5">
        <Skeleton className="h-48 rounded-xl" />
      </section>
    );
  }

  if (chartData.length === 0) {
    return null;
  }

  return (
    <section className="bg-card border border-border rounded-2xl shadow-soft p-5">
      <div className="mb-3">
        <h2 className="font-heading font-bold text-foreground">Tendencia y proyección</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Últimos 30 días reales + proyección 7 días (línea punteada)
        </p>
      </div>
      <div className="h-52 -ml-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={["dataMin - 30", "dataMax + 30"]}
              tickFormatter={(v) => `$${v}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(v: number, name: string) => [
                `$${v}`,
                name === "actual" ? "Real" : "Proyectado",
              ]}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ fill: "hsl(var(--primary))", r: 3 }}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="projected"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {scenarios && (
        <div className="grid grid-cols-3 gap-2 mt-4">
          <Scenario label="Si el dólar sube 2%" value={scenarios.up} tone="up" />
          <Scenario label="Si se mantiene" value={scenarios.flat} tone="flat" />
          <Scenario label="Si el dólar baja 2%" value={scenarios.down} tone="down" />
        </div>
      )}

      <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
        Proyección basada en historial CNE y MEPCO publicado. Los precios reales pueden variar.
      </p>
    </section>
  );
}

function Scenario({ label, value, tone }: { label: string; value: number; tone: "up" | "down" | "flat" }) {
  const color =
    tone === "up"
      ? "text-[hsl(0,75%,55%)]"
      : tone === "down"
      ? "text-[hsl(142,70%,45%)]"
      : "text-foreground";
  return (
    <div className="rounded-xl bg-muted/40 border border-border p-3 text-center">
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      <p className={`font-heading font-bold mt-1 ${color}`}>~${value}</p>
    </div>
  );
}
