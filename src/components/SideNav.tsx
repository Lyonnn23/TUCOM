/**
 * SideNav — Desktop sidebar navigation (lg screens and above).
 * Mirrors BottomNav tabs but rendered as a fixed left sidebar.
 */
import { memo } from "react";
import { Calculator, Car, Fuel, Heart, List, Map, Tag, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { TabType } from "./BottomNav";

interface SideNavProps {
  active: TabType;
  onChange: (tab: TabType) => void;
}

const tabs: { id: TabType; label: string; icon: typeof Fuel }[] = [
  { id: "prices",    label: "Precios",    icon: Fuel },
  { id: "map",       label: "Mapa",       icon: Map },
  { id: "stations",  label: "Estaciones", icon: List },
  { id: "favorites", label: "Favoritos",  icon: Heart },
  { id: "benefits",  label: "Beneficios", icon: Tag },
];

const SideNav = ({ active, onChange }: SideNavProps) => {
  const navigate = useNavigate();
  return (
    <aside
      aria-label="Navegación lateral"
      className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-56 bg-card border-r border-border z-40 pt-[env(safe-area-inset-top)]"
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-inner">
            <Zap className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div>
            <p className="font-heading font-extrabold text-foreground text-base leading-none">TÜcom</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">tucombustible.cl</p>
          </div>
        </div>
      </div>

      {/* Main tabs */}
      <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full text-left
                ${isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
            >
              <tab.icon
                className={`w-4 h-4 shrink-0 ${isActive ? "text-primary stroke-[2.5]" : ""}`}
                aria-hidden="true"
              />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Quick actions */}
      <div className="flex flex-col gap-1 px-3 pb-6 border-t border-border pt-4">
        <button
          type="button"
          onClick={() => navigate("/drive")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full text-left"
        >
          <Car className="w-4 h-4 shrink-0" aria-hidden="true" />
          Modo Conductor
        </button>
        <button
          type="button"
          onClick={() => navigate("/calculadora")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full text-left"
        >
          <Calculator className="w-4 h-4 shrink-0" aria-hidden="true" />
          Calculadora
        </button>
      </div>
    </aside>
  );
};

export default memo(SideNav);
