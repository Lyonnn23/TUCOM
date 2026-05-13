import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, MapPin, Bell, User, Database, Lock, Mail } from "lucide-react";

const Privacy = () => {
  const navigate = useNavigate();
  const lastUpdated = "20 de abril de 2026";

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
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
              <h1 className="font-heading font-extrabold text-white text-lg leading-tight">Política de Privacidad</h1>
              <p className="text-[10px] text-white/70">TÜcom · Última actualización {lastUpdated}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5 text-sm leading-relaxed text-foreground">
        <section className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <h2 className="font-heading font-bold text-base">1. Introducción</h2>
          <p className="text-muted-foreground">
            En <strong>TÜcom</strong> ("la aplicación", "nosotros") respetamos tu privacidad. Esta política
            describe qué datos recopilamos, cómo los usamos, con quién los compartimos y los derechos que
            tienes sobre ellos. Esta política cumple con la Ley N° 19.628 de Protección de la Vida Privada
            de Chile, el Reglamento General de Protección de Datos (RGPD/GDPR) cuando aplique y los
            requisitos de Google Play y la App Store.
          </p>
        </section>

        <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-bold text-base">2. Datos que recopilamos</h2>
          </div>

          <div>
            <h3 className="font-semibold mb-1 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-fuel-cyan" /> 2.1 Ubicación geográfica (precisa)
            </h3>
            <p className="text-muted-foreground">
              Solicitamos acceso a tu ubicación <strong>solo mientras la app está en uso</strong>. La usamos para:
            </p>
            <ul className="list-disc pl-5 text-muted-foreground mt-1 space-y-1">
              <li>Mostrar las estaciones de servicio más cercanas a ti.</li>
              <li>Calcular el precio promedio de combustible en un radio de 15 km.</li>
              <li>Permitirte navegar a una estación con Google Maps o Waze.</li>
              <li>Enviar alertas de bajadas de precio cercanas (si las activas).</li>
            </ul>
            <p className="text-muted-foreground mt-1">
              <strong>No rastreamos tu ubicación en segundo plano</strong> y nunca la vendemos a terceros.
              Puedes revocar el permiso en cualquier momento desde los ajustes de tu dispositivo.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-primary" /> 2.2 Datos de cuenta (autenticación)
            </h3>
            <p className="text-muted-foreground">
              Si creas una cuenta, recopilamos: correo electrónico, nombre para mostrar y el proveedor de
              identidad usado (Email/Contraseña, Google o Apple). Tu contraseña se almacena con un hash
              irreversible. Usamos estos datos exclusivamente para autenticarte y atribuir tus reportes
              de precios. Nunca publicamos tu correo en la app.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1 flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-fuel-pink" /> 2.3 Notificaciones push
            </h3>
            <p className="text-muted-foreground">
              Si activas las notificaciones, almacenamos tu suscripción Web Push (endpoint, claves p256dh
              y auth) junto con tu ubicación aproximada y los tipos de combustible que te interesan, para
              avisarte cuando baje el precio cerca de ti. Puedes desactivarlas en cualquier momento.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">2.4 Reportes de precios de combustible</h3>
            <p className="text-muted-foreground">
              Cuando reportas un precio, guardamos: estación, tipo de combustible, valor reportado, fecha
              y tu ID de usuario. Esto permite agregar reportes (mediana) y mejorar la precisión para
              toda la comunidad. Los reportes se asocian a tu cuenta pero no se muestran públicamente
              con tu nombre.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">2.5 Datos técnicos</h3>
            <p className="text-muted-foreground">
              De forma agregada y anónima podemos registrar tipo de dispositivo, sistema operativo,
              versión de la app y errores, con el único fin de mejorar la estabilidad.
            </p>
          </div>
        </section>

        <section className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <h2 className="font-heading font-bold text-base">3. Datos públicos de combustible</h2>
          <p className="text-muted-foreground">
            Los precios, marcas, direcciones y servicios de las estaciones se obtienen desde fuentes
            públicas de referencia, incluyendo el portal de datos de combustibles de la
            <strong> Comisión Nacional de Energía (CNE) de Chile</strong>. Los datos de electrolineras
            provienen de <strong>Open Charge Map</strong>. Estos datos se sincronizan periódicamente y
            pueden contener variaciones respecto del precio final informado por cada estación.
          </p>
        </section>

        <section className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <h2 className="font-heading font-bold text-base">4. Cómo usamos tus datos</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Operar las funciones principales (mapa, precios, ranking, navegación).</li>
            <li>Personalizar el promedio de precios según tu zona.</li>
            <li>Enviarte notificaciones que tú mismo activas.</li>
            <li>Prevenir abusos y validar reportes de la comunidad.</li>
            <li>Cumplir obligaciones legales.</li>
          </ul>
          <p className="text-muted-foreground">
            <strong>No usamos tus datos para publicidad de terceros.</strong> No vendemos información
            personal.
          </p>
        </section>

        <section className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <h2 className="font-heading font-bold text-base">5. Con quién compartimos datos</h2>
          <ul className="list-disc pl-5 text-muted-foreground space-y-1">
            <li><strong>Proveedor de backend:</strong> almacenamos datos en una infraestructura tipo Postgres administrada con cifrado en reposo y tránsito.</li>
            <li><strong>Google Maps Platform:</strong> al cargar el mapa se comparten coordenadas con Google según su política.</li>
            <li><strong>Proveedores de identidad (Google, Apple):</strong> solo si decides iniciar sesión con ellos.</li>
            <li><strong>Servicio Web Push del navegador:</strong> para entregarte notificaciones.</li>
            <li><strong>Autoridades:</strong> únicamente cuando exista una orden legal vinculante.</li>
          </ul>
        </section>

        <section className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-bold text-base">6. Seguridad</h2>
          </div>
          <p className="text-muted-foreground">
            Aplicamos cifrado TLS en todas las comunicaciones, políticas de Row-Level Security (RLS)
            en la base de datos, hashing de contraseñas y verificación de tokens en cada solicitud.
            Aun así, ningún sistema es 100% infalible: te recomendamos usar contraseñas únicas.
          </p>
        </section>

        <section className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <h2 className="font-heading font-bold text-base">7. Retención y eliminación</h2>
          <p className="text-muted-foreground">
            Conservamos tus datos mientras tu cuenta esté activa. Puedes solicitar la eliminación
            completa de tu cuenta y datos asociados escribiéndonos al correo de contacto. Los reportes
            agregados (sin tu identificador) pueden conservarse con fines estadísticos.
          </p>
        </section>

        <section className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <h2 className="font-heading font-bold text-base">8. Tus derechos</h2>
          <p className="text-muted-foreground">
            Tienes derecho a acceder, rectificar, eliminar, portar y oponerte al tratamiento de tus
            datos personales, además de retirar el consentimiento en cualquier momento. Para
            ejercerlos, contáctanos por correo.
          </p>
        </section>

        <section className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <h2 className="font-heading font-bold text-base">9. Niños</h2>
          <p className="text-muted-foreground">
            TÜcom no está dirigida a menores de 13 años y no recopila conscientemente datos de niños.
            Si crees que un menor nos ha proporcionado información, contáctanos para eliminarla.
          </p>
        </section>

        <section className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <h2 className="font-heading font-bold text-base">10. Cambios a esta política</h2>
          <p className="text-muted-foreground">
            Podemos actualizar esta política. Publicaremos la nueva versión en esta misma página con
            la fecha de actualización. Si los cambios son significativos, te lo notificaremos en la app.
          </p>
        </section>

        <section className="bg-destructive/5 border border-destructive/30 rounded-2xl p-4 space-y-2">
          <h2 className="font-heading font-bold text-base">11. Eliminación de cuenta y datos</h2>
          <p className="text-muted-foreground">
            Puedes eliminar tu cuenta y todos los datos personales asociados en cualquier momento desde:{" "}
            <a href="/eliminar-cuenta" className="text-primary font-semibold underline">
              tucombustible.lovable.app/eliminar-cuenta
            </a>
            . Procesamos la solicitud en un plazo máximo de 30 días.
          </p>
        </section>

        <section className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-bold text-base">12. Contacto</h2>
          </div>
          <p className="text-muted-foreground">
            Para cualquier duda sobre privacidad o ejercer tus derechos, escríbenos a:{" "}
            <a href="mailto:privacidad@tucom.app" className="text-primary font-semibold underline">
              privacidad@tucom.app
            </a>
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
