import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Fuel, MapPin, RefreshCw, Zap, LogIn, LogOut, User, Download, ArrowUpDown, Radar, BarChart3, TrendingUp, Shield } from "lucide-react";
import NearbyRanking from "@/components/NearbyRanking";
import LocationPermissionGuide from "@/components/LocationPermissionGuide";
import PushNotificationToggle from "@/components/PushNotificationToggle";
import { Input } from "@/components/ui/input";
import FuelPriceCard from "@/components/FuelPriceCard";
import StationCard from "@/components/StationCard";
import StationMap from "@/components/StationMap";
import BenefitsTab from "@/components/BenefitsTab";
import BottomNav, { type TabType } from "@/components/BottomNav";
import { useFuelPrices } from "@/hooks/useFuelPrices";
import { useGasStations, calculateDistance, type GasStation } from "@/hooks/useGasStations";
import { useLocalFuelPrices } from "@/hooks/useLocalFuelPrices";
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
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [locationErrorType, setLocationErrorType] = useState<"denied" | "unavailable" | "timeout" | "unsupported" | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { data: fuelPrices, isLoading: pricesLoading, refetch: refetchPrices } = useFuelPrices();
  const { data: stations, isLoading: stationsLoading, refetch: refetchStations } = useGasStations();
  const { prices: displayedPrices, isLocal: isLocalAvg, sampleSize } = useLocalFuelPrices({
    stations,
    userLocation,
    nationalPrices: fuelPrices,
    radiusKm: 30,
  });

  const handleSyncStations = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-stations");
      if (error) throw error;
      toast.success(`Sincronizadas ${data?.processed ?? 0} estaciones`);
      refetchStations();
    } catch (err: any) {
      toast.error("Error al sincronizar estaciones");
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const requestLocation = (silent = false) => {
    if (!("geolocation" in navigator)) {
      if (!silent) toast.error("Tu dispositivo no soporta geolocalización");
      setLocationErrorType("unsupported");
      return;
    }

    // Detect preview iframe (geolocation is blocked by permission policy in Lovable preview)
    const inIframe = (() => {
      try { return window.self !== window.top; } catch { return true; }
    })();
    if (inIframe && !silent) {
      toast.info("Vista previa: el GPS solo funciona al abrir la app fuera del editor o instalada");
    }

    if (!silent) {
      setLocationLoading(true);
      setLocationErrorType(null);
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocationErrorType(null);
        setLocationLoading(false);
        setLastLocationUpdate(Date.now());
        if (!silent) toast.success(`Ubicación activada · precisión ${Math.round(pos.coords.accuracy)} m`);
      },
      (err) => {
        console.warn("[GPS] error", err.code, err.message);
        setLocationLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationErrorType("denied");
          if (!silent) toast.error("Permiso de ubicación denegado. Actívalo en los ajustes del navegador.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setLocationErrorType("unavailable");
          if (!silent) toast.error("Servicio de ubicación no disponible");
        } else if (err.code === err.TIMEOUT) {
          setLocationErrorType("timeout");
          if (!silent) toast.error("Tiempo de espera agotado. Reintenta en un lugar con mejor señal GPS.");
        } else {
          setLocationErrorType("unavailable");
          if (!silent) toast.error("No se pudo obtener tu ubicación");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  // Initial request + silent auto-refresh every 2 min while the app is open
  useEffect(() => {
    requestLocation();
    const interval = setInterval(() => {
      // Skip silent refresh when the user denied permission or the device doesn't support it
      setLocationErrorType((current) => {
        if (current !== "denied" && current !== "unsupported") {
          requestLocation(true);
        }
        return current;
      });
    }, 120_000); // every 2 minutes
    return () => clearInterval(interval);
  }, []);


  const FEATURED_BRANDS = ["Copec", "Shell", "Aramco"];

  const availableBrands = useMemo(() => {
    const brands = new Set((stations ?? []).map((s) => s.brand));
    const all = Array.from(brands);
    const featured = FEATURED_BRANDS.filter((b) => all.includes(b));
    const rest = all.filter((b) => !FEATURED_BRANDS.includes(b)).sort();
    return [...featured, ...rest];
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
        const featuredBrands = ["Copec", "Shell", "Aramco"];
        const aFeat = featuredBrands.includes(a.brand) ? 0 : 1;
        const bFeat = featuredBrands.includes(b.brand) ? 0 : 1;
        if (aFeat !== bFeat) return aFeat - bFeat;

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
      if (mapFuelFilter === "electric") return s.hasEvCharging && (s.prices.electric ?? 0) > 0;
      const fuelKey = mapFuelFilter as keyof typeof s.prices;
      return (s.prices[fuelKey] ?? 0) > 0;
    });
  }, [stationsWithDistance, mapFuelFilter]);

  const handleNavigate = (station: GasStation) => {
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
            <button
              onClick={() => navigate("/legal")}
              className="flex items-center gap-1 text-xs text-white/80 bg-white/10 rounded-full px-2 py-1.5 backdrop-blur-sm hover:bg-white/20 transition-colors"
              title="Legal"
            >
              <Shield className="w-3 h-3" />
            </button>
            <button
              onClick={() => requestLocation(false)}
              disabled={locationLoading}
              className={`flex items-center gap-1 text-xs rounded-full px-2.5 py-1.5 backdrop-blur-sm transition-all disabled:opacity-60 ${
                userLocation
                  ? "bg-[hsl(142,70%,45%)] text-white shadow-md ring-1 ring-white/30"
                  : locationErrorType
                    ? "bg-[hsl(0,75%,55%)]/80 text-white hover:bg-[hsl(0,75%,55%)]"
                    : "bg-white/15 text-white/90 hover:bg-white/25"
              }`}
              title={
                userLocation
                  ? "GPS activo · tocar para actualizar"
                  : locationErrorType === "denied"
                    ? "Permiso denegado · revisa los ajustes del navegador"
                    : locationErrorType === "timeout"
                      ? "Tiempo agotado · reintentar"
                      : locationErrorType === "unavailable"
                        ? "Servicio no disponible · reintentar"
                        : locationErrorType === "unsupported"
                          ? "Tu dispositivo no soporta GPS"
                          : "Activar GPS"
              }
            >
              <MapPin className={`w-3 h-3 ${locationLoading ? "animate-pulse" : ""}`} />
              <span className="font-medium">
                {locationLoading ? "..." : userLocation ? "GPS" : locationErrorType ? "Reintentar" : "GPS"}
              </span>
            </button>
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
                <h2 className="font-heading font-bold text-foreground text-xl">Precio promedio actual</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isLocalAvg
                    ? `Promedio en 15 km · ${sampleSize} estaciones`
                    : "Promedio nacional · Actualizado hoy"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <PushNotificationToggle />
                <button
                  onClick={() => refetchPrices()}
                  className="p-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {pricesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {(displayedPrices ?? []).map((fuel) => (
                  <FuelPriceCard key={fuel.type} fuel={fuel} />
                ))}
              </div>
            )}

            {/* Nearby Ranking */}
            <NearbyRanking
              stations={stationsWithDistance}
              userLocation={userLocation}
              onNavigate={handleNavigate}
            />

            {/* Report Button */}
            <button
              onClick={() => navigate("/reporte")}
              className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground rounded-2xl p-4 flex items-center justify-between shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-heading font-bold text-sm">Reporte de Combustible</p>
                  <p className="text-[10px] text-white/80">Precios por zona, promedios y comparativas</p>
                </div>
              </div>
              <div className="text-white/60">→</div>
            </button>

            {/* History Button */}
            <button
              onClick={() => navigate("/historial")}
              className="w-full bg-card border border-border text-foreground rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-heading font-bold text-sm">Historial de Precios</p>
                  <p className="text-[10px] text-muted-foreground">Evolución semanal con gráficos</p>
                </div>
              </div>
              <div className="text-muted-foreground">→</div>
            </button>

            <div className="bg-gradient-to-r from-fuel-amber/15 to-fuel-pink/10 rounded-2xl p-4 border border-fuel-amber/20">
              <h3 className="font-heading font-semibold text-foreground text-sm mb-1.5">
                💡 Consejo del día
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Los precios de la bencina suelen bajar los jueves por la noche cuando ENAP publica las nuevas tarifas semanales. ¡Planifica tu carga!
              </p>
            </div>

            {locationErrorType && (
              <LocationPermissionGuide
                errorType={locationErrorType}
                onRetry={() => requestLocation(false)}
                loading={locationLoading}
                onDismiss={() => setLocationErrorType(null)}
              />
            )}
          </div>
        )}

        {/* Map Tab */}
        {activeTab === "map" && (
          <div className="space-y-3">
            <h2 className="font-heading font-bold text-foreground text-xl">Estaciones Cercanas</h2>
            {/* Radius selector */}
            <div className="flex items-center gap-2">
              <Radar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="flex gap-1.5">
                {[
                  { value: null, label: "Sin límite" },
                  { value: 1, label: "1 km" },
                  { value: 5, label: "5 km" },
                  { value: 10, label: "10 km" },
                  { value: 25, label: "25 km" },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setRadiusKm(opt.value)}
                    className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                      radiusKm === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Fuel type filter */}
            <div className="flex items-center gap-2">
              <Fuel className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="flex gap-1.5">
                {[
                  { key: "all", label: "Todos" },
                  { key: "gasoline93", label: "93" },
                  { key: "gasoline95", label: "95" },
                  { key: "gasoline97", label: "97" },
                  { key: "diesel", label: "Diésel" },
                  { key: "electric", label: "⚡ EV" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setMapFuelFilter(opt.key)}
                    className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                      mapFuelFilter === opt.key
                        ? opt.key === "electric"
                          ? "bg-[hsl(142,70%,45%)] text-white"
                          : "bg-secondary text-secondary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-muted-foreground">{mapStations.length} estaciones en el mapa</p>
              <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#06b6d4] inline-block" /> Cercanas</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] inline-block" /> Abiertas</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] inline-block" /> Cerradas</span>
              </div>
            </div>
            <div className="h-[calc(100vh-300px)] rounded-2xl overflow-hidden border border-border shadow-md">
              <StationMap
                stations={mapStations}
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
                  {stationsWithDistance.length} estaciones
                  {radiusKm ? ` en ${radiusKm} km` : ""}
                  {sortByFuel === "distance"
                    ? userLocation ? " · Por cercanía" : ""
                    : ` · Por octanaje ${
                        sortByFuel === "gasoline93" ? "93" :
                        sortByFuel === "gasoline95" ? "95" :
                        sortByFuel === "gasoline97" ? "97" :
                        sortByFuel === "diesel" ? "Diésel" :
                        sortByFuel === "electric" ? "EV" : ""
                      }`}
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
                {availableBrands.map((brand) => {
                  const isFeatured = FEATURED_BRANDS.includes(brand);
                  const brandColors: Record<string, { active: string; inactive: string }> = {
                    Copec: { active: "bg-[hsl(213,80%,45%)] text-white", inactive: "bg-[hsl(213,80%,45%)]/15 text-[hsl(213,80%,45%)] border border-[hsl(213,80%,45%)]/30" },
                    Shell: { active: "bg-[hsl(0,75%,50%)] text-white", inactive: "bg-[hsl(0,75%,50%)]/15 text-[hsl(0,75%,50%)] border border-[hsl(0,75%,50%)]/30" },
                    Aramco: { active: "bg-[hsl(145,65%,38%)] text-white", inactive: "bg-[hsl(145,65%,38%)]/15 text-[hsl(145,65%,38%)] border border-[hsl(145,65%,38%)]/30" },
                  };
                  const colors = brandColors[brand];
                  const isSelected = selectedBrand === brand;

                  return (
                    <button
                      key={brand}
                      onClick={() => setSelectedBrand(brand === selectedBrand ? "all" : brand)}
                      className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                        isSelected
                          ? colors?.active ?? "bg-primary text-primary-foreground"
                          : isFeatured
                            ? colors?.inactive ?? "bg-muted text-muted-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {isFeatured ? `⭐ ${brand}` : brand}
                    </button>
                  );
                })}
              </div>
            )}
            {/* Radius filter + sort by distance */}
            <div className="flex items-center gap-2">
              <Radar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setSortByFuel("distance")}
                  className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                    sortByFuel === "distance"
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Más cercanas
                </button>
                {[
                  { value: null, label: "Sin límite" },
                  { value: 1, label: "1 km" },
                  { value: 5, label: "5 km" },
                  { value: 10, label: "10 km" },
                  { value: 25, label: "25 km" },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setRadiusKm(opt.value)}
                    className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                      radiusKm === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Sort by fuel price (octanaje) */}
            <div className="flex items-center gap-2">
              <Fuel className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-[11px] font-medium text-muted-foreground shrink-0">Octanaje:</span>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                {[
                  { key: "gasoline93", label: "93" },
                  { key: "gasoline95", label: "95" },
                  { key: "gasoline97", label: "97" },
                  { key: "diesel", label: "Diésel" },
                  { key: "electric", label: "⚡ EV" },
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
