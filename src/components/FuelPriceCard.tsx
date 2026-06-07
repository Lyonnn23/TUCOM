import { useEffect, useMemo } from "react";
import { TrendingDown, TrendingUp, Minus, Zap, ArrowDown, ArrowUp } from "lucide-react";
import type { FuelPrice } from "@/hooks/useFuelPrices";
import { formatPrice } from "@/lib/format";

const LAST_WEEK_KEY = "mepco_last_week";

const isoWeek = (d = new Date()) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((+t - +yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${week}`;
};

type Store = { week: string; prices: Record<string, number> };

const readStore = (): Store | null => {
  try {
    const raw = localStorage.getItem(LAST_WEEK_KEY);
    return raw ? (JSON.parse(raw) as Store) : null;
  } catch { return null; }
};


interface FuelPriceCardProps {
  fuel: FuelPrice;
}

const fuelColors: Record<string, string> = {
  gasoline93: "from-fuel-cyan/20 to-fuel-blue/10 border-fuel-cyan/30",
  gasoline95: "from-fuel-purple/20 to-fuel-pink/10 border-fuel-purple/30",
  gasoline97: "from-fuel-pink/20 to-fuel-amber/10 border-fuel-pink/30",
  diesel: "from-fuel-green/20 to-fuel-cyan/10 border-fuel-green/30",
  electric: "from-[hsl(142,70%,45%)]/20 to-[hsl(160,60%,40%)]/10 border-[hsl(142,70%,45%)]/30",
};

const fuelEmoji: Record<string, string | null> = {
  gasoline93: "⛽",
  gasoline95: "⛽",
  gasoline97: "⛽",
  diesel: "🛢️",
  electric: null, // Use icon instead
};

const FuelPriceCard = ({ fuel }: FuelPriceCardProps) => {
  const trendUp = fuel.trend === "up";
  const trendDown = fuel.trend === "down";
  const colorClass = fuelColors[fuel.type] ?? "from-muted to-muted border-border";
  const isElectric = fuel.type === "electric";

  const trendLabel = trendUp ? "Subió" : trendDown ? "Bajó" : "Estable";
  const TrendIcon = trendDown ? TrendingDown : trendUp ? TrendingUp : Minus;

  // Week-over-week diff from localStorage
  const wow = useMemo(() => {
    const store = readStore();
    if (!store) return null;
    const prev = store.prices?.[fuel.type];
    if (typeof prev !== "number") return null;
    return fuel.price - prev;
  }, [fuel.type, fuel.price]);

  // Update store when ISO week rolls over
  useEffect(() => {
    try {
      const now = isoWeek();
      const store = readStore();
      if (!store || store.week !== now) {
        const base = store && store.week === now ? store.prices : {};
        const next: Store = {
          week: now,
          prices: { ...base, [fuel.type]: fuel.price },
        };
        // Only overwrite snapshot when crossing a new week to keep WoW stable
        if (!store || store.week !== now) {
          localStorage.setItem(LAST_WEEK_KEY, JSON.stringify(next));
        }
      } else if (typeof store.prices?.[fuel.type] !== "number") {
        // Seed missing fuel within current week without overwriting others
        store.prices[fuel.type] = fuel.price;
        localStorage.setItem(LAST_WEEK_KEY, JSON.stringify(store));
      }
    } catch {}
  }, [fuel.type, fuel.price]);

  const wowLabel =
    wow === null
      ? null
      : wow < 0
        ? `$${Math.abs(Math.round(wow))} más barato que la semana pasada`
        : wow > 0
          ? `$${Math.round(wow)} más caro que la semana pasada`
          : "Sin cambio esta semana";

  const WowIcon = wow === null ? Minus : wow < 0 ? ArrowDown : wow > 0 ? ArrowUp : Minus;
  const wowColor =
    wow === null || wow === 0
      ? "text-muted-foreground"
      : wow < 0
        ? "text-fuel-green"
        : "text-fuel-red";

  return (
    <article
      className={`bg-gradient-to-r ${colorClass} rounded-2xl p-4 border flex flex-col gap-2`}
      aria-label={`${fuel.name}: ${formatPrice(fuel.price)} por litro. Tendencia: ${trendLabel}.`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isElectric ? (
            <div className="w-9 h-9 rounded-xl bg-[hsl(142,70%,45%)]/20 flex items-center justify-center" aria-hidden="true">
              <Zap className="w-5 h-5 text-[hsl(142,70%,45%)]" />
            </div>
          ) : (
            <span className="text-2xl" aria-hidden="true">{fuelEmoji[fuel.type] ?? "⛽"}</span>
          )}
          <div>
            <p className="text-xs font-semibold text-foreground tracking-wide">{fuel.name}</p>
            <p
              className="text-2xl font-heading font-bold text-foreground mt-0.5"
              aria-live="polite"
              aria-atomic="true"
            >
              {formatPrice(fuel.price)}
            </p>
            <p className="text-[10px] text-muted-foreground">{fuel.unit}</p>
          </div>
        </div>
        <div
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${
            trendDown
              ? "bg-fuel-green/20 text-fuel-green"
              : trendUp
              ? "bg-fuel-red/20 text-fuel-red"
              : "bg-muted text-muted-foreground"
          }`}
          role="status"
          aria-label={`Tendencia: ${trendLabel}`}
        >
          <TrendIcon className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{trendLabel}</span>
        </div>
      </div>
      {wowLabel && (
        <div className={`flex items-center gap-1.5 text-[11px] font-medium ${wowColor}`}>
          <WowIcon className="w-3 h-3" aria-hidden="true" />
          <span>{wowLabel}</span>
        </div>
      )}
    </article>
  );
};

export default FuelPriceCard;
