import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Navigation,
  Mic,
  MicOff,
  Volume2,
  Loader2,
  MapPin,
  Star,
  TrendingUp,
  Fuel,
  BellOff,
  Bell,
} from "lucide-react";
import { useGasStations, calculateDistance, type GasStation } from "@/hooks/useGasStations";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useFavorites } from "@/hooks/useFavorites";
import { useFuelLogs } from "@/hooks/useFuelLogs";
import { useTankRange } from "@/hooks/useTankRange";
import { toast } from "sonner";

// ---- Constants -------------------------------------------------------------

const FUEL_NAME: Record<string, string> = {
  gasoline93: "93",
  gasoline95: "95",
  gasoline97: "97",
  diesel: "Diésel",
  electric: "Eléctrico",
};
const FUEL_SPEECH: Record<string, string> = {
  gasoline93: "bencina noventa y tres",
  gasoline95: "bencina noventa y cinco",
  gasoline97: "bencina noventa y siete",
  diesel: "diésel",
  electric: "carga eléctrica",
};
const BRAND_STRIP: Record<string, string> = {
  copec: "#1B3B8B",
  shell: "#DD1D21",
  aramco: "#00843D",
  petrobras: "#009639",
  enex: "#E30613",
  terpel: "#FFD100",
};

const fmt = (n: number) => `$${n.toLocaleString("es-CL")}`;

