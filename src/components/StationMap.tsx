import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GasStation } from "@/hooks/useGasStations";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface StationMapProps {
  stations: GasStation[];
  userLocation: { lat: number; lng: number } | null;
  onStationClick?: (station: GasStation) => void;
}

const StationMap = ({ stations, userLocation, onStationClick }: StationMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const center = userLocation || { lat: -33.4489, lng: -70.6693 };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: 13,
      zoomControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    // User location marker
    if (userLocation) {
      const userIcon = L.divIcon({
        html: `<div style="width:16px;height:16px;background:hsl(215,80%,55%);border:3px solid white;border-radius:50%;box-shadow:0 0 8px rgba(0,0,0,0.3);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
        className: "",
      });

      L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup("Tu ubicación");

      map.setView([userLocation.lat, userLocation.lng], 13);
    }

    // Station markers
    stations.forEach((station) => {
      const marker = L.marker([station.lat, station.lng])
        .addTo(map)
        .bindPopup(
          `<div style="font-size:13px;">
            <strong>${station.name}</strong><br/>
            93: $${station.prices.gasoline93} · 95: $${station.prices.gasoline95}<br/>
            ${station.isOpen ? "🟢 Abierta" : "🔴 Cerrada"}
          </div>`
        );

      marker.on("click", () => onStationClick?.(station));
    });
  }, [stations, userLocation, onStationClick]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
};

export default StationMap;
