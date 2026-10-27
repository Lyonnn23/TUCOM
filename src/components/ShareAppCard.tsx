/**
 * ShareAppCard — tarjeta para compartir TÜcom por WhatsApp o nativo.
 * Aparece en el perfil y puede mostrarse como modal post-ahorro.
 */
import { useState } from "react";
import { Share2, MessageCircle, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const APP_URL = "https://tucombustible.cl";

const SHARE_TEXT =
  "🚗⛽ ¿Ya usas TÜcom? Te ayuda a encontrar el combustible más barato cerca tuyo y calcula cuánto gastas en cada viaje. ¡Es gratis! 👉 " +
  APP_URL;

interface ShareAppCardProps {
  /** Contexto para personalizar el mensaje. "savings" agrega el texto de ahorro. */
  variant?: "default" | "savings";
  savingsAmount?: number;
  /** Si true, solo muestra botones sin el encabezado de la sección. */
  compact?: boolean;
}

export const ShareAppCard = ({
  variant = "default",
  savingsAmount,
  compact = false,
}: ShareAppCardProps) => {
  const [copied, setCopied] = useState(false);

  const buildText = () => {
    if (variant === "savings" && savingsAmount && savingsAmount > 0) {
      return (
        `🚗⛽ ¡Este mes ahorré $${savingsAmount.toLocaleString("es-CL")} en combustible usando TÜcom! ` +
        `Encuentra el más barato cerca tuyo en ${APP_URL} 🔥`
      );
    }
    return SHARE_TEXT;
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(buildText());
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
    try { navigator.vibrate?.(10); } catch {}
  };

  const shareNative = async () => {
    const text = buildText();
    try {
      if (navigator.share) {
        await navigator.share({ title: "TÜcom – Combustible más barato", text, url: APP_URL });
        try { navigator.vibrate?.(10); } catch {}
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Enlace copiado al portapapeles");
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // user cancelled or clipboard failed
    }
  };

  if (compact) {
    return (
      <div className="flex gap-2">
        <button
          onClick={shareWhatsApp}
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 text-sm font-semibold hover:bg-[#25D366]/20 transition-colors press-scale"
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp
        </button>
        <button
          onClick={shareNative}
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 text-sm font-semibold hover:bg-primary/20 transition-colors press-scale"
        >
          {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          {copied ? "¡Copiado!" : "Compartir"}
        </button>
      </div>
    );
  }

  return (
    <section className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 shadow-soft p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Share2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground text-sm">¿Te está ayudando TÜcom?</h2>
          <p className="text-xs text-muted-foreground">Cuéntale a tus amigos y ayúdalos a ahorrar también</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={shareWhatsApp}
          variant="outline"
          className="flex-1 h-10 rounded-xl border-[#25D366]/40 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 hover:border-[#25D366]/60 font-semibold text-sm"
        >
          <MessageCircle className="w-4 h-4 mr-1.5" />
          WhatsApp
        </Button>
        <Button
          onClick={shareNative}
          className="flex-1 h-10 rounded-xl btn-primary font-semibold text-sm"
        >
          {copied ? (
            <><Check className="w-4 h-4 mr-1.5" />¡Copiado!</>
          ) : (
            <><Share2 className="w-4 h-4 mr-1.5" />Compartir</>
          )}
        </Button>
      </div>
    </section>
  );
};

export default ShareAppCard;