const openDirections = (s: GasStation, from?: { lat: number; lng: number }) => {
  const dest = `${s.lat},${s.lng}`;
  const url = from
    ? `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${dest}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;
  window.open(url, "_blank", "noopener,noreferrer");
};

// ---- Voice recognition -----------------------------------------------------

const getRecognition = (): any | null => {
  const W: any = window;
  const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = "es-CL";
  r.continuous = false;
  r.interimResults = false;
  r.maxAlternatives = 1;
  return r;
};

const speak = (text: string) => {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "es-CL";
  u.rate = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
};

// ---- Page ------------------------------------------------------------------

const DND_KEY = "tucom_driver_dnd";

const Drive = () => {
  const navigate = useNavigate();
  const { data: stations = [], isLoading } = useGasStations();
  const { preferences } = useUserPreferences();
  const { favorites } = useFavorites();
  const { logs } = useFuelLogs();
  const tankRange = useTankRange();
  const preferredFuel = preferences?.preferred_fuel ?? "gasoline95";

  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [posError, setPosError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [heardText, setHeardText] = useState<string>("");
  const [pendingNav, setPendingNav] = useState<GasStation | null>(null);
  const [dnd, setDnd] = useState<boolean>(() => {
    try { return localStorage.getItem(DND_KEY) === "1"; } catch { return false; }
  });
  const recogRef = useRef<any>(null);
  const wakeLockRef = useRef<any>(null);

  const lowThreshold = preferences?.low_fuel_threshold_km ?? 80;

  // Night mode (extra dark theme is already dark; we keep pure black always but
  // dim the strip overlay between 19:00–07:00).
  const isNight = useMemo(() => {
    const h = new Date().getHours();
    return h >= 19 || h < 7;
  }, []);

  // Wake lock — keep screen on while in driver mode
  useEffect(() => {
    const N: any = navigator;
    let released = false;
    const acquire = async () => {
      try {
        if (N.wakeLock?.request) {
          wakeLockRef.current = await N.wakeLock.request("screen");
        }
      } catch {/* ignore */}
    };
    acquire();
    const onVis = () => {
      if (document.visibilityState === "visible" && !released) acquire();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVis);
      try { wakeLockRef.current?.release?.(); } catch {}
      window.speechSynthesis?.cancel?.();
      recogRef.current?.abort?.();
    };
  }, []);

  // Night brightness hint (first time per night)
  useEffect(() => {
    if (!isNight) return;
    try {
      const k = "tucom_driver_night_hint";
      const last = localStorage.getItem(k);
      const today = new Date().toISOString().slice(0, 10);
      if (last !== today) {
        toast("Te sugerimos bajar el brillo de pantalla 🌙", { duration: 4000 });
        localStorage.setItem(k, today);
      }
    } catch {}
  }, [isNight]);

  // Geolocation: refresh every 60s
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
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Usual station — most-frequent station in fuel_logs
  const usualStationId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of logs) {
      if (!l.station_id) continue;
      counts.set(l.station_id, (counts.get(l.station_id) ?? 0) + 1);
    }
    let best: string | null = null;
    let max = 1; // require ≥2
    for (const [id, c] of counts) {
      if (c > max) { max = c; best = id; }
    }
    return best;
  }, [logs]);

  // Favorite price warning — if any favorite is now >3% over average of last 3 fill-ups there
  const favoriteWarnings = useMemo(() => {
    const out: { stationId: string; deltaClp: number; pct: number }[] = [];
    for (const fav of favorites) {
      const station = stations.find((s) => s.id === fav.station_id);
      if (!station) continue;
      const now = (station.prices as any)[preferredFuel] as number;
      if (!now) continue;
      const past = logs
        .filter((l) => l.station_id === fav.station_id && l.fuel_type === preferredFuel)
        .slice(0, 3)
        .map((l) => l.price_per_liter);
      if (past.length < 1) continue;
      const avg = past.reduce((a, b) => a + b, 0) / past.length;
      const delta = now - avg;
      const pct = (delta / avg) * 100;
      if (pct > 3) out.push({ stationId: fav.station_id, deltaClp: Math.round(delta), pct });
    }
    return out;
  }, [favorites, stations, logs, preferredFuel]);

  // 5 nearest with valid preferred-fuel price; pin usual first if within set
  const top5 = useMemo(() => {
    if (!pos) return [];
    const enriched = stations
      .map((s) => ({
        ...s,
        distance: Number(calculateDistance(pos.lat, pos.lng, s.lat, s.lng).toFixed(1)),
      }))
      .filter((s) => (s.prices as any)[preferredFuel] > 0)
      .sort((a, b) => a.distance! - b.distance!)
      .slice(0, 5);
    if (usualStationId) {
      const i = enriched.findIndex((s) => s.id === usualStationId);
      if (i > 0) {
        const [u] = enriched.splice(i, 1);
        enriched.unshift(u);
      }
    }
    return enriched;
  }, [stations, pos, preferredFuel, usualStationId]);

  const cheapest = useMemo(() => {
    if (top5.length === 0) return null;
    return [...top5].sort(
      (a, b) =>
        ((a.prices as any)[preferredFuel] as number) -
        ((b.prices as any)[preferredFuel] as number)
    )[0];
  }, [top5, preferredFuel]);

  // ---- Voice command handling --------------------------------------------

  const announceCheapest = () => {
    if (!cheapest) return;
    const price = (cheapest.prices as any)[preferredFuel] as number;
    const text = `La estación más barata es ${cheapest.brand} ${cheapest.name}, a ${cheapest.distance} kilómetros. El precio de ${FUEL_SPEECH[preferredFuel]} es ${price} pesos. ¿Quieres que te lleve allá?`;
    setHeardText(text);
    setPendingNav(cheapest as GasStation);
    speak(text);
  };

  const announceBrand = (brand: string) => {
    if (!pos) return;
    const candidates = stations
      .map((s) => ({
        ...s,
        distance: calculateDistance(pos.lat, pos.lng, s.lat, s.lng),
      }))
      .filter(
        (s) =>
          s.brand?.toLowerCase().includes(brand) &&
          ((s.prices as any)[preferredFuel] as number) > 0
      )
      .sort((a, b) => a.distance - b.distance);
    const target = candidates[0];
    if (!target) {
      speak(`No encontré estaciones de ${brand} cerca.`);
      return;
    }
    const price = (target.prices as any)[preferredFuel] as number;
    const text = `${target.brand} ${target.name} está a ${target.distance.toFixed(1)} kilómetros, con ${FUEL_SPEECH[preferredFuel]} a ${price} pesos. ¿Te llevo?`;
    setHeardText(text);
    setPendingNav(target as GasStation);
    speak(text);
  };

  const handleCommand = (raw: string) => {
    const t = raw.toLowerCase().trim();
    setHeardText(`Te escuché: "${raw}"`);
    if (pendingNav && /\b(s[ií]|dale|llévame|vamos|claro|ok)\b/.test(t)) {
      const target = pendingNav;
      setPendingNav(null);
      openDirections(target, pos ?? undefined);
      speak("Abriendo navegación.");
      return;
    }
    if (pendingNav && /\bno\b/.test(t)) {
      setPendingNav(null);
      speak("Listo, cancelado.");
      return;
    }
    if (/(más barata|mas barata|barata|barato|cheapest)/.test(t)) return announceCheapest();
    if (/copec/.test(t)) return announceBrand("copec");
    if (/shell/.test(t)) return announceBrand("shell");
    if (/aramco/.test(t)) return announceBrand("aramco");
    if (/petrobras/.test(t)) return announceBrand("petrobras");
    if (/enex/.test(t)) return announceBrand("enex");
    if (/terpel/.test(t)) return announceBrand("terpel");
    if (/(cerca|aquí|aqui|cercana)/.test(t)) {
      const first = top5[0];
      if (!first) return;
      const text = `La más cercana es ${first.brand} ${first.name}, a ${first.distance} kilómetros.`;
      setPendingNav(first as GasStation);
      setHeardText(text);
      speak(text + " ¿Te llevo?");
      return;
    }
    speak("No entendí. Puedes decir: la más barata, o el nombre de una marca.");
  };

  const startListening = () => {
    if (listening) {
      recogRef.current?.stop?.();
      return;
    }
    const r = getRecognition();
    if (!r) {
      toast.error("Tu navegador no soporta reconocimiento de voz");
      return;
    }
    recogRef.current = r;
    r.onstart = () => setListening(true);
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    r.onresult = (e: any) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? "";
      if (transcript) handleCommand(transcript);
    };
    try { r.start(); } catch {}
  };

  const toggleDnd = () => {
    setDnd((v) => {
      const nv = !v;
      try {
        localStorage.setItem(DND_KEY, nv ? "1" : "0");
      } catch {}
      toast(nv ? "No molestar activado" : "No molestar desactivado");
      return nv;
    });
  };

  // ---- Render -------------------------------------------------------------

  return (
    <div
      className="min-h-screen text-white pb-[env(safe-area-inset-bottom)] motion-reduce:transition-none"
      style={{ backgroundColor: "#0A0A0A" }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-30 px-4 pt-[env(safe-area-inset-top)] py-3 flex items-center gap-3 border-b border-white/10"
        style={{ backgroundColor: "#0A0A0A" }}
      >
        <button
          onClick={() => navigate(-1)}
          className="h-14 w-14 rounded-2xl grid place-items-center bg-white/10 active:bg-white/20"
          aria-label="Salir del modo conductor"
        >
          <ArrowLeft className="w-7 h-7" strokeWidth={2.5} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight leading-tight">
            Modo conductor
          </h1>
          <p className="text-base text-white/70 truncate">
            {FUEL_NAME[preferredFuel] ?? preferredFuel}
            {isNight ? " · 🌙 noche" : ""}
            {dnd ? " · 🔕 no molestar" : ""}
          </p>
        </div>
        <button
          onClick={toggleDnd}
          className={`h-14 w-14 rounded-2xl grid place-items-center ${dnd ? "bg-violet-600" : "bg-white/10 active:bg-white/20"}`}
          aria-label={dnd ? "Desactivar no molestar" : "Activar no molestar"}
        >
          {dnd ? <BellOff className="w-6 h-6" /> : <Bell className="w-6 h-6" />}
        </button>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Smart banners */}
        {tankRange && tankRange.remainingKm < lowThreshold && (
          <div className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 p-4 flex items-center gap-3">
            <Fuel className="w-7 h-7 text-amber-400 shrink-0" />
            <p className="text-lg font-bold leading-tight">
              Necesitas cargar pronto · te quedan ~{tankRange.remainingKm} km
            </p>
          </div>
        )}

        {favoriteWarnings.slice(0, 1).map((w) => {
          const st = stations.find((s) => s.id === w.stationId);
          if (!st) return null;
          return (
            <div key={w.stationId} className="rounded-2xl border-2 border-rose-500/50 bg-rose-500/10 p-4 flex items-center gap-3">
              <TrendingUp className="w-7 h-7 text-rose-400 shrink-0" />
              <p className="text-lg font-bold leading-tight">
                Hoy {st.brand} {st.name} está ${w.deltaClp} más cara que tu promedio
              </p>
            </div>
          );
        })}

        {/* Status */}
        {!pos && !posError && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin motion-reduce:animate-none" />
            <span className="text-xl font-semibold">Obteniendo tu ubicación…</span>
          </div>
        )}
        {posError && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xl font-bold mb-1">No pudimos ubicarte</p>
            <p className="text-base text-white/70">{posError}</p>
          </div>
        )}
        {pos && isLoading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin motion-reduce:animate-none" />
            <span className="text-xl font-semibold">Cargando estaciones…</span>
          </div>
        )}
        {pos && !isLoading && top5.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-xl font-bold">Sin estaciones cercanas con precio disponible.</p>
          </div>
        )}

        {/* Voice feedback */}
        {heardText && (
          <div className="rounded-2xl border border-violet-500/40 bg-violet-500/10 p-4">
            <p className="text-lg leading-snug">{heardText}</p>
            {pendingNav && (
              <p className="text-sm text-violet-200 mt-2">Di "sí" para que te lleve.</p>
            )}
          </div>
        )}

        {/* Giant station cards */}
        {top5.map((s) => {
          const price = (s.prices as any)[preferredFuel] as number;
          const isCheapest = cheapest?.id === s.id;
          const isUsual = usualStationId === s.id;
          const strip = BRAND_STRIP[s.brand?.toLowerCase()] ?? "#7C3AED";
          return (
            <article
              key={s.id}
              className="relative rounded-3xl border border-white/10 bg-[#16161A] overflow-hidden"
              style={{ minHeight: 160 }}
            >
              <span
                aria-hidden
                className="absolute left-0 top-0 bottom-0 w-2"
                style={{ backgroundColor: strip }}
              />
              <div className="pl-5 pr-5 py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-base font-bold uppercase tracking-wide text-white/80">
                        {s.brand}
                      </span>
                      {isUsual && (
                        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-violet-600 text-white inline-flex items-center gap-1">
                          <Star className="w-3 h-3" /> TU HABITUAL
                        </span>
                      )}
                      {isCheapest && (
                        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500 text-black">
                          MÁS BARATA
                        </span>
                      )}
                    </div>
                    <p className="text-[22px] font-bold leading-tight">{s.name}</p>
                    <p className="text-base text-white/60 mt-0.5 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span className="tabular-nums">{s.distance} km</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs uppercase font-bold text-white/50">
                      {FUEL_NAME[preferredFuel]}
                    </div>
                    <div
                      className={`text-[36px] font-black tabular-nums leading-none mt-1 ${
                        isCheapest ? "text-emerald-400" : "text-white"
                      }`}
                    >
                      {fmt(price)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => openDirections(s, pos ?? undefined)}
                  className="w-full rounded-2xl bg-violet-600 active:bg-violet-700 text-white text-xl font-extrabold flex items-center justify-center gap-3"
                  style={{ height: 56 }}
                >
                  <Navigation className="w-6 h-6" strokeWidth={2.5} />
                  Ir
                </button>
              </div>
            </article>
          );
        })}
      </main>

      {/* Voice FAB */}
      <button
        onClick={startListening}
        aria-label={listening ? "Escuchando" : "Activar comando de voz"}
        className={`fixed bottom-6 right-5 z-40 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-white active:scale-95 transition-transform motion-reduce:transition-none ${
          listening ? "bg-rose-600 animate-pulse motion-reduce:animate-none" : "bg-violet-600"
        }`}
      >
        {listening ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" strokeWidth={2.5} />}
      </button>

      {/* Read aloud secondary FAB */}
      <button
        onClick={announceCheapest}
        aria-label="Leer la más barata"
        className="fixed bottom-6 left-5 z-40 w-14 h-14 rounded-full bg-white/10 active:bg-white/20 shadow-xl flex items-center justify-center text-white"
      >
        <Volume2 className="w-6 h-6" />
      </button>
    </div>
  );
};

export default Drive;
