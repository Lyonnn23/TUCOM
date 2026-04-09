import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Share, MoreVertical, Plus, Smartphone, Monitor, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) setPlatform("ios");
    else if (/Android/.test(ua)) setPlatform("android");
    else setPlatform("desktop");

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => navigate("/")} className="p-1.5 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Instalar TÜcom</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <div className="text-center space-y-3">
          <img src="/icons/icon-192x192.png" alt="TÜcom" className="w-20 h-20 rounded-2xl mx-auto shadow-lg" />
          <h2 className="text-2xl font-bold text-foreground">Lleva TÜcom en tu bolsillo</h2>
          <p className="text-muted-foreground text-sm">
            Instala la app en tu teléfono para acceder rápido a los precios de bencina, incluso sin conexión.
          </p>
        </div>

        {/* Already installed */}
        {isInstalled && (
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
            <Check className="w-6 h-6 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold text-foreground text-sm">¡Ya está instalada!</p>
              <p className="text-muted-foreground text-xs">TÜcom ya está en tu dispositivo.</p>
            </div>
          </div>
        )}

        {/* Native install button (Android/Desktop Chrome) */}
        {deferredPrompt && !isInstalled && (
          <Button onClick={handleInstall} className="w-full gap-2 h-12 text-base rounded-xl">
            <Download className="w-5 h-5" />
            Instalar ahora
          </Button>
        )}

        {/* iOS Instructions */}
        {platform === "ios" && !isInstalled && (
          <div className="space-y-4">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <img src="/icons/icon-32x32.png" alt="" className="w-5 h-5 rounded" />
              Instrucciones para iPhone / iPad
            </h3>
            <div className="space-y-3">
              <Step number={1} icon={<Share className="w-5 h-5" />}>
                Abre <strong>Safari</strong> y visita <span className="text-primary font-medium">tucom.app</span>
              </Step>
              <Step number={2} icon={<Share className="w-5 h-5" />}>
                Toca el botón <strong>Compartir</strong> <Share className="w-4 h-4 inline text-primary" /> en la barra inferior
              </Step>
              <Step number={3} icon={<Plus className="w-5 h-5" />}>
                Desplázate y selecciona <strong>"Agregar a pantalla de inicio"</strong>
              </Step>
              <Step number={4} icon={<Check className="w-5 h-5" />}>
                Toca <strong>"Agregar"</strong> y listo — TÜcom aparecerá como una app
              </Step>
            </div>
          </div>
        )}

        {/* Android Instructions */}
        {platform === "android" && !isInstalled && !deferredPrompt && (
          <div className="space-y-4">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <img src="/icons/icon-32x32.png" alt="" className="w-5 h-5 rounded" />
              Instrucciones para Android
            </h3>
            <div className="space-y-3">
              <Step number={1} icon={<Monitor className="w-5 h-5" />}>
                Abre <strong>Chrome</strong> y visita <span className="text-primary font-medium">tucom.app</span>
              </Step>
              <Step number={2} icon={<MoreVertical className="w-5 h-5" />}>
                Toca el menú <strong>⋮</strong> (tres puntos) en la esquina superior derecha
              </Step>
              <Step number={3} icon={<Download className="w-5 h-5" />}>
                Selecciona <strong>"Instalar app"</strong> o <strong>"Agregar a pantalla de inicio"</strong>
              </Step>
              <Step number={4} icon={<Check className="w-5 h-5" />}>
                Confirma y listo — TÜcom se instalará como una app
              </Step>
            </div>
          </div>
        )}

        {/* Desktop Instructions */}
        {platform === "desktop" && !isInstalled && !deferredPrompt && (
          <div className="space-y-4">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Instrucciones para computador
            </h3>
            <div className="space-y-3">
              <Step number={1} icon={<Monitor className="w-5 h-5" />}>
                Abre <strong>Chrome</strong> o <strong>Edge</strong> y visita la app
              </Step>
              <Step number={2} icon={<Download className="w-5 h-5" />}>
                Haz clic en el ícono de <strong>instalación</strong> en la barra de direcciones
              </Step>
              <Step number={3} icon={<Check className="w-5 h-5" />}>
                Confirma la instalación y se abrirá como una app independiente
              </Step>
            </div>
          </div>
        )}

        {/* Benefits */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <h3 className="font-bold text-foreground text-sm">¿Por qué instalar TÜcom?</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              Acceso rápido desde la pantalla de inicio
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              Funciona sin conexión con datos en caché
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              Experiencia de pantalla completa como app nativa
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              Notificaciones de precios (próximamente)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

function Step({ number, icon, children }: { number: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 bg-card rounded-xl border border-border p-3">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <span className="text-primary font-bold text-sm">{number}</span>
      </div>
      <p className="text-sm text-foreground leading-relaxed pt-1">{children}</p>
    </div>
  );
}

export default Install;
