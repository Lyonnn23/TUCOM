import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, BatteryCharging, Plug, Sparkles, Zap, Fuel, Navigation } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, formatDistance } from "@/lib/format";
import { EV_PRESETS } from "@/lib/evPresets";
import { toast } from "sonner";

interface LatLng { lat: number; lng: number; label?: string; }

interface RouteSummary {
  index: number;
  description: string | null;
  distance_km: number;
  duration_min: number;
  kwh: number;
  fuel_cost: number;
  tag_cost: number;
  total_cost: number;
  equivalent_ice_cost: number | null;
  cheapest_station: { id: string; name: string; brand: string; price: number; ev_power_kw?: number | null; ev_operator?: string | null } | null;
}

const CalculadoraEV = () => {
  const navigate = useNavigate();
  const { vehicles, primary } = useUserVehicles();
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [roundTrip, setRoundTrip] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const evVehicles = useMemo(() => vehicles.filter((v) => v.fuel_type === "electric"), [vehicles]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [presetKey, setPresetKey] = useState<string>("0");

  useEffect(() => {
    if (!selectedId && evVehicles.length > 0) {
      const def = evVehicles.find((v) => v.is_primary) ?? evVehicles[0];
      setSelectedId(def.id);
    }
  }, [evVehicles, selectedId]);

  const myVehicle = evVehicles.find((v) => v.id === selectedId);
  const preset = EV_PRESETS[Number(presetKey)] ?? EV_PRESETS[0];

  const battery = myVehicle?.tank_size_l ?? preset.battery_kwh;
  const efficiency = myVehicle?.consumption_kml ?? preset.efficiency_kmkwh;
  const range = myVehicle ? Math.round(battery * efficiency) : preset.max_range_km;

  const [result, setResult] = useState<{ routes: RouteSummary[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (origin || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "Mi ubicación" }),
      () => {},
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 5 * 60 * 1000 },
    );
  }, [origin]);

  const handleCalculate = async () => {
    if (!origin || !destination) { toast.error("Indica origen y destino"); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("trip-calculator", {
        body: {
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          vehicle: { consumption_kml: efficiency, fuel_type: "electric" },
          roundTrip,
          departAt: new Date().toISOString(),
        },
      });
      if (error) throw error;
      setResult(data as any);
    } catch (err: any) {
      setError(err?.message ?? "Error al calcular el viaje");
    } finally {
      setLoading(false);
    }
  };

  const cheapest = result?.routes.reduce<RouteSummary | null>((a, b) => (a && a.total_cost < b.total_cost ? a : b), null) ?? null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <Helmet>
        <title>Calculadora de viaje eléctrico | TÜcom</title>
        <meta name="description" content="Calcula el costo en kWh y CLP de tu viaje en auto eléctrico en Chile. Compara contra bencina." />
      </Helmet>

      <header className="bg-gradient-primary px-4 pt-[env(safe-area-inset-top)] sticky top-0 z-30 shadow-soft">
        <div className="flex items-center gap-2 py-3 max-w-3xl mx-auto">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl text-white/90 hover:bg-white/15" aria-label="Volver">
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <h1 className="font-heading font-extrabold text-white text-lg leading-tight">Viaje eléctrico</h1>
            <p className="text-[11px] text-white/80">Estima energía y costo de carga</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        <section className="bg-card border border-border rounded-2xl shadow-soft p-4 space-y-3">
          <div>
            <Label className="text-xs">Origen</Label>
            <PlacesAutocomplete placeholder="¿Desde dónde sales?" initialValue={origin?.label ?? ""} onSelect={setOrigin} />
          </div>
          <div>
            <Label className="text-xs">Destino</Label>
            <PlacesAutocomplete placeholder="¿A dónde vas?" onSelect={setDestination} bias={origin ?? undefined} />
          </div>

          <div>
            <Label className="text-xs">Auto eléctrico</Label>
            {evVehicles.length > 0 ? (
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="mt-1 h-11"><SelectValue placeholder="Elige tu auto" /></SelectTrigger>
                <SelectContent>
                  {evVehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      ⚡ {v.nickname ? `${v.nickname} · ` : ""}{v.brand} {v.model} · {v.consumption_kml} km/kWh
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={presetKey} onValueChange={setPresetKey}>
                <SelectTrigger className="mt-1 h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EV_PRESETS.map((p, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {p.brand} {p.model} · {p.battery_kwh} kWh · {p.efficiency_kmkwh} km/kWh
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-[11px] text-muted-foreground mt-1.5 inline-flex items-center gap-1">
              <BatteryCharging className="w-3 h-3" aria-hidden="true" />
              {battery} kWh · {efficiency} km/kWh · autonomía ~{range} km
            </p>
            {evVehicles.length === 0 && (
              <button onClick={() => setShowDialog(true)} className="text-[11px] text-primary font-semibold mt-1 underline">
                + Guardar mi auto eléctrico
              </button>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2.5">
            <span className="text-sm text-foreground">Ida y vuelta</span>
            <Switch checked={roundTrip} onCheckedChange={setRoundTrip} />
          </div>

          <Button
            onClick={handleCalculate}
            disabled={loading || !origin || !destination}
            className="w-full h-12 rounded-xl bg-gradient-primary text-white font-semibold"
          >
            {loading ? "Calculando..." : "Calcular viaje EV"}
          </Button>
        </section>

        {error && <div className="rounded-xl bg-destructive/10 text-destructive p-3 text-sm">{error}</div>}

        {loading && <Skeleton className="h-40 rounded-2xl" />}

        {result?.routes.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground text-center py-6">No se encontraron rutas.</p>
        )}

        {result?.routes.map((r, i) => {
          const isCheap = cheapest && r.total_cost === cheapest.total_cost;
          const savings = r.equivalent_ice_cost ? r.equivalent_ice_cost - r.total_cost : 0;
          return (
            <article
              key={r.index}
              className={`bg-card border rounded-2xl shadow-soft p-4 space-y-3 ${isCheap ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
            >
              <header className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-heading font-bold text-foreground">Ruta {i + 1}</h2>
                    {isCheap && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                        <Sparkles className="w-3 h-3" aria-hidden="true" /> Más barata
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDistance(r.distance_km)} · {r.duration_min} min</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">Total</p>
                  <p className="font-heading font-extrabold text-2xl text-foreground" aria-live="polite">
                    {formatPrice(r.total_cost)}
                  </p>
                </div>
              </header>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-muted/30 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Zap className="w-3.5 h-3.5" aria-hidden="true" /> Energía
                  </div>
                  <div className="font-heading font-bold text-foreground">{r.kwh} kWh</div>
                  <div className="text-[11px] text-muted-foreground">{formatPrice(r.fuel_cost)}</div>
                </div>
                <div className="rounded-xl bg-muted/30 px-3 py-2.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Plug className="w-3.5 h-3.5" aria-hidden="true" /> TAG
                  </div>
                  <div className="font-heading font-bold text-foreground">{formatPrice(r.tag_cost)}</div>
                </div>
              </div>

              {r.equivalent_ice_cost !== null && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 text-sm">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                    <Fuel className="w-4 h-4" aria-hidden="true" /> Comparación con gasolina
                  </div>
                  <p className="text-foreground mt-1">
                    En bencina costaría <strong>{formatPrice(r.equivalent_ice_cost)}</strong>.
                    {savings > 0 && (
                      <> En tu EV cuesta <strong>{formatPrice(r.total_cost)}</strong> · ahorras <strong className="text-emerald-600 dark:text-emerald-400">{formatPrice(savings)}</strong>.</>
                    )}
                  </p>
                </div>
              )}

              {r.cheapest_station && (
                <button
                  onClick={() => navigate(`/station/${r.cheapest_station!.id}`)}
                  className="w-full text-left rounded-xl border border-border px-3 py-2.5 hover:bg-accent transition-colors"
                >
                  <p className="text-[11px] text-muted-foreground">Carga más barata en la ruta</p>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {r.cheapest_station.ev_operator ?? r.cheapest_station.brand} · {r.cheapest_station.name}
                  </p>
                  <p className="text-xs text-primary font-bold">
                    {formatPrice(r.cheapest_station.price)}/kWh
                    {r.cheapest_station.ev_power_kw ? ` · ${r.cheapest_station.ev_power_kw} kW` : ""}
                  </p>
                </button>
              )}
            </article>
          );
        })}

        <button
          onClick={() => navigate("/calculadora")}
          className="w-full text-xs text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5 py-2"
        >
          <Navigation className="w-3.5 h-3.5" aria-hidden="true" /> ¿Auto a combustión? Usa la calculadora normal
        </button>
      </main>

      <VehicleDialog open={showDialog} onOpenChange={setShowDialog} />
    </div>
  );
};

export default CalculadoraEV;
