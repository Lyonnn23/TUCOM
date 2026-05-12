import { Info } from "lucide-react";
import { Link } from "react-router-dom";

interface UnofficialBannerProps {
  variant?: "compact" | "full";
  className?: string;
}

/**
 * Banner de no oficialidad. Refuerza cumplimiento de políticas (Google Play)
 * indicando que TÜcom no es una app gubernamental ni está afiliada a la CNE.
 */
const UnofficialBanner = ({ variant = "compact", className = "" }: UnofficialBannerProps) => {
  if (variant === "full") {
    return (
      <div
        role="note"
        aria-label="Aviso de no oficialidad"
        className={`bg-muted/60 border border-border rounded-2xl p-3 flex gap-2 ${className}`}
      >
        <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground">App independiente — no oficial.</strong>{" "}
          No afiliada a CNE, ENAP ni al Gobierno de Chile. Datos referenciales de fuentes
          públicas:{" "}
          <a
            href="https://www.cne.cl/combustibles/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            cne.cl
          </a>
          .{" "}
          <Link to="/legal" className="text-primary underline">
            Más info
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div
      role="note"
      aria-label="Aviso de no oficialidad"
      className={`bg-muted/50 border border-border rounded-xl px-3 py-2 flex items-center gap-2 ${className}`}
    >
      <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <p className="text-[10px] text-muted-foreground leading-tight">
        App <strong className="text-foreground">independiente, no oficial</strong>. Sin
        vínculo con CNE/Gobierno.{" "}
        <Link to="/legal" className="text-primary underline">
          Detalles
        </Link>
      </p>
    </div>
  );
};

export default UnofficialBanner;
