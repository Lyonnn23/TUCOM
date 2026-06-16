import { APIProvider, Map, Marker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { LocateFixed } from "lucide-react";
import { memo, useState, useEffect, useMemo } from "react";

// Cap visible markers to keep map render time bounded on low-end devices.
const MAX_VISIBLE_PINS = 50;
import { supabase } from "@/integrations/supabase/client";
import type { GasStation } from "@/hooks/useGasStations";

import MapLegend from "@/components/MapLegend";

interface StationMapProps {
  stations: GasStation[];
  userLocation: { lat: number; lng: number } | null;
  onStationClick?: (station: GasStation) => void;
  routePath?: { lat: number; lng: number }[];
  highlightStationId?: string;
  selectedFuel?: "all" | "gasoline93" | "gasoline95" | "gasoline97" | "diesel" | "electric";
}


const StationMap = ({ stations, userLocation, onStationClick, routePath, highlightStationId, selectedFuel }: StationMapProps) => {
  const [selected, setSelected] = useState<GasStation | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const center = userLocation || { lat: -33.45, lng: -70.65 };

  // Sort by distance (if available) and cap to MAX_VISIBLE_PINS to keep
  // marker rendering smooth on low-end devices regardless of zoom.
  const visibleStations = useMemo(() => {
    const sorted = [...stations].sort(
      (a: any, b: any) => (a.distance ?? Infinity) - (b.distance ?? Infinity),
    );
    return sorted.slice(0, MAX_VISIBLE_PINS);
  }, [stations]);

  // Unique brands present in the visible station set — drives the legend.
  const visibleBrands = useMemo(
    () => Array.from(new Set(visibleStations.map((s) => (s.brand ?? "").toUpperCase()).filter(Boolean))),
    [visibleStations],
  );

  // IDs of the 5 closest stations to the user (within 10 km)
  const nearbyIds = useMemo(() => {
    if (!userLocation) return new Set<string>();
    const withDist = stations
      .map((s) => ({ id: s.id, d: (s as any).distance ?? Infinity }))
      .filter((s) => s.d <= 10)
      .sort((a, b) => a.d - b.d)
      .slice(0, 5);
    return new Set(withDist.map((s) => s.id));
  }, [stations, userLocation]);
  

  useEffect(() => {
    supabase.functions
      .invoke("get-maps-key")
      .then(({ data, error }) => {
        if (!error && data?.key) setApiKey(data.key);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-muted rounded-2xl">
        <p className="text-sm text-muted-foreground">Cargando mapa...</p>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="h-full flex items-center justify-center bg-muted rounded-2xl px-4">
        <div className="text-center max-w-xs">
          <p className="text-sm font-semibold text-foreground">
            El mapa no está disponible.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Verifica tu conexión a internet e intenta nuevamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div
        className="relative w-full h-full"
        style={{ willChange: "transform", WebkitOverflowScrolling: "touch" }}
      >
        <Map
          defaultCenter={center}
          defaultZoom={13}
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ width: "100%", height: "100%" }}
        >
          {userLocation && (
            <Marker
              position={userLocation}
              title="Tu ubicación"
              icon={getMarkerIcon("hsl(var(--primary))", 10)}
            />
          )}

          {visibleStations.map((station) => {
            const isCheapest = highlightStationId === station.id;
            const isNearest = nearbyIds.has(station.id);
            // Status color: nearest = blue, open = green, closed = red.
            // Cheapest overrides with gold star (highest visual priority).
            const isOpen = (station as any).is_open !== false;
            const statusColor = isNearest ? "#3b82f6" : isOpen ? "#22c55e" : "#ef4444";
            const fuelPrice =
              selectedFuel && selectedFuel !== "all"
                ? (station.prices as any)[selectedFuel] ?? 0
                : 0;
            const priceLabel = fuelPrice > 0 ? `$${Math.round(fuelPrice)}` : "";
            const showPrice = !isCheapest && priceLabel !== "";
            return (
              <Marker
                key={station.id}
                position={{ lat: station.lat, lng: station.lng }}
                onClick={() => setSelected(station)}
                title={`${station.brand} · ${station.name}${isCheapest ? " · La más barata" : isNearest ? " · Cercana" : isOpen ? " · Abierta" : " · Cerrada"}${priceLabel ? ` · ${priceLabel}` : ""}`}
                label={
                  isCheapest
                    ? { text: "★", color: "#1a1a1a", fontSize: "16px", fontWeight: "900" }
                    : showPrice
                      ? { text: priceLabel, color: "#fff", fontSize: "10px", fontWeight: "800" }
                      : undefined
                }
                icon={getMarkerIcon(isCheapest ? "#F5B301" : statusColor, isCheapest ? 20 : isNearest ? 18 : showPrice ? 18 : 14)}
                zIndex={isCheapest ? 999 : isNearest ? 500 : undefined}
                animation={(globalThis as any).google?.maps?.Animation?.DROP}
              />
            );
          })}


          {routePath && routePath.length > 1 && <RoutePolyline path={routePath} />}


          {selected && (
            <InfoWindow
              position={{ lat: selected.lat, lng: selected.lng }}
              onCloseClick={() => setSelected(null)}
            >
              <div className="p-1 min-w-[180px]">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm">{selected.name}</h3>
                  {highlightStationId === selected.id && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#F5B301] text-[#1a1a1a] whitespace-nowrap">
                      ★ Más barata
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{selected.brand}</p>
                <p className="text-xs mt-1">{selected.address}</p>
                {selectedFuel && selectedFuel !== "all" && (selected.prices as any)[selectedFuel] > 0 && (
                  <p className="text-xs font-semibold mt-1" style={{ color: "#7C3AED" }}>
                    ${Math.round((selected.prices as any)[selectedFuel])}/L
                  </p>
                )}
                {selected.distance !== undefined && (
                  <p className="text-xs font-medium mt-1" style={{ color: "#7C3AED" }}>
                    {selected.distance} km
                  </p>
                )}
                <button
                  onClick={() => onStationClick?.(selected)}
                  className="mt-2 w-full text-xs py-1.5 rounded-md font-semibold"
                  style={{ background: "#7C3AED", color: "#fff" }}
                >
                  Cómo llegar
                </button>
              </div>
            </InfoWindow>
          )}
        </Map>
        {userLocation && <CenterOnMeButton location={userLocation} />}
        <MapLegend visibleBrands={visibleBrands} />
      </div>
    </APIProvider>
  );
};

function getMarkerIcon(color: string, scale: number) {
  const maps = (globalThis as any).google?.maps;
  if (!maps?.SymbolPath) return undefined;
  return {
    path: maps.SymbolPath.CIRCLE,
    scale,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#fff",
    strokeWeight: 2,
  };
}

const CenterOnMeButton = ({ location }: { location: { lat: number; lng: number } }) => {
  const map = useMap();
  if (!map) return null;
  return (
    <button
      onClick={() => {
        map.panTo(location);
        map.setZoom(15);
      }}
      className="absolute bottom-4 right-4 z-10 w-12 h-12 rounded-full bg-card border border-border shadow-elegant flex items-center justify-center press-scale hover:shadow-glow transition-all"
      aria-label="Centrar en mi ubicación"
      title="Centrar en mi ubicación"
    >
      <LocateFixed className="w-5 h-5 text-primary" />
    </button>
  );
};

const RoutePolyline = ({ path }: { path: { lat: number; lng: number }[] }) => {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const maps = (globalThis as any).google?.maps;
    if (!maps?.Polyline) return;
    const polyline = new maps.Polyline({
      path,
      geodesic: true,
      strokeColor: "#2563eb",
      strokeOpacity: 0.9,
      strokeWeight: 5,
      map,
    });
    try {
      const bounds = new maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 60);
    } catch {}
    return () => polyline.setMap(null);
  }, [map, path]);
  return null;
};

export default memo(StationMap);
