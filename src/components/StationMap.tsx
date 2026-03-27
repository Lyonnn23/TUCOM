import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GasStation } from "@/data/fuelData";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const stationIcon = new L.Icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const userIcon = new L.DivIcon({
  html: `<div style="width:16px;height:16px;background:hsl(215,80%,55%);border:3px solid white;border-radius:50%;box-shadow:0 0 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  className: "",
});

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 13);
  }, [lat, lng, map]);
  return null;
}

interface StationMapProps {
  stations: GasStation[];
  userLocation: { lat: number; lng: number } | null;
  onStationClick?: (station: GasStation) => void;
}

const StationMap = ({ stations, userLocation, onStationClick }: StationMapProps) => {
  const center = userLocation || { lat: -33.4489, lng: -70.6693 }; // Santiago default

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      className="w-full h-full rounded-xl overflow-hidden"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {userLocation && (
        <>
          <RecenterMap lat={userLocation.lat} lng={userLocation.lng} />
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>Tu ubicación</Popup>
          </Marker>
        </>
      )}
      {stations.map((station) => (
        <Marker
          key={station.id}
          position={[station.lat, station.lng]}
          icon={stationIcon}
          eventHandlers={{
            click: () => onStationClick?.(station),
          }}
        >
          <Popup>
            <div className="font-body text-sm">
              <strong>{station.name}</strong>
              <br />
              93: ${station.prices.gasoline93} · 95: ${station.prices.gasoline95}
              <br />
              {station.isOpen ? "🟢 Abierta" : "🔴 Cerrada"}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default StationMap;
