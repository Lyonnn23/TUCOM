import { Car, Fuel } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserVehicles } from "@/hooks/useUserVehicles";

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

  if (isLoading) return null;

  if (!primary) {
    return (
      <button
        onClick={() => navigate("/mi-auto")}
        className="w-full mb-4 rounded-2xl border border-dashed border-border bg-card/60 p-3 text-left flex items-center gap-3 hover:bg-card transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Car className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Agrega tu vehículo</p>
          <p className="text-[11px] text-muted-foreground">Personaliza precios y cálculos para tu auto.</p>
        </div>
      </button>
    );
  }

  const label = primary.nickname?.trim() || `${primary.brand} ${primary.model}`.trim();
  const fuel = FUEL_LABEL[primary.fuel_type] ?? primary.fuel_type;
  const tankUnit = primary.fuel_type === "electric" ? "kWh" : "L";

  return (
    <button
      onClick={() => navigate("/mi-auto")}
      className="w-full mb-4 rounded-2xl border border-border bg-card p-3 text-left flex items-center gap-3 shadow-soft hover:shadow-elegant transition-all"
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
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Fuel className="w-3 h-3" /> {fuel} · Estanque {primary.tank_size_l}{tankUnit}
          {vehicles.length > 1 && <span className="ml-1">· {vehicles.length} autos</span>}
        </p>
      </div>
    </button>
  );
};

export default VehicleMiniWidget;
