import { useEffect, useState } from "react";
import { Fuel, X } from "lucide-react";
import { useFuelPrices } from "@/hooks/useFuelPrices";

const STORAGE_KEY = "mepco_thursday_banner_dismissed";

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

const MepcoThursdayBanner = () => {
  const [visible, setVisible] = useState(false);
  const { data: prices } = useFuelPrices();

  useEffect(() => {
    if (new Date().getDay() !== 4) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === todayKey()) return;
    } catch {}
    setVisible(true);
  }, []);

  if (!visible) return null;

  const avgChange =
    prices && prices.length
      ? prices.reduce((sum, p) => sum + Math.abs(p.change ?? 0), 0) / prices.length
      : 0;

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, todayKey()); } catch {}
    setVisible(false);
  };

  return (
    <div
      role="status"
      className="relative rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 to-accent/15 p-4 pr-12 flex items-center gap-3 animate-fade-in"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
        <Fuel className="w-5 h-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">Precios actualizados hoy ⛽</p>
        <p className="text-xs text-muted-foreground">
          {avgChange > 0
            ? `Variación promedio de $${Math.round(avgChange)} por litro esta semana`
            : "Revisa los nuevos precios MEPCO de esta semana"}
        </p>
      </div>
      <button
        onClick={dismiss}
        aria-label="Cerrar"
        className="absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/60"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default MepcoThursdayBanner;
