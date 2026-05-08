import { useState, useMemo, useEffect, useRef } from "react";
import { Tag, CreditCard, Calendar, Zap } from "lucide-react";
import { useFuelBenefits } from "@/hooks/useFuelBenefits";
import { Skeleton } from "@/components/ui/skeleton";

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_NAMES_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const FUEL_LABELS: Record<string, string> = {
  gasoline93: "93",
  gasoline95: "95",
  gasoline97: "97",
  diesel: "Diésel",
  electric: "⚡ EV",
};

// Match StationCard brand styling for visual consistency
const BRAND_STYLES: Record<string, { border: string; bg: string; accent: string; badge: string; chip: string }> = {
  Copec: {
    border: "border-[hsl(var(--brand-copec))]",
    bg: "bg-[hsl(var(--brand-copec)/0.06)]",
    accent: "text-[hsl(var(--brand-copec))]",
    badge: "bg-[hsl(var(--brand-copec))] text-white",
    chip: "bg-[hsl(var(--brand-copec)/0.12)] text-[hsl(var(--brand-copec))]",
  },
  Shell: {
    border: "border-[hsl(var(--brand-shell))]",
    bg: "bg-[hsl(var(--brand-shell)/0.06)]",
    accent: "text-[hsl(var(--brand-shell))]",
    badge: "bg-[hsl(var(--brand-shell))] text-white",
    chip: "bg-[hsl(var(--brand-shell)/0.12)] text-[hsl(var(--brand-shell))]",
  },
  Aramco: {
    border: "border-[hsl(var(--brand-aramco))]",
    bg: "bg-[hsl(var(--brand-aramco)/0.06)]",
    accent: "text-[hsl(var(--brand-aramco))]",
    badge: "bg-[hsl(var(--brand-aramco))] text-white",
    chip: "bg-[hsl(var(--brand-aramco)/0.12)] text-[hsl(var(--brand-aramco))]",
  },
};

const BenefitsTab = () => {
  const { data: benefits, isLoading } = useFuelBenefits();
  const today = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState<number>(today);
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [onlyThisDay, setOnlyThisDay] = useState<boolean>(false);

  const brands = useMemo(() => {
    const set = new Set((benefits ?? []).map((b) => b.brand));
    return Array.from(set).sort();
  }, [benefits]);

  const filtered = useMemo(() => {
    return (benefits ?? [])
      .filter((b) => {
        const days = (b.day_of_week ?? []).map(Number);
        if (!days.includes(Number(selectedDay))) return false;
        if (onlyThisDay && days.length === 7) return false;
        return true;
      })
      .filter((b) => selectedBrand === "all" || b.brand === selectedBrand)
      .sort((a, b) => {
        // Specific-day discounts first, then all-week
        const aLen = (a.day_of_week ?? []).length;
        const bLen = (b.day_of_week ?? []).length;
        return aLen - bLen;
      });
  }, [benefits, selectedDay, selectedBrand, onlyThisDay]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading font-bold text-foreground text-lg leading-tight tracking-tight">Beneficios y Descuentos</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Descuentos disponibles para <span className="font-semibold text-primary">{DAY_NAMES_FULL[selectedDay]}</span>
        </p>
      </div>

      {/* Day selector */}
      <div className="flex gap-1.5">
        {DAY_NAMES.map((name, i) => (
          <button
            key={i}
            onClick={() => setSelectedDay(i)}
            className={`flex-1 text-[11px] font-semibold py-2 rounded-xl transition-colors ${
              selectedDay === i
                ? "bg-primary text-primary-foreground shadow-sm"
                : i === today
                  ? "bg-primary/15 text-primary hover:bg-primary/25"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Only-this-day toggle */}
      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
        <input
          type="checkbox"
          checked={onlyThisDay}
          onChange={(e) => setOnlyThisDay(e.target.checked)}
          className="w-4 h-4 rounded accent-primary"
        />
        Solo descuentos exclusivos de <span className="font-semibold text-foreground">{DAY_NAMES_FULL[selectedDay]}</span>
      </label>

      {/* Brand filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        <button
          onClick={() => setSelectedBrand("all")}
          className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
            selectedBrand === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          Todas
        </button>
        {brands.map((brand) => {
          const style = BRAND_STYLES[brand];
          const isSelected = selectedBrand === brand;
          let cls = "";
          if (style) {
            cls = isSelected ? style.badge : `${style.chip} hover:opacity-80`;
          } else {
            cls = isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80";
          }
          return (
            <button
              key={brand}
              onClick={() => setSelectedBrand(brand === selectedBrand ? "all" : brand)}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${cls}`}
            >
              {brand}
            </button>
          );
        })}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <Tag className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No hay descuentos para este día y marca.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((benefit) => {
            const hasEV = benefit.fuel_types.includes("electric");
            const brandStyle = BRAND_STYLES[benefit.brand];
            const featured = !!brandStyle;
            const cardClass = featured
              ? `${brandStyle.bg} ${brandStyle.border} border-2 shadow-md`
              : hasEV
                ? "bg-card border border-[hsl(142,70%,45%)]/30"
                : "bg-card border border-border";
            return (
              <div key={benefit.id} className={`rounded-2xl p-4 shadow-sm ${cardClass}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 truncate max-w-[140px] ${
                        featured ? brandStyle.badge : "bg-primary/10 text-primary"
                      }`}>
                        {benefit.brand}
                      </span>
                      {hasEV && (
                        <span className="text-xs font-bold bg-[hsl(142,70%,45%)]/10 text-[hsl(142,70%,45%)] px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                          <Zap className="w-3 h-3" />
                          EV
                        </span>
                      )}
                      {benefit.discount_fixed && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          featured ? brandStyle.chip : "text-primary bg-primary/10"
                        }`}>
                          -${benefit.discount_fixed}/L
                        </span>
                      )}
                      {benefit.discount_percent && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          featured ? brandStyle.chip : "text-primary bg-primary/10"
                        }`}>
                          -{benefit.discount_percent}%
                        </span>
                      )}
                    </div>
                    <p className={`font-heading font-semibold text-sm leading-snug line-clamp-2 ${
                      featured ? brandStyle.accent : "text-foreground"
                    }`}>
                      {benefit.discount_description}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <CreditCard className="w-3 h-3 text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground">{benefit.payment_method}</p>
                    </div>
                    {benefit.conditions && (
                      <p className="text-[11px] text-muted-foreground/80 mt-1.5 leading-relaxed">
                        {benefit.conditions}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  <Calendar className="w-3 h-3 text-muted-foreground" />
                  <div className="flex gap-1 flex-wrap">
                    {benefit.day_of_week.map((d) => {
                      const dn = Number(d);
                      return (
                        <span
                          key={dn}
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            dn === today
                              ? "bg-primary/15 text-primary font-bold"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {DAY_NAMES[dn]}
                        </span>
                      );
                    })}
                  </div>
                  <div className="ml-auto flex gap-1 flex-wrap justify-end">
                    {benefit.fuel_types.map((ft) => (
                      <span
                        key={ft}
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          ft === "electric"
                            ? "bg-[hsl(142,70%,45%)]/10 text-[hsl(142,70%,45%)]"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {FUEL_LABELS[ft] ?? ft}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BenefitsTab;
