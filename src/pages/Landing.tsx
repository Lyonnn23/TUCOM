import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  MapPin,
  Map as MapIcon,
  Wallet,
  Smartphone,
  Bell,
  TrendingDown,
  Zap,
  Calculator,
  Download,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useFuelPrices } from "@/hooks/useFuelPrices";
import { formatPrice, formatLongDate } from "@/lib/format";

const Landing = () => {
  const navigate = useNavigate();
  const { data: prices } = useFuelPrices();

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  const openApp = () => {
    try {
      sessionStorage.setItem("tucom_guest_mode", "1");
    } catch {
      /* noop */
    }
    navigate("/?tab=estaciones");
  };

  const priceOf = (type: string) =>
    prices?.find((p) => p.type === type)?.price ?? null;

  const updatedAt =
    prices && prices.length
      ? formatLongDate(new Date())
      : "—";

  const fuels: Array<{ key: string; label: string }> = [
    { key: "gasoline93", label: "93" },
    { key: "gasoline95", label: "95" },
    { key: "gasoline97", label: "97" },
    { key: "diesel", label: "Diésel" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>TÜcom - Precio Bencina Chile Hoy | Mapa en tiempo real</title>
        <meta
          name="description"
          content="Encuentra la bencina más barata cerca tuyo. Precios de 93, 95, 97 y Diésel actualizados cada jueves en Chile. Gratis."
        />
        <meta
          name="keywords"
          content="precio bencina hoy chile, bencina mas barata, precio combustible santiago, bencina 95 precio hoy, MEPCO"
        />
        <link rel="canonical" href="https://tucombustible.cl/" />
        <meta property="og:title" content="TÜcom - Precio Bencina Chile Hoy" />
        <meta
          property="og:description"
          content="Compara precios de bencina 93, 95, 97 y Diésel en tiempo real en Chile."
        />
        <meta property="og:url" content="https://tucombustible.cl/" />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* NAV */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-extrabold text-lg">
            <span className="inline-flex w-8 h-8 rounded-xl items-center justify-center text-white" style={{ background: "var(--gradient-primary)" }}>
              T
            </span>
            <span>TÜcom</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              Iniciar sesión
            </Button>
            <Button size="sm" onClick={openApp} className="text-white" style={{ background: "var(--gradient-primary)" }}>
              Abrir app
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 opacity-90"
            style={{ background: "var(--gradient-hero)" }}
          />
          <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24 text-white">
            <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight tracking-tight max-w-3xl">
              El precio de la bencina más barata cerca de ti
            </h1>
            <p className="mt-5 text-lg sm:text-xl text-white/90 max-w-2xl">
              Compara precios de 93, 95, 97, Diésel y EV en tiempo real.
              Actualizado cada jueves con MEPCO.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={openApp}
                className="bg-white text-primary hover:bg-white/90 font-semibold"
              >
                Abrir app <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/install")}
                className="border-white/40 bg-white/10 text-white hover:bg-white/20"
              >
                <Download className="mr-2 h-4 w-4" /> Descargar para Android
              </Button>
            </div>
            <p className="mt-6 text-sm text-white/80">
              Gratis · Sin registro para explorar · +2.100 estaciones en Chile
            </p>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center">
            Cómo funciona
          </h2>
          <div className="mt-10 grid sm:grid-cols-3 gap-5">
            {[
              { icon: MapPin, t: "1. Activa tu ubicación", d: "Detectamos automáticamente las estaciones cerca tuyo." },
              { icon: MapIcon, t: "2. Ve precios en el mapa", d: "Mapa interactivo con precios actualizados y filtros por combustible." },
              { icon: Wallet, t: "3. Ahorra en cada carga", d: "Identifica la estación más barata y calcula tu ahorro." },
            ].map(({ icon: Icon, t, d }) => (
              <Card key={t} className="p-6 text-center border-border">
                <div
                  className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg">{t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{d}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* LIVE PRICES */}
        <section className="bg-muted/40 border-y border-border">
          <div className="max-w-6xl mx-auto px-4 py-16">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold">
                Precios promedio en Santiago hoy
              </h2>
              <p className="mt-2 text-muted-foreground text-sm">
                Promedio actualizado en tiempo real desde nuestra red de estaciones.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto">
              {fuels.map((f) => {
                const p = priceOf(f.key);
                return (
                  <Card key={f.key} className="p-5 text-center">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                      {f.label}
                    </div>
                    <div className="mt-1 text-2xl font-extrabold text-primary">
                      {p ? formatPrice(p) : "—"}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">CLP/L</div>
                  </Card>
                );
              })}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Actualizado: {updatedAt}
            </p>
            <div className="text-center mt-6">
              <Button onClick={openApp} variant="default" className="text-white" style={{ background: "var(--gradient-primary)" }}>
                Ver precios cerca de mí
              </Button>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center">
            Todo lo que necesitas para ahorrar
          </h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: TrendingDown, t: "Precios actualizados", d: "Sincronizados con CNE y reportes de la comunidad." },
              { icon: Bell, t: "Alertas de precio", d: "Te avisamos cuando baje el precio cerca de ti." },
              { icon: Calculator, t: "Calculadora de viaje", d: "Estima cuánto gastarás en bencina antes de salir." },
              { icon: Zap, t: "Cargadores EV", d: "Mapa de cargadores eléctricos en todo Chile." },
              { icon: Wallet, t: "Descuentos vigentes", d: "Beneficios por tarjeta y día de la semana." },
              { icon: Smartphone, t: "Funciona offline", d: "PWA instalable, rápida y liviana en cualquier celular." },
            ].map(({ icon: Icon, t, d }) => (
              <Card key={t} className="p-5 border-border">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{d}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* DOWNLOAD */}
        <section id="descargar" className="relative overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "var(--gradient-primary)" }}
          />
          <div className="relative max-w-4xl mx-auto px-4 py-16 text-center text-white">
            <h2 className="text-2xl sm:text-3xl font-bold">
              Descarga TÜcom gratis
            </h2>
            <p className="mt-3 text-white/90 max-w-xl mx-auto">
              Instálala como app en tu celular. Sin Play Store, sin publicidad,
              sin trackers invasivos.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                onClick={() => navigate("/install")}
                className="bg-white text-primary hover:bg-white/90 font-semibold"
              >
                <Smartphone className="mr-2 h-4 w-4" /> Instalar PWA
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/install")}
                className="border-white/40 bg-white/10 text-white hover:bg-white/20"
              >
                <Download className="mr-2 h-4 w-4" /> APK Android
              </Button>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-card border-t border-border">
          <div className="max-w-6xl mx-auto px-4 py-10 text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 font-extrabold text-base">
                  <span
                    className="inline-flex w-7 h-7 rounded-lg items-center justify-center text-white"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    T
                  </span>
                  TÜcom
                </div>
                <p className="text-muted-foreground mt-2 max-w-sm">
                  La forma más simple de encontrar bencina barata en Chile.
                </p>
              </div>
              <nav className="flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground">
                <Link to="/privacidad" className="hover:text-foreground">
                  Privacidad
                </Link>
                <Link to="/terminos" className="hover:text-foreground">
                  Términos
                </Link>
                <Link to="/contacto" className="hover:text-foreground">
                  Contacto
                </Link>
                <Link to="/mepco-info" className="hover:text-foreground">
                  MEPCO
                </Link>
                <Link to="/bencina" className="hover:text-foreground">
                  Por comuna
                </Link>
              </nav>
            </div>
            <div className="mt-8 pt-6 border-t border-border text-xs text-muted-foreground text-center">
              © {new Date().getFullYear()} TÜcom · Hecho en Chile 🇨🇱
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Landing;
