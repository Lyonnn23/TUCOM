import { useMemo, useState } from "react";
import { useCatalogTop } from "@/hooks/useVehiclesCatalog";
import { QUICK_DESTINATIONS, calcTrip, vehicleLabel, type RouteType } from "@/lib/tripCalc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";
import { Award, TrendingUp } from "lucide-react";

interface Props {
  defaultFuelPrice: number;
  defaultElectricPrice: number;
}

const CompareCarsTab = ({ defaultFuelPrice, defaultElectricPrice }: Props) => {
  const top = useCatalogTop(12);
  const [destKm, setDestKm] = useState<number>(150);
  const [destLabel, setDestLabel] = useState<string>("Viña del Mar / Valparaíso");
  const [route] = useState<RouteType>("mixed");
  const [sort, setSort] = useState<"price" | "eff" | "brand">("price");
  const [tripsPerMonth, setTripsPerMonth] = useState<number>(2);

  const rows = useMemo(() => {
    if (!top.data) return [];
    const list = top.data.map((v) => {
      const price = v.fuel_type === "electric" ? defaultElectricPrice : defaultFuelPrice;
      const calc = calcTrip(v, destKm, route, price);
      return { v, calc };
    });
    return list.sort((a, b) => {
      if (sort === "price") return a.calc.total - b.calc.total;
      if (sort === "eff")   return b.calc.consumption - a.calc.consumption;
      return a.v.brand.localeCompare(b.v.brand);
    });
  }, [top.data, destKm, route, sort, defaultFuelPrice, defaultElectricPrice]);

  const cheapestTotal = rows[0]?.calc.total ?? 0;
  const mostExpensive = rows.length ? Math.max(...rows.map((r) => r.calc.total)) : 0;
  const monthlyDiff = (mostExpensive - cheapestTotal) * tripsPerMonth;

  return (
    <div className="space-y-4">
      {/* Destination */}
      <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <h2 className="font-heading font-bold text-foreground text-sm">¿A dónde piensas viajar?</h2>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_DESTINATIONS.map((d) => {
            const active = destKm === d.km && destLabel === d.label;
            return (
              <button
                key={d.id}
                onClick={() => { setDestKm(d.km); setDestLabel(d.label); }}
                className={`rounded-xl border px-3 py-2 text-left text-xs press-scale transition ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 text-foreground hover:bg-muted"}`}
              >
                <div className="font-semibold truncate">{d.label}</div>
                <div className="text-[10px] text-muted-foreground">~{d.km} km</div>
              </button>
            );
          })}
        </div>
        <div>
          <Label htmlFor="custom-km-cmp" className="text-xs">O ingresa los km del viaje</Label>
          <Input
            id="custom-km-cmp"
            type="number"
            inputMode="numeric"
            min={1}
            value={destKm}
            onChange={(e) => { setDestKm(Number(e.target.value) || 0); setDestLabel("Personalizado"); }}
            className="h-11 mt-1 rounded-xl"
          />
        </div>
      </section>

      {/* Sort */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Ordenar por:</span>
        {(["price","eff","brand"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`px-2.5 py-1 rounded-full font-medium ${sort === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {s === "price" ? "Precio" : s === "eff" ? "Eficiencia" : "Marca"}
          </button>
        ))}
      </div>

      {/* Table */}
      {top.isLoading ? (
        <Skeleton className="h-72 rounded-2xl" />
      ) : (
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-bold bg-muted/40">
            <div className="col-span-6">Vehículo</div>
            <div className="col-span-2 text-right">km/L</div>
            <div className="col-span-2 text-right">L</div>
            <div className="col-span-2 text-right">Total</div>
          </div>
          <ul>
            {rows.map((r, i) => {
              const isCheapest = r.calc.total === cheapestTotal;
              const isPricey = r.calc.total === mostExpensive && rows.length > 1;
              return (
                <li
                  key={r.v.id}
                  className={`grid grid-cols-12 px-3 py-2.5 text-xs items-center border-t border-border ${isCheapest ? "bg-primary/5" : isPricey ? "bg-amber-500/5" : ""}`}
                >
                  <div className="col-span-6 min-w-0">
                    <p className="font-semibold text-foreground truncate flex items-center gap-1.5">
                      {isCheapest && <Award className="w-3.5 h-3.5 text-primary" aria-hidden="true" />}
                      {r.v.brand} {r.v.model}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{r.v.year} · {r.v.version}</p>
                    {isCheapest && (
                      <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground">Más barato</span>
                    )}
                  </div>
                  <div className="col-span-2 text-right tabular-nums text-foreground">{r.calc.isElectric ? `${(r.v.kwh_per_km ? (1/r.v.kwh_per_km) : 0).toFixed(1)}` : r.calc.consumption.toFixed(1)}</div>
                  <div className="col-span-2 text-right tabular-nums text-muted-foreground">{r.calc.units.toFixed(1)}</div>
                  <div className="col-span-2 text-right tabular-nums font-bold text-foreground">{formatPrice(r.calc.total)}</div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Monthly cost */}
      <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">¿Cuántas veces haces este viaje al mes?</Label>
          <span className="text-sm font-bold text-primary tabular-nums">{tripsPerMonth}×</span>
        </div>
        <Slider value={[tripsPerMonth]} onValueChange={(v) => setTripsPerMonth(v[0] ?? 1)} min={1} max={20} step={1} />
        <div className="rounded-xl bg-gradient-primary text-white p-3 text-center">
          <p className="text-[11px] opacity-90 flex items-center justify-center gap-1">
            <TrendingUp className="w-3 h-3" /> Diferencia mensual entre el más barato y el más caro
          </p>
          <p className="font-heading font-extrabold text-2xl tabular-nums">{formatPrice(monthlyDiff)}</p>
        </div>
      </section>
    </div>
  );
};

export default CompareCarsTab;
