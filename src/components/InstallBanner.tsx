import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "tucom-install-dismissed-at";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const SHOW_DELAY_MS = 3000;

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

export default function InstallBanner() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (Date.now() - dismissedAt < DISMISS_TTL_MS) return;
    if (window.matchMedia?.("(display-mode: standalone)").matches) return;
    if ((window.navigator as unknown as { standalone?: boolean }).standalone) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    const timer = setTimeout(() => {
      setVisible(true);
      if (isIOS()) setIosHint(true);
      import("@/lib/analytics").then((m) => m.analytics.installPrompt(isIOS() ? "ios" : "native")).catch(() => {});
    }, SHOW_DELAY_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  const handleInstall = async () => {
    if (deferred) {
      try {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === "accepted") analytics.installAccepted();
        else analytics.installDismissed();
      } finally {
        setVisible(false);
        setDeferred(null);
      }
    } else if (isIOS()) {
      setIosHint(true);
    } else {
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    analytics.installDismissed();
  };

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md animate-fade-in">
      <div className="bg-gradient-hero text-white rounded-2xl shadow-elegant border border-white/10 p-4 flex items-center gap-3 backdrop-blur-sm">
        <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-bold text-sm">Agregar a pantalla de inicio</p>
          <p className="text-xs text-white/85">
            {iosHint
              ? "Toca Compartir y luego “Agregar a inicio”."
              : "Instala TÜcom para acceso rápido sin navegador."}
          </p>
        </div>
        {!iosHint && (
          <Button
            size="sm"
            onClick={handleInstall}
            className="bg-white text-primary hover:bg-white/95 rounded-xl font-semibold"
          >
            Agregar
          </Button>
        )}
        <button
          onClick={handleDismiss}
          aria-label="Cerrar"
          className="w-8 h-8 rounded-lg hover:bg-white/15 flex items-center justify-center shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
