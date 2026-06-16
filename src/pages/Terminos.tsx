import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, AlertTriangle, Database, Shield, Gavel, Calendar } from "lucide-react";

const Terminos = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-to-r from-primary to-secondary px-4 pt-[env(safe-area-inset-top)] sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-3 py-3 max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white/15 text-white hover:bg-white/25 transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-white text-lg leading-tight">
                Términos y Condiciones
              </h1>
              <p className="text-[10px] text-white/70">TÜcom · Última actualización junio 2026</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5 text-sm leading-relaxed text-foreground">
        <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-bold text-base">
              1. Los precios son referenciales
            </h2>
          </div>
          <p className="text-muted-foreground">
            Los precios de combustible mostrados en TÜcom son <strong>referenciales, no oficiales ni garantizados</strong>. Pueden variar respecto al precio final cobrado en cada estación de servicio. Siempre verifica el precio en la bomba antes de cargar.
          </p>
        </section>

        <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-bold text-base">
              2. Independencia institucional
            </h2>
          </div>
          <p className="text-muted-foreground">
            TÜcom <strong>no es afiliado a la CNE, ENAP ni al gobierno de Chile</strong>. Somos una aplicación independiente desarrollada por particulares sin vínculo oficial con organismos públicos o empresas del sector energético.
          </p>
        </section>

        <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-bold text-base">
              3. Fuentes de datos
            </h2>
          </div>
          <p className="text-muted-foreground">
            Los datos se obtienen de <strong>fuentes públicas</strong> como bencinaenlinea.cl, el portal de datos de la Comisión Nacional de Energía (CNE) y Open Charge Map (electrolineras). La información se sincroniza periódicamente y puede contener desfases temporales.
          </p>
        </section>

        <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-bold text-base">
              4. Uso bajo propio riesgo
            </h2>
          </div>
          <p className="text-muted-foreground">
            El usuario usa la app <strong>bajo su propio riesgo</strong>. TÜcom no se hace responsable por decisiones de compra, rutas tomadas ni discrepancias de precio. La app se proporciona "tal cual" sin garantías de exactitud o disponibilidad continua.
          </p>
        </section>

        <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-bold text-base">
              5. Modificaciones
            </h2>
          </div>
          <p className="text-muted-foreground">
            Reservamos el derecho de <strong>modificar la app sin previo aviso</strong>, incluyendo funciones, diseño, precios mostrados y disponibilidad de servicios. El uso continuado de la aplicación después de cualquier cambio implica la aceptación de los términos actualizados.
          </p>
        </section>

        <section className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Gavel className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-bold text-base">
              6. Ley aplicable
            </h2>
          </div>
          <p className="text-muted-foreground">
            Estos términos se rigen por las leyes de la <strong>República de Chile</strong>. Cualquier controversia será sometida a los tribunales competentes de Santiago.
          </p>
        </section>

        <p className="text-center text-[11px] text-muted-foreground pt-2">
          © {new Date().getFullYear()} TÜcom · Hecho en Chile 🇨🇱
        </p>
      </main>
    </div>
  );
};

export default Terminos;
