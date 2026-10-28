import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Returns true between 20:00 and 06:59 — mirrors the logic in useTheme */
const isNightHour = () => { const h = new Date().getHours(); return h >= 20 || h < 7; };

interface Props {
  /** Visual variant: glass renders on a colored header; surface for neutral backgrounds */
  variant?: "glass" | "surface";
}

const ThemeToggle = ({ variant = "glass" }: Props) => {
  const { mode, resolved, setMode } = useTheme();
  const Icon = resolved === "dark" ? Moon : Sun;
  const nightActive = mode === "system" && isNightHour();

  const base =
    variant === "glass"
      ? "bg-white/15 hover:bg-white/25 text-white"
      : "bg-muted hover:bg-muted/80 text-foreground";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Cambiar tema (actual: ${mode === "system" ? "automático" : mode === "dark" ? "oscuro" : "claro"})`}
          className={`${base} rounded-full p-2 backdrop-blur-sm press-scale transition-colors`}
        >
          <Icon className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Tema de la aplicación
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setMode("light")} className={mode === "light" ? "font-semibold" : ""}>
          <Sun className="w-4 h-4 mr-2" /> Claro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setMode("dark")} className={mode === "dark" ? "font-semibold" : ""}>
          <Moon className="w-4 h-4 mr-2" /> Oscuro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setMode("system")} className={mode === "system" ? "font-semibold" : ""}>
          <Monitor className="w-4 h-4 mr-2" />
          <span>Automático</span>
          {nightActive && (
            <span className="ml-auto text-[10px] text-muted-foreground">· modo noche</span>
          )}
        </DropdownMenuItem>
        {mode === "system" && (
          <p className="px-2 pb-1.5 pt-0.5 text-[10px] text-muted-foreground">
            {nightActive
              ? "Oscuro entre 20:00 – 07:00 hrs"
              : "Se oscurece a las 20:00 hrs"}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeToggle;
