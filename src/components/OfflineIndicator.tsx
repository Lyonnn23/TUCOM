import { useEffect, useRef, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { toast } from "sonner";

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  // Track if we've been offline at least once so we can show a "back online" toast
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    const goOffline = () => {
      setIsOffline(true);
      wasOfflineRef.current = true;
    };
    const goOnline = () => {
      setIsOffline(false);
      if (wasOfflineRef.current) {
        toast.success("Conexión restaurada", {
          description: "Actualizando datos…",
          icon: <Wifi className="w-4 h-4" />,
          duration: 3000,
        });
        wasOfflineRef.current = false;
      }
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      Sin conexión — mostrando datos en caché
    </div>
  );
}
