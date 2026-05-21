import { useState } from "react";
import { ArrowLeft, Check, Crown, Building2, Sparkles, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";

const FREE_FEATURES = [
  "Mapa y precios en tiempo real",
  "Búsqueda y filtros completos",
  "Hasta 3 alertas activas",
  "1 vehículo en tu perfil",
  "Historial de cargas (3 meses)",
  "Hasta 10 favoritos",
  "Sin publicidad",
];

const PRO_FEATURES = [
  "Todo lo del plan Básico",
  "Alertas ilimitadas",
  "Hasta 5 vehículos",
  "Historial de cargas ilimitado",
  "Favoritos ilimitados",
  "Gráficos de precios hasta 90 días",
  "Calculadora de rutas sin límite",
  "Reportes mensuales en PDF",
  "Acceso anticipado a nuevas funciones",
  "Insignia Pro y soporte prioritario",
];

const EMPRESA_FEATURES = [
  "Todo lo del plan Pro",
  "Vehículos ilimitados para flotas",
  "Dashboard de consumo por conductor",
  "API de precios para integraciones",
  "Facturación con datos de empresa",
  "Onboarding y soporte dedicado",
];

const WHATSAPP_EMPRESAS = "https://wa.me/56900000000?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20T%C3%9Ccom%20Empresas";

export default function Planes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro, subscription, refresh } = useSubscription();
  const [loadingPro, setLoadingPro] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const handleSubscribePro = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setLoadingPro(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan: "pro" },
      });
      if (error) throw error;
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast.info(
          data?.message ?? "Pasarela de pago en preparación. Te avisaremos cuando esté lista.",
        );
      }
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo iniciar el pago");
    } finally {
      setLoadingPro(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("¿Cancelar tu suscripción Pro? Mantendrás los beneficios hasta el fin del periodo pagado.")) {
      return;
    }
    setCanceling(true);
    try {
      const { error } = await supabase.functions.invoke("cancel-subscription", {});
      if (error) throw error;
      toast.success("Suscripción cancelada");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo cancelar la suscripción");
    } finally {
      setCanceling(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Planes y Precios | TÜcom Pro $990/mes</title>
        <meta
          name="description"
          content="Compara los planes de TÜcom: Básico gratis, Pro $990 CLP/mes con alertas ilimitadas y reportes PDF, y Empresas para flotas."
        />
      </Helmet>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
          <div className="container max-w-5xl flex items-center gap-3 py-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Volver">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">Planes</h1>
          </div>
        </header>

        <main className="container max-w-5xl py-8 space-y-8">
          <div className="text-center space-y-2">
            <Badge variant="outline" className="border-primary/30 text-primary">
              <Sparkles className="h-3 w-3 mr-1" />
              Elige tu plan
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Ahorra más con <span className="bg-gradient-to-r from-primary to-[hsl(245,75%,60%)] bg-clip-text text-transparent">TÜcom Pro</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Empieza gratis. Pásate a Pro cuando quieras desbloquear el máximo ahorro.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* FREE */}
            <Card className="p-6 flex flex-col">
              <div>
                <h3 className="text-xl font-bold">Básico</h3>
                <div className="mt-3 text-3xl font-bold">Gratis</div>
                <p className="text-xs text-muted-foreground mt-1">Para siempre, sin tarjeta</p>
              </div>
              <ul className="mt-6 space-y-2 flex-1">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" disabled className="mt-6 w-full">
                {!isPro ? "Tu plan actual" : "Plan Básico"}
              </Button>
            </Card>

            {/* PRO */}
            <Card className="p-6 flex flex-col relative border-primary/50 shadow-lg shadow-primary/10 md:scale-105">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-[hsl(245,75%,60%)] text-primary-foreground">
                Más popular
              </Badge>
              <div>
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-bold">Pro</h3>
                </div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">$990</span>
                  <span className="text-muted-foreground">CLP/mes</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Cancela cuando quieras</p>
              </div>
              <ul className="mt-6 space-y-2 flex-1">
                {PRO_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {isPro ? (
                <div className="mt-6 space-y-2">
                  <Button disabled className="w-full bg-gradient-to-r from-primary to-[hsl(245,75%,60%)] text-primary-foreground">
                    <Crown className="h-4 w-4 mr-2" />
                    Plan actual
                  </Button>
                  {subscription?.status === "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancel}
                      disabled={canceling}
                      className="w-full text-xs text-muted-foreground"
                    >
                      {canceling ? "Cancelando…" : "Cancelar suscripción"}
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  size="lg"
                  onClick={handleSubscribePro}
                  disabled={loadingPro}
                  className="mt-6 w-full bg-gradient-to-r from-primary to-[hsl(245,75%,60%)] text-primary-foreground hover:opacity-90"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {loadingPro ? "Cargando…" : "Activar TÜcom Pro"}
                </Button>
              )}
            </Card>

            {/* EMPRESA */}
            <Card className="p-6 flex flex-col">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  <h3 className="text-xl font-bold">Empresas</h3>
                </div>
                <div className="mt-3 text-3xl font-bold">Personalizado</div>
                <p className="text-xs text-muted-foreground mt-1">Para flotas y equipos</p>
              </div>
              <ul className="mt-6 space-y-2 flex-1">
                {EMPRESA_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="mt-6 w-full">
                <a href={WHATSAPP_EMPRESAS} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contactar ventas
                </a>
              </Button>
            </Card>
          </div>

          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>Pagos procesados de forma segura. Cancela cuando quieras desde tu perfil.</p>
            <p>
              ¿Dudas? <Link to="/legal" className="underline">Términos</Link> ·{" "}
              <Link to="/privacy" className="underline">Privacidad</Link>
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
