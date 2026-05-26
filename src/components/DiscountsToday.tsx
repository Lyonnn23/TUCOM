import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Tag } from "lucide-react";
import { useStationDiscounts } from "@/hooks/useStationDiscounts";
import { discountsActiveToday } from "@/lib/discounts";
import BrandLogo from "@/components/BrandLogo";

const DiscountsToday = () => {
  const navigate = useNavigate();
  const { data: discounts } = useStationDiscounts();

  const todayList = useMemo(() => {
    const list = discountsActiveToday(discounts);
    // mejor por marca
    const byBrand = new Map<string, number>();
    for (const d of list) {
      const cur = byBrand.get(d.brand) ?? 0;
      if (d.discount_clp > cur) byBrand.set(d.brand, d.discount_clp);
    }
    return Array.from(byBrand.entries()).sort((a, b) => b[1] - a[1]);
  }, [discounts]);

  return (
    <section className="bg-card rounded-2xl border border-border shadow-soft p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-primary" />
          <h2 className="font-heading font-semibold text-sm text-foreground">
            Descuentos activos hoy
          </h2>
        </div>
        <button
          onClick={() => navigate("/descuentos")}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
        >
          Ver todos <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {todayList.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          Esta semana no hay descuentos programados. Los precios se muestran según CNE.
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {todayList.map(([brand, amount]) => (
            <button
              key={brand}
              onClick={() => navigate("/descuentos")}
              className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-muted/40 hover:bg-muted press-scale"
            >
              <BrandLogo brand={brand === "ALL" ? "Genérico" : brand} size={20} />
              <div className="text-left">
                <div className="text-[10px] text-muted-foreground leading-none">
                  {brand === "ALL" ? "Todas" : brand}
                </div>
                <div className="text-xs font-extrabold text-fuel-green leading-tight">
                  −${amount}/L
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export default DiscountsToday;
