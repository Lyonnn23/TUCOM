import { useEffect, useRef, useState } from "react";
import { Car } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const AUTO_KEY = "tucom_driver_auto";
const DISMISS_KEY = "tucom_driver_auto_dismissed_at";
const ENABLED_KEY = "tucom_driver_fab_enabled";

export const isDriverAutoEnabled = () => {
  try { return localStorage.getItem(AUTO_KEY) === "1"; } catch { return false; }
};
export const isDriverFabEnabled = () => {
  try { return localStorage.getItem(ENABLED_KEY) !== "0"; } catch { return true; }
};

const DriverModeFAB = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [autoPromptOpen, setAutoPromptOpen] = useState(false);
  const [fabOn, setFabOn] = useState(isDriverFabEnabled());
  const lastSpeedRef = useRef(0);
  const watchIdRef = useRef<number | null>(null);

  // re-evaluate enabled state when navigating back from settings
  useEffect(() => {
    setFabOn(isDriverFabEnabled());
  }, [location.pathname]);

  // Auto-detect speed > 15 km/h
  useEffect(() => {
    if (!isDriverAutoEnabled()) return;
    if (!("geolocation" in navigator)) return;
    if (location.pathname.startsWith("/conducir") || location.pathname.startsWith("/drive")) return;

    const id = navigator.geolocation.watchPosition(
      (p) => {
        const mps = p.coords.speed; // m/s — null if unsupported
        if (mps == null || Number.isNaN(mps)) return;
        const kmh = mps * 3.6;
        lastSpeedRef.current = kmh;
        if (kmh > 15) {
          // throttle: don't re-ask within 10 min
          let dismissed = 0;
          try { dismissed = Number(localStorage.getItem(DISMISS_KEY) || 0); } catch {}
          if (Date.now() - dismissed < 10 * 60 * 1000) return;
          setAutoPromptOpen(true);
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    watchIdRef.current = id;
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [location.pathname]);

  if (!fabOn) return null;
  if (location.pathname.startsWith("/conducir") || location.pathname.startsWith("/drive")) return null;

  const activate = () => {
    setOpen(false);
    setAutoPromptOpen(false);
    navigate("/conducir");
  };
  const dismissAuto = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setAutoPromptOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Activar modo conductor"
        className="fixed bottom-44 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-xl flex items-center justify-center active:scale-95 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
      >
        <Car className="w-6 h-6" strokeWidth={2.5} aria-hidden="true" />
      </button>

      <AlertDialog open={open || autoPromptOpen} onOpenChange={(v) => {
        if (!v) { setOpen(false); dismissAuto(); }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-violet-600" />
              ¿Activar modo conductor?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {autoPromptOpen
                ? "Detectamos que vas en movimiento. La interfaz se simplificará para mayor seguridad: textos grandes, una acción por toque y comandos por voz."
                : "La interfaz se simplificará para mayor seguridad: textos grandes, una acción por toque y comandos por voz."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={dismissAuto}>Ahora no</AlertDialogCancel>
            <AlertDialogAction
              onClick={activate}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              Activar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DriverModeFAB;
