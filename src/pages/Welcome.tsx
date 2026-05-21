import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, MapPin, Bell, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/integrations/cloud-auth";
import { useFuelPrices } from "@/hooks/useFuelPrices";

function useAnimatedNumber(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!target) return;
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const Welcome = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [signing, setSigning] = useState(false);
  const { data: fuelPrices } = useFuelPrices();

  const lowest = fuelPrices?.length
    ? Math.min(...fuelPrices.filter((f) => f.type !== "electric").map((f) => f.price))
    : 0;
  const animatedLowest = useAnimatedNumber(lowest);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const handleGoogle = async () => {
    setSigning(true);
    try {
      const result = await auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("No se pudo iniciar sesión con Google");
        return;
      }
      if (result.redirected) return;
      navigate("/", { replace: true });
    } catch {
      toast.error("No se pudo iniciar sesión con Google");
    } finally {
      setSigning(false);
    }
  };

  const continueAsGuest = () => {
    try {
      sessionStorage.setItem("tucom_guest_mode", "1");
    } catch {}
    navigate("/", { replace: true });
  };

  const features = [
    { icon: TrendingDown, label: "Precios en tiempo real" },
    { icon: MapPin, label: "Estaciones cercanas" },
    { icon: Bell, label: "Alertas personalizadas" },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-animated-gradient flex flex-col items-center justify-center px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-32 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 w-96 h-96 rounded-full bg-accent/20 blur-3xl" />

      <div className="relative w-full max-w-sm flex flex-col items-center text-center text-white">
        {/* Logo */}
        <div className="w-28 h-28 rounded-[2rem] bg-white/15 backdrop-blur-md flex items-center justify-center shadow-2xl ring-1 ring-white/25 mb-6 animate-scale-in">
          <Zap className="w-14 h-14 text-white" strokeWidth={2.5} />
        </div>
        <h1 className="font-heading font-extrabold text-6xl tracking-tight mb-3">TÜcom</h1>
        <p className="text-white/90 text-base mb-6 leading-relaxed max-w-xs">
          Encuentra el combustible más barato cerca de ti
        </p>

        {/* Animated live price counter */}
        <div className="w-full mb-8 rounded-2xl bg-white/10 backdrop-blur-md ring-1 ring-white/20 px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-white/70 mb-1">
            Precio más bajo hoy
          </p>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-3xl font-extrabold tabular-nums animate-count-up">
              ${animatedLowest.toLocaleString("es-CL")}
            </span>
            <span className="text-sm text-white/80">CLP/L</span>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 w-full mb-8">
          {features.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 bg-white/10 rounded-2xl p-3 backdrop-blur-sm ring-1 ring-white/15"
            >
              <Icon className="w-5 h-5 text-white" />
              <span className="text-[10px] font-medium leading-tight">{label}</span>
            </div>
          ))}
        </div>

        {/* Google sign-in (Google brand guidelines) */}
        <Button
          onClick={handleGoogle}
          disabled={signing || loading}
          className="w-full h-12 rounded-xl bg-white hover:bg-white/95 text-[#1f1f1f] font-medium text-sm gap-3 shadow-lg hover-scale"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {signing ? "Conectando..." : "Iniciar sesión con Google"}
        </Button>

        <button
          onClick={() => navigate("/auth")}
          className="mt-3 text-xs text-white/80 hover:text-white underline-offset-2 hover:underline"
        >
          Usar email en su lugar
        </button>

        <button
          onClick={continueAsGuest}
          className="mt-4 text-xs text-white/70 hover:text-white underline underline-offset-2"
        >
          Continuar sin cuenta · funciones limitadas
        </button>

        <p className="mt-6 text-[11px] text-white/70 leading-relaxed">
          Al continuar aceptas los{" "}
          <button onClick={() => navigate("/legal?tab=terms")} className="underline">Términos</button>{" "}
          y la{" "}
          <button onClick={() => navigate("/privacy")} className="underline">Política de Privacidad</button>.
        </p>
      </div>
    </div>
  );
};

export default Welcome;
