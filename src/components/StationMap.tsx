import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from "@vis.gl/react-google-maps";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { GasStation } from "@/hooks/useGasStations";

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

  // IDs of the 5 closest stations to the user (within 30 km) — highlighted in cyan
  const nearbyIds = (() => {
    if (!userLocation) return new Set<string>();
    const withDist = stations
      .map((s) => ({ id: s.id, d: (s as any).distance ?? Infinity }))
      .filter((s) => s.d <= 30)
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
          const isNearby = nearbyIds.has(station.id);
          const bg = isNearby ? "#06b6d4" : station.isOpen ? "#22c55e" : "#ef4444";
          const border = isNearby ? "#0891b2" : station.isOpen ? "#16a34a" : "#dc2626";
          return (
            <AdvancedMarker
              key={station.id}
              position={{ lat: station.lat, lng: station.lng }}
              onClick={() => setSelected(station)}
            >
              <Pin background={bg} borderColor={border} glyphColor="#fff" />
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
                <p className="text-xs font-medium mt-1" style={{ color: "#2563eb" }}>
                  {selected.distance} km
                </p>
              )}
              <button
                onClick={() => onStationClick?.(selected)}
                className="mt-2 w-full text-xs py-1.5 rounded-md font-medium"
                style={{ background: "#2563eb", color: "#fff" }}
              >
                Ir con Waze
              </button>
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
};

export default StationMap;
