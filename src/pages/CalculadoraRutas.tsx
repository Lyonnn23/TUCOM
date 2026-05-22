import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Car, Clock, Fuel, Plus, Repeat, Share2, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import VehicleDialog from "@/components/VehicleDialog";
import { useUserVehicles } from "@/hooks/useUserVehicles";
import { useSubscription, useRouteSearchUsage } from "@/hooks/useSubscription";
import { PaywallModal } from "@/components/PaywallModal";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, formatDistance } from "@/lib/format";
import { toast } from "sonner";

interface LatLng { lat: number; lng: number; label?: string; }

interface RouteSummary {
  index: number;
  description: string | null;
  distance_km: number;
  duration_min: number;
  polyline: string;
  tariff_band: "baja" | "punta" | "saturacion";
  porticos: Array<{ portico_id: string; name: string; autopista: string; lat: number; lng: number; tarifa: number }>;
  tag_cost: number;
  liters: number;
  fuel_cost: number;
  total_cost: number;
  cheapest_station: { id: string; name: string; brand: string; lat: number; lng: number; price: number } | null;
}

interface TripResponse {
  band: string;
  depart_at: string;
  routes: RouteSummary[];
}

const bandLabel: Record<string, string> = {
  baja: "Tarifa baja",
  punta: "Hora punta",
  saturacion: "Saturación",
};

