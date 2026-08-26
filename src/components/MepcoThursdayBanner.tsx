import { useEffect, useState } from "react";
import { Fuel, TrendingDown, TrendingUp, X } from "lucide-react";
import { useFuelPrices } from "@/hooks/useFuelPrices";

const STORAGE_KEY = "mepco_thursday_banner_dismissed";

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

const nextThursday = () => {
  const d = new Date();
  const diff = (4 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d;
};

const formatDayMonth = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

const MepcoThursdayBanner = () => {
  const [visible, setVisible] = useState(false);
  const { data: prices } = useFuelPrices();
  const isThursday = new Date().getDay() === 4;

  useEffect(() => {
    if (!isThursday) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === todayKey()) return;
    } catch {}
    setVisible(true);
  }, [isThursday]);

  const avgChange =
    prices && prices.length
      ? prices.reduce((sum, p) => sum + Math.abs(p.change ?? 0), 0) / prices.length
      : 0;

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, todayKey()); } catch {}
    setVisible(false);
  };

  if (!isThursday) {
    const nt = nextThursday();
    return (
      <div
        role="status"
        className="rounded-2xl border border-border bg-muted/40 px-4 py-2.5 flex items-center gap-2.5 text-xs"
      >
        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Fuel className="w-3.5 h-3.5 text-primary" />
        </div>
        <p className="text-foreground">
          <span className="font-semibold">Próximo ajuste MEPCO:</span>{" "}
          <span className="text-muted-foreground">jueves {formatDayMonth(nt)}</span>
        </p>
      </div>
    );
  }

  if (!visible) return null;

  const signedAvg =
    prices && prices.length
      ? prices.reduce((sum, p) => sum + (p.change ?? 0), 0) / prices.length
      : 0;
  const direction: "up" | "down" | "flat" =
    signedAvg > 0 ? "up" : signedAvg < 0 ? "down" : "flat";
  const DirIcon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Fuel;

  return (
    <div
      role="status"
      className={`relative overflow-hidden rounded-2xl p-4 pr-12 flex items-center gap-3 shadow-md animate-slide-down-in text-white ${
        direction === "down"
          ? "bg-gradient-to-r from-emerald-500 to-green-500"
          : "bg-gradient-to-r from-amber-500 to-orange-500"
      }`}
    >
      {direction === "down" && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0">
          {[12, 34, 56, 78, 90].map((left, i) => (
            <span
              key={left}
              className="confetti-dot absolute top-1 w-1.5 h-1.5 rounded-full bg-white/70"
              style={{ left: `${left}%`, animationDelay: `${i * 320}ms` }}
            />
          ))}
        </span>
      )}
      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
        <DirIcon className="w-5 h-5 text-white animate-pulse motion-reduce:animate-none" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-white">⛽ Precios MEPCO actualizados hoy</p>
        <p className="text-xs text-white/85">
          {avgChange > 0
            ? `Variación promedio de $${Math.round(avgChange)} por litro esta semana`
            : "Revisa los nuevos precios MEPCO de esta semana"}
        </p>
      </div>
      <button
        onClick={dismiss}
        aria-label="Cerrar"
        className="absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};


export default MepcoThursdayBanner;
