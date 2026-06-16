import { memo } from "react";
import { analytics } from "@/lib/analytics";

export type FuelFilterKey =
  | "all"
  | "gasoline93"
  | "gasoline95"
  | "gasoline97"
  | "diesel"
  | "electric";

const OPTIONS: { key: FuelFilterKey; label: string; ev?: boolean }[] = [
  { key: "all", label: "Todos" },
  { key: "gasoline93", label: "93" },
  { key: "gasoline95", label: "95" },
  { key: "gasoline97", label: "97" },
  { key: "diesel", label: "Diésel" },
  { key: "electric", label: "⚡ EV", ev: true },
];

interface Props {
  value: FuelFilterKey;
  onChange: (v: FuelFilterKey) => void;
  className?: string;
}

const FuelFilterPills = ({ value, onChange, className }: Props) => {
  return (
    <div
      role="tablist"
      aria-label="Filtrar por tipo de combustible"
      className={`flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1 ${className ?? ""}`}
      style={{ touchAction: "pan-x" }}
    >
      {OPTIONS.map((opt) => {
        const selected = value === opt.key;
        return (
          <button
            key={opt.key}
            role="tab"
            aria-selected={selected}
            onClick={() => {
              onChange(opt.key);
              analytics.filterFuel(opt.key);
            }}
            style={{ touchAction: "manipulation", minHeight: 44 }}
            className={`shrink-0 text-xs font-semibold px-4 rounded-full transition-colors border ${
              selected
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-transparent text-muted-foreground border-border hover:bg-muted/60"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export default memo(FuelFilterPills);
