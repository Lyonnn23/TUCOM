import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const SectionLabel = ({ children, className }: { children: ReactNode; className?: string }) => (
  <h2 className={cn("text-sm font-semibold text-muted-foreground uppercase tracking-wide", className)}>
    {children}
  </h2>
);

export default SectionLabel;