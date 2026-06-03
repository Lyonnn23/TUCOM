import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Fuel, MapPin, RefreshCw, Zap, LogIn, LogOut, User, Download, ArrowUpDown, Radar, BarChart3, TrendingUp, Shield, LocateFixed, TrendingDown, Heart, Bell, Calculator } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import AlertsBell from "@/components/AlertsBell";
import NearbyRanking from "@/components/NearbyRanking";
import LocationPermissionGuide from "@/components/LocationPermissionGuide";
import PushNotificationToggle from "@/components/PushNotificationToggle";
import { Input } from "@/components/ui/input";
import FuelPriceCard from "@/components/FuelPriceCard";
import StationCard from "@/components/StationCard";
import EVChargerCard from "@/components/EVChargerCard";
import StationMap from "@/components/StationMap";
import BenefitsTab from "@/components/BenefitsTab";
import FavoritesTab from "@/components/FavoritesTab";
import UnofficialBanner from "@/components/UnofficialBanner";
import BottomNav, { type TabType } from "@/components/BottomNav";
import FuelLogFAB from "@/components/FuelLogFAB";
import DriverModeFAB from "@/components/DriverModeFAB";
import TankRangeBanner from "@/components/TankRangeBanner";
import UpcomingDeadlinesCard from "@/components/UpcomingDeadlinesCard";
import WhereToGoWidget from "@/components/WhereToGoWidget";
import MacroWidgets from "@/components/macro/MacroWidgets";

import { useFuelPrices } from "@/hooks/useFuelPrices";
import { useGasStations, calculateDistance, type GasStation } from "@/hooks/useGasStations";
import { useLocalFuelPrices } from "@/hooks/useLocalFuelPrices";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useRecentReports } from "@/hooks/useRecentReports";
import { useStationRatings } from "@/hooks/useStationRatings";
import { analytics } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Helmet } from "react-helmet-async";


