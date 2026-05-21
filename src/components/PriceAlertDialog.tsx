import { useState } from "react";
import { Bell } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallModal } from "@/components/PaywallModal";

const FUEL_OPTIONS = [
  { key: "gasoline93", label: "93" },
  { key: "gasoline95", label: "95" },
  { key: "gasoline97", label: "97" },
  { key: "diesel", label: "Diésel" },
];

interface Props {
  stationId: string;
  prices: Record<string, number>;
}

export default function PriceAlertDialog({ stationId, prices }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { create, creating, alerts } = usePriceAlerts();
  const { isPro, limits } = useSubscription();
  const [open, setOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [fuel, setFuel] = useState("gasoline95");
  const [target, setTarget] = useState<string>("");

  const currentPrice = prices?.[fuel] || 0;
  const activeAlerts = alerts?.filter((a) => a.active).length ?? 0;
  const atLimit = !isPro && activeAlerts >= limits.alerts;

  const handleClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      toast.error("Inicia sesión para crear alertas");
      navigate("/auth");
      return;
    }
    if (atLimit) {
      e.preventDefault();
      setPaywallOpen(true);
    }
  };

  const submit = () => {
    const tp = parseInt(target, 10);
    if (!tp || tp < 100 || tp > 5000) {
      toast.error("Ingresa un precio válido (100–5000)");
      return;
    }
    create(
      { station_id: stationId, fuel_type: fuel, target_price: tp },
      {
        onSuccess: () => {
          setOpen(false);
          setTarget("");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          onClick={handleClick}
          className="w-full h-12 rounded-xl font-semibold border-primary/30 text-primary hover:bg-primary/5"
        >
          <Bell className="w-4 h-4 mr-2" /> Crear alerta de precio
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Nueva alerta de precio</DialogTitle>
          <DialogDescription>
            Te avisaremos cuando el precio baje del valor que elijas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-xs font-semibold">Combustible</Label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {FUEL_OPTIONS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFuel(f.key)}
                  className={`h-10 rounded-lg border text-sm font-bold transition-colors ${
                    fuel === f.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold">Precio objetivo (CLP)</Label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder={currentPrice ? `Ej: ${Math.max(100, currentPrice - 50)}` : "Ej: 1050"}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="mt-2 h-11 rounded-xl text-lg font-bold tabular-nums"
            />
            {currentPrice > 0 && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Precio actual: <span className="font-semibold text-foreground">${currentPrice}</span>
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={creating}>
            {creating ? "Creando..." : "Crear alerta"}
          </Button>
        </DialogFooter>
      </DialogContent>
      <PaywallModal
        open={paywallOpen}
        onOpenChange={setPaywallOpen}
        reason={`Llegaste al límite de ${limits.alerts} alertas del plan Básico. Hazte Pro para alertas ilimitadas.`}
      />
    </Dialog>
  );
}
