import { useState, useMemo } from "react";
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

const BenefitsTab = () => {
  const { data: benefits, isLoading } = useFuelBenefits();
  const today = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState<number>(today);
  const [selectedBrand, setSelectedBrand] = useState<string>("all");

  const brands = useMemo(() => {
    const set = new Set((benefits ?? []).map((b) => b.brand));
    return Array.from(set).sort();
  }, [benefits]);

  const filtered = useMemo(() => {
    return (benefits ?? [])
      .filter((b) => b.day_of_week.includes(selectedDay))
      .filter((b) => selectedBrand === "all" || b.brand === selectedBrand);
  }, [benefits, selectedDay, selectedBrand]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading font-bold text-foreground text-xl">Beneficios y Descuentos</h2>
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
        {brands.map((brand) => (
          <button
            key={brand}
            onClick={() => setSelectedBrand(brand === selectedBrand ? "all" : brand)}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
              selectedBrand === brand
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {brand}
          </button>
        ))}
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
            return (
              <div key={benefit.id} className={`bg-card rounded-2xl p-4 shadow-sm border ${hasEV ? "border-[hsl(142,70%,45%)]/30" : "border-border"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        {benefit.brand}
                      </span>
                      {hasEV && (
                        <span className="text-xs font-bold bg-[hsl(142,70%,45%)]/10 text-[hsl(142,70%,45%)] px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          EV
                        </span>
                      )}
                      {benefit.discount_fixed && (
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          -${benefit.discount_fixed}/L
                        </span>
                      )}
                      {benefit.discount_percent && (
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          -{benefit.discount_percent}%
                        </span>
                      )}
                    </div>
                    <p className="font-heading font-semibold text-foreground text-sm">
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
                  <div className="flex gap-1">
                    {benefit.day_of_week.map((d) => (
                      <span
                        key={d}
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          d === today
                            ? "bg-primary/15 text-primary font-bold"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {DAY_NAMES[d]}
                      </span>
                    ))}
                  </div>
                  <div className="ml-auto flex gap-1">
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
