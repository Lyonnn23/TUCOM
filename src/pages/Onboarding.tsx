import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Fuel, MapPin, Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
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
  const [radius, setRadius] = useState(defaults.search_radius_km);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/welcome", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (preferences?.onboarding_completed) navigate("/", { replace: true });
  }, [preferences, navigate]);

  const finish = async (notificationsEnabled: boolean) => {
    setSaving(true);
    try {
      await save({
        preferred_fuel: fuel,
        search_radius_km: radius,
        notifications_enabled: notificationsEnabled,
        onboarding_completed: true,
      });
      navigate("/", { replace: true });
    } catch {
      toast.error("No se pudieron guardar tus preferencias");
    } finally {
      setSaving(false);
    }
  };

  const requestNotifications = async () => {
    let granted = false;
    try {
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        granted = permission === "granted";
      }
    } catch {}
    if (granted) toast.success("Notificaciones activadas");
    await finish(granted);
  };

  const next = () => setStep((s) => Math.min(2, s + 1));
  const skip = () => {
    if (step < 2) next();
    else finish(false);
  };

  const steps = [
    {
      icon: Fuel,
      title: "¿Qué combustible usas?",
      subtitle: "Lo destacaremos en cada estación.",
    },
    {
      icon: MapPin,
      title: "¿Cuánto radio quieres buscar?",
      subtitle: "Te mostraremos estaciones dentro de esta distancia.",
    },
    {
      icon: Bell,
      title: "Activa notificaciones",
      subtitle: "Avísate cuando bajen los precios cerca de ti.",
    },
  ];

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Top bar */}
      <div className="flex items-center justify-between py-4">
        <span className="text-xs font-medium text-muted-foreground">
          Paso {step + 1} de 3
        </span>
        <button
          onClick={skip}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Omitir
        </button>
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
                  onClick={() => setFuel(f.key)}
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
          <div className="w-full">
            <div className="text-center mb-6">
              <div className="text-5xl font-extrabold font-heading text-gradient-primary tabular-nums">
                {radius}
                <span className="text-xl text-muted-foreground ml-1">km</span>
              </div>
            </div>
            <Slider
              value={[radius]}
              min={1}
              max={50}
              step={1}
              onValueChange={(v) => setRadius(v[0])}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>1 km</span>
              <span>50 km</span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="w-full rounded-2xl border border-border bg-card p-5 text-center">
            <p className="text-sm text-muted-foreground">
              Te enviaremos alertas cuando alguna estación cercana baje de tu precio objetivo.
              Puedes cambiarlo cuando quieras.
            </p>
          </div>
        )}
      </div>

      {/* Footer with progress + CTA */}
      <div className="max-w-md mx-auto w-full pb-4">
        <div className="flex items-center justify-center gap-2 mb-6">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "h-2 rounded-full transition-all",
                i === step ? "w-8 bg-primary" : "w-2 bg-muted"
              )}
            />
          ))}
        </div>

        {step < 2 ? (
          <Button
            onClick={next}
            className="w-full h-12 rounded-xl bg-gradient-primary text-primary-foreground font-semibold shadow-elegant hover-scale"
          >
            Siguiente
          </Button>
        ) : (
          <div className="space-y-2">
            <Button
              onClick={requestNotifications}
              disabled={saving}
              className="w-full h-12 rounded-xl bg-gradient-primary text-primary-foreground font-semibold shadow-elegant hover-scale"
            >
              {saving ? "Guardando..." : "Activar notificaciones"}
            </Button>
            <Button
              onClick={() => finish(false)}
              variant="ghost"
              disabled={saving}
              className="w-full h-11 rounded-xl"
            >
              Ahora no
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