const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("prices");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const [sortByFuel, setSortByFuel] = useState<string>("distance");
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [mapFuelFilter, setMapFuelFilter] = useState<string>("all");
  const [stationKind, setStationKind] = useState<"all" | "fuel" | "ev" | "glp" | "gnc">("all");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [locationErrorType, setLocationErrorType] = useState<"denied" | "unavailable" | "timeout" | "unsupported" | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [lastLocationUpdate, setLastLocationUpdate] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { data: fuelPrices, isLoading: pricesLoading, refetch: refetchPrices } = useFuelPrices();
  const { data: stations, isLoading: stationsLoading, refetch: refetchStations } = useGasStations();
  const { prices: displayedPrices, isLocal: isLocalAvg, sampleSize } = useLocalFuelPrices({
    stations,
    userLocation,
    nationalPrices: fuelPrices,
    radiusKm: 15,
  });
  const { data: recentReports } = useRecentReports();
  const { data: stationRatings } = useStationRatings();

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

    // Detect preview iframe (geolocation may be blocked by permission policy in preview)
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
    const q = debouncedSearch.toLowerCase().trim();
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
  }, [stations, userLocation, debouncedSearch, selectedBrand, sortByFuel, radiusKm]);

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

  const titleByTab: Record<string, { title: string; description: string }> = {
    prices: {
      title: "Precios de bencina hoy en Chile | TÜcom",
      description: "Compara precios de bencina 93, 95, 97, Diésel y carga EV en estaciones cerca de ti en Chile. Actualizados a diario.",
    },
    stations: {
      title: "Estaciones de servicio cerca de mí | TÜcom",
      description: "Encuentra estaciones de servicio cercanas en un mapa interactivo. Filtra por marca y combustible.",
    },
    favoritos: {
      title: "Mis estaciones favoritas | TÜcom",
      description: "Accede rápido a tus estaciones de servicio guardadas en TÜcom.",
    },
    beneficios: {
      title: "Descuentos y beneficios en combustible | TÜcom",
      description: "Promociones y descuentos disponibles en estaciones de servicio de Chile.",
    },
  };
  const meta = titleByTab[activeTab] ?? titleByTab.prices;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <link rel="canonical" href="https://tucombustible.lovable.app/" />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Inicio", item: "https://tucombustible.lovable.app/" },
          ],
        })}</script>
      </Helmet>
      {/* Header */}
      <header
        className={`bg-gradient-primary px-4 pt-[env(safe-area-inset-top)] sticky top-0 z-40 transition-shadow duration-300 ${
          scrolled ? "shadow-premium" : "shadow-soft"
        }`}
      >
        <div className="flex items-center justify-between py-3 max-w-6xl mx-auto">
          <div className="flex items-center gap-2.5 animate-fade-in">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner ring-1 ring-white/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-white text-xl leading-tight tracking-tight">TÜcom</h1>
              <p className="text-[10px] text-white/75">Bencina inteligente 🇨🇱</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle variant="glass" />
            <button
              onClick={() => navigate("/legal")}
              className="hidden sm:flex items-center gap-1 text-xs text-white/85 bg-white/10 rounded-full px-2 py-1.5 backdrop-blur-sm hover:bg-white/20 transition-colors"
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
            {user && <AlertsBell />}
            {user ? (
              (() => {
                const displayName =
                  (user.user_metadata?.full_name as string) ||
                  (user.user_metadata?.name as string) ||
                  (user.user_metadata?.display_name as string) ||
                  user.email?.split("@")[0] ||
                  "Usuario";
                const avatarUrl =
                  (user.user_metadata?.avatar_url as string) ||
                  (user.user_metadata?.picture as string) ||
                  undefined;
                const initials = displayName
                  .split(" ")
                  .map((p) => p[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 rounded-full pl-1 pr-2.5 py-1 backdrop-blur-sm transition-colors"
                        aria-label="Cuenta"
                      >
                        <Avatar className="w-6 h-6 ring-1 ring-white/30">
                          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                          <AvatarFallback className="bg-white/20 text-white text-[10px] font-semibold">
                            {initials || <User className="w-3 h-3" />}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-white max-w-[70px] truncate">
                          {displayName}
                        </span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="flex flex-col">
                        <span className="font-semibold truncate">{displayName}</span>
                        <span className="text-xs text-muted-foreground font-normal truncate">
                          {user.email}
                        </span>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate("/profile")}>
                        <User className="w-4 h-4 mr-2" />
                        Mi cuenta
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/alertas")}>
                        <Bell className="w-4 h-4 mr-2" />
                        Mis alertas
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/eliminar-cuenta")}>
                        Eliminar cuenta
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={signOut}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Cerrar sesión
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })()
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

      <main className="max-w-6xl mx-auto px-4 py-5 animate-fade-in">
        {/* Hero: lowest local price */}
        {activeTab === "prices" && (() => {
          const cheapest = stationsWithDistance
            .filter((s) => userLocation && (s.distance ?? 999) <= 15 && (s.prices.gasoline93 ?? 0) > 0)
            .sort((a, b) => (a.prices.gasoline93 ?? 99999) - (b.prices.gasoline93 ?? 99999))[0];
          if (!cheapest) return null;
          return (
            <div className="mb-5 rounded-3xl bg-gradient-hero p-5 shadow-glow text-white relative overflow-hidden animate-scale-in">
              <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute right-10 bottom-0 w-24 h-24 rounded-full bg-accent/30 blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" /> Más barato cerca
                  </div>
                  <span className="text-[10px] text-white/75">a {cheapest.distance?.toFixed(1)} km</span>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-heading font-bold text-base truncate">{cheapest.name}</p>
                    <p className="text-[11px] text-white/80 truncate">{cheapest.brand} · {cheapest.address}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-white/75 uppercase tracking-wider">93</p>
                    <p className="font-heading tabular-nums font-extrabold text-4xl leading-none">
                      ${cheapest.prices.gasoline93}
                    </p>
                    <p className="text-[10px] text-white/70 mt-0.5">por litro</p>
                  </div>
                </div>
                <button
                  onClick={() => handleNavigateGoogle(cheapest)}
                  className="mt-4 w-full bg-white/95 hover:bg-white text-primary font-semibold text-sm rounded-xl py-2.5 press-scale flex items-center justify-center gap-2 shadow-md"
                >
                  <MapPin className="w-4 h-4" /> Cómo llegar
                </button>
                <button
                  onClick={() => navigate("/calculadora")}
                  className="mt-2 w-full bg-white/15 hover:bg-white/25 text-white font-semibold text-sm rounded-xl py-2.5 press-scale flex items-center justify-center gap-2 border border-white/30"
                >
                  ¿Cuánto cuesta tu viaje?
                </button>
              </div>
            </div>
          );
        })()}
        {activeTab === "prices" && <div className="mb-4"><TankRangeBanner /></div>}
        {activeTab === "prices" && <div className="mb-4"><WhereToGoWidget /></div>}
        {activeTab === "prices" && <div className="mb-4"><UpcomingDeadlinesCard /></div>}
        {activeTab === "prices" && <MacroWidgets />}

        <UnofficialBanner className="mb-4" />
        {/* Prices Tab */}
        {activeTab === "prices" && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="font-heading font-bold text-foreground text-lg leading-tight truncate">Precio promedio actual</h2>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
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

            {/* Disclaimer oficial: requisito Google Play (afirmaciones engañosas) — cerrable */}
            <UnofficialBanner variant="full" storageKey="tucom_unofficial_banner_full_dismissed" />

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
            <h2 className="font-heading font-bold text-foreground text-lg leading-tight tracking-tight">Estaciones Cercanas</h2>
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
                    onClick={() => { setMapFuelFilter(opt.key); analytics.filterFuel(opt.key); }}
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
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-fuel-blue inline-block" /> Más cercana</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-fuel-green inline-block" /> Abiertas</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-fuel-red inline-block" /> Cerradas</span>
              </div>
            </div>
            <div className="h-[calc(100dvh-320px)] min-h-[320px] max-h-[calc(100dvh-220px)] rounded-2xl overflow-hidden border border-border shadow-md isolate">
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
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="font-heading font-bold text-foreground text-lg leading-tight tracking-tight truncate">Todas las Estaciones</h2>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
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
                      onClick={() => { const next = brand === selectedBrand ? "all" : brand; setSelectedBrand(next); analytics.filterBrand(next); }}
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
            {/* Station type filter */}
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
              <span className="text-[11px] font-medium text-muted-foreground shrink-0">Tipo:</span>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                {([
                  { key: "all", label: "Todos" },
                  { key: "fuel", label: "Combustible" },
                  { key: "ev", label: "⚡ Eléctrico" },
                  { key: "glp", label: "GLP" },
                  { key: "gnc", label: "GNC" },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setStationKind(opt.key)}
                    className={`shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                      stationKind === opt.key
                        ? opt.key === "ev"
                          ? "bg-emerald-500 text-white"
                          : "bg-secondary text-secondary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {stationKind !== "ev" && (
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
                      onClick={() => { setSortByFuel(opt.key); analytics.filterFuel(opt.key); }}
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
            )}
            {stationKind === "ev" && (
              <button
                onClick={() => navigate("/calculadora-ev")}
                className="w-full rounded-2xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 flex items-center justify-between gap-3 hover:bg-emerald-500/15 transition-colors"
              >
                <div className="flex items-center gap-2 text-left">
                  <Calculator className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                  <div>
                    <p className="font-heading font-bold text-sm text-foreground">Calculadora de viaje EV</p>
                    <p className="text-[11px] text-muted-foreground">Energía, costo de carga y ahorro vs bencina</p>
                  </div>
                </div>
                <span className="text-emerald-600">→</span>
              </button>
            )}
            {(() => {
              const filtered = stationsWithDistance.filter((s) => {
                if (stationKind === "all" || stationKind === "fuel") return stationKind === "all" ? true : !s.hasEvCharging || (s.prices.gasoline93 || s.prices.gasoline95 || s.prices.gasoline97 || s.prices.diesel) > 0;
                if (stationKind === "ev") return s.hasEvCharging || (s.prices.electric ?? 0) > 0;
                // GLP / GNC not yet sourced in DB
                return false;
              });
              if (stationsLoading) {
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
                  </div>
                );
              }
              const anyWithPrices = filtered.some((s) =>
                (s.prices.gasoline93 || s.prices.gasoline95 || s.prices.gasoline97 || s.prices.diesel || s.prices.electric) > 0,
              );
              const showSyncBanner = filtered.length > 0 && !anyWithPrices;
              if (stationKind === "glp" || stationKind === "gnc") {
                return (
                  <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
                    <div className="w-16 h-16 rounded-2xl bg-fuel-amber/15 flex items-center justify-center mb-3">
                      <Fuel className="w-8 h-8 text-fuel-amber" aria-hidden="true" />
                    </div>
                    <p className="font-heading font-bold text-foreground">Estaciones {stationKind.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                      Próximamente: catálogo de estaciones de {stationKind === "glp" ? "GLP vehicular" : "Gas Natural Comprimido"} en Chile.
                      Recuerda revisar que tu vehículo cuente con el adaptador certificado.
                    </p>
                  </div>
                );
              }
              if (filtered.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-primary/10 flex items-center justify-center mb-4">
                      <Fuel className="w-10 h-10 text-primary" />
                    </div>
                    <p className="font-heading font-bold text-foreground">No encontramos estaciones</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                      Ajusta los filtros, amplía el radio o intenta otra búsqueda.
                    </p>
                  </div>
                );
              }
              if (stationKind === "ev") {
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-fade-in">
                    {filtered.map((station) => (
                      <EVChargerCard key={station.id} station={station} onNavigate={handleNavigate} />
                    ))}
                  </div>
                );
              }
              return (
                <div className="animate-fade-in">
                  {showSyncBanner && (
                    <div className="mb-3 rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3 flex items-center gap-3">
                      <RefreshCw className="w-4 h-4 text-primary animate-spin shrink-0" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">Actualizando precios desde CNE…</p>
                        <p className="text-xs text-muted-foreground">Los precios se cargarán en breve. Mientras tanto te mostramos las estaciones disponibles.</p>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filtered.map((station) => (
                      <StationCard key={station.id} station={station} onNavigate={handleNavigate} onNavigateGoogle={handleNavigateGoogle} lastCommunityReport={recentReports?.get(station.id) ?? null} rating={stationRatings?.get(station.id) ?? null} />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Favorites Tab */}
        {activeTab === "favorites" && (
          <FavoritesTab
            stations={stationsWithDistance}
            onNavigate={handleNavigate}
            onNavigateGoogle={handleNavigateGoogle}
            onBack={() => setActiveTab("prices")}
          />

        )}

        {/* Benefits Tab */}
        {activeTab === "benefits" && <BenefitsTab />}
      </main>

      <BottomNav active={activeTab} onChange={setActiveTab} />
      <FuelLogFAB />
      <DriverModeFAB />
    </div>
  );
};

export default Index;
