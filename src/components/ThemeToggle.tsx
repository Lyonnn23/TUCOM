import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  /** Visual variant: glass renders on a colored header; surface for neutral backgrounds */
  variant?: "glass" | "surface";
}

const ThemeToggle = ({ variant = "glass" }: Props) => {
  const { mode, resolved, setMode } = useTheme();
  const Icon = resolved === "dark" ? Moon : Sun;

  const base =
    variant === "glass"
      ? "bg-white/15 hover:bg-white/25 text-white"
      : "bg-muted hover:bg-muted/80 text-foreground";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Cambiar tema"
          className={`${base} rounded-full p-2 backdrop-blur-sm press-scale transition-colors`}
        >
          <Icon className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => setMode("light")} className={mode === "light" ? "font-semibold" : ""}>
          <Sun className="w-4 h-4 mr-2" /> Claro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setMode("dark")} className={mode === "dark" ? "font-semibold" : ""}>
          <Moon className="w-4 h-4 mr-2" /> Oscuro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setMode("system")} className={mode === "system" ? "font-semibold" : ""}>
          <Monitor className="w-4 h-4 mr-2" /> Sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeToggle;
