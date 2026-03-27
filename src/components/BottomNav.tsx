import { Fuel, Map, List } from "lucide-react";

export type TabType = "prices" | "map" | "stations";

interface BottomNavProps {
  active: TabType;
  onChange: (tab: TabType) => void;
}

const tabs: { id: TabType; label: string; icon: typeof Fuel }[] = [
  { id: "prices", label: "Precios", icon: Fuel },
  { id: "map", label: "Mapa", icon: Map },
  { id: "stations", label: "Estaciones", icon: List },
];

const BottomNav = ({ active, onChange }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-2 pb-[env(safe-area-inset-bottom)] z-50">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex flex-col items-center py-2.5 px-4 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-medium mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
