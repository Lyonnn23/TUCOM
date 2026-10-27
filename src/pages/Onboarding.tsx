import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Fuel, MapPin, Check, LocateFixed, Car, ChevronRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useUserVehicles } from "@/hooks/useUserVehicles";
import { cn } from "@/lib/utils";

const FUELS = [
  { key: "gasoline93", label: "93", desc: "Bencina 93", color: "text-amber-500" },
  { key: "gasoline95", label: "95", desc: "Bencina 95", color: "text-primary" },
  { key: "gasoline97", label: "97", desc: "Bencina 97", color: "text-blue-500" },
  { key: "diesel", label: "Diésel", desc: "Petróleo Diésel", color: "text-emerald-500" },
  { key: "electric", label: "⚡", desc: "Eléctrico / kWh", color: "text-yellow-400" },
];

const CONSUMPTION_OPTIONS = [
  { value: 8, label: "8 km/L", desc: "SUV / camioneta grande" },
  { value: 11, label: "11 km/L", desc: "Auto familiar / sedan" },
  { value: 14, label: "14 km/L", desc: "Compacto / hatchback" },
  { value: 17, label: "17 km/L", desc: "Subcompacto / city car" },
];

const TOTAL_STEPS = 3;

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { preferences, save, defaults } = useUserPreferences();
  const { create: createVehicle } = useUserVehicles();

  const [step, setStep] = useState(0);
  const [fuel, setFuel] = useState(defaults.preferred_fuel ?? "gasoline95");
  const [consumption, setConsumption] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);

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
      // Create quick vehicle if consumption was picked
      if (consumption && fuel !== "electric") {
        try {
          await createVehicle.mutateAsync({
            nickname: "Mi auto",
            brand: "Otro",
            model: "Vehículo",
            year: new Date().getFullYear(),
            fuel_type: fuel as "gasoline93" | "gasoline95" | "gasoline97" | "diesel" | "electric",
            tank_size_l: Math.round(consumption * 4), // rough estimate
            consumption_kml: consumption,
            color: "hsl(220,70%,60%)",
          });
        } catch { /* non-fatal */ }
      }
      try { navigator.vibrate?.(20); } catch {}
      toast.success("¡Listo! Mostrándote las más baratas cerca tuyo 🎉");
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
        setLocationGranted(true);
        try { navigator.vibrate?.(15); } catch {}
        toast.success("¡Ubicación activada!");
      },
      () => {
        setRequestingLocation(false);
        toast.info("Puedes activarla más tarde desde Inicio");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };

  const next = () => {
    try { navigator.vibrate?.(10); } catch {}
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Top bar */}
      <div className="flex items-center justify-between py-4">
        <button
          className={cn(
            "text-xs font-medium text-muted-foreground transition-opacity",
            step === 0 ? "opacity-0 pointer-events-none" : "opacity-100"
          )}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          ← Atrás
        </button>
        <span className="text-xs font-semibold text-primary">
          {step + 1} / {TOTAL_STEPS}
        </span>
        {step < TOTAL_STEPS - 1 ? (
          <button
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setStep((s) => s + 1)}
          >
            Saltar
          </button>
        ) : (
          <span className="w-8" />
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-gradient-primary rounded-full transition-all duration-500"
          style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      {/* STEP 0: Combustible */}
      {step === 0 && (
        <div className="flex-1 flex flex-col max-w-md mx-auto w-full animate-fade-in">
          <div className="flex-1 flex flex-col justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-elegant mb-5">
              <Fuel className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="font-heading font-bold text-2xl mb-2">¿Qué combustible usas?</h1>
            <p className="text-sm text-muted-foreground mb-8">
              Lo destacaremos en cada estación para que encuentres el mejor precio.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {FUELS.map((f) => {
                const active = fuel === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => {
                      setFuel(f.key);
                      try { navigator.vibrate?.(10); } catch {}
                      setTimeout(() => next(), 220);
                    }}
                    className={cn(
                      "relative rounded-2xl border-2 p-4 text-left transition-all press-scale",
                      active
                        ? "border-primary bg-primary/5 shadow-elegant"
                        : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    <div className={`text-2xl font-extrabold font-heading ${f.color}`}>
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
          </div>
          <div className="pb-4 mt-6">
            <Button onClick={next} className="btn-primary w-full h-12 rounded-xl">
              Siguiente <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 1: Consumo del vehículo */}
      {step === 1 && (
        <div className="flex-1 flex flex-col max-w-md mx-auto w-full animate-fade-in">
          <div className="flex-1 flex flex-col justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-elegant mb-5">
              <Car className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="font-heading font-bold text-2xl mb-2">¿Cuánto consume tu auto?</h1>
            <p className="text-sm text-muted-foreground mb-8">
              Con esto calculamos cuánto gastas en cada viaje.
              <span className="block mt-1 text-xs text-muted-foreground/70">Puedes cambiarlo después en Perfil.</span>
            </p>
            <div className="space-y-2.5">
              {CONSUMPTION_OPTIONS.map((opt) => {
                const active = consumption === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setConsumption(opt.value);
                      try { navigator.vibrate?.(10); } catch {}
                      setTimeout(() => next(), 200);
                    }}
                    className={cn(
                      "w-full rounded-2xl border-2 px-4 py-3.5 text-left transition-all press-scale flex items-center justify-between",
                      active
                        ? "border-primary bg-primary/5 shadow-elegant"
                        : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    <div>
                      <p className="font-heading font-bold text-base text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                    {active && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="pb-4 mt-6">
            <Button onClick={next} className="btn-primary w-full h-12 rounded-xl">
              {consumption ? "Continuar" : "Saltar por ahora"} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Ubicación */}
      {step === 2 && (
        <div className="flex-1 flex flex-col max-w-md mx-auto w-full animate-fade-in">
          <div className="flex-1 flex flex-col justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-elegant mb-5">
              <MapPin className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="font-heading font-bold text-2xl mb-2">Encuentra lo más barato cerca</h1>
            <p className="text-sm text-muted-foreground mb-8">
              Tu ubicación se usa <strong className="text-foreground">solo en tu dispositivo</strong> para ordenar estaciones y calcular distancias. Nunca se comparte.
            </p>
            <div className="bg-card border border-border rounded-2xl p-5 text-center space-y-4 mb-4">
              {locationGranted ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-fuel-green/20 flex items-center justify-center">
                    <Check className="w-6 h-6 text-[hsl(var(--fuel-green))]" />
                  </div>
                  <p className="text-sm font-semibold text-[hsl(var(--fuel-green))]">¡Ubicación activada!</p>
                  <p className="text-xs text-muted-foreground">Verás las bencineras más baratas cerca tuyo.</p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <LocateFixed className="w-6 h-6" />
                  </div>
                  <p className="text-sm text-foreground">Mostramos un radio de 10 km para precios relevantes y cercanos.</p>
                  <Button type="button" variant="outline" onClick={requestLocation} disabled={requestingLocation} className="w-full h-11 rounded-xl">
                    <MapPin className="w-4 h-4 mr-2" />
                    {requestingLocation ? "Buscando ubicación…" : "Activar ubicación"}
                  </Button>
                </>
              )}
            </div>

            {/* Preview de beneficios */}
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { icon: "📍", label: "Estaciones cercanas" },
                { icon: "💰", label: "Precio más bajo" },
                { icon: "🚗", label: "Ruta óptima" },
              ].map(({ icon, label }) => (
                <div key={label} className="bg-card border border-border rounded-xl p-3">
                  <div className="text-xl mb-1">{icon}</div>
                  <p className="text-[10px] font-medium text-muted-foreground leading-tight">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="pb-4 mt-6">
            <Button
              onClick={finish}
              disabled={saving}
              className="btn-primary w-full h-12 rounded-xl text-base"
            >
              {saving ? "Guardando…" : "¡Listo, a ahorrar! 🎉"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
