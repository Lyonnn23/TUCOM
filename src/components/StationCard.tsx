import { MapPin, Navigation } from "lucide-react";
import type { GasStation } from "@/hooks/useGasStations";
import ReportPriceDialog from "./ReportPriceDialog";

interface StationCardProps {
  station: GasStation;
  onNavigate?: (station: GasStation) => void;
  onNavigateGoogle?: (station: GasStation) => void;
}

const StationCard = ({ station, onNavigate, onNavigateGoogle }: StationCardProps) => {
  return (
    <div className="bg-card rounded-xl p-4 shadow-sm border border-border">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-semibold text-foreground text-sm">{station.name}</h3>
            <span
              className={`w-2 h-2 rounded-full ${
                station.isOpen ? "bg-fuel-green animate-pulse-green" : "bg-fuel-red"
              }`}
            />
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" />
            {station.address}
          </p>
          {station.distance !== undefined && (
            <p className="text-xs text-fuel-blue font-medium mt-1">
              <Navigation className="w-3 h-3 inline mr-1" />
              {station.distance} km
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <ReportPriceDialog station={station} />
          <button
            onClick={() => onNavigateGoogle?.(station)}
            className="bg-muted text-foreground rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-muted/80 transition-colors"
          >
            Maps
          </button>
          <button
            onClick={() => onNavigate?.(station)}
            className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            Waze
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3">
        {[
          { label: "93", price: station.prices.gasoline93 },
          { label: "95", price: station.prices.gasoline95 },
          { label: "97", price: station.prices.gasoline97 },
          { label: "Diésel", price: station.prices.diesel },
        ].map((item) => (
          <div key={item.label} className="text-center bg-muted rounded-lg py-1.5 px-1">
            <p className="text-[10px] text-muted-foreground font-medium">{item.label}</p>
            <p className="text-xs font-bold text-foreground">${item.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StationCard;
