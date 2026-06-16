import { useState } from "react";
import { ArrowUp, ArrowDown, Droplet, ChevronDown, ChevronUp } from "lucide-react";
import { useWti } from "@/hooks/useWti";
import { useFxRates } from "@/hooks/useFxRates";
import { useMacroExplainer } from "@/hooks/useMacroExplainer";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";

export default function WtiWidget() {
  const { data: wti, isLoading } = useWti();
  const { data: fx } = useFxRates(2);
  const [expanded, setExpanded] = useState(false);
  const { data: explainer, isLoading: explainerLoading } = useMacroExplainer("wti_fuel", expanded);

  const change = wti?.change_pct_week ?? 0;
  const up = change >= 0;
  const ArrowIcon = up ? ArrowUp : ArrowDown;
  const color = up ? "text-[hsl(0,75%,55%)]" : "text-[hsl(142,70%,45%)]";
  const usdClp = fx && fx.length > 0 ? fx[fx.length - 1].rate_clp : null;
  const clp = wti && usdClp ? wti.price_usd * usdClp : null;

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
              Precio del petróleo WTI
            </p>
            {isLoading ? (
              <Skeleton className="h-5 w-36 mt-1" />
            ) : !wti ? (
              <p className="font-heading font-bold text-muted-foreground text-base mt-0.5">
                No disponible
              </p>
            ) : (
              <>
                <p className="font-heading font-bold text-foreground text-base mt-0.5">
                  US${wti.price_usd.toFixed(2)}/barril
                  {clp && (
                    <span className="text-[11px] text-muted-foreground font-medium ml-1.5 tabular-nums">
                      ≈ {formatPrice(clp)} CLP
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Variación semanal:{" "}
                  <span className={`font-semibold ${color}`}>
                    <ArrowIcon className="inline w-3 h-3" />
                    {Math.abs(change).toFixed(2)}%
                  </span>
                </p>
              </>
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
        <div className="px-5 pb-5 border-t border-border pt-4 animate-fade-in space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Información de referencia</h4>
          {explainerLoading || !explainer ? (
            <Skeleton className="h-16 rounded" />
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">{explainer}</p>
          )}
          <p className="text-[11px] text-muted-foreground pt-1">
            Fuente: mercados internacionales.
          </p>
        </div>
      )}
    </div>
  );
}
