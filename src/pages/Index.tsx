import { useState, useEffect, useMemo } from "react";
import { Search, Fuel, MapPin, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import FuelPriceCard from "@/components/FuelPriceCard";
import StationCard from "@/components/StationCard";
import StationMap from "@/components/StationMap";
import BottomNav, { type TabType } from "@/components/BottomNav";
import { useFuelPrices } from "@/hooks/useFuelPrices";
import { useGasStations, calculateDistance, type GasStation } from "@/hooks/useGasStations";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabType>("prices");
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState(false);

  const { data: fuelPrices, isLoading: pricesLoading, refetch: refetchPrices } = useFuelPrices();
  const { data: stations, isLoading: stationsLoading } = useGasStations();

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocationError(true)
      );
    }
  }, []);

  const stationsWithDistance = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return (stations ?? [])
      .map((s) => ({
        ...s,
        distance: userLocation
          ? calculateDistance(userLocation.lat, userLocation.lng, s.lat, s.lng)
          : undefined,
      }))
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.brand.toLowerCase().includes(q) || s.address.toLowerCase().includes(q))
      .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
  }, [stations, userLocation, searchQuery]);

  const handleNavigate = (station: GasStation) => {
    // Try Waze first (works on mobile), fallback to Google Maps
    const wazeUrl = `https://waze.com/ul?ll=${station.lat},${station.lng}&navigate=yes`;
    window.open(wazeUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 pt-[env(safe-area-inset-top)] sticky top-0 z-40">
        <div className="flex items-center justify-between py-3 max-w-md mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Fuel className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-foreground text-lg leading-tight">BencinApp</h1>
              <p className="text-[10px] text-muted-foreground">Precios y estaciones en Chile</p>
            </div>
          </div>
          {userLocation && (
            <div className="flex items-center gap-1 text-xs text-fuel-blue">
              <MapPin className="w-3.5 h-3.5" />
              <span className="font-medium">GPS activo</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4">
        {/* Prices Tab */}
        {activeTab === "prices" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading font-bold text-foreground text-xl">Precios Actuales</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Promedio nacional · Actualizado hoy
                </p>
              </div>
              <button
                onClick={() => refetchPrices()}
                className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {pricesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {(fuelPrices ?? []).map((fuel) => (
                  <FuelPriceCard key={fuel.type} fuel={fuel} />
                ))}
              </div>
            )}

            <div className="bg-card rounded-xl p-4 border border-border">
              <h3 className="font-heading font-semibold text-foreground text-sm mb-2">
                💡 Consejo del día
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Los precios de la bencina suelen bajar los jueves por la noche cuando ENAP publica las nuevas tarifas semanales. ¡Planifica tu carga!
              </p>
            </div>

            {locationError && (
              <div className="bg-fuel-amber/10 border border-fuel-amber/30 rounded-xl p-3">
                <p className="text-xs text-accent-foreground">
                  📍 Activa tu ubicación para ver las estaciones más cercanas y las distancias en el mapa.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Map Tab */}
        {activeTab === "map" && (
          <div className="space-y-3">
            <h2 className="font-heading font-bold text-foreground text-xl">Estaciones Cercanas</h2>
            <div className="h-[calc(100vh-220px)] rounded-xl overflow-hidden border border-border shadow-sm">
              <StationMap
                stations={stationsWithDistance}
                userLocation={userLocation}
                onStationClick={(s) => handleNavigate(s)}
              />
            </div>
          </div>
        )}

        {/* Stations List Tab */}
        {activeTab === "stations" && (
          <div className="space-y-3">
            <div>
              <h2 className="font-heading font-bold text-foreground text-xl">Todas las Estaciones</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stationsWithDistance.length} estaciones encontradas
                {userLocation ? " · Ordenadas por distancia" : ""}
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, marca o dirección..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-card border-border rounded-xl text-sm"
              />
            </div>
            {stationsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {stationsWithDistance.map((station) => (
                  <StationCard key={station.id} station={station} onNavigate={handleNavigate} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  );
};

export default Index;
