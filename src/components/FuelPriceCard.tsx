import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { FuelPrice } from "@/data/fuelData";

interface FuelPriceCardProps {
  fuel: FuelPrice;
}

const FuelPriceCard = ({ fuel }: FuelPriceCardProps) => {
  const isUp = fuel.change > 0;
  const isDown = fuel.change < 0;

  return (
    <div className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{fuel.type}</p>
        <p className="text-2xl font-heading font-bold text-foreground mt-1">
          ${fuel.price.toLocaleString("es-CL")}
        </p>
        <p className="text-xs text-muted-foreground">{fuel.unit}</p>
      </div>
      <div
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
          isDown
            ? "bg-fuel-green/15 text-fuel-green"
            : isUp
            ? "bg-fuel-red/15 text-fuel-red"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {isDown ? <TrendingDown className="w-3.5 h-3.5" /> : isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
        {Math.abs(fuel.change)}%
      </div>
    </div>
  );
};

export default FuelPriceCard;
