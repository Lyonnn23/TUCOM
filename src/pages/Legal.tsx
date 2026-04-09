import { ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Legal = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "terms";

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Información Legal</h1>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <Tabs defaultValue={defaultTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="terms">Términos de Uso</TabsTrigger>
            <TabsTrigger value="privacy">Privacidad</TabsTrigger>
          </TabsList>

          <TabsContent value="terms" className="mt-6 space-y-4 text-sm text-muted-foreground leading-relaxed">
            <h2 className="text-base font-semibold text-foreground">Términos y Condiciones de Uso</h2>
            <p><strong>Última actualización:</strong> 9 de abril de 2026</p>

            <h3 className="font-semibold text-foreground">1. Aceptación</h3>
            <p>Al descargar, instalar o utilizar TuCom ("la Aplicación"), usted acepta estos Términos y Condiciones en su totalidad. Si no está de acuerdo, no utilice la Aplicación.</p>

            <h3 className="font-semibold text-foreground">2. Descripción del Servicio</h3>
            <p>TuCom es una aplicación informativa que muestra precios de combustibles, estaciones de servicio y beneficios asociados en Chile. Los precios son referenciales y pueden variar respecto al precio final en la estación.</p>

            <h3 className="font-semibold text-foreground">3. Propiedad Intelectual</h3>
            <p>Todo el contenido, diseño, código fuente, marcas y elementos visuales de la Aplicación son propiedad exclusiva de su autor y están protegidos por la Ley N° 17.336 sobre Propiedad Intelectual de Chile y tratados internacionales. Queda prohibida su reproducción, distribución o modificación sin autorización escrita.</p>

            <h3 className="font-semibold text-foreground">4. Uso Permitido</h3>
            <p>La Aplicación es para uso personal y no comercial. Queda prohibido:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Copiar, modificar o distribuir el software</li>
              <li>Realizar ingeniería inversa o descompilar el código</li>
              <li>Usar la Aplicación para fines ilegales</li>
              <li>Extraer datos de forma automatizada (scraping)</li>
            </ul>

            <h3 className="font-semibold text-foreground">5. Precios Reportados por Usuarios</h3>
            <p>Los usuarios autenticados pueden reportar precios. TuCom no garantiza la exactitud de los precios reportados por la comunidad. Reportar precios falsos intencionalmente puede resultar en la suspensión de la cuenta.</p>

            <h3 className="font-semibold text-foreground">6. Limitación de Responsabilidad</h3>
            <p>TuCom se proporciona "tal cual". No garantizamos la exactitud, disponibilidad o completitud de la información. No somos responsables por decisiones tomadas en base a la información proporcionada.</p>

            <h3 className="font-semibold text-foreground">7. Modificaciones</h3>
            <p>Nos reservamos el derecho de modificar estos términos en cualquier momento. El uso continuado de la Aplicación constituye aceptación de los términos modificados.</p>

            <h3 className="font-semibold text-foreground">8. Legislación Aplicable</h3>
            <p>Estos términos se rigen por las leyes de la República de Chile. Cualquier controversia será sometida a los tribunales competentes de Santiago.</p>
          </TabsContent>

          <TabsContent value="privacy" className="mt-6 space-y-4 text-sm text-muted-foreground leading-relaxed">
            <h2 className="text-base font-semibold text-foreground">Política de Privacidad</h2>
            <p><strong>Última actualización:</strong> 9 de abril de 2026</p>

            <h3 className="font-semibold text-foreground">1. Datos que Recopilamos</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Cuenta:</strong> Correo electrónico al registrarse</li>
              <li><strong>Ubicación:</strong> Coordenadas GPS (solo con su permiso) para mostrar estaciones cercanas</li>
              <li><strong>Notificaciones push:</strong> Token de suscripción si activa las alertas</li>
              <li><strong>Reportes de precios:</strong> Precios y estación asociada</li>
            </ul>

            <h3 className="font-semibold text-foreground">2. Cómo Usamos sus Datos</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Mostrar estaciones y precios cercanos a su ubicación</li>
              <li>Enviar alertas de precios bajos (si las activa)</li>
              <li>Mejorar la precisión de los precios con reportes comunitarios</li>
            </ul>

            <h3 className="font-semibold text-foreground">3. Compartición de Datos</h3>
            <p>No vendemos ni compartimos sus datos personales con terceros. Los datos de ubicación se procesan en tiempo real y no se almacenan de forma permanente salvo para suscripciones de notificaciones.</p>

            <h3 className="font-semibold text-foreground">4. Seguridad</h3>
            <p>Implementamos medidas de seguridad técnicas incluyendo cifrado en tránsito (HTTPS/TLS), políticas de acceso a nivel de fila en la base de datos, y autenticación segura.</p>

            <h3 className="font-semibold text-foreground">5. Sus Derechos</h3>
            <p>Conforme a la Ley N° 19.628 sobre Protección de Datos Personales de Chile, usted tiene derecho a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Acceder a sus datos personales</li>
              <li>Solicitar la corrección de datos inexactos</li>
              <li>Solicitar la eliminación de sus datos</li>
              <li>Revocar el consentimiento para el uso de ubicación</li>
            </ul>

            <h3 className="font-semibold text-foreground">6. Contacto</h3>
            <p>Para ejercer sus derechos o consultas sobre privacidad, contáctenos a través de la aplicación.</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Legal;
