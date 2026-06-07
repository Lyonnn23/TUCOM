import { APIProvider, Map, Marker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { LocateFixed } from "lucide-react";
import { memo, useState, useEffect, useMemo } from "react";

// Cap visible markers to keep map render time bounded on low-end devices.
const MAX_VISIBLE_PINS = 50;
import { supabase } from "@/integrations/supabase/client";
import type { GasStation } from "@/hooks/useGasStations";
import { brandColor, brandInitials } from "@/lib/brandColors";
import MapLegend from "@/components/MapLegend";

interface StationMapProps {
  stations: GasStation[];
  userLocation: { lat: number; lng: number } | null;
  onStationClick?: (station: GasStation) => void;
  routePath?: { lat: number; lng: number }[];
  highlightStationId?: string;
}


const StationMap = ({ stations, userLocation, onStationClick }: StationMapProps) => {
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
  void nearbyIds; // currently used only for future highlighting; kept for backward compat

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
            const color = brandColor(station.brand);
            const initials = brandInitials(station.brand);
            return (
              <Marker
                key={station.id}
                position={{ lat: station.lat, lng: station.lng }}
                onClick={() => setSelected(station)}
                title={`${station.brand} · ${station.name}`}
                label={{ text: initials, color: "#fff", fontSize: "11px", fontWeight: "700" }}
                icon={getMarkerIcon(color, 16)}
                animation={(globalThis as any).google?.maps?.Animation?.DROP}
              />
            );
          })}

          {selected && (
            <InfoWindow
              position={{ lat: selected.lat, lng: selected.lng }}
              onCloseClick={() => setSelected(null)}
            >
              <div className="p-1 min-w-[160px]">
                <h3 className="font-bold text-sm">{selected.name}</h3>
                <p className="text-xs text-gray-500">{selected.brand}</p>
                <p className="text-xs mt-1">{selected.address}</p>
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
                  Ir con Waze
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

export default memo(StationMap);
