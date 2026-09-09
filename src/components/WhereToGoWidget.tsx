import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { QUICK_DESTINATIONS } from "@/lib/tripCalc";
import { useNearbyStations, type FuelTypeKey } from "@/hooks/useNearbyStations";
import { useUserVehicles } from "@/hooks/useUserVehicles";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { formatPrice, formatInt } from "@/lib/format";

interface Props {
  userLocation?: { lat: number; lng: number } | null;
}

const FUEL_LABEL: Record<FuelTypeKey, string> = {
  gasoline93: "Gasolina 93",
  gasoline95: "Gasolina 95",
  gasoline97: "Gasolina 97",
  diesel: "Diésel",
  electric: "carga eléctrica",
};

/**
 * Home "¿A dónde vas hoy?" widget: quick chips + km input, inline trip cost.
 */
export default function WhereToGoWidget({ userLocation }: Props) {
  const [km, setKm] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [result, setResult] = useState<{
    km: number;
    label: string | null;
    total: number;
    fuelLabel: string;
    cheapest: number;
    consumption: number;
    units: number;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const pendingRef = useRef<{ km: number; label: string | null } | null>(null);

  // Fallback national average prices (CLP/L) when no nearby prices are found
  const FALLBACK_PRICES: Record<FuelTypeKey, number> = {
    gasoline93: 1050,
    gasoline95: 1100,
    gasoline97: 1180,
    diesel: 980,
    electric: 250,
  };

  const { primary: primaryVehicle } = useUserVehicles();
  const { preferences } = useUserPreferences();

  const fuelType: FuelTypeKey = useMemo(() => {
    const f = (primaryVehicle?.fuel_type ?? preferences?.preferred_fuel ?? "gasoline95") as FuelTypeKey;
    return f;
  }, [primaryVehicle, preferences]);

  const consumption = primaryVehicle?.consumption_kml && primaryVehicle.consumption_kml > 0
    ? primaryVehicle.consumption_kml
    : 12;

  const { data: nearby, isFetching } = useNearbyStations(
    userLocation?.lat ?? null,
    userLocation?.lng ?? null,
    15000,
    fuelType,
    20,
  );

  const cheapest = useMemo(() => {
    const prices = (nearby ?? [])
      .map((s) => s.price)
      .filter((p): p is number => typeof p === "number" && p > 0);
    if (!prices.length) return null;
    return Math.min(...prices);
  }, [nearby]);

  const cheapestStationName = useMemo(() => {
    if (cheapest == null) return null;
    const s = (nearby ?? []).find((st) => st.price === cheapest);
    return s ? `${s.brand} ${s.name}` : null;
  }, [nearby, cheapest]);

  const compute = (tripKm: number, label: string | null, price: number, fallback = false) => {
    const units = tripKm / consumption;
    const total = Math.round(units * price);
    setUsingFallback(fallback);
    setResult({
      km: tripKm,
      label,
      total,
      fuelLabel: FUEL_LABEL[fuelType] ?? "combustible",
      cheapest: price,
      consumption,
      units,
    });
  };

  // Resolve a pending calculation once prices arrive, or fall back after 8s
  useEffect(() => {
    if (!pending) return;
    if (cheapest && pendingRef.current) {
      const { km: k, label } = pendingRef.current;
      pendingRef.current = null;
      setPending(false);
      compute(k, label, cheapest);
      return;
    }
    const t = setTimeout(() => {
      if (!pendingRef.current) return;
      const { km: k, label } = pendingRef.current;
      pendingRef.current = null;
      setPending(false);
      toast.info("No se encontraron precios cercanos. Usando precio promedio nacional.");
      compute(k, label, FALLBACK_PRICES[fuelType] ?? 1100, true);
    }, 8000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, cheapest, fuelType]);

  const run = (tripKm: number, label: string | null) => {
    if (!tripKm || tripKm <= 0) return;
    setKm(String(tripKm));
    setSelectedCity(label);
    if (cheapest) {
      compute(tripKm, label, cheapest);
      return;
    }
    pendingRef.current = { km: tripKm, label };
    setPending(true);
  };

  const handleCalculate = () => {
    const n = parseFloat(km);
    if (!n || n <= 0) {
      toast.error("Ingresa los kilómetros del viaje");
      return;
    }
    if (selectedCity && String(n) !== km) setSelectedCity(null);
    run(n, selectedCity);
  };

  const noLocation = !userLocation;

  return (
    <section className="bg-card border border-border rounded-2xl shadow-soft p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
        <h2 className="font-heading font-bold text-foreground text-sm">¿A dónde vas hoy?</h2>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_DESTINATIONS.slice(0, 5).map((d) => (
          <button
            key={d.id}
            onClick={() => run(d.km, d.label)}
            className={`text-[11px] rounded-full px-2.5 py-1 transition border ${
              selectedCity === d.label
                ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/50"
                : "border-border bg-muted/40 text-foreground hover:bg-primary/10 hover:border-primary/40"
            }`}
          >
            {d.label} <span className={selectedCity === d.label ? "text-primary-foreground/80" : "text-muted-foreground"}>· {d.km}km</span>
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleCalculate();
        }}
        className="flex gap-2"
      >
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={km}
          onChange={(e) => { setKm(e.target.value); setSelectedCity(null); }}
          placeholder="O ingresa los km del viaje"
          className="flex-1 h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label="Kilómetros del viaje"
        />
        <button
          type="submit"
          disabled={!km || Number(km) <= 0}
          className="h-10 px-3 rounded-xl bg-gradient-primary text-white text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-50"
        >
          Calcular <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>

      {(pending || (isFetching && !cheapest && result === null)) && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando precios cercanos…
        </div>
      )}

      {noLocation && (
        <p className="text-[11px] text-muted-foreground">
          Activa tu ubicación para usar el precio más barato cercano.
        </p>
      )}

      {result && (
        <div className="rounded-xl bg-primary/5 border border-primary/20 px-3 py-2.5 text-sm text-foreground animate-fade-in">
          Tu viaje{result.label ? ` a ${result.label}` : ""} (~{formatInt(result.km)} km) costará aproximadamente{" "}
          <span className="font-bold text-primary">{formatPrice(result.total)}</span> con {result.fuelLabel}.
          <div className="text-xs mt-1">
            Litros necesarios: <span className="font-semibold">{result.units.toFixed(1)} L</span>
            {" · "}Costo estimado: <span className="font-semibold">{formatPrice(result.total)}</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {usingFallback
              ? `Usando precio promedio nacional ${formatPrice(result.cheapest)} · rendimiento ${result.consumption} km/L.`
              : `Estimado con ${result.consumption} km/L y ${formatPrice(result.cheapest)} (más barato cercano).`}
            {!usingFallback && cheapestStationName && (
              <> 📍 Precio en: <span className="font-medium">{cheapestStationName}</span></>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
