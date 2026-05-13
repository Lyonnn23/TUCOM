import { Info, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

interface UnofficialBannerProps {
  variant?: "compact" | "full";
  className?: string;
  /** Identificador para persistir el estado de cerrado por pantalla */
  storageKey?: string;
}

/**
 * Banner de no oficialidad. Refuerza cumplimiento de políticas (Google Play)
 * indicando que TÜcom no es una app gubernamental ni está afiliada a la CNE.
 * Se puede cerrar y recuerda la preferencia del usuario.
 */
const UnofficialBanner = ({
  variant = "compact",
  className = "",
  storageKey = "tucom_unofficial_banner_dismissed",
}: UnofficialBannerProps) => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(storageKey) === "1");
    } catch {
      setDismissed(false);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {}
    setDismissed(true);
  };

  if (dismissed) return null;

  if (variant === "full") {
    return (
      <div
        role="note"
        aria-label="Aviso de no oficialidad"
        className={`relative bg-muted/60 border border-border rounded-2xl p-3 pr-9 flex gap-2 ${className}`}
      >
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground">App independiente — no oficial.</strong>{" "}
          No afiliada a CNE, ENAP ni al Gobierno de Chile. Datos referenciales obtenidos de
          fuentes públicas:{" "}
          <a
            href="https://api.cne.cl/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            api.cne.cl
          </a>
          .{" "}
          <Link to="/legal" className="text-primary underline">
            Más info
          </Link>
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Cerrar aviso"
          className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:bg-muted transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="note"
      aria-label="Aviso de no oficialidad"
      className={`relative bg-muted/50 border border-border rounded-xl pl-3 pr-8 py-2 flex items-center gap-2 ${className}`}
    >
      <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <p className="text-[10px] text-muted-foreground leading-tight">
        App <strong className="text-foreground">independiente, no oficial</strong>. Sin
        vínculo con CNE/Gobierno.{" "}
        <Link to="/legal" className="text-primary underline">
          Detalles
        </Link>
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Cerrar aviso"
        className="absolute top-1/2 -translate-y-1/2 right-1.5 p-1 rounded-full text-muted-foreground hover:bg-muted transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

export default UnofficialBanner;
