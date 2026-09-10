// Modo Viaje: origen/destino con Google Places (Chile), pills de ciudades,
// Distance Matrix para km reales y estación más barata en el destino.
import { useEffect, useRef, useState } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { brandColor } from "@/lib/brandColors";
import { DEFAULT_PRICES } from "@/lib/priceRanges";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export type FuelKey = "gasoline93" | "gasoline95" | "gasoline97" | "diesel" | "electric";

interface Props {
  fuelType: FuelKey;
  fuelLabel: string;
  consumption: number;
  pricePerUnit: number;
  vehicleName?: string | null;
}

type Place = { lat: number; lng: number; name: string };

interface TripResult {
  km: number;
  liters: number;
  cost: number;
  fuelPrice: number;
  hours: number | null;
  mins: number | null;
}

interface DestStation {
  id: string;
  name: string;
  brand: string;
  address: string;
  price: number | null;
  lat: number;
  lng: number;
}

const CHILE_CITIES = [
  { label: "Viña / Valpo 🌊", km: 120, duration: 90, lat: -33.0245, lng: -71.5518 },
  { label: "Rancagua 🏔️", km: 87, duration: 75, lat: -34.1703, lng: -70.7444 },
  { label: "Talca 🍇", km: 255, duration: 195, lat: -35.4264, lng: -71.6554 },
  { label: "Chillán 🌶️", km: 400, duration: 300, lat: -36.6063, lng: -72.1033 },
  { label: "Concepción 🌊", km: 500, duration: 375, lat: -36.827, lng: -73.0503 },
  { label: "Temuco 🌿", km: 675, duration: 510, lat: -38.7396, lng: -72.59 },
  { label: "Valdivia 🦦", km: 840, duration: 630, lat: -39.8196, lng: -73.2452 },
  { label: "Osorno 🐄", km: 920, duration: 690, lat: -40.574, lng: -73.1322 },
  { label: "Pto Montt 🛳️", km: 1020, duration: 765, lat: -41.4717, lng: -72.9369 },
  { label: "La Serena ⭐", km: 470, duration: 360, lat: -29.9027, lng: -71.2519 },
  { label: "Copiapó 🌵", km: 807, duration: 630, lat: -27.3667, lng: -70.3333 },
  { label: "Antofagasta 🌊", km: 1360, duration: 1020, lat: -23.6509, lng: -70.3975 },
  { label: "Iquique 🏄", km: 1850, duration: 1380, lat: -20.2141, lng: -70.1522 },
  { label: "Arica 🌞", km: 2050, duration: 1530, lat: -18.4783, lng: -70.3126 },
] as const;

