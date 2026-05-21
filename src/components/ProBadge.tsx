import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";

interface ProBadgeProps {
  className?: string;
  /** Render solo si el usuario es Pro (default true) */
  onlyIfPro?: boolean;
}

export function ProBadge({ className, onlyIfPro = true }: ProBadgeProps) {
  const { isPro } = useSubscription();
  if (onlyIfPro && !isPro) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-primary to-[hsl(245,75%,60%)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm",
        className,
      )}
      aria-label="Plan Pro activo"
    >
      <Crown className="h-2.5 w-2.5" />
      Pro
    </span>
  );
}
