import { Link } from "react-router-dom";
import { Crown, Check, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Mensaje contextual sobre el límite alcanzado */
  reason?: string;
}

const PRO_FEATURES = [
  "Alertas ilimitadas (vs. 3 en Free)",
  "Hasta 5 vehículos en tu perfil",
  "Historial de cargas ilimitado",
  "Favoritos ilimitados",
  "Gráficos de precios hasta 90 días",
  "Calculadora de rutas sin límite",
  "Reportes mensuales en PDF",
  "Acceso anticipado a nuevas funciones",
  "Insignia Pro y soporte prioritario",
];

export function PaywallModal({ open, onOpenChange, reason }: PaywallModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-primary/30">
        <div className="bg-gradient-to-br from-primary via-primary to-[hsl(245,75%,60%)] p-6 text-primary-foreground">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-5 w-5" />
            <span className="text-sm font-medium opacity-90">TÜcom Pro</span>
          </div>
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-2xl font-bold text-primary-foreground">
              Hazte Pro
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/90">
              {reason ?? "Desbloquea todo el potencial de TÜcom."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5">
          <ul className="space-y-2">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="rounded-xl bg-muted/50 p-4 text-center">
            <div className="text-3xl font-bold">$990<span className="text-base font-normal text-muted-foreground">/mes</span></div>
            <div className="text-xs text-muted-foreground mt-1">Menos de un café ☕</div>
          </div>

          <div className="space-y-2">
            <Button
              asChild
              size="lg"
              className="w-full bg-gradient-to-r from-primary to-[hsl(245,75%,60%)] text-primary-foreground hover:opacity-90"
            >
              <Link to="/planes" onClick={() => onOpenChange(false)}>
                <Sparkles className="h-4 w-4 mr-2" />
                Activar TÜcom Pro
              </Link>
            </Button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              Quizás después
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
