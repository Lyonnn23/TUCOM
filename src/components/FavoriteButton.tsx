import { useState } from "react";
import { Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallModal } from "@/components/PaywallModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";

interface Props {
  stationId: string;
  size?: "sm" | "md" | "lg";
  variant?: "glass" | "surface";
  className?: string;
}

const SIZES = {
  sm: { btn: "w-8 h-8", icon: "w-4 h-4" },
  md: { btn: "w-10 h-10", icon: "w-5 h-5" },
  lg: { btn: "w-12 h-12", icon: "w-6 h-6" },
};

const FavoriteButton = ({ stationId, size = "md", variant = "surface", className }: Props) => {
  const { user } = useAuth();
  const { favorites, isFavorite, toggle, toggling } = useFavorites();
  const { isPro, limits } = useSubscription();
  const navigate = useNavigate();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const active = isFavorite(stationId);
  const s = SIZES[size];

  const handle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      haptic("error");
      toast.error("Inicia sesión para guardar favoritos", {
        action: { label: "Entrar", onClick: () => navigate("/auth") },
      });
      return;
    }
    // Only block when ADDING (not when removing) and only on Free plan
    if (!active && !isPro && (favorites?.length ?? 0) >= limits.favorites) {
      haptic("error");
      setPaywallOpen(true);
      return;
    }
    haptic(active ? "light" : "success");
    toggle(stationId);
  };

  const base =
    variant === "glass"
      ? "bg-white/20 hover:bg-white/30 backdrop-blur-md text-white"
      : "bg-card border border-border hover:bg-muted text-foreground shadow-soft";

  return (
    <>
      <button
        onClick={handle}
        disabled={toggling}
        aria-label={active ? "Quitar de favoritos" : "Añadir a favoritos"}
        title={active ? "Quitar de favoritos" : "Añadir a favoritos"}
        className={cn(
          s.btn,
          base,
          "rounded-full flex items-center justify-center press-scale transition-all disabled:opacity-60",
          className,
        )}
      >
        <Heart
          key={String(active)}
          className={cn(
            s.icon,
            "transition-colors",
            active
              ? "fill-[hsl(0,75%,55%)] text-[hsl(0,75%,55%)] animate-spring-pop"
              : "fill-transparent",
          )}
          strokeWidth={2.25}
        />
      </button>
      <PaywallModal
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        reason={`Llegaste al límite de ${limits.favorites} favoritos del plan Básico. Hazte Pro para guardar todas las estaciones que quieras.`}
      />
    </>
  );
};

export default FavoriteButton;
