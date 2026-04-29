import { useMemo, useState } from "react";
import { Smartphone, ChevronDown, ChevronUp, Settings, MapPin, RefreshCw, X } from "lucide-react";

type OS = "ios" | "android" | "desktop" | "unknown";

interface LocationPermissionGuideProps {
  errorType: "denied" | "unavailable" | "timeout" | "unsupported";
  onRetry: () => void;
  loading?: boolean;
  onDismiss?: () => void;
}

function detectOS(): OS {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  const platform = (navigator as any).userAgentData?.platform || navigator.platform || "";

  if (/iPhone|iPad|iPod/i.test(ua) || (platform === "MacIntel" && (navigator as any).maxTouchPoints > 1)) {
    return "ios";
  }
  if (/Android/i.test(ua)) return "android";
  if (/Windows|Macintosh|Linux/i.test(ua)) return "desktop";
  return "unknown";
}

function detectBrowser(): string {
  const ua = navigator.userAgent || "";
  if (/CriOS/i.test(ua)) return "Chrome iOS";
  if (/FxiOS/i.test(ua)) return "Firefox iOS";
  if (/EdgiOS/i.test(ua)) return "Edge iOS";
  if (/Edg\//i.test(ua)) return "Edge";
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return "Chrome";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return "Safari";
  return "tu navegador";
}

const IOS_STEPS = [
  { title: "Abre Ajustes del iPhone", detail: "Sal de la app y ve a la app Ajustes (icono de engranaje gris)." },
  { title: "Toca Privacidad y seguridad", detail: "Desplázate hacia abajo en la lista de Ajustes." },
  { title: "Selecciona Localización", detail: "Asegúrate que el interruptor superior 'Localización' esté activado (verde)." },
  { title: "Busca tu navegador o TÜcom", detail: "Si instalaste la app: busca 'TÜcom'. Si usas el navegador: busca Safari/Chrome." },
  { title: "Elige 'Al usar la app'", detail: "Selecciona esta opción en lugar de 'Nunca'. También activa 'Ubicación exacta'." },
  { title: "Vuelve a TÜcom y reintenta", detail: "Regresa a la app y toca el botón Reintentar." },
];

const ANDROID_STEPS = [
  { title: "Abre Ajustes del teléfono", detail: "Desliza hacia abajo desde arriba y toca el ícono de engranaje." },
  { title: "Ve a Ubicación", detail: "Busca 'Ubicación' en Ajustes (puede estar dentro de 'Privacidad' o 'Conexiones')." },
  { title: "Activa Ubicación", detail: "Asegúrate que el interruptor superior esté encendido." },
  { title: "Toca Permisos de apps de ubicación", detail: "Verás la lista de apps con acceso a tu ubicación." },
  { title: "Selecciona TÜcom o tu navegador", detail: "Si tienes la app instalada, busca 'TÜcom'. En navegador, busca Chrome." },
  { title: "Elige 'Permitir solo mientras se usa'", detail: "Y activa 'Usar ubicación precisa' si aparece la opción." },
  { title: "Vuelve y reintenta", detail: "Regresa a TÜcom y toca el botón Reintentar." },
];

const DESKTOP_STEPS = [
  { title: "Haz clic en el candado/icono al lado de la URL", detail: "En la barra de direcciones del navegador, junto al dominio." },
  { title: "Busca 'Ubicación' o 'Permisos del sitio'", detail: "Cambia el permiso de ubicación a 'Permitir'." },
  { title: "Recarga la página", detail: "Presiona F5 o Cmd/Ctrl + R y vuelve a tocar Reintentar." },
];

const LocationPermissionGuide = ({ errorType, onRetry, loading, onDismiss }: LocationPermissionGuideProps) => {
  const [expanded, setExpanded] = useState(true);
  const os = useMemo(() => detectOS(), []);
  const browser = useMemo(() => detectBrowser(), []);

  const steps = os === "ios" ? IOS_STEPS : os === "android" ? ANDROID_STEPS : DESKTOP_STEPS;
  const osLabel = os === "ios" ? "iPhone / iPad" : os === "android" ? "Android" : "Computadora";

  const headerCopy = useMemo(() => {
    if (errorType === "unsupported") {
      return {
        emoji: "❌",
        title: "Tu dispositivo no soporta GPS",
        body: "Lamentablemente este dispositivo o navegador no permite acceso a la ubicación.",
      };
    }
    if (errorType === "denied") {
      return {
        emoji: "🔒",
        title: "Permiso de ubicación denegado",
        body: `Para que TÜcom pueda mostrarte estaciones cercanas, necesitas permitir el acceso a tu ubicación en ${browser}.`,
      };
    }
    if (errorType === "timeout") {
      return {
        emoji: "⏱️",
        title: "El GPS está tardando demasiado",
        body: "Tu señal de GPS es débil. Acércate a una ventana o sal al exterior. Si el problema persiste, revisa los permisos.",
      };
    }
    return {
      emoji: "📡",
      title: "Servicio de ubicación no disponible",
      body: "Verifica que el GPS de tu dispositivo esté encendido y que TÜcom tenga permisos de ubicación.",
    };
  }, [errorType, browser]);

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-br from-[hsl(0,75%,55%)]/10 to-[hsl(45,93%,47%)]/10 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center text-xl shrink-0 shadow-sm">
              {headerCopy.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-heading font-bold text-sm text-foreground">{headerCopy.title}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{headerCopy.body}</p>
            </div>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors shrink-0"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {errorType !== "unsupported" && (
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={onRetry}
              disabled={loading}
              className="flex-1 text-xs font-semibold px-3 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Reintentando..." : "Reintentar GPS"}
            </button>
          </div>
        )}
      </div>

      {/* OS-specific guide */}
      {errorType !== "unsupported" && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              {os === "desktop" ? (
                <Settings className="w-4 h-4 text-primary" />
              ) : (
                <Smartphone className="w-4 h-4 text-primary" />
              )}
              <span className="text-xs font-semibold text-foreground">
                Guía paso a paso para {osLabel}
              </span>
            </div>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {expanded && (
            <div className="px-4 pb-4 space-y-2.5">
              {steps.map((step, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground leading-snug">{step.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{step.detail}</p>
                  </div>
                </div>
              ))}

              {/* Extra tips */}
              <div className="mt-3 p-2.5 rounded-xl bg-muted/40 border border-border/50">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  <MapPin className="w-3 h-3 inline mr-1 text-primary" />
                  <strong className="text-foreground">Tip:</strong>{" "}
                  {os === "ios"
                    ? "En iOS, si la app no aparece en la lista, ábrela una vez y vuelve a Ajustes."
                    : os === "android"
                      ? "En Android, también puedes mantener presionado el icono de TÜcom y tocar 'Información de la app' → Permisos."
                      : "Algunos navegadores bloquean GPS en sitios sin HTTPS. Usa la URL oficial."}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LocationPermissionGuide;
