import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, MapPin, Mail, Database, Lock, Calendar } from "lucide-react";

const Privacy = () => {
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
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-white text-lg leading-tight">
                Política de Privacidad
              </h1>
              <p className="text-[10px] text-white/70">TÜcom · Última actualización junio 2026</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5 text-sm leading-relaxed text-foreground">
        <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-bold text-base">1. Qué datos recopilamos</h2>
          </div>
          <ul className="list-disc pl-5 text-muted-foreground space-y-2">
            <li>
              <strong>Ubicación GPS:</strong> solo mientras la app está abierta. La usamos para
              mostrarte estaciones cercanas y calcular distancias. No rastreamos tu ubicación en
              segundo plano.
            </li>
            <li>
              <strong>Email y nombre:</strong> si te registras con Google (u otro proveedor),
              guardamos tu correo y nombre de perfil para identificar tu cuenta.
            </li>
            <li>
              <strong>Vehículo preferido:</strong> guardado localmente en tu dispositivo y, si
              inicias sesión, también en tu cuenta para sincronizar entre dispositivos.
            </li>
            <li>
              <strong>Estaciones favoritas:</strong> las guardamos para que puedas acceder a ellas
              rápidamente desde tu lista de favoritos.
            </li>
          </ul>
        </section>

        <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-bold text-base">2. Para qué usamos los datos</h2>
          </div>
          <ul className="list-disc pl-5 text-muted-foreground space-y-2">
            <li>Mostrar estaciones de servicio cercanas a tu ubicación actual.</li>
            <li>Personalizar la calculadora con los datos de tu vehículo.</li>
            <li>Enviar alertas de precios si tú las activas explícitamente.</li>
          </ul>
        </section>

        <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-bold text-base">3. No vendemos ni compartimos datos con terceros</h2>
          </div>
          <p className="text-muted-foreground">
            Tu información personal no se vende, alquila ni comparte con terceros con fines
            comerciales. Los datos de ubicación se procesan en tiempo real y no se almacenan de
            forma permanente, salvo cuando guardas una estación como favorita o configuras una
            alerta de precio.
          </p>
        </section>

        <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-bold text-base">4. Cómo eliminar tu cuenta y datos</h2>
          </div>
          <p className="text-muted-foreground">
            Puedes solicitar la eliminación completa de tu cuenta y todos los datos asociados
            escribiéndonos a:{" "}
            <a
              href="mailto:contacto@tucombustible.cl"
              className="text-primary font-semibold underline"
            >
              contacto@tucombustible.cl
            </a>
            . Procesamos la solicitud en un plazo máximo de 30 días.
          </p>
        </section>

        <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-bold text-base">5. Cumplimiento legal</h2>
          </div>
          <p className="text-muted-foreground">
            Esta política cumple con la <strong>Ley 21.719 de Chile</strong> (vigente desde
            diciembre de 2026) y la <strong>Ley N° 19.628 sobre Protección de la Vida Privada</strong>.
            Tienes derecho a acceder, rectificar, eliminar y portar tus datos personales.
          </p>
        </section>

        <section className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-bold text-base">6. Fecha de última actualización</h2>
          </div>
          <p className="text-muted-foreground">
            Esta política fue actualizada por última vez en <strong>junio de 2026</strong>.
            Cualquier cambio significativo será notificado dentro de la app.
          </p>
        </section>

        <p className="text-center text-[11px] text-muted-foreground pt-2">
          © {new Date().getFullYear()} TÜcom · Hecho en Chile 🇨🇱
        </p>
      </main>
    </div>
  );
};

export default Privacy;
