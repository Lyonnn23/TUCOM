import { useState } from "react";
import { ArrowUp, ArrowDown, ChevronDown, ChevronUp } from "lucide-react";
import { useFxRates } from "@/hooks/useFxRates";
import { useMacroExplainer } from "@/hooks/useMacroExplainer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
  Tooltip,
  XAxis,
  CartesianGrid,
} from "recharts";

export default function FxWidget() {
  const { data: rates7, isLoading } = useFxRates(7);
  const { data: rates30 } = useFxRates(30);
  const [expanded, setExpanded] = useState(false);
  const { data: explainer, isLoading: explainerLoading } = useMacroExplainer("fx_fuel", expanded);

  const latest = rates7?.[rates7.length - 1];
  const change = latest?.change_pct ?? 0;
  const up = change >= 0;
  const ArrowIcon = up ? ArrowUp : ArrowDown;
  const color = up ? "text-[hsl(0,75%,55%)]" : "text-[hsl(142,70%,45%)]";

  return (
    <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
      >
        <div className="min-w-0 text-left">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
            USD/CLP
          </p>
          {isLoading || !latest ? (
            <Skeleton className="h-5 w-32 mt-1" />
          ) : (
            <p className="font-heading font-bold text-foreground text-base mt-0.5">
              ${Math.round(latest.rate_clp)}{" "}
              <span className={`text-xs font-semibold ${color} ml-1`}>
                <ArrowIcon className="inline w-3 h-3" />
                {Math.abs(change).toFixed(2)}% hoy
              </span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {rates7 && rates7.length > 1 && (
            <div className="w-20 h-10 -mr-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rates7}>
                  <Line
                    type="monotone"
                    dataKey="rate_clp"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4 animate-fade-in">
          <div className="h-40">
            {rates30 && rates30.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rates30} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="recorded_at" hide />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    domain={["dataMin - 5", "dataMax + 5"]}
                    tickFormatter={(v) => `$${Math.round(v)}`}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    labelFormatter={(v) => new Date(v).toLocaleDateString("es-CL")}
                    formatter={(v: number) => [`$${Math.round(v)}`, "CLP"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate_clp"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-12">
                Aún no hay suficientes datos para el gráfico de 30 días.
              </p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-1.5">
              Por qué el dólar afecta la bencina
            </h4>
            {explainerLoading || !explainer ? (
              <Skeleton className="h-16 rounded" />
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">{explainer}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
