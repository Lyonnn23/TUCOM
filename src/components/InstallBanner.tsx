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
const IOS_HINT_KEY = "ios_hint_shown";
const SHOW_DELAY_MS = 30000;

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  if ((window.navigator as unknown as { standalone?: boolean }).standalone) return true;
  return false;
}

export default function InstallBanner() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosSheet, setIosSheet] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS one-time hint
    const iosTimer = setTimeout(() => {
      if (isIOS() && !localStorage.getItem(IOS_HINT_KEY) && !isStandalone()) {
        setIosSheet(true);
        analytics.installPrompt("ios");
      }
    }, SHOW_DELAY_MS);

    // Android install banner
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    const androidTimer = setTimeout(() => {
      if (isIOS()) return;
      if (Date.now() - dismissedAt < DISMISS_TTL_MS) return;
      if (isStandalone()) return;
      setVisible(true);
      analytics.installPrompt("native");
    }, SHOW_DELAY_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      clearTimeout(iosTimer);
      clearTimeout(androidTimer);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) {
      setVisible(false);
      return;
    }
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") analytics.installAccepted();
      else analytics.installDismissed();
    } finally {
      setVisible(false);
      setDeferred(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
    analytics.installDismissed();
  };

  const handleIosClose = () => {
    localStorage.setItem(IOS_HINT_KEY, "1");
    setIosSheet(false);
  };

  return (
    <>
      {visible && !iosSheet && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md animate-fade-in">
          <div className="bg-gradient-hero text-white rounded-2xl shadow-elegant border border-white/10 p-4 flex items-center gap-3 backdrop-blur-sm">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-bold text-sm">Instala TÜcom</p>
              <p className="text-xs text-white/85">
                Instala TÜcom para mejor experiencia.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleInstall}
              className="bg-white text-primary hover:bg-white/95 rounded-xl font-semibold"
            >
              Instalar
            </Button>
            <button
              onClick={handleDismiss}
              aria-label="Ahora no"
              className="text-xs text-white/85 hover:text-white px-2 py-1 rounded-md shrink-0"
            >
              Ahora no
            </button>
          </div>
        </div>
      )}

      {iosSheet && (
        <div
          className="fixed inset-0 z-[70] bg-black/50 flex items-end justify-center animate-fade-in"
          onClick={handleIosClose}
        >
          <div
            className="bg-card text-card-foreground rounded-t-3xl w-full max-w-md p-5 pb-8 shadow-elegant border border-border animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Instalar TÜcom en iOS"
          >
            <div className="flex items-start justify-between mb-3">
              <h2 className="font-heading font-bold text-lg">Instala TÜcom</h2>
              <button
                onClick={handleIosClose}
                aria-label="Cerrar"
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Para instalar: toca{" "}
              <span className="inline-flex items-center align-middle mx-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5 text-primary"
                  aria-label="Compartir"
                >
                  <path d="M12 3v12" />
                  <path d="m8 7 4-4 4 4" />
                  <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
                </svg>
              </span>{" "}
              en Safari y luego <strong>Añadir a pantalla de inicio</strong>.
            </p>
            <Button onClick={handleIosClose} className="w-full">
              Entendido
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
