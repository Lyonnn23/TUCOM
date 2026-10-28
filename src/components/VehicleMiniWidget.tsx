import { useState } from "react";
import { Car, Fuel, TrendingDown, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserVehicles } from "@/hooks/useUserVehicles";
import { useConsumptionStats } from "@/hooks/useFuelStats";
import VehicleDialog from "@/components/VehicleDialog";

const FUEL_LABEL: Record<string, string> = {
  gasoline93: "93",
  gasoline95: "95",
  gasoline97: "97",
  diesel: "Diésel",
  electric: "EV",
};

const VehicleMiniWidget = () => {
  const navigate = useNavigate();
  const { primary, vehicles, isLoading } = useUserVehicles();
  const { data: stats } = useConsumptionStats(primary?.id ?? null);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) return null;

  if (!primary) {
    return (
      <>
        <button
          onClick={() => setDialogOpen(true)}
          className="card-interactive cursor-pointer w-full rounded-2xl border border-dashed border-border bg-card p-4 text-left flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Car className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Agrega tu vehículo</p>
            <p className="text-[11px] text-muted-foreground">Personaliza precios y cálculos para tu auto.</p>
          </div>
        </button>
        <VehicleDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </>
    );
  }

  const label = primary.nickname?.trim() || `${primary.brand} ${primary.model}`.trim();
  const fuel = FUEL_LABEL[primary.fuel_type] ?? primary.fuel_type;
  const tankUnit = primary.fuel_type === "electric" ? "kWh" : "L";

  // Show real consumption if available, fall back to configured value
  const displayKml = stats?.real_kml ?? primary.consumption_kml ?? null;
  const costPerKm = stats?.cost_per_km;

  return (
    <button
      onClick={() => navigate(`/profile/vehicle/${primary.id}`)}
      className="card-interactive cursor-pointer w-full rounded-2xl border border-border bg-card p-4 text-left flex items-center gap-3 shadow-soft"
      aria-label={`Tu vehículo activo: ${label}`}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
        style={{ backgroundColor: primary.color || "#7C3AED" }}
      >
        <Car className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">Tu {label}</p>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
          <Fuel className="w-3 h-3 shrink-0" aria-hidden="true" />
          {fuel} · Estanque {primary.tank_size_l}{tankUnit}
          {vehicles.length > 1 && <span className="ml-1">· {vehicles.length} autos</span>}
        </p>
        {/* Real consumption stats from logs */}
        {displayKml && displayKml > 0 && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <TrendingDown className="w-3 h-3 text-fuel-green shrink-0" aria-hidden="true" />
            {displayKml.toFixed(1)} km/L
            {costPerKm && costPerKm > 0 && (
              <span className="ml-1 text-muted-foreground/70">
                · ${Math.round(costPerKm).toLocaleString("es-CL")}/km
              </span>
            )}
            {stats?.real_kml && (
              <span className="ml-1 text-[9px] text-primary font-medium">real</span>
            )}
          </p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
    </button>
  );
};

export default VehicleMiniWidget;
