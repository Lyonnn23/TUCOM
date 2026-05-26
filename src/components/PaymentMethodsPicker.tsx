import { Check } from "lucide-react";
import { PAYMENT_METHODS, maxDiscountForMethod } from "@/lib/discounts";
import { useStationDiscounts } from "@/hooks/useStationDiscounts";
import { cn } from "@/lib/utils";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  compact?: boolean;
}

const PaymentMethodsPicker = ({ value, onChange, compact }: Props) => {
  const { data: discounts } = useStationDiscounts();

  const toggle = (key: string) => {
    if (key === "Efectivo") {
      // Solo efectivo limpia el resto
      onChange(value.includes("Efectivo") ? [] : ["Efectivo"]);
      return;
    }
    const next = value.includes(key)
      ? value.filter((v) => v !== key)
      : [...value.filter((v) => v !== "Efectivo"), key];
    onChange(next);
  };

  return (
    <div className={cn("grid gap-2", compact ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3")}>
      {PAYMENT_METHODS.map((m) => {
        const active = value.includes(m.key);
        const maxDisc = maxDiscountForMethod(discounts, m.key);
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => toggle(m.key)}
            aria-pressed={active}
            className={cn(
              "relative rounded-xl border-2 p-3 text-left transition-all press-scale",
              active
                ? "border-primary bg-primary/5 shadow-soft"
                : "border-border bg-card hover:border-primary/40",
            )}
          >
            <div className="text-xl">{m.emoji}</div>
            <div className="text-xs font-semibold text-foreground mt-1 leading-tight">{m.label}</div>
            {maxDisc > 0 && (
              <div className="text-[10px] font-bold text-fuel-green mt-0.5">
                Hasta ${maxDisc}/L
              </div>
            )}
            {active && (
              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default PaymentMethodsPicker;
