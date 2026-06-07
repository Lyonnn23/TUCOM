import { useEffect, useRef, useState } from "react";
import { Fuel, Map as MapIcon, Wallet, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "onboarding_complete";

type Slide = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
};

const SLIDES: Slide[] = [
  { icon: Fuel, title: "Bienvenido a TÜcom", subtitle: "La bencina más barata cerca de ti" },
  { icon: MapIcon, title: "Mapa inteligente de bencineras", subtitle: "Precios de 93, 95, 97, Diésel y EV" },
  { icon: Wallet, title: "Ahorra en cada carga", subtitle: "Calcula cuánto gastas en tu viaje" },
  { icon: MapPin, title: "Activa tu ubicación", subtitle: "Solo dentro de la app, nunca en segundo plano" },
];

const FirstRunOnboarding = () => {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "true") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  const complete = () => {
    try { localStorage.setItem(STORAGE_KEY, "true"); } catch {}
    setOpen(false);
  };

  const goTo = (next: number) => {
    if (next < 0 || next > SLIDES.length - 1 || next === index) return;
    setFade(false);
    window.setTimeout(() => {
      setIndex(next);
      setFade(true);
    }, 150);
  };

  const handleNext = () => {
    if (index < SLIDES.length - 1) goTo(index + 1);
  };

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      complete();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => complete(),
      () => complete(),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0) goTo(index + 1);
    else goTo(index - 1);
  };

  if (!open) return null;

  const slide = SLIDES[index];
  const Icon = slide.icon;
  const isLast = index === SLIDES.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenida"
      className="fixed inset-0 z-[100] flex flex-col px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] bg-gradient-to-br from-[#7C3AED] via-[#6D28D9] to-[#6366F1] text-white"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center justify-between py-4">
        <span className="text-xs font-medium text-white/80">
          {index + 1} / {SLIDES.length}
        </span>
        {!isLast && (
          <button
            onClick={complete}
            className="text-sm font-medium text-white/80 hover:text-white min-h-11 px-2"
          >
            Omitir
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
        <div
          className="flex flex-col items-center text-center transition-opacity duration-300 ease-in-out"
          style={{ opacity: fade ? 1 : 0 }}
        >
          <div className="w-24 h-24 rounded-[2rem] bg-white/15 backdrop-blur-md ring-1 ring-white/25 flex items-center justify-center shadow-2xl mb-6">
            <Icon className="w-12 h-12 text-white" />
          </div>
          <h1 className="font-heading font-extrabold text-3xl mb-3">{slide.title}</h1>
          <p className="text-base text-white/85 leading-relaxed max-w-xs">{slide.subtitle}</p>
        </div>
      </div>

      <div className="max-w-md mx-auto w-full pb-4">
        <div className="flex items-center justify-center gap-2 mb-6">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${i === index ? "w-8 bg-white" : "w-2 bg-white/40"}`}
            />
          ))}
        </div>

        {isLast ? (
          <div className="space-y-2">
            <Button
              onClick={requestLocation}
              className="w-full h-12 rounded-xl bg-white text-[#6D28D9] font-semibold hover:bg-white/95"
            >
              Activar ubicación
            </Button>
            <button
              onClick={complete}
              className="w-full h-11 rounded-xl text-sm text-white/85 hover:text-white"
            >
              Ahora no
            </button>
          </div>
        ) : (
          <Button
            onClick={handleNext}
            className="w-full h-12 rounded-xl bg-white text-[#6D28D9] font-semibold hover:bg-white/95"
          >
            Siguiente
          </Button>
        )}
      </div>
    </div>
  );
};

export default FirstRunOnboarding;