/** Input con sugerencias de Places (New) restringido a Chile. */
const PlaceField = ({
  placeholder,
  value,
  onValueChange,
  onSelect,
  bias,
}: {
  placeholder: string;
  value: string;
  onValueChange: (v: string) => void;
  onSelect: (p: Place) => void;
  bias?: { lat: number; lng: number };
}) => {
  const placesLib = useMapsLibrary("places");
  const [suggestions, setSuggestions] = useState<
    { placeId: string; primary: string; secondary: string }[]
  >([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (placesLib) sessionRef.current = new placesLib.AutocompleteSessionToken();
  }, [placesLib]);

  const fetchSuggestions = async (input: string) => {
    if (!placesLib || !input.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const req: any = {
        input,
        sessionToken: sessionRef.current,
        includedRegionCodes: ["cl"],
        language: "es-CL",
      };
      if (bias) req.locationBias = { radius: 50000, center: bias };
      const { suggestions: raw } =
        await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(req);
      const mapped = (raw ?? [])
        .filter((s: any) => s.placePrediction)
        .slice(0, 6)
        .map((s: any) => ({
          placeId: s.placePrediction.placeId,
          primary: s.placePrediction.mainText?.text ?? s.placePrediction.text?.text ?? "",
          secondary: s.placePrediction.secondaryText?.text ?? "",
        }));
      setSuggestions(mapped);
      setOpen(mapped.length > 0);
    } catch (err) {
      console.warn("Autocomplete error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (next: string) => {
    onValueChange(next);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => fetchSuggestions(next), 250) as unknown as number;
  };

  const pick = async (s: { placeId: string; primary: string; secondary: string }) => {
    setOpen(false);
    if (!placesLib) return;
    try {
      const place = new placesLib.Place({ id: s.placeId, requestedLanguage: "es-CL" });
      await place.fetchFields({ fields: ["location", "displayName", "formattedAddress"] });
      const loc = place.location;
      if (!loc) return;
      const name = place.formattedAddress ?? place.displayName ?? s.primary;
      onValueChange(name);
      onSelect({ lat: loc.lat(), lng: loc.lng(), name });
      sessionRef.current = new placesLib.AutocompleteSessionToken();
    } catch (err) {
      console.warn("Place fetch failed:", err);
    }
  };

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/60 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-white/50 text-base"
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-white/80" aria-hidden="true" />
      )}
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl bg-popover border border-border shadow-elegant text-left"
        >
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                className="w-full text-left px-3 py-2.5 hover:bg-accent"
              >
                <div className="text-sm font-medium text-foreground truncate">{s.primary}</div>
                {s.secondary && (
                  <div className="text-xs text-muted-foreground truncate">{s.secondary}</div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const TripPlannerInner = ({ fuelType, fuelLabel, consumption, pricePerUnit, vehicleName }: Props) => {
  const geocodingLib = useMapsLibrary("geocoding");
  const routesLib = useMapsLibrary("routes");

  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");
  const [originPlace, setOriginPlace] = useState<Place | null>(null);
  const [destPlace, setDestPlace] = useState<Place | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<TripResult | null>(null);
  const [destStation, setDestStation] = useState<DestStation | null>(null);
  const [stationLoading, setStationLoading] = useState(false);

  const isElectric = fuelType === "electric";
  const unit = isElectric ? "kWh" : "L";
  const fallbackPrice = DEFAULT_PRICES[fuelType] ?? DEFAULT_PRICES.gasoline95;

  const calculateTrip = (km: number, durationMin?: number) => {
    const cons = consumption > 0 ? consumption : 10;
    const price = pricePerUnit > 0 ? pricePerUnit : fallbackPrice;
    const liters = Math.round((km / cons) * 10) / 10;
    setResult({
      km,
      liters,
      cost: Math.round(liters * price),
      fuelPrice: price,
      hours: durationMin != null ? Math.floor(durationMin / 60) : null,
      mins: durationMin != null ? durationMin % 60 : null,
    });
    import("@/lib/analytics").then((m) => m.analytics.calculateTrip(fuelType, km)).catch(() => {});
  };

  // Estación más barata cerca del destino
  useEffect(() => {
    if (!destPlace || !result) {
      setDestStation(null);
      return;
    }
    let cancelled = false;
    setStationLoading(true);
    supabase
      .rpc("nearby_stations", {
        _lat: destPlace.lat,
        _lng: destPlace.lng,
        _radius_m: 5000,
        _fuel_type: fuelType,
        _limit: 20,
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        setStationLoading(false);
        if (error || !data) { setDestStation(null); return; }
        const rows = (data as any[]).filter((r) => typeof r.price === "number" && r.price > 0);
        rows.sort((a, b) => a.price - b.price);
        setDestStation((rows[0] as DestStation) ?? null);
      });
    return () => { cancelled = true; };
  }, [destPlace, result, fuelType]);

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Tu dispositivo no permite ubicación");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (!geocodingLib) {
          setOriginPlace({ lat, lng, name: "Mi ubicación" });
          setOriginText("Mi ubicación");
          return;
        }
        const geocoder = new geocodingLib.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          const name = status === "OK" && results?.[0] ? results[0].formatted_address : "Mi ubicación";
          setOriginPlace({ lat, lng, name });
          setOriginText(name);
        });
      },
      () => toast.error("No pudimos obtener tu ubicación"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const handleCity = (city: (typeof CHILE_CITIES)[number]) => {
    setSelectedCity(city.label);
    setDestPlace({ lat: city.lat, lng: city.lng, name: city.label });
    setDestText(city.label);
    calculateTrip(city.km, city.duration);
  };

  const calculateRealDistance = () => {
    if (!originPlace || !destPlace) {
      toast.error("📍 Selecciona origen y destino");
      return;
    }
    if (!routesLib) {
      toast.error("Mapa cargando, intenta de nuevo");
      return;
    }
    setCalculating(true);
    const service = new routesLib.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins: [{ lat: originPlace.lat, lng: originPlace.lng }],
        destinations: [{ lat: destPlace.lat, lng: destPlace.lng }],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
      },
      (response, status) => {
        setCalculating(false);
        const element = response?.rows?.[0]?.elements?.[0];
        if (status === "OK" && element?.status === "OK") {
          calculateTrip(
            Math.round((element.distance.value / 1000) * 10) / 10,
            Math.round(element.duration.value / 60),
          );
        } else {
          toast.error("No se pudo calcular la ruta");
        }
      },
    );
  };

  return (
    <div className="space-y-3">
      {/* ORIGEN */}
      <div className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-2xl p-4 shadow-lg space-y-3">
        <h3 className="font-bold text-white">📍 ¿Desde dónde sales?</h3>
        <PlaceField
          placeholder="Dirección, comuna o lugar"
          value={originText}
          onValueChange={(v) => { setOriginText(v); }}
          onSelect={setOriginPlace}
        />
        <button
          type="button"
          onClick={useMyLocation}
          className="bg-white text-violet-600 font-bold rounded-full px-4 py-2 text-sm shadow-md active:scale-95 transition-transform"
          style={{ touchAction: "manipulation" }}
        >
          🎯 Usar mi ubicación
        </button>
      </div>

      {/* CONECTOR */}
      <div className="flex items-center justify-center py-1">
        <div className="flex flex-col items-center gap-1">
          <div className="w-0.5 h-4 bg-border" />
          <span className="text-xl">🚗</span>
          <div className="w-0.5 h-4 bg-border" />
        </div>
      </div>

      {/* DESTINO */}
      <div className="bg-gradient-to-br from-orange-500 to-rose-500 text-white rounded-2xl p-4 shadow-lg space-y-3">
        <h3 className="font-bold text-white">🏁 ¿A dónde vas?</h3>
        <PlaceField
          placeholder="Dirección, comuna o lugar"
          value={destText}
          onValueChange={(v) => { setDestText(v); setSelectedCity(null); }}
          onSelect={(p) => { setDestPlace(p); setSelectedCity(null); }}
          bias={originPlace ?? undefined}
        />
      </div>

      {/* PILLS */}
      <div>
        <p className="text-sm font-semibold text-muted-foreground mb-2">⚡ Rutas rápidas desde Santiago</p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {CHILE_CITIES.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => handleCity(c)}
              style={{ touchAction: "manipulation" }}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                selectedCity === c.label
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-primary/10 text-primary border-primary/20"
              }`}
            >
              {c.label} · {c.km} km
            </button>
          ))}
        </div>
      </div>

      {/* CALCULAR */}
      <button
        type="button"
        onClick={calculateRealDistance}
        disabled={calculating || !originPlace || !destPlace}
        style={{ touchAction: "manipulation" }}
        className="w-full bg-gradient-to-r from-violet-600 to-orange-500 text-white font-bold rounded-2xl py-4 text-base shadow-lg shadow-violet-500/30 active:scale-[0.98] transition-transform disabled:opacity-50"
      >
        {calculating ? "Calculando..." : "⚡ Calcular ruta"}
      </button>

      {/* RESULTADO */}
      {result && (
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-5 shadow-xl shadow-emerald-500/30 mt-4 animate-scale-in">
          <h3 className="font-bold text-lg mb-4">✅ Tu ruta calculada</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <div className="text-xl">🛣️</div>
              <div className="font-bold tabular-nums">{result.km.toLocaleString("es-CL")} km</div>
              <div className="text-xs text-white/80">kilómetros</div>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <div className="text-xl">⏱️</div>
              <div className="font-bold tabular-nums">
                {result.hours != null ? `${result.hours}h ${result.mins}min` : "—"}
              </div>
              <div className="text-xs text-white/80">tiempo estimado</div>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <div className="text-xl">⛽</div>
              <div className="font-bold tabular-nums">{result.liters.toFixed(1)} {unit}</div>
              <div className="text-xs text-white/80">{isElectric ? "energía necesaria" : "litros necesarios"}</div>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <div className="text-xl">💰</div>
              <div className="font-bold tabular-nums">{formatPrice(result.cost)}</div>
              <div className="text-xs text-white/80">costo total</div>
            </div>
          </div>
          <p className="text-white/70 text-xs text-center mt-2">
            Precio referencia: {formatPrice(result.fuelPrice)}/{unit} · {fuelLabel}
          </p>
          {vehicleName && (
            <p className="text-white/80 text-xs text-center">🚗 Calculado para tu {vehicleName}</p>
          )}
        </div>
      )}

      {/* ESTACIÓN EN DESTINO */}
      {result && destPlace && (
        <div className="bg-card border border-border rounded-2xl p-4 mt-3">
          <h4 className="font-semibold text-sm mb-2">⛽ Estación más barata en destino</h4>
          {stationLoading ? (
            <p className="text-muted-foreground text-sm text-center">Buscando…</p>
          ) : destStation ? (
            <>
              <div className="flex items-start gap-2">
                <span
                  className="w-3 h-3 rounded-full mt-1 shrink-0"
                  style={{ backgroundColor: brandColor(destStation.brand) }}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="font-bold text-foreground truncate">
                    {destStation.brand} · {destStation.name}
                  </p>
                  <p className="text-fuel-green font-bold tabular-nums">
                    {formatPrice(destStation.price ?? 0)}/{unit}
                  </p>
                  <p className="text-muted-foreground text-xs truncate">{destStation.address}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps/dir/?api=1&destination=${destStation.lat},${destStation.lng}`,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                style={{ touchAction: "manipulation" }}
                className="w-full mt-2 bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-semibold active:scale-95 transition-transform"
              >
                Cómo llegar 🗺️
              </button>
            </>
          ) : (
            <p className="text-muted-foreground text-sm text-center">
              📍 Busca estaciones al llegar a destino
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const TripPlanner = (props: Props) => {
  const [apiKey, setApiKey] = useState("");
  useEffect(() => {
    let cancelled = false;
    supabase.functions
      .invoke("get-maps-key")
      .then(({ data, error }) => {
        if (!cancelled && !error && data?.key) setApiKey(data.key);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!apiKey) {
    return (
      <div className="rounded-2xl bg-muted/40 h-64 animate-pulse" aria-label="Cargando calculadora de viaje" />
    );
  }

  return (
    <APIProvider apiKey={apiKey} libraries={["places", "geocoding", "routes"]} language="es-CL" region="CL">
      <TripPlannerInner {...props} />
    </APIProvider>
  );
};

export default TripPlanner;
