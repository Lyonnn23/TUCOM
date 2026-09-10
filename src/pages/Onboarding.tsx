import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Fuel, MapPin, Check, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { cn } from "@/lib/utils";

const FUELS = [
  { key: "gasoline93", label: "93", desc: "Bencina 93" },
  { key: "gasoline95", label: "95", desc: "Bencina 95" },
  { key: "gasoline97", label: "97", desc: "Bencina 97" },
  { key: "diesel", label: "Diésel", desc: "Petróleo Diésel" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { preferences, save, defaults } = useUserPreferences();
  const [step, setStep] = useState(0);
  const [fuel, setFuel] = useState(defaults.preferred_fuel);
  const [saving, setSaving] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/welcome", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (preferences?.onboarding_completed) navigate("/", { replace: true });
  }, [preferences, navigate]);

  const finish = async () => {
    setSaving(true);
    try {
      await save({
        preferred_fuel: fuel,
        search_radius_km: 10,
        onboarding_completed: true,
      });
      toast.success("¡Listo! Mostrándote las más baratas cerca tuyo");
      navigate("/", { replace: true });
    } catch {
      toast.error("No se pudieron guardar tus preferencias");
    } finally {
      setSaving(false);
    }
  };

  const requestLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.info("Puedes activar tu ubicación más tarde desde Inicio");
      return;
    }
    setRequestingLocation(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setRequestingLocation(false);
        toast.success("Ubicación activada");
      },
      () => {
        setRequestingLocation(false);
        toast.info("Puedes activarla más tarde desde Inicio");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const TOTAL_STEPS = 2;
  const next = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));

  const steps = [
    {
      icon: Fuel,
      title: "¿Qué combustible usas?",
      subtitle: "Lo destacaremos en cada estación.",
    },
    {
      icon: MapPin,
      title: "Encuentra lo más barato cerca",
      subtitle: "Tu ubicación se usa solo para ordenar estaciones y calcular distancias. Nunca se comparte.",
    },
  ];

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Top bar */}
      <div className="flex items-center justify-between py-4">
        <span className="text-xs font-medium text-muted-foreground">
          Paso {step + 1} de {TOTAL_STEPS}
        </span>
        <span className="text-xs font-semibold text-primary">Configuración esencial</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full animate-fade-in" key={step}>
        <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-elegant mb-5">
          <Icon className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="font-heading font-bold text-2xl text-center mb-2">{current.title}</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">{current.subtitle}</p>

        {step === 0 && (
          <div className="grid grid-cols-2 gap-3 w-full">
            {FUELS.map((f) => {
              const active = fuel === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => {
                    setFuel(f.key);
                    // Auto-advance after a brief beat so the user sees their pick
                    setTimeout(() => next(), 250);
                  }}
                  className={cn(
                    "relative rounded-2xl border-2 p-4 text-left transition-all press-scale",
                    active
                      ? "border-primary bg-primary/5 shadow-elegant"
                      : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  <div className="text-2xl font-extrabold font-heading text-foreground">
                    {f.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{f.desc}</div>
                  {active && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {step === 1 && (
          <div className="w-full bg-card border border-border rounded-2xl p-5 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <LocateFixed className="w-6 h-6" />
            </div>
            <p className="text-sm text-foreground">Usaremos un radio fijo de 10 km para mostrar precios relevantes y cercanos.</p>
            <Button type="button" variant="outline" onClick={requestLocation} disabled={requestingLocation} className="w-full h-11 rounded-xl">
              <MapPin className="w-4 h-4" />
              {requestingLocation ? "Buscando ubicación…" : "Activar ubicación"}
            </Button>
            <p className="text-xs text-muted-foreground">También puedes continuar y activarla después.</p>
          </div>
        )}
      </div>

      {/* Footer with progress + CTA */}
      <div className="max-w-md mx-auto w-full pb-4">
        <div className="flex items-center justify-center gap-2 mb-6">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-2 rounded-full transition-all",
                i === step ? "w-8 bg-primary" : "w-2 bg-muted"
              )}
            />
          ))}
        </div>

        {step === 0 ? (
          <Button
            onClick={next}
            className="btn-primary w-full h-12 rounded-xl"
          >
            Siguiente
          </Button>
        ) : (
          <Button onClick={finish} disabled={saving} className="btn-primary w-full h-12 rounded-xl">
            {saving ? "Guardando…" : "Listo, ¡a ahorrar!"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
