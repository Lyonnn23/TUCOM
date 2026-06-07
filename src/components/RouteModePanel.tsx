import { useEffect, useMemo, useState } from "react";
import { Route as RouteIcon, X, LocateFixed, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { GasStation } from "@/hooks/useGasStations";
import { formatPrice } from "@/lib/format";

type LatLng = { lat: number; lng: number };

export type RouteCorridor = {
  path: LatLng[];
  corridorKm: number;
  stationIds: Set<string>;
  cheapestStationId: string | null;
  distanceKm: number;
  fuelCost: number;
  cheapestName: string | null;
};

interface Props {
  userLocation: LatLng | null;
  stations: GasStation[];
  onChange: (corridor: RouteCorridor | null) => void;
}

// Google encoded polyline decoder
function decodePolyline(str: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < str.length) {
    let b: number, shift = 0, result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;
    shift = 0; result = 0;
    do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const la1 = a.lat * Math.PI / 180;
  const la2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const RouteModePanel = ({ userLocation, stations, onChange }: Props) => {
  const [active, setActive] = useState(false);
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [originLabel, setOriginLabel] = useState("");
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [destLabel, setDestLabel] = useState("");
  const [corridorKm, setCorridorKm] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    path: LatLng[];
    distanceKm: number;
    fuelCost: number;
    cheapestStation: { id: string; name: string; price: number } | null;
  } | null>(null);

  // Default origin to user location
  useEffect(() => {
    if (active && !origin && userLocation) {
      setOrigin(userLocation);
      setOriginLabel("Mi ubicación actual");
    }
  }, [active, origin, userLocation]);

  // Recompute corridor when slider/result/stations change
  const corridor = useMemo<RouteCorridor | null>(() => {
    if (!result) return null;
    const ids = new Set<string>();
    let cheapestId: string | null = null;
    let cheapestPrice = Infinity;
    for (const s of stations) {
      for (const pt of result.path) {
        if (haversineKm(pt, { lat: s.lat, lng: s.lng }) <= corridorKm) {
          ids.add(s.id);
          const p = s.prices.gasoline95 ?? s.prices.gasoline93 ?? s.prices.diesel ?? 0;
          if (p > 0 && p < cheapestPrice) {
            cheapestPrice = p;
            cheapestId = s.id;
          }
          break;
        }
      }
    }
    return {
      path: result.path,
      corridorKm,
      stationIds: ids,
      cheapestStationId: cheapestId ?? result.cheapestStation?.id ?? null,
      distanceKm: result.distanceKm,
      fuelCost: result.fuelCost,
      cheapestName: result.cheapestStation?.name ?? null,
    };
  }, [result, corridorKm, stations]);

  useEffect(() => {
    onChange(corridor);
  }, [corridor, onChange]);

  const exit = () => {
    setActive(false);
    setResult(null);
    setOrigin(null);
    setOriginLabel("");
    setDestination(null);
    setDestLabel("");
    onChange(null);
  };

  const compute = async () => {
    if (!origin || !destination) {
      toast.error("Ingresa origen y destino");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("trip-calculator", {
        body: {
          origin,
          destination,
          vehicle: { consumption_kml: 12, fuel_type: "gasoline95" },
        },
      });
      if (error) throw error;
      const route = data?.routes?.[0];
      if (!route?.polyline) throw new Error("no_route");
      setResult({
        path: decodePolyline(route.polyline),
        distanceKm: route.distance_km ?? 0,
        fuelCost: route.fuel_cost ?? 0,
        cheapestStation: route.cheapest_station
          ? { id: route.cheapest_station.id, name: route.cheapest_station.name, price: route.cheapest_station.price }
          : null,
      });
    } catch (e) {
      console.warn("route error", e);
      toast.error("No se pudo calcular la ruta");
    } finally {
      setLoading(false);
    }
  };

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-elegant hover-scale min-h-11"
      >
        <RouteIcon className="w-4 h-4" />
        Modo Ruta
      </button>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-primary/30 bg-card p-3 space-y-3 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RouteIcon className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Modo Ruta</h3>
          </div>
          <button
            onClick={exit}
            aria-label="Salir de modo ruta"
            className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <PlacesAutocomplete
              placeholder="Origen"
              initialValue={originLabel}
              bias={userLocation ?? undefined}
              onSelect={(p) => { setOrigin({ lat: p.lat, lng: p.lng }); setOriginLabel(p.label); }}
            />
            {userLocation && (
              <button
                onClick={() => { setOrigin(userLocation); setOriginLabel("Mi ubicación actual"); }}
                className="shrink-0 h-11 w-11 rounded-xl bg-muted flex items-center justify-center text-primary"
                title="Usar mi ubicación"
              >
                <LocateFixed className="w-4 h-4" />
              </button>
            )}
          </div>
          <PlacesAutocomplete
            placeholder="Destino"
            initialValue={destLabel}
            bias={origin ?? userLocation ?? undefined}
            onSelect={(p) => { setDestination({ lat: p.lat, lng: p.lng }); setDestLabel(p.label); }}
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Distancia max de la ruta</span>
            <span className="font-semibold text-foreground tabular-nums">{corridorKm} km</span>
          </div>
          <Slider
            value={[corridorKm]}
            min={0.5}
            max={5}
            step={0.5}
            onValueChange={(v) => setCorridorKm(v[0])}
          />
        </div>

        <Button
          onClick={compute}
          disabled={loading || !origin || !destination}
          className="w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground font-semibold"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Calcular ruta"}
        </Button>
      </div>

      {corridor && (
        <div className="rounded-2xl border border-border bg-card p-3 flex items-center gap-3 animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-[#F5B301]/20 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 text-[#F5B301]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">
              {corridor.distanceKm.toFixed(1)} km · Costo estimado: {formatPrice(corridor.fuelCost)}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {corridor.cheapestName ? `con ${corridor.cheapestName}` : "Sin estación cercana en el corredor"} ·
              {" "}{corridor.stationIds.size} estaciones en el trayecto
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default RouteModePanel;
