import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getConsent, setConsent } from "@/lib/analytics";
import { Link } from "react-router-dom";

const ConsentBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsent() === null) {
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  if (!visible) return null;

  const decide = (value: "granted" | "denied") => {
    setConsent(value);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Consentimiento de analítica"
      className="fixed bottom-24 sm:bottom-4 left-1/2 -translate-x-1/2 z-[70] w-[calc(100%-1.5rem)] max-w-md animate-fade-in"
    >
      <div className="rounded-2xl border border-border bg-card/95 backdrop-blur shadow-elegant p-3 space-y-2">
        <p className="text-xs text-foreground leading-snug">
          Usamos analítica anónima (sin datos personales) para mejorar la app. Lee
          nuestra{" "}
          <Link to="/privacidad" className="underline font-medium text-primary">
            Política de Privacidad
          </Link>
          .
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-9 rounded-xl text-xs"
            onClick={() => decide("denied")}
          >
            Rechazar
          </Button>
          <Button
            size="sm"
            className="flex-1 h-9 rounded-xl text-xs bg-gradient-primary text-primary-foreground"
            onClick={() => decide("granted")}
          >
            Aceptar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConsentBanner;
