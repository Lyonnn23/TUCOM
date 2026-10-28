/**
 * WeeklySummaryWidget — "Esta semana"
 * Muestra resumen de gasto e litros cargados en los últimos 7 días.
 * Se oculta si no hay registros recientes. Dismissable por el usuario.
 */
import { useMemo } from "react";
import { Flame, TrendingDown, TrendingUp, X } from "lucide-react";
import { useFuelLogs } from "@/hooks/useFuelLogs";
import CountUp from "./CountUp";

const DISMISS_KEY = "tucom.weekly_summary_dismissed";

/** ISO week string: YYYY-Www */
const isoWeek = (d = new Date()): string => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((+t - +yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};

const getDismissedWeek = (): string => {
  try { return localStorage.getItem(DISMISS_KEY) ?? ""; } catch { return ""; }
};
const dismissCurrentWeek = () => {
  try { localStorage.setItem(DISMISS_KEY, isoWeek()); } catch {}
};

interface Props {
  className?: string;
}

const WeeklySummaryWidget = ({ className = "" }: Props) => {
  const { list } = useFuelLogs();
  const logs = list.data ?? [];

  const week = isoWeek();

  // Sum logs from the past 7 days
  const { liters, spent, fills, vsLastWeek } = useMemo(() => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;

    const thisWeekLogs = logs.filter(
      (l) => now - new Date(l.logged_at).getTime() < sevenDays
    );
    const prevWeekLogs = logs.filter((l) => {
      const age = now - new Date(l.logged_at).getTime();
      return age >= sevenDays && age < fourteenDays;
    });

    const sum = (arr: typeof logs) =>
      arr.reduce(
        (acc, l) => ({ liters: acc.liters + l.liters, spent: acc.spent + l.total_cost }),
        { liters: 0, spent: 0 }
      );

    const cur = sum(thisWeekLogs);
    const prev = sum(prevWeekLogs);
    const diff = prev.spent > 0 ? ((cur.spent - prev.spent) / prev.spent) * 100 : null;

    return {
      liters: cur.liters,
      spent: cur.spent,
      fills: thisWeekLogs.length,
      vsLastWeek: diff,
    };
  }, [logs]);

  // Nothing to show if no fills this week
  if (fills === 0) return null;

  // Hidden if user dismissed for this week
  if (getDismissedWeek() === week) return null;

  const changeLabel =
    vsLastWeek === null
      ? null
      : vsLastWeek < -1
      ? `${Math.abs(Math.round(vsLastWeek))}% menos que la semana pasada`
      : vsLastWeek > 1
      ? `${Math.round(vsLastWeek)}% más que la semana pasada`
      : "Similar a la semana pasada";

  const TrendIcon = vsLastWeek === null ? null : vsLastWeek <= -1 ? TrendingDown : TrendingUp;
  const trendColor =
    vsLastWeek === null
      ? "text-muted-foreground"
      : vsLastWeek <= -1
      ? "text-fuel-green"
      : "text-fuel-red";

  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-br from-primary/5 via-card to-card border border-primary/20 p-4 shadow-soft overflow-hidden ${className}`}
      role="region"
      aria-label="Resumen semanal de combustible"
    >
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 rounded-full bg-primary/10 blur-2xl" aria-hidden="true" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Flame className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Esta semana</p>
        </div>
        <button
          onClick={dismissCurrentWeek}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Cerrar resumen semanal"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Stats row */}
      <div className="flex gap-3">
        <div className="flex-1 bg-card/60 rounded-xl p-3 border border-border/50">
          <p className="text-[10px] text-muted-foreground mb-0.5">Gastaste</p>
          <p className="text-lg font-black tabular-nums text-foreground leading-none">
            $<CountUp value={spent} format={(n) => Math.round(n).toLocaleString("es-CL")} />
          </p>
        </div>
        <div className="flex-1 bg-card/60 rounded-xl p-3 border border-border/50">
          <p className="text-[10px] text-muted-foreground mb-0.5">Cargaste</p>
          <p className="text-lg font-black tabular-nums text-foreground leading-none">
            <CountUp value={liters} format={(n) => n.toFixed(1)} /><span className="text-xs font-semibold text-muted-foreground ml-0.5">L</span>
          </p>
        </div>
        <div className="flex-1 bg-card/60 rounded-xl p-3 border border-border/50">
          <p className="text-[10px] text-muted-foreground mb-0.5">Cargas</p>
          <p className="text-lg font-black tabular-nums text-foreground leading-none">
            <CountUp value={fills} />
          </p>
        </div>
      </div>

      {/* Comparison with last week */}
      {changeLabel && TrendIcon && (
        <div className={`flex items-center gap-1.5 mt-2.5 text-[11px] font-medium ${trendColor}`}>
          <TrendIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
          <span>{changeLabel}</span>
        </div>
      )}
    </div>
  );
};

export default WeeklySummaryWidget;
