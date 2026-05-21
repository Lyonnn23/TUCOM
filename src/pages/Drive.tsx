import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Navigation, Volume2, Loader2, MapPin } from "lucide-react";
import { useGasStations, calculateDistance, type GasStation } from "@/hooks/useGasStations";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { toast } from "sonner";

const FUEL_NAME: Record<string, string> = {
  gasoline93: "93",
  gasoline95: "95",
  gasoline97: "97",
  diesel: "Diésel",
};

const FUEL_SPEECH: Record<string, string> = {
  gasoline93: "bencina 93",
  gasoline95: "bencina 95",
  gasoline97: "bencina 97",
  diesel: "diésel",
};

const fmt = (n: number) => `$${n.toLocaleString("es-CL")}`;

const openDirections = (s: GasStation, from?: { lat: number; lng: number }) => {
  const dest = `${s.lat},${s.lng}`;
  const url = from
    ? `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${dest}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
  window.open(url, "_blank", "noopener,noreferrer");
};

const Drive = () => {
  const navigate = useNavigate();
  const { data: stations = [], isLoading } = useGasStations();
  const { preferences } = useUserPreferences();
  const preferredFuel = preferences?.preferred_fuel ?? "gasoline95";

  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [posError, setPosError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Night mode after 7pm or before 7am
  const isNight = useMemo(() => {
    const h = new Date().getHours();
    return h >= 19 || h < 7;
  }, [tick]);

  // Geolocation: get once + refresh every 60s
  useEffect(() => {
    let cancelled = false;
    const fetchPos = () => {
      if (!("geolocation" in navigator)) {
        setPosError("Geolocalización no disponible");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (p) => {
          if (cancelled) return;
          setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
          setPosError(null);
          setTick((t) => t + 1);
        },
        (e) => {
          if (cancelled) return;
          setPosError(e.message || "Activa la ubicación para ver estaciones cercanas");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    };
    fetchPos();
    const id = window.setInterval(fetchPos, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // 5 nearest with valid preferred-fuel price
  const top5 = useMemo(() => {
    if (!pos) return [];
    return stations
      .map((s) => ({
        ...s,
        distance: Number(calculateDistance(pos.lat, pos.lng, s.lat, s.lng).toFixed(1)),
      }))
      .filter((s) => (s.prices as any)[preferredFuel] > 0)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  }, [stations, pos, preferredFuel, tick]);

  const speak = () => {
    if (!("speechSynthesis" in window)) {
      toast.error("La síntesis de voz no está disponible");
      return;
    }
    if (top5.length === 0) return;
    const cheapest = [...top5].sort(
      (a, b) =>
        ((a.prices as any)[preferredFuel] as number) -
        ((b.prices as any)[preferredFuel] as number)
    )[0];
    const price = (cheapest.prices as any)[preferredFuel] as number;
    const text = `La estación más barata cerca es ${cheapest.brand} ${cheapest.name}, con ${FUEL_SPEECH[preferredFuel]} a ${price} pesos el litro, a ${cheapest.distance} kilómetros.`;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-CL";
    u.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  // Force colors via inline tokens depending on night mode (no dark-mode toggle dependency)
  const bg = isNight ? "bg-[#0A0A12] text-white" : "bg-white text-slate-900";
  const cardBg = isNight ? "bg-[#16162A] border-white/10" : "bg-white border-slate-200";
  const subText = isNight ? "text-white/70" : "text-slate-600";
  const cheapestPriceId = top5.length
    ? top5.reduce((min, s) =>
        ((s.prices as any)[preferredFuel] as number) <
        ((min.prices as any)[preferredFuel] as number)
          ? s
          : min
      ).id
    : null;

  return (
    <div className={`min-h-screen ${bg} pb-[env(safe-area-inset-bottom)]`}>
      {/* Header — minimum 48px tap targets, high contrast, no animation */}
      <header
        className={`sticky top-0 z-30 px-4 pt-[env(safe-area-inset-top)] py-3 flex items-center gap-3 border-b ${
          isNight ? "bg-[#0A0A12] border-white/10" : "bg-white border-slate-200"
        }`}
      >
        <button
          onClick={() => navigate("/")}
          className={`h-12 w-12 rounded-xl grid place-items-center text-2xl font-bold ${
            isNight ? "bg-white/10 hover:bg-white/20" : "bg-slate-100 hover:bg-slate-200"
          }`}
          aria-label="Volver"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight leading-tight">Modo conductor</h1>
          <p className={`text-sm ${subText} truncate`}>
            5 más cercanas · {FUEL_NAME[preferredFuel] ?? preferredFuel} · refresco 60 s
          </p>
        </div>
        <button
          onClick={speak}
          className={`h-12 w-12 rounded-xl grid place-items-center ${
            isNight ? "bg-amber-500 text-black" : "bg-amber-500 text-white"
          }`}
          aria-label="Leer en voz alta"
        >
          <Volume2 className="w-6 h-6" strokeWidth={2.5} />
        </button>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Status */}
        {!pos && !posError && (
          <div className={`rounded-2xl border p-6 flex items-center gap-3 ${cardBg}`}>
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-lg font-semibold">Obteniendo tu ubicación…</span>
          </div>
        )}

        {posError && (
          <div className={`rounded-2xl border p-6 ${cardBg}`}>
            <p className="text-lg font-bold mb-1">No pudimos ubicarte</p>
            <p className={`text-sm ${subText}`}>{posError}</p>
          </div>
        )}

        {pos && isLoading && (
          <div className={`rounded-2xl border p-6 flex items-center gap-3 ${cardBg}`}>
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-lg font-semibold">Cargando estaciones…</span>
          </div>
        )}

        {pos && !isLoading && top5.length === 0 && (
          <div className={`rounded-2xl border p-6 ${cardBg}`}>
            <p className="text-lg font-bold">Sin estaciones cercanas con precio disponible.</p>
          </div>
        )}

        {/* Giant cards */}
        {top5.map((s) => {
          const price = (s.prices as any)[preferredFuel] as number;
          const isCheapest = s.id === cheapestPriceId;
          return (
            <article
              key={s.id}
              className={`rounded-3xl border-2 p-5 ${cardBg} ${
                isCheapest ? "ring-2 ring-amber-500 border-amber-500" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-bold uppercase tracking-wide">
                      {s.brand}
                    </span>
                    {isCheapest && (
                      <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-black">
                        MÁS BARATA
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-semibold leading-tight truncate">{s.name}</p>
                  <p className={`text-sm ${subText} truncate flex items-center gap-1 mt-0.5`}>
                    <MapPin className="w-4 h-4 shrink-0" />
                    {s.address}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-xs uppercase font-semibold ${subText}`}>Distancia</div>
                  <div className="text-2xl font-extrabold tabular-nums">{s.distance} km</div>
                </div>
              </div>

              <div className="flex items-end justify-between gap-3 mb-4">
                <div>
                  <div className={`text-xs uppercase font-semibold ${subText}`}>
                    {FUEL_NAME[preferredFuel]}
                  </div>
                  <div
                    className={`text-5xl font-black tabular-nums leading-none mt-1 ${
                      isCheapest ? "text-amber-500" : ""
                    }`}
                  >
                    {fmt(price)}
                  </div>
                  <div className={`text-xs ${subText} mt-1`}>por litro</div>
                </div>
              </div>

              {/* One-tap directions — 56px tall, no confirmation */}
              <button
                onClick={() => openDirections(s, pos ?? undefined)}
                className="w-full h-14 rounded-2xl bg-amber-500 text-black text-lg font-extrabold flex items-center justify-center gap-3 active:bg-amber-600"
              >
                <Navigation className="w-6 h-6" strokeWidth={2.5} />
                Cómo llegar
              </button>
            </article>
          );
        })}

        {/* Llegué */}
        {pos && top5.length > 0 && (
          <button
            onClick={() => navigate("/")}
            className={`w-full h-14 rounded-2xl text-lg font-bold border-2 mt-2 ${
              isNight
                ? "border-white/30 text-white active:bg-white/10"
                : "border-slate-300 text-slate-900 active:bg-slate-100"
            }`}
          >
            Llegué — salir del modo conductor
          </button>
        )}
      </main>
    </div>
  );
};

export default Drive;
