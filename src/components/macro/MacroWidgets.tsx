import { useState } from "react";
import { ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import MepcoWidget from "./MepcoWidget";
import FxWidget from "./FxWidget";
import WtiWidget from "./WtiWidget";

export default function MacroWidgets() {
  const [open, setOpen] = useState(true);

  return (
    <section className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-1 mb-2 group"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="font-heading font-bold text-foreground text-sm uppercase tracking-wide">
            Tendencias del mercado
          </h2>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-fade-in">
          <MepcoWidget />
          <FxWidget />
          <WtiWidget />
        </div>
      )}
    </section>
  );
}
