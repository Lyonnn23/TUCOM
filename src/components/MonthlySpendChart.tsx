import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMonthlySpend } from "@/hooks/useFuelStats";
import { formatPrice } from "@/lib/format";

const MONTH_NAMES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const MonthlySpendChart = () => {
  const { data, isLoading } = useMonthlySpend(6);

  if (isLoading) return <div className="h-48 rounded-2xl bg-muted animate-pulse" />;
  if (!data || data.length === 0) return null;

  const chartData = data.map((d) => {
    const date = new Date(d.month);
    return {
      label: MONTH_NAMES[date.getMonth()],
      total: d.total_clp,
    };
  });

  return (
    <section
      className="bg-card rounded-2xl border border-border shadow-soft p-5"
      aria-label="Gasto mensual en combustible"
    >
      <h3 className="font-semibold text-foreground mb-3">Gasto mensual</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => (v ? `$${(v / 1000).toFixed(0)}k` : "0")} />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                color: "hsl(var(--popover-foreground))",
                fontSize: 12,
              }}
              formatter={(v: number) => [formatPrice(v), "Gasto"]}
            />
            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};

export default MonthlySpendChart;
