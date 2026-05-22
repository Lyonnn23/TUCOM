import { useState } from "react";
import { ArrowUp, ArrowDown, Droplet, ChevronDown, ChevronUp } from "lucide-react";
import { useWti } from "@/hooks/useWti";
import { useMacroExplainer } from "@/hooks/useMacroExplainer";
import { Skeleton } from "@/components/ui/skeleton";

export default function WtiWidget() {
  const { data: wti, isLoading } = useWti();
  const [expanded, setExpanded] = useState(false);
  const { data: explainer, isLoading: explainerLoading } = useMacroExplainer("wti_fuel", expanded);

  const change = wti?.change_pct_week ?? 0;
  const up = change >= 0;
  const ArrowIcon = up ? ArrowUp : ArrowDown;
  const color = up ? "text-[hsl(0,75%,55%)]" : "text-[hsl(142,70%,45%)]";

  return (
    <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-5 py-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
      >
        <div className="min-w-0 text-left flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Droplet className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
              Petróleo WTI
            </p>
            {isLoading || !wti ? (
              <Skeleton className="h-5 w-36 mt-1" />
            ) : (
              <p className="font-heading font-bold text-foreground text-base mt-0.5">
                ${wti.price_usd.toFixed(1)}/bbl{" "}
                <span className={`text-xs font-semibold ${color} ml-1`}>
                  <ArrowIcon className="inline w-3 h-3" />
                  {Math.abs(change).toFixed(1)}% esta semana
                </span>
              </p>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-border pt-4 animate-fade-in">
          <h4 className="text-sm font-semibold text-foreground mb-1.5">¿Cómo me afecta?</h4>
          {explainerLoading || !explainer ? (
            <Skeleton className="h-16 rounded" />
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">{explainer}</p>
          )}
        </div>
      )}
    </div>
  );
}
