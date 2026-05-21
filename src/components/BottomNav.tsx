import { Car, Fuel, Heart, List, Map, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";

export type TabType = "prices" | "map" | "stations" | "favorites" | "benefits";

interface BottomNavProps {
  active: TabType;
  onChange: (tab: TabType) => void;
}

const tabs: { id: TabType; label: string; icon: typeof Fuel }[] = [
  { id: "prices", label: "Precios", icon: Fuel },
  { id: "map", label: "Mapa", icon: Map },
  { id: "stations", label: "Estaciones", icon: List },
  { id: "favorites", label: "Favoritos", icon: Heart },
  { id: "benefits", label: "Beneficios", icon: Tag },
];

const BottomNav = ({ active, onChange }: BottomNavProps) => {
  const navigate = useNavigate();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/85 backdrop-blur-xl border-t border-border px-2 pb-[env(safe-area-inset-bottom)] z-50">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex flex-col items-center py-2.5 px-2 transition-all press-scale ${
                isActive
                  ? "text-primary scale-105"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-colors ${isActive ? "bg-primary/10" : ""}`}>
                <tab.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              </div>
              <span className="text-[10px] font-semibold mt-0.5">{tab.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => navigate("/drive")}
          className="flex flex-col items-center py-2.5 px-2 text-muted-foreground hover:text-primary press-scale"
          aria-label="Modo conductor"
        >
          <div className="p-1.5 rounded-xl">
            <Car className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-semibold mt-0.5">Conducir</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
