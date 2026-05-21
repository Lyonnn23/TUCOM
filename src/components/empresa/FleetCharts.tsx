import { BarChart, Bar, LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatPrice } from "@/lib/format";
import type { FleetVehicleRow } from "@/hooks/useOrganization";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function FleetSpendBarChart({ rows }: { rows: FleetVehicleRow[] }) {
  const data = rows
    .slice(0, 10)
    .map((r) => ({ name: r.nickname ?? `${r.brand} ${r.model}`, spend: r.month_spend }));
  if (data.length === 0) return null;
  return (
    <section className="bg-card rounded-2xl border border-border p-5 shadow-soft" aria-label="Gasto por vehículo">
      <h3 className="font-semibold mb-3">Gasto por vehículo (mes actual)</h3>
      <div className="h-56">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} interval={0} angle={-15} textAnchor="end" height={50} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => (v ? `$${(v / 1000).toFixed(0)}k` : "0")} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
              formatter={(v: number) => [formatPrice(v), "Gasto"]}
            />
            <Bar dataKey="spend" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function FleetSpendLineChart({ data }: { data: { month: string; total: number }[] }) {
  if (!data || data.length === 0) return null;
  const chartData = data.map((d) => {
    const m = parseInt(d.month.split("-")[1], 10) - 1;
    return { label: MONTHS[m], total: d.total };
  });
  return (
    <section className="bg-card rounded-2xl border border-border p-5 shadow-soft" aria-label="Gasto en el tiempo">
      <h3 className="font-semibold mb-3">Gasto de flota en el tiempo</h3>
      <div className="h-56">
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => (v ? `$${(v / 1000).toFixed(0)}k` : "0")} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }}
              formatter={(v: number) => [formatPrice(v), "Gasto"]}
            />
            <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
