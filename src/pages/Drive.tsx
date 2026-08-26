import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Navigation,
  Mic,
  Volume2,
  Loader2,
  MapPin,
  Star,
  TrendingUp,
  Fuel,
  BellOff,
  Bell,
  ExternalLink,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNearbyStations, type NearbyStationRow } from "@/hooks/useNearbyStations";
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

const isIOSDevice = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

type NavApp = "waze" | "google" | "apple";
const NAV_APP_KEY = "tucom_drive_nav_app";
const HELP_KEY = "tucom_drive_help_shown";

const navUrl = (app: NavApp, lat: number, lng: number, from?: { lat: number; lng: number }) => {
  if (app === "waze") return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  if (app === "apple") return `maps://maps.apple.com/?daddr=${lat},${lng}`;
  return from
    ? `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${lat},${lng}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
};

const openNav = (
  app: NavApp,
  lat: number,
  lng: number,
  from?: { lat: number; lng: number }
) => {
  window.open(navUrl(app, lat, lng, from), "_blank", "noopener,noreferrer");
};

const getPreferredNavApp = (): NavApp | null => {
  try {
    const v = localStorage.getItem(NAV_APP_KEY);
    return v === "waze" || v === "google" || v === "apple" ? v : null;
  } catch {
    return null;
  }
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

type DriveStation = NearbyStationRow & { distance: number };

const Drive = () => {
  const navigate = useNavigate();
  const { preferences } = useUserPreferences();
  const { favorites } = useFavorites();
  const { logs } = useFuelLogs();
  const tankRange = useTankRange();
  const preferredFuel = preferences?.preferred_fuel ?? "gasoline95";

  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [posError, setPosError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [heardText, setHeardText] = useState<string>("");
  const [pendingNav, setPendingNav] = useState<DriveStation | null>(null);
  const [navTarget, setNavTarget] = useState<DriveStation | null>(null);
  const [alwaysUse, setAlwaysUse] = useState(false);
  const [dnd, setDnd] = useState<boolean>(() => {
    try { return localStorage.getItem(DND_KEY) === "1"; } catch { return false; }
  });
  const recogRef = useRef<any>(null);
  const wakeLockRef = useRef<any>(null);

  const lowThreshold = preferences?.low_fuel_threshold_km ?? 80;

  // Nearby stations (10 km) — server-side, already sorted by distance
  const { data: nearbyData = [], isLoading } = useNearbyStations(
    pos?.lat ?? null,
    pos?.lng ?? null,
    10000,
    preferredFuel as any,
    20
  );

  // Slightly wider radius for favorites
  const { data: favNearby = [] } = useNearbyStations(
    pos?.lat ?? null,
    pos?.lng ?? null,
    15000,
    preferredFuel as any,
    100
  );

  // Night mode
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

  // Voice commands help — first time only
  useEffect(() => {
    let shown = false;
    try { shown = localStorage.getItem(HELP_KEY) === "1"; } catch {}
    if (shown) return;
    const t = window.setTimeout(() => {
      toast('🎙️ Di "la más barata", una marca, o "la más cercana"', { duration: 6000 });
      try { localStorage.setItem(HELP_KEY, "1"); } catch {}
    }, 2000);
    return () => clearTimeout(t);
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

  const toDriveStation = (r: NearbyStationRow): DriveStation => ({
    ...r,
    distance: Number((r.distance_m / 1000).toFixed(1)),
  });

  // Favorite price warning
  const favoriteWarnings = useMemo(() => {
    const out: { stationId: string; name: string; brand: string; deltaClp: number }[] = [];
    for (const fav of favorites) {
      const station = favNearby.find((s) => s.id === fav.station_id);
      const now = station?.price;
      if (!station || !now) continue;
      const past = logs
        .filter((l) => l.station_id === fav.station_id && l.fuel_type === preferredFuel)
        .slice(0, 3)
        .map((l) => l.price_per_liter);
      if (past.length < 1) continue;
      const avg = past.reduce((a, b) => a + b, 0) / past.length;
      const delta = now - avg;
      if ((delta / avg) * 100 > 3) {
        out.push({ stationId: fav.station_id, name: station.name, brand: station.brand, deltaClp: Math.round(delta) });
      }
    }
    return out;
  }, [favorites, favNearby, logs, preferredFuel]);

  // 5 nearest with valid preferred-fuel price; pin usual first
  const top5 = useMemo(() => {
    if (!pos) return [];
    const enriched = nearbyData
      .filter((s) => typeof s.price === "number" && (s.price as number) > 0)
      .slice(0, 5)
      .map(toDriveStation);
    if (usualStationId) {
      const i = enriched.findIndex((s) => s.id === usualStationId);
      if (i > 0) {
        const [u] = enriched.splice(i, 1);
        enriched.unshift(u);
      }
    }
    return enriched;
  }, [nearbyData, pos, usualStationId]);

  // Low-density area: >3 of the top5 are farther than 5 km
  const lowDensity = useMemo(
    () => top5.filter((s) => s.distance > 5).length > 3,
    [top5]
  );

  const cheapest = useMemo(() => {
    if (top5.length === 0) return null;
    return [...top5].sort((a, b) => (a.price as number) - (b.price as number))[0];
  }, [top5]);

  // Favorites nearby (within 15 km) that are not already in the top5
  const favoritesNearby = useMemo(() => {
    if (!pos || favorites.length === 0) return [];
    const favIds = new Set(favorites.map((f) => f.station_id));
    const topIds = new Set(top5.map((s) => s.id));
    return favNearby
      .filter(
        (s) =>
          favIds.has(s.id) &&
          !topIds.has(s.id) &&
          s.distance_m <= 15000 &&
          typeof s.price === "number" &&
          (s.price as number) > 0
      )
      .slice(0, 3)
      .map(toDriveStation);
  }, [favNearby, favorites, top5, pos]);

  // ---- Navigation ----------------------------------------------------------

  const requestNav = (s: DriveStation) => {
    const pref = getPreferredNavApp();
    if (pref) {
      openNav(pref, s.lat, s.lng, pos ?? undefined);
      return;
    }
    setAlwaysUse(false);
    setNavTarget(s);
  };

  const pickNavApp = (app: NavApp) => {
    if (!navTarget) return;
    if (alwaysUse) {
      try { localStorage.setItem(NAV_APP_KEY, app); } catch {}
    }
    openNav(app, navTarget.lat, navTarget.lng, pos ?? undefined);
    setNavTarget(null);
  };

  // ---- Voice command handling --------------------------------------------

  const announceCheapest = () => {
    if (!cheapest) return;
    const price = cheapest.price as number;
    const text = `La estación más barata es ${cheapest.brand} ${cheapest.name}, a ${cheapest.distance} kilómetros. El precio de ${FUEL_SPEECH[preferredFuel]} es ${price} pesos. ¿Quieres que te lleve allá?`;
    setHeardText(text);
    setPendingNav(cheapest);
    speak(text);
  };

  const announceBrand = (brand: string) => {
    if (!pos) return;
    const target = nearbyData
      .filter(
        (s) =>
          s.brand?.toLowerCase().includes(brand) &&
          typeof s.price === "number" &&
          (s.price as number) > 0
      )
      .map(toDriveStation)[0];
    if (!target) {
      speak(`No encontré estaciones de ${brand} cerca.`);
      return;
    }
    const text = `${target.brand} ${target.name} está a ${target.distance} kilómetros, con ${FUEL_SPEECH[preferredFuel]} a ${target.price} pesos. ¿Te llevo?`;
    setHeardText(text);
    setPendingNav(target);
    speak(text);
  };

  const handleCommand = (raw: string) => {
    const t = raw.toLowerCase().trim();
    setHeardText(`Te escuché: "${raw}"`);
    if (pendingNav && /\b(s[ií]|dale|llévame|vamos|claro|ok)\b/.test(t)) {
      const target = pendingNav;
      setPendingNav(null);
      // Voice flow: always Google Maps, no sheet (user is driving)
      openNav("google", target.lat, target.lng, pos ?? undefined);
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
      setPendingNav(first);
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

  // Tank range colour coding
  const rangeKm = tankRange?.remainingKm ?? 0;
  const rangeColor =
    rangeKm > 100 ? "text-emerald-400" : rangeKm >= 50 ? "text-amber-400" : "text-rose-400";
  const rangeEmoji = rangeKm > 100 ? "🟢" : rangeKm >= 50 ? "🟡" : "🔴";

  // ---- Render -------------------------------------------------------------

  return (
    <div
      className="min-h-screen text-white pb-[env(safe-area-inset-bottom)] motion-reduce:transition-none"
      style={{ backgroundColor: "#0A0A0A" }}
    >
      <style>{`
        @keyframes tucom-wave { 0%,100% { height: 8px } 50% { height: 20px } }
        .tucom-wave-bar {
          width: 4px; border-radius: 9999px; background: #fff;
          animation: tucom-wave 700ms ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .tucom-wave-bar { animation: none; height: 14px }
        }
      `}</style>

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
            {rangeKm > 0 && (
              <>
                {" · "}
                <span className={`font-bold ${rangeColor}`}>
                  ~{rangeKm}km restantes {rangeEmoji}
                </span>
              </>
            )}
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

        {favoriteWarnings.slice(0, 1).map((w) => (
          <div key={w.stationId} className="rounded-2xl border-2 border-rose-500/50 bg-rose-500/10 p-4 flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-rose-400 shrink-0" />
            <p className="text-lg font-bold leading-tight">
              Hoy {w.brand} {w.name} está ${w.deltaClp} más cara que tu promedio
            </p>
          </div>
        ))}

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
        {top5.map((s, idx) => {
          const price = s.price as number;
          const isCheapest = cheapest?.id === s.id;
          const isUsual = usualStationId === s.id;
          const isNearest = idx === 0 && (!usualStationId || top5[0].id !== usualStationId);
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
                      {isNearest && isCheapest && (
                        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500 text-black">
                          MÁS CERCANA Y MÁS ECONÓMICA
                        </span>
                      )}
                      {isNearest && !isCheapest && (
                        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500 text-black">
                          MÁS CERCANA
                        </span>
                      )}
                      {isCheapest && !isNearest && (
                        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500 text-black">
                          MÁS ECONÓMICA
                        </span>
                      )}
                    </div>
                    <p className="text-[22px] font-bold leading-tight">{s.name}</p>
                    <p className="text-base text-white/60 mt-0.5 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span className="tabular-nums">{s.distance} km</span>
                    </p>
                    {lowDensity && s.distance > 5 && (
                      <p className="text-sm text-amber-400/80 mt-0.5">
                        Algo lejos · considera esperar
                      </p>
                    )}
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
                  onClick={() => requestNav(s)}
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

        {/* Favorites nearby */}
        {favoritesNearby.length > 0 && (
          <section className="space-y-2 pt-2">
            <h2 className="text-lg font-bold text-white/80 px-1">Tus favoritas cercanas</h2>
            {favoritesNearby.map((s) => (
              <article
                key={s.id}
                className="rounded-2xl border border-white/10 bg-[#16161A] px-4 py-3 flex items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold truncate">
                    {s.brand} · {s.name}
                  </p>
                  <p className="text-sm text-white/60 tabular-nums">
                    {s.distance} km · {fmt(s.price as number)}
                  </p>
                </div>
                <button
                  onClick={() => requestNav(s)}
                  className="shrink-0 h-11 px-4 rounded-xl bg-violet-600 active:bg-violet-700 font-bold flex items-center gap-2"
                  aria-label={`Ir a ${s.name}`}
                >
                  <Navigation className="w-4 h-4" />
                  Ir
                </button>
              </article>
            ))}
          </section>
        )}
      </main>

      {/* Navigation app sheet */}
      <Sheet open={!!navTarget} onOpenChange={(v) => { if (!v) setNavTarget(null); }}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[max(env(safe-area-inset-bottom),1rem)]">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary" />
              ¿Cómo quieres ir?
            </SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-1 gap-2 mt-4">
            {([
              { key: "waze" as NavApp, label: "Waze", emoji: "🚗" },
              { key: "google" as NavApp, label: "Google Maps", emoji: "🗺️" },
              ...(isIOSDevice() ? [{ key: "apple" as NavApp, label: "Apple Maps", emoji: "🍎" }] : []),
            ]).map((a) => (
              <button
                key={a.key}
                onClick={() => pickNavApp(a.key)}
                className="flex items-center justify-between w-full rounded-xl border border-border bg-card hover:bg-muted/60 px-4 py-3 text-left transition-colors min-h-14"
              >
                <span className="flex items-center gap-3 font-semibold text-base text-foreground">
                  <span className="text-xl" aria-hidden="true">{a.emoji}</span>
                  {a.label}
                </span>
                <ExternalLink className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 mt-4 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={alwaysUse}
              onChange={(e) => setAlwaysUse(e.target.checked)}
              className="w-4 h-4 rounded border-border accent-primary"
            />
            Usar siempre esta app
          </label>
        </SheetContent>
      </Sheet>

      {/* Voice FAB */}
      <button
        onClick={startListening}
        aria-label={listening ? "Escuchando" : "Activar comando de voz"}
        className={`fixed bottom-6 right-5 z-40 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-white active:scale-95 transition-transform motion-reduce:transition-none ${
          listening ? "bg-rose-600" : "bg-violet-600"
        }`}
      >
        {listening ? (
          <span className="flex items-end gap-1 h-6" aria-hidden="true">
            <span className="tucom-wave-bar" style={{ height: 8, animationDelay: "0ms" }} />
            <span className="tucom-wave-bar" style={{ height: 8, animationDelay: "150ms" }} />
            <span className="tucom-wave-bar" style={{ height: 8, animationDelay: "300ms" }} />
          </span>
        ) : (
          <Mic className="w-7 h-7" strokeWidth={2.5} />
        )}
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
