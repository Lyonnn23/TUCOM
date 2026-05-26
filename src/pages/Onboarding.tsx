import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Fuel, MapPin, Bell, Check, Car, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useUserVehicles } from "@/hooks/useUserVehicles";
import { VEHICLE_PRESETS, VEHICLE_COLORS } from "@/lib/vehiclePresets";
import { cn } from "@/lib/utils";
import PaymentMethodsPicker from "@/components/PaymentMethodsPicker";

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
  const { create: createVehicle, vehicles } = useUserVehicles();

  const [step, setStep] = useState(0);
  const [fuel, setFuel] = useState(defaults.preferred_fuel);
  const [radius, setRadius] = useState(defaults.search_radius_km);
  const [vehiclePresetIdx, setVehiclePresetIdx] = useState<string>("skip");
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/welcome", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (preferences?.onboarding_completed) navigate("/", { replace: true });
  }, [preferences, navigate]);

  const saveVehicleIfSelected = async () => {
    if (vehiclePresetIdx === "skip") return;
    if ((vehicles?.length ?? 0) > 0) return;
    const preset = VEHICLE_PRESETS[Number(vehiclePresetIdx)];
    if (!preset) return;
    try {
      await createVehicle.mutateAsync({
        nickname: null,
        brand: preset.brand,
        model: preset.model,
        year: null,
        fuel_type: preset.fuel_type,
        tank_size_l: preset.tank_size_l,
        consumption_kml: preset.consumption_kml,
        color: VEHICLE_COLORS[0],
        is_primary: true,
      });
    } catch {
      // no bloquear el onboarding si falla
    }
  };

  const finish = async (notificationsEnabled: boolean) => {
    setSaving(true);
    try {
      await saveVehicleIfSelected();
      await save({
        preferred_fuel: fuel,
        search_radius_km: radius,
        notifications_enabled: notificationsEnabled,
        onboarding_completed: true,
        payment_methods: paymentMethods,
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

  const TOTAL_STEPS = 5;
  const next = () => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  const skip = () => {
    if (step < TOTAL_STEPS - 1) next();
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
      icon: Car,
      title: "¿Cuál es tu auto?",
      subtitle: "Lo usaremos para calcular el costo de tus viajes.",
    },
    {
      icon: CreditCard,
      title: "¿Qué tarjetas o apps usas?",
      subtitle: "Te mostraremos el precio real con tu mejor descuento.",
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
          Paso {step + 1} de {TOTAL_STEPS}
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
          <div className="w-full space-y-3">
            <Select value={vehiclePresetIdx} onValueChange={setVehiclePresetIdx}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="Selecciona tu auto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="skip">Prefiero configurarlo después</SelectItem>
                {VEHICLE_PRESETS.map((p, i) => (
                  <SelectItem key={`${p.brand}-${p.model}-${i}`} value={String(i)}>
                    {p.brand} {p.model} · {p.consumption_kml} km/L
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground text-center">
              Podrás editarlo o agregar más autos desde tu perfil.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="w-full space-y-3">
            <PaymentMethodsPicker value={paymentMethods} onChange={setPaymentMethods} />
            <p className="text-xs text-muted-foreground text-center">
              Puedes cambiar esto en tu perfil cuando quieras.
            </p>
          </div>
        )}

        {step === 4 && (
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

        {step < TOTAL_STEPS - 1 ? (
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
