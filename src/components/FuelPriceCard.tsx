import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { FuelPrice } from "@/hooks/useFuelPrices";

interface FuelPriceCardProps {
  fuel: FuelPrice;
}

const fuelColors: Record<string, string> = {
  gasoline93: "from-fuel-cyan/20 to-fuel-blue/10 border-fuel-cyan/30",
  gasoline95: "from-fuel-purple/20 to-fuel-pink/10 border-fuel-purple/30",
  gasoline97: "from-fuel-pink/20 to-fuel-amber/10 border-fuel-pink/30",
  diesel: "from-fuel-green/20 to-fuel-cyan/10 border-fuel-green/30",
};

const fuelEmoji: Record<string, string> = {
  gasoline93: "⛽",
  gasoline95: "🔵",
  gasoline97: "🟣",
  diesel: "🟢",
};

const FuelPriceCard = ({ fuel }: FuelPriceCardProps) => {
  const trendUp = fuel.trend === "up";
  const trendDown = fuel.trend === "down";
  const colorClass = fuelColors[fuel.type] ?? "from-muted to-muted border-border";

  return (
    <div className={`bg-gradient-to-r ${colorClass} rounded-2xl p-4 border flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{fuelEmoji[fuel.type] ?? "⛽"}</span>
        <div>
          <p className="text-xs font-semibold text-foreground tracking-wide">{fuel.name}</p>
          <p className="text-2xl font-heading font-bold text-foreground mt-0.5">
            ${fuel.price.toLocaleString("es-CL")}
          </p>
          <p className="text-[10px] text-muted-foreground">{fuel.unit}</p>
        </div>
      </div>
      <div
        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${
          trendDown
            ? "bg-fuel-green/20 text-fuel-green"
            : trendUp
            ? "bg-fuel-red/20 text-fuel-red"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {trendDown ? <TrendingDown className="w-3.5 h-3.5" /> : trendUp ? <TrendingUp className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
        {fuel.trend === "up" ? "Subió" : fuel.trend === "down" ? "Bajó" : "Estable"}
      </div>
    </div>
  );
};

export default FuelPriceCard;
