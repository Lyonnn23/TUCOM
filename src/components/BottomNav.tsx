import { memo } from "react";
import { Calculator, Car, Fuel, Heart, List, Map, Tag } from "lucide-react";
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
    <nav
      aria-label="Navegación principal"
      style={{
        isolation: "isolate",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        boxShadow: "0 -4px 24px hsl(var(--background) / 0.8)",
        borderTop: "1px solid hsl(var(--border) / 0.08)",
      }}
      className="fixed bottom-0 left-0 right-0 bg-card/85 px-2 pb-[env(safe-area-inset-bottom)] z-[9999]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex flex-col items-center py-2.5 px-2 min-h-11 min-w-11 active:scale-90 transition-transform duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-colors ${isActive ? "bg-primary/10" : ""}`}>
                <tab.icon
                  className={`w-5 h-5 ${isActive ? "stroke-[2.5] scale-110" : "scale-100"}`}
                  style={{ transition: "transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                  aria-hidden="true"
                />
              </div>
              <span className={`text-[10px] mt-0.5 ${isActive ? "font-bold text-primary" : "font-medium text-muted-foreground"}`}>
                {tab.label}
              </span>
              <span
                aria-hidden="true"
                className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary transition-all duration-300 ${
                  isActive ? "opacity-100 scale-100" : "opacity-0 scale-0"
                }`}
              />
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => navigate("/drive")}
          className="relative flex flex-col items-center py-2.5 px-2 min-h-11 min-w-11 text-muted-foreground hover:text-primary active:scale-90 transition-transform duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
          aria-label="Abrir modo conductor"
        >
          <div className="p-1.5 rounded-xl">
            <Car className="w-5 h-5" aria-hidden="true" />
          </div>
          <span className="text-[10px] font-medium mt-0.5">Conducir</span>
        </button>
        <button
          type="button"
          onClick={() => navigate("/calculadora")}
          className="relative flex flex-col items-center py-2.5 px-2 min-h-11 min-w-11 text-muted-foreground hover:text-primary active:scale-90 transition-transform duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
          aria-label="Abrir calculadora de viaje"
        >
          <div className="p-1.5 rounded-xl">
            <Calculator className="w-5 h-5" aria-hidden="true" />
          </div>
          <span className="text-[10px] font-medium mt-0.5">Calcular</span>
        </button>
      </div>

    </nav>
  );
};

export default memo(BottomNav);
