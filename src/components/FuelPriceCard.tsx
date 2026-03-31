import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { FuelPrice } from "@/hooks/useFuelPrices";

interface FuelPriceCardProps {
  fuel: FuelPrice;
}

const fuelColors: Record<string, string> = {
  "Bencina 93": "from-fuel-cyan/20 to-fuel-blue/10 border-fuel-cyan/30",
  "Bencina 95": "from-fuel-purple/20 to-fuel-pink/10 border-fuel-purple/30",
  "Bencina 97": "from-fuel-pink/20 to-fuel-amber/10 border-fuel-pink/30",
  "Diésel": "from-fuel-green/20 to-fuel-cyan/10 border-fuel-green/30",
};

const fuelEmoji: Record<string, string> = {
  "Bencina 93": "⛽",
  "Bencina 95": "🔵",
  "Bencina 97": "🟣",
  "Diésel": "🟢",
};

const FuelPriceCard = ({ fuel }: FuelPriceCardProps) => {
  const isUp = fuel.change > 0;
  const isDown = fuel.change < 0;
  const colorClass = fuelColors[fuel.type] ?? "from-muted to-muted border-border";

  return (
    <div className={`bg-gradient-to-r ${colorClass} rounded-2xl p-4 border flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{fuelEmoji[fuel.type] ?? "⛽"}</span>
        <div>
          <p className="text-xs font-semibold text-foreground tracking-wide">{fuel.type}</p>
          <p className="text-2xl font-heading font-bold text-foreground mt-0.5">
            ${fuel.price.toLocaleString("es-CL")}
          </p>
          <p className="text-[10px] text-muted-foreground">{fuel.unit}</p>
        </div>
      </div>
      <div
        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${
          isDown
            ? "bg-fuel-green/20 text-fuel-green"
            : isUp
            ? "bg-fuel-red/20 text-fuel-red"
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