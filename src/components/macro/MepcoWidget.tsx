import { useState } from "react";
import { ArrowUp, ArrowDown, Minus, Info, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMepco } from "@/hooks/useMepco";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";

const FUEL_LABEL: Record<string, string> = {
  gasoline93: "93",
  gasoline95: "95",
  gasoline97: "97",
  diesel: "Diésel",
};

export default function MepcoWidget() {
  const { data, isLoading } = useMepco(1);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const latest = data?.[0];

  return (
    <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
      <div className="px-5 py-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
            Ajuste MEPCO
          </p>
          <h3 className="font-heading font-bold text-foreground mt-0.5">
            Ajuste de precios programado para el día jueves
          </h3>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className="text-xs text-primary font-medium flex items-center gap-1 hover:underline shrink-0"
              aria-label="¿Qué es el MEPCO?"
            >
              <Info className="w-3.5 h-3.5" /> ¿Qué es?
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader>
              <SheetTitle>¿Qué es el MEPCO?</SheetTitle>
              <SheetDescription className="text-left space-y-3 pt-2 text-sm text-foreground/90">
                <p>
                  El <strong>MEPCO</strong> (Mecanismo de Estabilización del Precio
                  de los Combustibles) es la fórmula con la que el Estado de Chile
                  suaviza las subidas y bajadas semanales del precio de las bencinas
                  y el diésel. Cada martes, la CNE publica cuánto subirá o bajará
                  cada combustible el jueves siguiente.
                </p>
                <p>
                  El ajuste depende del precio internacional del petróleo, el tipo
                  de cambio del dólar y un fondo público que amortigua los cambios
                  bruscos. Con MEPCO no desaparecen las variaciones, pero llegan
                  más graduales a la bomba.
                </p>
              </SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </div>

      <div className="px-5 pb-5">
        {isLoading ? (
          <Skeleton className="h-20 rounded-xl" />
        ) : !latest ? (
          <div className="rounded-xl bg-muted/40 border border-border px-4 py-5 text-center">
            <p className="text-sm text-muted-foreground">
              Ajuste no publicado aún. Se publica los martes.
            </p>
          </div>
        ) : (
          <DirectionBlock latest={latest} onMore={() => navigate("/mepco-info")} />
        )}
      </div>
    </div>
  );
}

function DirectionBlock({
  latest,
  onMore,
}: {
  latest: { direction: "up" | "down" | "neutral"; fuel_changes: Record<string, number>; week_of: string };
  onMore: () => void;
}) {
  const dot =
    latest.direction === "up"
      ? "bg-[hsl(0,75%,55%)]"
      : latest.direction === "down"
      ? "bg-[hsl(142,70%,45%)]"
      : "bg-[hsl(45,90%,55%)]";

  const Icon =
    latest.direction === "up" ? ArrowUp : latest.direction === "down" ? ArrowDown : Minus;

  const color =
    latest.direction === "up"
      ? "text-[hsl(0,75%,55%)]"
      : latest.direction === "down"
      ? "text-[hsl(142,70%,45%)]"
      : "text-[hsl(45,90%,55%)]";

  const maxAbs = Math.max(
    ...Object.values(latest.fuel_changes).map((v) => Math.abs(Number(v))),
    0,
  );
  const sign =
    latest.direction === "up" ? "+" : latest.direction === "down" ? "-" : "";

  return (
    <div className="rounded-xl bg-muted/30 border border-border p-4">
      <div className="flex items-center gap-3">
        <span className={`w-3 h-3 rounded-full ${dot} ring-2 ring-background animate-soft-pulse`} />
        <span className={`font-heading font-extrabold text-3xl ${color} flex items-center gap-1`}>
          <Icon className="w-7 h-7" />
          {sign}${maxAbs.toFixed(0)}/L
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {Object.entries(latest.fuel_changes)
          .filter(([, v]) => Math.abs(Number(v)) > 0)
          .map(([k, v]) => (
            <Badge key={k} variant="secondary" className="text-[11px]">
              {FUEL_LABEL[k] ?? k} {Number(v) > 0 ? "↑" : "↓"}${Math.abs(Number(v)).toFixed(0)}
            </Badge>
          ))}
      </div>
      <button
        onClick={onMore}
        className="mt-3 text-xs text-primary font-medium hover:underline flex items-center gap-1"
      >
        <TrendingUp className="w-3.5 h-3.5" /> Ver historial y detalles
      </button>
    </div>
  );
}
