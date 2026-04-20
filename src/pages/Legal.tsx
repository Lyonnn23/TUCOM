import { ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Legal = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "about";

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="about">Acerca de</TabsTrigger>
            <TabsTrigger value="terms">Términos</TabsTrigger>
            <TabsTrigger value="privacy">Privacidad</TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="mt-6 space-y-4 text-sm text-muted-foreground leading-relaxed">
            <h2 className="text-base font-semibold text-foreground">Acerca de TÜcom</h2>
            <p className="text-foreground font-medium">Tu compañero inteligente para ahorrar en combustible 🇨🇱</p>
            
            <p>TÜcom es la app chilena que te ayuda a encontrar los mejores precios de bencina y diésel cerca de ti. Compara precios en tiempo real, descubre estaciones cercanas en el mapa y aprovecha descuentos exclusivos con tus tarjetas y medios de pago.</p>

            <h3 className="font-semibold text-foreground">✨ Características principales</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Precios actualizados:</strong> Consulta los precios promedio de bencina 93, 95, 97 y diésel a nivel nacional</li>
              <li><strong>Mapa interactivo:</strong> Encuentra las estaciones de servicio más cercanas a tu ubicación con navegación directa</li>
              <li><strong>Reporta precios:</strong> Contribuye con la comunidad reportando los precios que encuentras en la calle</li>
              <li><strong>Beneficios y descuentos:</strong> Descubre qué días y con qué tarjetas puedes ahorrar más en cada cadena</li>
              <li><strong>Historial de precios:</strong> Visualiza la tendencia de precios para tomar mejores decisiones</li>
              <li><strong>Alertas inteligentes:</strong> Recibe notificaciones cuando baje el precio del combustible cerca de ti</li>
              <li><strong>Ranking de estaciones:</strong> Ve cuáles son las estaciones más baratas en tu zona</li>
            </ul>

            <h3 className="font-semibold text-foreground">🚗 ¿Para quién es TÜcom?</h3>
            <p>Para todos los conductores en Chile que quieren gastar menos en bencina. Ya sea que manejes todos los días al trabajo o solo los fines de semana, TÜcom te muestra dónde cargar más barato.</p>

            <h3 className="font-semibold text-foreground">💡 Datos confiables</h3>
            <p>Los precios se actualizan con información oficial y reportes de la comunidad de usuarios. Mientras más personas usen TÜcom, más precisos serán los precios.</p>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">Versión 1.0.0 · Hecho con 💜 en Chile</p>
            </div>
          </TabsContent>

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

            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3">
              <p className="text-foreground text-xs">
                📄 Para la versión completa y detallada que cumple con los requisitos de Google Play,{" "}
                <button
                  onClick={() => navigate("/privacy")}
                  className="text-primary font-semibold underline"
                >
                  ver política completa
                </button>
                .
              </p>
            </div>

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