const CalculadoraRutas = () => {
  const navigate = useNavigate();
  const { vehicles, primary, isLoading: vehiclesLoading } = useUserVehicles();
  const { isPro, limits } = useSubscription();
  const { data: usedSearches = 0, refetch: refetchUsage } = useRouteSearchUsage();
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [roundTrip, setRoundTrip] = useState(false);
  const [departLater, setDepartLater] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  const [resultNow, setResultNow] = useState<TripResponse | null>(null);
  const [resultLater, setResultLater] = useState<TripResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill origin with current location
  useEffect(() => {
    if (origin) return;
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "Mi ubicación" }),
      () => {},
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 5 * 60 * 1000 },
    );
  }, [origin]);

  // Pick primary vehicle by default
  useEffect(() => {
    if (!selectedVehicleId && primary) setSelectedVehicleId(primary.id);
  }, [primary, selectedVehicleId]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) ?? primary,
    [vehicles, selectedVehicleId, primary],
  );

  const handleCalculate = async () => {
    if (!origin || !destination) {
      toast.error("Indica origen y destino");
      return;
    }
    if (!selectedVehicle) {
      toast.error("Agrega un vehículo primero");
      return;
    }
    if (!isPro && usedSearches >= limits.routeSearchesPerMonth) {
      setPaywallOpen(true);
      return;
    }
    setLoading(true);
    setError(null);
    setResultNow(null);
    setResultLater(null);
    try {
      const payload = {
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: destination.lat, lng: destination.lng },
        vehicle: {
          consumption_kml: selectedVehicle.consumption_kml,
          fuel_type: selectedVehicle.fuel_type,
        },
        roundTrip,
      };
      const now = new Date();
      const later = new Date(now.getTime() + 60 * 60 * 1000);
      const [{ data: dNow, error: eNow }, latRes] = await Promise.all([
        supabase.functions.invoke("trip-calculator", {
          body: { ...payload, departAt: now.toISOString() },
        }),
        departLater
          ? supabase.functions.invoke("trip-calculator", {
              body: { ...payload, departAt: later.toISOString() },
            })
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (eNow) throw eNow;
      setResultNow(dNow as TripResponse);
      if (departLater && !latRes.error) setResultLater(latRes.data as TripResponse);
      // Log route search for free-plan monthly counter
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("route_search_logs").insert({ user_id: user.id });
          refetchUsage();
        }
      } catch { /* non-blocking */ }
    } catch (err: any) {
      setError(err?.message ?? "Error al calcular el viaje");
    } finally {
      setLoading(false);
    }
  };

  const shareTrip = async (route: RouteSummary) => {
    const oLabel = origin?.label ?? "origen";
    const dLabel = destination?.label ?? "destino";
    const text = `Mi viaje de ${oLabel} a ${dLabel} costará ${formatPrice(route.fuel_cost)} en bencina + ${formatPrice(route.tag_cost)} en TAG (total ${formatPrice(route.total_cost)}). Calculado con TÜcom.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Costo de viaje · TÜcom", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("Resumen copiado al portapapeles");
    } catch {
      /* user cancelled */
    }
  };

  const cheapestRoute = resultNow?.routes.reduce(
    (best, r) => (!best || r.total_cost < best.total_cost ? r : best),
    null as RouteSummary | null,
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <Helmet>
        <title>Calculadora de costo de viaje | TÜcom</title>
        <meta name="description" content="Calcula el costo de bencina y TAG de tu viaje en Chile. Compara rutas alternativas y encuentra la estación más barata en el camino." />
        <link rel="canonical" href="https://tucombustible.lovable.app/calculadora" />
      </Helmet>

      <header className="bg-gradient-primary px-4 pt-[env(safe-area-inset-top)] sticky top-0 z-40 shadow-elegant">
        <div className="flex items-center gap-3 py-3 max-w-3xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white/15 text-white hover:bg-white/25"
            aria-label="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-heading font-extrabold text-white text-lg">Calculadora de viaje</h1>
            <p className="text-xs text-white/80">Bencina + TAG · Rutas alternativas</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {/* Inputs */}
        <section className="bg-card border border-border rounded-2xl shadow-soft p-4 space-y-3">
          <div>
            <Label className="text-xs">Origen</Label>
            <div className="mt-1">
              <PlacesAutocomplete
                placeholder="¿Desde dónde sales?"
                initialValue={origin?.label ?? ""}
                onSelect={(p) => setOrigin(p)}
              />
            </div>
            {origin?.label === "Mi ubicación" && (
              <p className="text-[11px] text-muted-foreground mt-1">Usando tu ubicación actual.</p>
            )}
          </div>
          <div>
            <Label className="text-xs">Destino</Label>
            <div className="mt-1">
              <PlacesAutocomplete
                placeholder="¿A dónde vas?"
                onSelect={(p) => setDestination(p)}
                bias={origin ?? undefined}
              />
            </div>
          </div>

          {/* Vehicle */}
          <div>
            <Label className="text-xs">Vehículo</Label>
            <div className="mt-1 flex gap-2">
              {vehiclesLoading ? (
                <Skeleton className="h-11 flex-1 rounded-xl" />
              ) : vehicles.length === 0 ? (
                <Button
                  variant="outline"
                  onClick={() => setShowDialog(true)}
                  className="flex-1 h-11 rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> Agregar vehículo
                </Button>
              ) : (
                <>
                  <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                    <SelectTrigger className="flex-1 h-11 rounded-xl">
                      <SelectValue placeholder="Elige un vehículo" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: v.color }} />
                            {v.nickname ? `${v.nickname} · ` : ""}{v.brand} {v.model}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowDialog(true)}
                    className="h-11 w-11 rounded-xl"
                    aria-label="Agregar otro vehículo"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </>
              )}
            </div>
            {selectedVehicle && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {selectedVehicle.consumption_kml} km/L · estanque {selectedVehicle.tank_size_l} L
              </p>
            )}
          </div>

          {/* Toggles */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Repeat className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm text-foreground">Ida y vuelta</span>
            </div>
            <Switch checked={roundTrip} onCheckedChange={setRoundTrip} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm text-foreground">Comparar: ahora vs en 1 hora</span>
            </div>
            <Switch checked={departLater} onCheckedChange={setDepartLater} />
          </div>

          <Button
            onClick={handleCalculate}
            disabled={loading || !origin || !destination || !selectedVehicle}
            className="w-full h-12 rounded-xl bg-gradient-primary text-white font-semibold"
          >
            {loading ? "Calculando..." : "Calcular costo del viaje"}
          </Button>
        </section>

        {error && (
          <div className="rounded-xl bg-destructive/10 text-destructive p-3 text-sm">{error}</div>
        )}

        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        )}

        {/* Results */}
        {resultNow?.routes.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No se encontraron rutas para este viaje.
          </p>
        )}

        {resultNow?.routes.map((r, i) => {
          const isCheapest = r.total_cost === cheapestRoute?.total_cost;
          const laterRoute = resultLater?.routes[i];
          const diff = laterRoute ? laterRoute.total_cost - r.total_cost : 0;
          return (
            <article
              key={r.index}
              className={`bg-card border rounded-2xl shadow-soft p-4 space-y-3 ${isCheapest ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
              aria-label={`Ruta ${i + 1}`}
            >
              <header className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-heading font-bold text-foreground">
                      Ruta {i + 1}
                    </h2>
                    {isCheapest && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                        <Sparkles className="w-3 h-3" aria-hidden="true" /> Más barata
                      </span>
                    )}
                  </div>
                  {r.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistance(r.distance_km)} · {r.duration_min} min ·{" "}
                    <span className="font-medium">{bandLabel[r.tariff_band]}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">Total estimado</p>
                  <p className="font-heading font-extrabold text-2xl text-foreground" aria-live="polite">
                    {formatPrice(r.total_cost)}
                  </p>
                </div>
              </header>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-muted/30 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Fuel className="w-3.5 h-3.5" aria-hidden="true" /> Bencina
                  </div>
                  <div className="font-heading font-bold text-foreground">{formatPrice(r.fuel_cost)}</div>
                  <div className="text-[11px] text-muted-foreground">{r.liters} L</div>
                </div>
                <div className="rounded-xl bg-muted/30 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Zap className="w-3.5 h-3.5" aria-hidden="true" /> TAG
                  </div>
                  <div className="font-heading font-bold text-foreground">{formatPrice(r.tag_cost)}</div>
                  <div className="text-[11px] text-muted-foreground">{r.porticos.length} pórticos</div>
                </div>
              </div>

              {laterRoute && (
                <p className="text-xs text-muted-foreground rounded-lg bg-muted/30 px-3 py-2">
                  Salir en 1 h: <strong>{formatPrice(laterRoute.total_cost)}</strong>{" "}
                  ({diff === 0 ? "igual" : diff > 0 ? `+${formatPrice(diff)} más caro` : `${formatPrice(-diff)} más barato`}).
                </p>
              )}

              {r.cheapest_station && (
                <button
                  onClick={() => navigate(`/station/${r.cheapest_station!.id}`)}
                  className="w-full text-left rounded-xl border border-border px-3 py-2.5 hover:bg-accent transition-colors"
                >
                  <p className="text-[11px] text-muted-foreground">Estación más barata en la ruta</p>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {r.cheapest_station.brand} · {r.cheapest_station.name}
                  </p>
                  <p className="text-xs text-primary font-bold">
                    {formatPrice(r.cheapest_station.price)} /L
                  </p>
                </button>
              )}

              {r.porticos.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Ver {r.porticos.length} pórticos TAG
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {r.porticos.map((p) => (
                      <li key={p.portico_id} className="flex justify-between gap-2">
                        <span className="text-foreground truncate">{p.autopista} · {p.name ?? p.portico_id}</span>
                        <span className="font-medium text-foreground tabular-nums">{formatPrice(p.tarifa)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              <Button
                onClick={() => shareTrip(r)}
                variant="outline"
                className="w-full rounded-xl"
              >
                <Share2 className="w-4 h-4 mr-2" aria-hidden="true" /> Compartir
              </Button>
            </article>
          );
        })}
      </main>

      <VehicleDialog open={showDialog} onOpenChange={setShowDialog} />
      <PaywallModal
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        reason={`Usaste tus ${limits.routeSearchesPerMonth} cálculos de ruta del mes en el plan Básico. Hazte Pro para cálculos ilimitados.`}
      />
    </div>
  );
};

export default CalculadoraRutas;
