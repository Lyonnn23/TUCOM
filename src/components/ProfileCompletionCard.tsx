import { Bell, Car, ChevronRight, CreditCard, UserRoundCheck, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useUserVehicles } from "@/hooks/useUserVehicles";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProfileCompletionCardProps {
  dismissible?: boolean;
  className?: string;
}

const ProfileCompletionCard = ({ dismissible = false, className }: ProfileCompletionCardProps) => {
  const navigate = useNavigate();
  const { preferences } = useUserPreferences();
  const { primary } = useUserVehicles();
  const [dismissed, setDismissed] = useState(false);

  const hasPayments = (preferences?.payment_methods?.length ?? 0) > 0;
  const hasNotifications = preferences?.notifications_enabled ?? false;
  const optionalComplete = Boolean(primary) && hasPayments && hasNotifications;
  if (dismissed || optionalComplete) return null;

  const personalizationComplete = hasPayments && hasNotifications;
  const completed = 2 + (primary ? 1 : 0) + (personalizationComplete ? 1 : 0);
  const missing = [
    !primary ? { icon: Car, label: "vehículo" } : null,
    !hasPayments ? { icon: CreditCard, label: "pagos" } : null,
    !hasNotifications ? { icon: Bell, label: "alertas" } : null,
  ].filter(Boolean) as { icon: typeof Car; label: string }[];

  return (
    <section className={cn("relative bg-card border border-border rounded-2xl p-4 shadow-soft", className)}>
      {dismissible && (
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute right-2 top-2 h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted"
          aria-label="Ocultar recordatorio"
        >
          <X className="h-4 w-4 mx-auto" />
        </button>
      )}
      <button
        type="button"
        onClick={() => navigate("/profile")}
        className="card-interactive w-full cursor-pointer text-left pr-8"
      >
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <UserRoundCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-base font-semibold text-foreground">Completa tu perfil</p>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Recomendaciones más precisas, a tu ritmo.</p>
            <Progress value={completed * 25} className="h-1.5 mt-3" />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-primary tabular-nums">{completed}/4 completado</span>
              <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
                {missing.slice(0, 3).map(({ icon: Icon, label }) => (
                  <span key={label} className="inline-flex items-center gap-1"><Icon className="h-3 w-3" />{label}</span>
                ))}
              </span>
            </div>
          </div>
        </div>
      </button>
    </section>
  );
};

export default ProfileCompletionCard;