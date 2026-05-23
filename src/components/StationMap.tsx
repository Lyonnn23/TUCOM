import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { LocateFixed } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GasStation } from "@/hooks/useGasStations";
import { brandColor, brandInitials } from "@/lib/brandColors";
import MapLegend from "@/components/MapLegend";

interface StationMapProps {
  stations: GasStation[];
  userLocation: { lat: number; lng: number } | null;
  onStationClick?: (station: GasStation) => void;
}

const StationMap = ({ stations, userLocation, onStationClick }: StationMapProps) => {
  const [selected, setSelected] = useState<GasStation | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const center = userLocation || { lat: -33.45, lng: -70.65 };

  // IDs of the 5 closest stations to the user (within 15 km) — highlighted in cyan
  const nearbyIds = (() => {
    if (!userLocation) return new Set<string>();
    const withDist = stations
      .map((s) => ({ id: s.id, d: (s as any).distance ?? Infinity }))
      .filter((s) => s.d <= 15)
      .sort((a, b) => a.d - b.d)
      .slice(0, 5);
    return new Set(withDist.map((s) => s.id));
  })();

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
      <div className="h-full flex items-center justify-center bg-muted rounded-2xl">
        <p className="text-sm text-muted-foreground text-center px-4">
          No se pudo cargar Google Maps. Verifica la configuración.
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="relative w-full h-full">
        <Map
          defaultCenter={center}
          defaultZoom={13}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapId="tucom-map"
          style={{ width: "100%", height: "100%" }}
        >
          {userLocation && (
            <AdvancedMarker position={userLocation}>
              <div className="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg animate-pulse" />
            </AdvancedMarker>
          )}

          {stations.map((station) => {
            const color = brandColor(station.brand);
            const initials = brandInitials(station.brand);
            return (
              <AdvancedMarker
                key={station.id}
                position={{ lat: station.lat, lng: station.lng }}
                onClick={() => setSelected(station)}
              >
                <div
                  aria-label={`${station.brand} ${station.name}`}
                  className="grid place-items-center rounded-full shadow-md"
                  style={{
                    width: 32,
                    height: 32,
                    backgroundColor: color,
                    border: "2px solid #fff",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.3,
                  }}
                >
                  {initials}
                </div>
              </AdvancedMarker>
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

export default StationMap;
