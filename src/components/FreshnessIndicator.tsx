import { cn } from "@/lib/utils";

interface FreshnessIndicatorProps {
  updatedAt: Date | string | null | undefined;
  className?: string;
  inverse?: boolean;
}

const FreshnessIndicator = ({ updatedAt, className, inverse = false }: FreshnessIndicatorProps) => {
  if (!updatedAt) return null;

  const timestamp = new Date(updatedAt).getTime();
  if (!Number.isFinite(timestamp)) return null;

  const ageHours = Math.max(0, Math.floor((Date.now() - timestamp) / 3_600_000));
  const ageDays = Math.max(1, Math.floor(ageHours / 24));
  const label = ageHours < 1 ? "hace menos de 1h" : ageHours < 24 ? `hace ${ageHours}h` : `hace ${ageDays} ${ageDays === 1 ? "día" : "días"}`;
  const dotClass = ageHours < 6 ? "bg-fuel-green" : ageHours < 24 ? "bg-fuel-amber" : inverse ? "bg-primary-foreground/55" : "bg-muted-foreground/55";

  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px]", inverse ? "text-primary-foreground/75" : "text-muted-foreground", className)}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClass)} aria-hidden="true" />
      {label}
    </span>
  );
};

export default FreshnessIndicator;