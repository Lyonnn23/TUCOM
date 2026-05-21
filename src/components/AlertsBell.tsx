import { Bell, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { useGasStations } from "@/hooks/useGasStations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const FUEL_LABEL: Record<string, string> = {
  gasoline93: "93",
  gasoline95: "95",
  gasoline97: "97",
  diesel: "Diésel",
};

export default function AlertsBell() {
  const navigate = useNavigate();
  const { alerts, unreadCount, markAllRead } = usePriceAlerts();
  const { data: stations } = useGasStations();

  const triggered = alerts.filter((a) => a.triggered).slice(0, 6);

  const stationName = (id: string) =>
    stations?.find((s) => s.id === id)?.name ?? "Estación";

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open && unreadCount > 0) markAllRead();
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          className="relative w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center transition-colors"
          aria-label="Alertas"
        >
          <Bell className="w-4 h-4 text-white" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-[10px] font-bold text-accent-foreground flex items-center justify-center ring-2 ring-primary">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Alertas de precio</span>
          <button
            onClick={() => navigate("/alertas")}
            className="text-xs font-medium text-primary hover:underline"
          >
            Ver todas
          </button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {triggered.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {alerts.length === 0
                ? "Aún no tienes alertas activas"
                : "Sin notificaciones nuevas"}
            </p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {triggered.map((a) => (
              <button
                key={a.id}
                onClick={() => navigate(`/station/${a.station_id}`)}
                className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
              >
                <p className="text-sm font-semibold text-foreground truncate">
                  {stationName(a.station_id)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {FUEL_LABEL[a.fuel_type] ?? a.fuel_type} bajó a{" "}
                  <span className="font-bold text-accent">${a.last_known_price ?? a.target_price}</span>{" "}
                  (objetivo ${a.target_price})
                </p>
              </button>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => navigate("/alertas")}
          >
            Gestionar alertas
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
