import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Calendar, Info, Tag, Navigation } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useStationDiscounts } from "@/hooks/useStationDiscounts";
import { dayName, type StationDiscount } from "@/lib/discounts";
import BrandLogo from "@/components/BrandLogo";
import { cn } from "@/lib/utils";

const DAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const DAYS_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function appliesOn(d: StationDiscount, dayLabel: string) {
  if (!d.day_of_week || d.day_of_week.length === 0) return true;
  const norm = d.day_of_week.map((x) => x.toLowerCase());
  return norm.includes(dayLabel);
}

const Descuentos = () => {
  const navigate = useNavigate();
  const { data: discounts, isLoading } = useStationDiscounts();
  const todayIdx = (new Date().getDay() + 6) % 7; // monday=0
  const [selectedDay, setSelectedDay] = useState<number | "all">(todayIdx);
  const [filter, setFilter] = useState<"hoy" | "semana">("hoy");

  const lastUpdate = useMemo(() => {
    if (!discounts || discounts.length === 0) return null;
    const max = discounts.reduce((acc, d) => (d.updated_at > acc ? d.updated_at : acc), discounts[0].updated_at);
    return new Date(max).toLocaleDateString("es-CL");
  }, [discounts]);

  const filtered = useMemo(() => {
    if (!discounts) return [];
    if (filter === "semana") return discounts;
    const day = typeof selectedDay === "number" ? DAYS[selectedDay] : null;
    if (!day) return discounts;
    return discounts.filter((d) => appliesOn(d, day));
  }, [discounts, selectedDay, filter]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Helmet>
        <title>Descuentos de bencina | TÜcom</title>
        <meta name="description" content="Calendario semanal de descuentos en combustible de Chile por marca, tarjeta y app." />
      </Helmet>

      <header className="bg-gradient-primary px-4 pt-[env(safe-area-inset-top)] sticky top-0 z-40 shadow-elegant">
        <div className="flex items-center gap-3 py-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/15 text-white hover:bg-white/25" aria-label="Volver">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-heading font-extrabold text-white text-lg">Descuentos esta semana</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        <div className="rounded-xl bg-muted/50 border border-border p-3 flex gap-2 text-xs text-muted-foreground">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
          <p>
            Los descuentos son vigentes según información pública de cada marca. TÜcom no garantiza su disponibilidad.
            Verifica en la estación antes de cargar.
            {lastUpdate && <span className="block mt-1 opacity-80">Última actualización: {lastUpdate}</span>}
          </p>
        </div>

        {/* Calendario semanal */}
        <section className="bg-card rounded-2xl border border-border shadow-soft p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground text-sm">Calendario</h2>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map((dayLabel, i) => {
              const dayDiscounts = (discounts ?? []).filter((d) => appliesOn(d, dayLabel));
              const brands = Array.from(new Set(dayDiscounts.map((d) => d.brand))).slice(0, 3);
              const isToday = i === todayIdx;
              const isSelected = selectedDay === i;
              return (
                <button
                  key={dayLabel}
                  onClick={() => { setSelectedDay(i); setFilter("hoy"); }}
                  className={cn(
                    "rounded-xl border p-2 text-center transition-all min-h-[64px] flex flex-col items-center justify-start gap-1",
                    isSelected ? "border-primary bg-primary/10" : "border-border bg-muted/30 hover:border-primary/40",
                    isToday && !isSelected && "ring-1 ring-primary/40",
                  )}
                >
                  <div className={cn("text-[10px] font-bold", isToday ? "text-primary" : "text-muted-foreground")}>
                    {DAYS_SHORT[i]}
                  </div>
                  <div className="text-[9px] font-semibold text-foreground tabular-nums">
                    {dayDiscounts.length}
                  </div>
                  <div className="flex gap-0.5 flex-wrap justify-center">
                    {brands.map((b) => (
                      <div key={b} className="w-3 h-3 rounded-full bg-card border border-border flex items-center justify-center overflow-hidden">
                        <BrandLogo brand={b === "ALL" ? "Genérico" : b} size={10} />
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Filtros */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("hoy")}
            className={cn(
              "flex-1 rounded-xl py-2 text-xs font-bold transition-all",
              filter === "hoy" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {typeof selectedDay === "number" ? DAYS_SHORT[selectedDay] : "Hoy"}
          </button>
          <button
            onClick={() => setFilter("semana")}
            className={cn(
              "flex-1 rounded-xl py-2 text-xs font-bold transition-all",
              filter === "semana" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            Toda la semana
          </button>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Cargando descuentos…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            No hay descuentos para este día.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((d) => (
              <article key={d.id} className="bg-card rounded-2xl border border-border shadow-soft p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <BrandLogo brand={d.brand === "ALL" ? "Genérico" : d.brand} size={32} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-heading font-bold text-foreground">
                        {d.brand === "ALL" ? "Todas las estaciones" : d.brand}
                      </h3>
                      <div className="text-2xl font-extrabold text-fuel-green tabular-nums leading-none">
                        −${d.discount_clp}<span className="text-xs text-muted-foreground font-semibold">/L</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Con {d.payment_method}</p>
                  </div>
                </div>

                <p className="text-sm text-foreground mt-3">{d.description}</p>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {d.fuel_types.map((f) => (
                    <span key={f} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-foreground uppercase">
                      {f.replace("gasoline", "")}
                    </span>
                  ))}
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {d.day_of_week && d.day_of_week.length > 0
                      ? `Todos los ${d.day_of_week.join(", ")}`
                      : "Todos los días"}
                  </span>
                  {d.max_liters && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">
                      Hasta {d.max_liters} L
                    </span>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => navigate(`/?tab=stations&brand=${encodeURIComponent(d.brand === "ALL" ? "all" : d.brand)}`)}
                    className="flex-1 bg-gradient-primary text-primary-foreground rounded-xl py-2 px-3 text-xs font-semibold press-scale flex items-center justify-center gap-1"
                  >
                    <Navigation className="w-3.5 h-3.5" /> Ver estaciones
                  </button>
                  {d.source_url && (
                    <a
                      href={d.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-muted text-foreground rounded-xl py-2 px-3 text-xs font-semibold press-scale flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Fuente
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Descuentos;
