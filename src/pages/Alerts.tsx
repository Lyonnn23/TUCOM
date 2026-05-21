import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Trash2, BellOff, ChevronRight } from "lucide-react";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { useGasStations } from "@/hooks/useGasStations";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const FUEL_LABEL: Record<string, string> = {
  gasoline93: "Gasolina 93",
  gasoline95: "Gasolina 95",
  gasoline97: "Gasolina 97",
  diesel: "Diésel",
};

export default function Alerts() {
  const navigate = useNavigate();
  const { alerts, loading, remove } = usePriceAlerts();
  const { data: stations } = useGasStations();

  const stationOf = (id: string) => stations?.find((s) => s.id === id);

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="bg-gradient-hero text-white px-4 pt-[env(safe-area-inset-top)] pb-6 shadow-elegant">
        <div className="max-w-3xl mx-auto pt-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center"
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-heading font-extrabold text-2xl">Mis alertas</h1>
              <p className="text-sm text-white/85">
                Te avisamos cuando los precios bajen de tu objetivo
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-3 animate-fade-in">
        {loading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
        ) : alerts.length === 0 ? (
          <div className="text-center py-16 px-6 bg-card border border-border rounded-2xl">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
              <BellOff className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="font-heading font-bold text-foreground text-lg">
              No tienes alertas
            </h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm mx-auto">
              Entra a una estación y crea una alerta para que te avisemos cuando el precio baje.
            </p>
            <Button onClick={() => navigate("/")}>Explorar estaciones</Button>
          </div>
        ) : (
          alerts.map((a) => {
            const st = stationOf(a.station_id);
            return (
              <div
                key={a.id}
                className="bg-card border border-border rounded-2xl shadow-soft p-4 flex items-center gap-3"
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    a.triggered ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary"
                  }`}
                >
                  <Bell className="w-5 h-5" />
                </div>
                <button
                  onClick={() => navigate(`/station/${a.station_id}`)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="font-semibold text-foreground truncate">
                    {st?.name ?? "Estación"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {FUEL_LABEL[a.fuel_type] ?? a.fuel_type} ≤{" "}
                    <span className="font-bold text-foreground">${a.target_price}</span>
                    {a.last_known_price != null && (
                      <> · actual ${a.last_known_price}</>
                    )}
                  </p>
                  {a.triggered && (
                    <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-accent">
                      ¡Alerta activada!
                    </span>
                  )}
                </button>
                <button
                  onClick={() => navigate(`/station/${a.station_id}`)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Ver estación"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => remove(a.id)}
                  className="w-9 h-9 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors"
                  aria-label="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
