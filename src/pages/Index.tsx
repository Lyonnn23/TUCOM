import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Fuel, MapPin, RefreshCw, Zap, LogIn, LogOut, User, Download, ArrowUpDown, Radar } from "lucide-react";
import { Input } from "@/components/ui/input";
import FuelPriceCard from "@/components/FuelPriceCard";
import StationCard from "@/components/StationCard";
import StationMap from "@/components/StationMap";
import BenefitsTab from "@/components/BenefitsTab";
import BottomNav, { type TabType } from "@/components/BottomNav";
import { useFuelPrices } from "@/hooks/useFuelPrices";
import { useGasStations, calculateDistance, type GasStation } from "@/hooks/useGasStations";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("prices");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortByFuel, setSortByFuel] = useState<string>("distance");
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [mapFuelFilter, setMapFuelFilter] = useState<string>("all");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const { data: fuelPrices, isLoading: pricesLoading, refetch: refetchPrices } = useFuelPrices();
  const { data: stations, isLoading: stationsLoading, refetch: refetchStations } = useGasStations();

  const handleSyncStations = async () => {
    if (!userLocation) {
      toast.error("Activa tu ubicación para buscar estaciones cercanas");
      return;
    }
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-stations", {
        body: { lat: userLocation.lat, lng: userLocation.lng },
      });
      if (error) throw error;
      toast.success(`Se encontraron ${data?.found ?? 0} estaciones`);
      refetchStations();
    } catch (err: any) {
      toast.error("Error al sincronizar estaciones");
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocationError(true)
      );
    }
  }, []);

  const availableBrands = useMemo(() => {
    const brands = new Set((stations ?? []).map((s) => s.brand));
    return Array.from(brands).sort();
  }, [stations]);

  const stationsWithDistance = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return (stations ?? [])
      .map((s) => ({
        ...s,
        distance: userLocation
          ? calculateDistance(userLocation.lat, userLocation.lng, s.lat, s.lng)
          : undefined,
      }))
      .filter((s) => radiusKm === null || (s.distance !== undefined && s.distance <= radiusKm))
      .filter((s) => selectedBrand === "all" || s.brand === selectedBrand)
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.brand.toLowerCase().includes(q) || s.address.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sortByFuel !== "distance") {
          const fuelKey = sortByFuel as keyof typeof a.prices;
          const priceA = a.prices[fuelKey] || 99999;
          const priceB = b.prices[fuelKey] || 99999;
          if (priceA !== priceB) return priceA - priceB;
        }
        return (a.distance ?? 999) - (b.distance ?? 999);
      });
  }, [stations, userLocation, searchQuery, selectedBrand, sortByFuel, radiusKm]);

  const mapStations = useMemo(() => {
    return stationsWithDistance.filter((s) => {
      if (mapFuelFilter === "all") return true;
      const fuelKey = mapFuelFilter as keyof typeof s.prices;
      return (s.prices[fuelKey] ?? 0) > 0;
    });
  }, [stationsWithDistance, mapFuelFilter]);
    const wazeUrl = `https://waze.com/ul?ll=${station.lat},${station.lng}&navigate=yes`;
    window.open(wazeUrl, "_blank");
  };

  const handleNavigateGoogle = (station: GasStation) => {
    const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
    window.open(gmapsUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-secondary px-4 pt-[env(safe-area-inset-top)] sticky top-0 z-40 shadow-lg">
        <div className="flex items-center justify-between py-3 max-w-md mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-white text-xl leading-tight tracking-tight">TÜcom</h1>
              <p className="text-[10px] text-white/70">Bencina inteligente 🇨🇱</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {userLocation && (
              <div className="flex items-center gap-1 text-xs text-white/90 bg-white/15 rounded-full px-2.5 py-1 backdrop-blur-sm">
                <MapPin className="w-3 h-3" />
                <span className="font-medium">GPS</span>
              </div>
            )}
            {user ? (
              <button
                onClick={signOut}
                className="flex items-center gap-1 text-xs text-white/90 bg-white/15 rounded-full px-2.5 py-1.5 backdrop-blur-sm hover:bg-white/25 transition-colors"
              >
                <User className="w-3 h-3" />
                <span className="font-medium max-w-[60px] truncate">{user.user_metadata?.display_name || user.email?.split("@")[0]}</span>
                <LogOut className="w-3 h-3 ml-0.5" />
              </button>
            ) : (
              <button
                onClick={() => navigate("/auth")}
                className="flex items-center gap-1 text-xs text-white bg-white/20 rounded-full px-3 py-1.5 backdrop-blur-sm hover:bg-white/30 transition-colors font-medium"
              >
                <LogIn className="w-3 h-3" />
                Entrar
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-5">
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
                className="p-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {pricesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {(fuelPrices ?? []).map((fuel) => (
                  <FuelPriceCard key={fuel.type} fuel={fuel} />
                ))}
              </div>
            )}

            <div className="bg-gradient-to-r from-fuel-amber/15 to-fuel-pink/10 rounded-2xl p-4 border border-fuel-amber/20">
              <h3 className="font-heading font-semibold text-foreground text-sm mb-1.5">
                💡 Consejo del día
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Los precios de la bencina suelen bajar los jueves por la noche cuando ENAP publica las nuevas tarifas semanales. ¡Planifica tu carga!
              </p>
            </div>

            {locationError && (
              <div className="bg-fuel-cyan/10 border border-fuel-cyan/25 rounded-2xl p-3">
                <p className="text-xs text-foreground">
                  📍 Activa tu ubicación para ver las estaciones más cercanas y navegar con Waze.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Map Tab */}
        {activeTab === "map" && (
          <div className="space-y-3">
            <h2 className="font-heading font-bold text-foreground text-xl">Estaciones Cercanas</h2>
            <div className="h-[calc(100vh-220px)] rounded-2xl overflow-hidden border border-border shadow-md">
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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading font-bold text-foreground text-xl">Todas las Estaciones</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stationsWithDistance.length} estaciones encontradas
                  {userLocation ? " · Ordenadas por distancia" : ""}
                </p>
              </div>
              <button
                onClick={handleSyncStations}
                disabled={syncing}
                className="p-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                title="Buscar estaciones cercanas en Google Maps"
              >
                <Download className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, marca o dirección..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-card border-border rounded-2xl text-sm"
              />
            </div>
            {availableBrands.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                <button
                  onClick={() => setSelectedBrand("all")}
                  className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                    selectedBrand === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Todas
                </button>
                {availableBrands.map((brand) => (
                  <button
                    key={brand}
                    onClick={() => setSelectedBrand(brand === selectedBrand ? "all" : brand)}
                    className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                      selectedBrand === brand
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            )}
            {/* Sort by fuel price */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                {[
                  { key: "distance", label: "Distancia" },
                  { key: "gasoline93", label: "93" },
                  { key: "gasoline95", label: "95" },
                  { key: "gasoline97", label: "97" },
                  { key: "diesel", label: "Diésel" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setSortByFuel(opt.key)}
                    className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                      sortByFuel === opt.key
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {stationsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {stationsWithDistance.map((station) => (
                  <StationCard key={station.id} station={station} onNavigate={handleNavigate} onNavigateGoogle={handleNavigateGoogle} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Benefits Tab */}
        {activeTab === "benefits" && <BenefitsTab />}
      </main>

      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  );
};

export default Index;