/**
 * HomeRouteWidget — "Camino a casa"
 * Permite al usuario guardar su destino habitual y ver estaciones baratas
 * en esa dirección. Si no hay ruta guardada, muestra CTA para configurarla.
 */
import { useState } from "react";
import { Home, Briefcase, MapPin, X, Fuel, ChevronRight, Navigation } from "lucide-react";
import { useHomeRoute } from "@/hooks/useHomeRoute";
import { useNavigate } from "react-router-dom";
import type { GasStation } from "@/hooks/useGasStations";

interface Props {
  userLocation: { lat: number; lng: number } | null;
  stations: GasStation[];
  preferredFuel?: string;
}

const QUICK_DESTINATIONS = [
  { label: "Casa", icon: Home },
  { label: "Trabajo", icon: Briefcase },
];

function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Stations within ~5 km in the general direction of the destination */
function stationsOnRoute(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
  stations: GasStation[],
  fuel: string
): GasStation[] {
  const totalDist = haversineKm(origin.lat, origin.lng, dest.lat, dest.lng);
  if (totalDist < 1) return [];

  return stations
    .filter((s) => {
      if (!(s.prices as Record<string, number>)?.[fuel]) return false;
      const sLat = s.lat ?? 0;
      const sLng = s.lng ?? s.lon ?? 0;
      // Station must be within ≤20% of the total detour distance
      const dFromOrigin = haversineKm(origin.lat, origin.lng, sLat, sLng);
      const dToDestination = haversineKm(sLat, sLng, dest.lat, dest.lng);
      const detour = dFromOrigin + dToDestination - totalDist;
      return detour < totalDist * 0.2 && dFromOrigin < totalDist * 1.1;
    })
    .sort((a, b) => {
      const pa = (a.prices as Record<string, number>)?.[fuel] ?? 99999;
      const pb = (b.prices as Record<string, number>)?.[fuel] ?? 99999;
      return pa - pb;
    })
    .slice(0, 3);
}

const HomeRouteWidget = ({ userLocation, stations, preferredFuel = "gasoline95" }: Props) => {
  const navigate = useNavigate();
  const { route, saveRoute, clearRoute } = useHomeRoute();
  const [setting, setSetting] = useState(false);
  const [customLabel, setCustomLabel] = useState("");

  // If setting mode — let user pick via Calculadora with pre-filled dest
  const handleQuickSet = (label: string) => {
    // We navigate to Calculadora with a flag to save home route on completion
    // For now, save approximate: prompt user to use Calculadora
    setSetting(false);
    navigate(`/calculadora?saveHomeRoute=${encodeURIComponent(label)}`);
  };

  if (!route) {
    return (
      <div className="rounded-2xl bg-card border border-border p-4 animate-scale-in">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Home className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Camino a casa</p>
            <p className="text-[10px] text-muted-foreground">Bencineras baratas en tu ruta</p>
          </div>
        </div>
        {setting ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-2">¿A dónde vas habitualmente?</p>
            <div className="flex gap-2">
              {QUICK_DESTINATIONS.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => handleQuickSet(label)}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border border-border bg-muted/50 hover:bg-primary/10 hover:border-primary/40 transition-colors"
                >
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setSetting(false)}
              className="w-full text-xs text-muted-foreground py-2 hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setSetting(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
          >
            <MapPin className="w-3.5 h-3.5" />
            Configurar mi ruta
          </button>
        )}
      </div>
    );
  }

  // Ruta guardada — mostrar estaciones en ruta
  const onRoute =
    userLocation
      ? stationsOnRoute(userLocation, { lat: route.destLat, lng: route.destLng }, stations, preferredFuel)
      : [];

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden animate-scale-in">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Home className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Camino a {route.label}</p>
            <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">{route.destName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(`/calculadora?dest=${encodeURIComponent(route.destName)}`)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            aria-label="Calcular ruta"
          >
            <Navigation className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={clearRoute}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Eliminar ruta guardada"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stations on route */}
      {onRoute.length > 0 ? (
        <div className="px-3 pb-3 space-y-1.5">
          {onRoute.map((s) => {
            const price = (s.prices as Record<string, number>)?.[preferredFuel] ?? 0;
            return (
              <button
                key={s.id}
                onClick={() => navigate(`/station/${s.id}`)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-card flex items-center justify-center shrink-0">
                  <Fuel className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{s.brand}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-[hsl(var(--fuel-green))] tabular-nums">${price}</p>
                  <p className="text-[9px] text-muted-foreground">por litro</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="px-4 pb-4">
          <p className="text-xs text-muted-foreground text-center py-2">
            {userLocation
              ? "No hay estaciones baratas en tu ruta ahora"
              : "Activa ubicación para ver estaciones en ruta"}
          </p>
        </div>
      )}
    </div>
  );
};

export default HomeRouteWidget;
