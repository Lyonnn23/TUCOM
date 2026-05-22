import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, ArrowRight } from "lucide-react";
import { QUICK_DESTINATIONS } from "@/lib/tripCalc";

/**
 * Home "¿A dónde vas hoy?" widget: quick chips + km input, opens /calculadora.
 */
export default function WhereToGoWidget() {
  const navigate = useNavigate();
  const [km, setKm] = useState("");

  const go = (extra: Record<string, string>) => {
    const params = new URLSearchParams(extra);
    navigate(`/calculadora?${params.toString()}`);
  };

  return (
    <section className="bg-card border border-border rounded-2xl shadow-soft p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" aria-hidden="true" />
        <h2 className="font-heading font-bold text-foreground text-sm">¿A dónde vas hoy?</h2>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {QUICK_DESTINATIONS.slice(0, 5).map((d) => (
          <button
            key={d.id}
            onClick={() => go({ dest: d.id, km: String(d.km) })}
            className="text-[11px] rounded-full border border-border bg-muted/40 px-2.5 py-1 text-foreground hover:bg-primary/10 hover:border-primary/40 transition"
          >
            {d.label} <span className="text-muted-foreground">· {d.km}km</span>
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (Number(km) > 0) go({ km });
        }}
        className="flex gap-2"
      >
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={km}
          onChange={(e) => setKm(e.target.value)}
          placeholder="O ingresa los km del viaje"
          className="flex-1 h-10 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          aria-label="Kilómetros del viaje"
        />
        <button
          type="submit"
          disabled={!km || Number(km) <= 0}
          className="h-10 px-3 rounded-xl bg-gradient-primary text-white text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-50"
        >
          Calcular <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </form>
    </section>
  );
}
