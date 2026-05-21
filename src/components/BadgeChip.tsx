import { BADGE_META, type BadgeKey } from "@/hooks/useGamification";
import { cn } from "@/lib/utils";

interface Props {
  badge: BadgeKey;
  earned?: boolean;
  className?: string;
}

const BadgeChip = ({ badge, earned = true, className }: Props) => {
  const meta = BADGE_META[badge];
  if (!meta) return null;
  return (
    <div
      title={meta.description}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
        earned
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-muted text-muted-foreground opacity-60",
        className
      )}
    >
      <span className="text-base leading-none">{meta.emoji}</span>
      <span>{meta.label}</span>
    </div>
  );
};

export default BadgeChip;
