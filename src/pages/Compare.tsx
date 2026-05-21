import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Plus, X, Share2, TrendingDown, Search, Trophy,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from "recharts";
import { useGasStations } from "@/hooks/useGasStations";
import { usePriceHistory } from "@/hooks/usePriceHistory";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const FUEL_TYPES = [
  { key: "gasoline93", label: "93" },
  { key: "gasoline95", label: "95" },
  { key: "gasoline97", label: "97" },
  { key: "diesel", label: "Diésel" },
] as const;

type FuelKey = (typeof FUEL_TYPES)[number]["key"];

const fmt = (n: number) => `$${n.toLocaleString("es-CL")}`;

const Compare = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: stations = [], isLoading } = useGasStations();

  const ids = useMemo(
    () => (searchParams.get("ids") || "").split(",").filter(Boolean),
    [searchParams]
  );

  const selected = useMemo(
    () => ids.map((id) => stations.find((s) => s.id === id)).filter(Boolean) as typeof stations,
    [ids, stations]
  );

  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tank, setTank] = useState(50);
  const [chartCell, setChartCell] = useState<{ stationId: string; fuel: FuelKey } | null>(null);

  const updateIds = (next: string[]) => {
    if (next.length === 0) {
      searchParams.delete("ids");
    } else {
      searchParams.set("ids", next.join(","));
    }
    setSearchParams(searchParams, { replace: true });
  };

  const addStation = (id: string) => {
    if (ids.includes(id)) return;
    if (ids.length >= 4) {
      toast.error("Máximo 4 estaciones");
      return;
    }
    updateIds([...ids, id]);
    setAddOpen(false);
    setSearch("");
  };

  const removeStation = (id: string) => updateIds(ids.filter((x) => x !== id));

  const filteredStations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stations
      .filter((s) => !ids.includes(s.id))
      .filter((s) =>
        !q
          ? true
          : s.name.toLowerCase().includes(q) ||
            s.brand.toLowerCase().includes(q) ||
            s.address.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [stations, ids, search]);

  const sharedComparison = async () => {
    const url = `${window.location.origin}/compare?ids=${ids.join(",")}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Comparación TÜcom", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Enlace copiado");
      }
    } catch {
      /* user cancelled */
    }
  };

  // Cheapest per fuel & savings calc
  const cheapestByFuel = useMemo(() => {
    const result: Record<FuelKey, { id: string; price: number } | null> = {
      gasoline93: null, gasoline95: null, gasoline97: null, diesel: null,
    };
    FUEL_TYPES.forEach(({ key }) => {
      let best: { id: string; price: number } | null = null;
      selected.forEach((s) => {
        const p = (s.prices as any)[key] as number;
        if (p && (best === null || p < best.price)) best = { id: s.id, price: p };
      });
      result[key] = best;
    });
    return result;
  }, [selected]);

  // Estimated weekly savings: cheapest vs. most expensive of selected, using preferred fuel = 95
  const savings = useMemo(() => {
    const fuel: FuelKey = "gasoline95";
    const prices = selected
      .map((s) => (s.prices as any)[fuel] as number)
      .filter((p) => p > 0);
    if (prices.length < 2) return null;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const perTank = (max - min) * tank;
    return { fuel, min, max, perTank, weekly: perTank * 2, diff: max - min };
  }, [selected, tank]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-primary px-4 pt-[env(safe-area-inset-top)] sticky top-0 z-40 shadow-elegant">
        <div className="flex items-center gap-3 py-3 max-w-5xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white/15 text-white hover:bg-white/25 transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-heading font-extrabold text-white text-lg leading-tight">
              Comparar estaciones
            </h1>
            <p className="text-[11px] text-white/80">Hasta 4 estaciones lado a lado</p>
          </div>
          {selected.length >= 2 && (
            <button
              onClick={sharedComparison}
              className="p-2 rounded-xl bg-white/15 text-white hover:bg-white/25 transition-colors"
              aria-label="Compartir"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        {/* Selected chips */}
        <section className="flex flex-wrap gap-2">
          {selected.map((s) => (
            <Badge
              key={s.id}
              variant="secondary"
              className="rounded-full pl-3 pr-1 py-1 text-xs bg-card border border-border"
            >
              <span className="font-semibold text-foreground mr-2 max-w-[160px] truncate">
                {s.brand} · {s.name}
              </span>
              <button
                onClick={() => removeStation(s.id)}
                className="w-5 h-5 rounded-full hover:bg-muted flex items-center justify-center"
                aria-label="Quitar"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
          {selected.length < 4 && (
            <Button
              size="sm"
              onClick={() => setAddOpen(true)}
              className="rounded-full h-7 bg-gradient-primary text-primary-foreground gap-1 px-3 hover-scale"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar
            </Button>
          )}
        </section>

        {selected.length < 2 ? (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center">
            <Trophy className="w-10 h-10 text-primary mx-auto mb-3" />
            <h2 className="font-semibold text-foreground mb-1">
              Selecciona al menos 2 estaciones
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Compara precios lado a lado y descubre cuánto puedes ahorrar.
            </p>
            <Button
              onClick={() => setAddOpen(true)}
              className="bg-gradient-primary text-primary-foreground hover-scale"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar estación
            </Button>
          </div>
        ) : (
          <>
            {/* Comparison table */}
            <section className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 sticky left-0 bg-muted/40 z-10">
                        Combustible
                      </th>
                      {selected.map((s) => (
                        <th
                          key={s.id}
                          className="text-left text-xs font-semibold text-foreground px-4 py-3 min-w-[160px]"
                        >
                          <div className="font-bold truncate">{s.brand}</div>
                          <div className="text-[10px] text-muted-foreground font-normal truncate">
                            {s.name}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FUEL_TYPES.map(({ key, label }) => {
                      const best = cheapestByFuel[key];
                      return (
                        <tr key={key} className="border-t border-border">
                          <td className="px-4 py-3 font-semibold text-foreground sticky left-0 bg-card z-10">
                            {label}
                          </td>
                          {selected.map((s) => {
                            const price = (s.prices as any)[key] as number;
                            if (!price) {
                              return (
                                <td key={s.id} className="px-4 py-3 text-xs text-muted-foreground">
                                  Sin datos
                                </td>
                              );
                            }
                            const isBest = best?.id === s.id;
                            const diff = best ? price - best.price : 0;
                            return (
                              <td key={s.id} className="px-4 py-3">
                                <button
                                  onClick={() => setChartCell({ stationId: s.id, fuel: key })}
                                  className={cn(
                                    "w-full text-left rounded-xl px-3 py-2 transition-all press-scale",
                                    isBest
                                      ? "bg-emerald-500/10 ring-1 ring-emerald-500/40"
                                      : "hover:bg-muted/40"
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-foreground tabular-nums">
                                      {fmt(price)}
                                    </span>
                                    {isBest && (
                                      <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white border-0 text-[10px] px-1.5 py-0">
                                        Más barato
                                      </Badge>
                                    )}
                                  </div>
                                  {!isBest && diff > 0 && (
                                    <div className="text-[11px] text-destructive font-medium mt-0.5">
                                      +{fmt(diff)} más caro
                                    </div>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Savings calculator */}
            <section className="bg-card rounded-2xl border border-border shadow-soft p-5 space-y-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-emerald-500" />
                <h2 className="font-semibold text-foreground">Calculadora de ahorro</h2>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-foreground">Tamaño del estanque</span>
                  <span className="text-sm font-bold text-primary tabular-nums">{tank} L</span>
                </div>
                <Slider
                  value={[tank]}
                  min={30}
                  max={80}
                  step={1}
                  onValueChange={(v) => setTank(v[0])}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>30 L</span><span>80 L</span>
                </div>
              </div>

              {savings ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300 font-semibold">
                      Ahorro por estanque
                    </p>
                    <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
                      {fmt(savings.perTank)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Con bencina 95 · {tank} L
                    </p>
                  </div>
                  <div className="rounded-xl bg-primary/10 border border-primary/30 p-4">
                    <p className="text-[11px] uppercase tracking-wide text-primary font-semibold">
                      Ahorro semanal estimado
                    </p>
                    <p className="text-2xl font-extrabold text-primary tabular-nums mt-1">
                      {fmt(savings.weekly)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Con 2 llenadas por semana
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Se necesitan al menos 2 estaciones con precio de 95 para calcular el ahorro.
                </p>
              )}
            </section>
          </>
        )}
      </main>

      {/* Add station dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar estación</DialogTitle>
            <DialogDescription>Busca por nombre, marca o dirección.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ej: Copec Providencia"
              className="pl-9"
            />
          </div>
          <ul className="max-h-80 overflow-y-auto divide-y divide-border -mx-1">
            {isLoading && (
              <li className="px-3 py-4 text-sm text-muted-foreground">Cargando…</li>
            )}
            {!isLoading && filteredStations.length === 0 && (
              <li className="px-3 py-4 text-sm text-muted-foreground text-center">
                Sin resultados
              </li>
            )}
            {filteredStations.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => addStation(s.id)}
                  className="w-full text-left px-3 py-2.5 hover:bg-muted/40 rounded-lg"
                >
                  <p className="text-sm font-semibold text-foreground truncate">
                    {s.brand} · {s.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{s.address}</p>
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      {/* Price history modal */}
      <PriceHistoryModal
        open={!!chartCell}
        onClose={() => setChartCell(null)}
        stationName={
          chartCell ? selected.find((s) => s.id === chartCell.stationId)?.name ?? "" : ""
        }
        fuel={chartCell?.fuel ?? "gasoline95"}
        currentPrice={
          chartCell
            ? ((selected.find((s) => s.id === chartCell.stationId)?.prices as any)?.[
                chartCell.fuel
              ] as number) ?? 0
            : 0
        }
      />
    </div>
  );
};

// -------- Price history modal (uses national fuel history as proxy) --------

const FUEL_NAME: Record<string, string> = {
  gasoline93: "Bencina 93",
  gasoline95: "Bencina 95",
  gasoline97: "Bencina 97",
  diesel: "Diésel",
};

interface ChartProps {
  open: boolean;
  onClose: () => void;
  stationName: string;
  fuel: FuelKey;
  currentPrice: number;
}

const PriceHistoryModal = ({ open, onClose, stationName, fuel, currentPrice }: ChartProps) => {
  const { data: history = [], isLoading } = usePriceHistory(30);

  const series = useMemo(
    () =>
      history
        .filter((h) => h.fuel_type === fuel)
        .map((h) => ({ date: h.snapshot_date.slice(5), price: h.avg_price })),
    [history, fuel]
  );

  const stats = useMemo(() => {
    if (series.length === 0) return null;
    const prices = series.map((p) => p.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const first = series[0].price;
    const last = series[series.length - 1].price;
    const pct = first > 0 ? ((last - first) / first) * 100 : 0;
    return { min, max, avg, pct };
  }, [series]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Historial — {FUEL_NAME[fuel] ?? fuel}</DialogTitle>
          <DialogDescription className="truncate">
            {stationName} · últimos 30 días
          </DialogDescription>
        </DialogHeader>

        {currentPrice > 0 && (
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-extrabold text-primary tabular-nums">
              {fmt(currentPrice)}
            </span>
            <span className="text-xs text-muted-foreground">precio actual</span>
          </div>
        )}

        {isLoading ? (
          <div className="h-56 grid place-items-center text-sm text-muted-foreground">
            Cargando…
          </div>
        ) : series.length === 0 ? (
          <div className="h-56 grid place-items-center text-sm text-muted-foreground">
            Sin datos disponibles.
          </div>
        ) : (
          <>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 10, right: 8, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
                  <Tooltip
                    formatter={(v: number) => fmt(v)}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      fontSize: 12,
                    }}
                  />
                  {stats && (
                    <ReferenceLine
                      y={stats.avg}
                      stroke="hsl(var(--muted-foreground))"
                      strokeDasharray="4 4"
                      label={{ value: `Prom ${fmt(stats.avg)}`, fontSize: 10, fill: "hsl(var(--muted-foreground))", position: "insideTopRight" }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#7C3AED"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {stats && (
              <div className="grid grid-cols-4 gap-2 text-center mt-2">
                <div className="rounded-xl bg-muted/40 p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">Mín</p>
                  <p className="text-sm font-bold text-emerald-600 tabular-nums">{fmt(stats.min)}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">Prom</p>
                  <p className="text-sm font-bold text-foreground tabular-nums">{fmt(stats.avg)}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">Máx</p>
                  <p className="text-sm font-bold text-destructive tabular-nums">{fmt(stats.max)}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">Δ 30d</p>
                  <p
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      stats.pct <= 0 ? "text-emerald-600" : "text-destructive"
                    )}
                  >
                    {stats.pct > 0 ? "+" : ""}
                    {stats.pct.toFixed(1)}%
                  </p>
                </div>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Tendencia basada en el promedio nacional CNE para este combustible.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default Compare;
