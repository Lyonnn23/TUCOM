import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from "@vis.gl/react-google-maps";
import { useState } from "react";
import type { GasStation } from "@/hooks/useGasStations";

interface StationMapProps {
  stations: GasStation[];
  userLocation: { lat: number; lng: number } | null;
  onStationClick?: (station: GasStation) => void;
}

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

const StationMap = ({ stations, userLocation, onStationClick }: StationMapProps) => {
  const [selected, setSelected] = useState<GasStation | null>(null);

  const center = userLocation || { lat: -33.45, lng: -70.65 };

  if (!GOOGLE_MAPS_KEY) {
    return (
      <div className="h-full flex items-center justify-center bg-muted rounded-2xl">
        <p className="text-sm text-muted-foreground text-center px-4">
          Configurando Google Maps...
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_KEY}>
      <Map
        defaultCenter={center}
        defaultZoom={13}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapId="tucom-map"
        style={{ width: "100%", height: "100%" }}
      >
        {/* User location */}
        {userLocation && (
          <AdvancedMarker position={userLocation}>
            <div className="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg animate-pulse" />
          </AdvancedMarker>
        )}

        {/* Station markers */}
        {stations.map((station) => (
          <AdvancedMarker
            key={station.id}
            position={{ lat: station.lat, lng: station.lng }}
            onClick={() => setSelected(station)}
          >
            <Pin
              background={station.isOpen ? "#22c55e" : "#ef4444"}
              borderColor={station.isOpen ? "#16a34a" : "#dc2626"}
              glyphColor="#fff"
            />
          </AdvancedMarker>
        ))}

        {/* Info window */}
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
                <p className="text-xs text-blue-600 font-medium mt-1">{selected.distance} km</p>
              )}
              <button
                onClick={() => onStationClick?.(selected)}
                className="mt-2 w-full bg-blue-600 text-white text-xs py-1.5 rounded-md font-medium hover:bg-blue-700"
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
