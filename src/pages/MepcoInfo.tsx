import { ArrowLeft, ArrowUp, ArrowDown, Minus, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useMepco } from "@/hooks/useMepco";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const FUEL_LABEL: Record<string, string> = {
  gasoline93: "93",
  gasoline95: "95",
  gasoline97: "97",
  diesel: "Diésel",
};

export default function MepcoInfo() {
  const { data, isLoading } = useMepco(8);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Helmet>
        <title>MEPCO: ajustes semanales de precio | TÜcom</title>
        <meta name="description" content="Mecanismo de Estabilización del Precio de los Combustibles (MEPCO): cómo funciona y últimos ajustes semanales en Chile." />
        <link rel="canonical" href="https://tucombustible.cl/mepco-info" />
      </Helmet>
      <header className="bg-gradient-primary px-4 py-4 sticky top-0 z-30 shadow-soft">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link to="/" className="text-white/90 hover:text-white" aria-label="Volver">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-heading font-bold text-white text-lg leading-none">MEPCO</h1>
            <p className="text-[11px] text-white/80">Mecanismo de Estabilización</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-5">
        <section className="bg-card border border-border rounded-2xl shadow-soft p-5 space-y-3">
          <h2 className="font-heading font-bold text-foreground">¿Qué es el MEPCO?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            El MEPCO es la fórmula con la que el Estado de Chile suaviza las
            subidas y bajadas semanales del precio de las bencinas y el diésel.
            Cada martes la <strong>CNE</strong> publica el ajuste que se aplicará
            el jueves siguiente.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            El ajuste depende del precio internacional del petróleo (WTI), el
            tipo de cambio dólar/peso, y un fondo público que amortigua los
            cambios bruscos. Por eso, aunque el dólar suba fuerte una semana,
            el cambio en la bomba llega más gradual.
          </p>
        </section>

        <section className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-heading font-bold text-foreground">Historial reciente</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Últimas 8 semanas publicadas</p>
          </div>
          <ul className="divide-y divide-border">
            {isLoading ? (
              <li className="p-5"><Skeleton className="h-12 rounded" /></li>
            ) : !data || data.length === 0 ? (
              <li className="p-5 text-sm text-muted-foreground text-center">
                Aún no hay publicaciones registradas.
              </li>
            ) : (
              data.map((row) => {
                const Icon = row.direction === "up" ? ArrowUp : row.direction === "down" ? ArrowDown : Minus;
                const color =
                  row.direction === "up"
                    ? "text-[hsl(0,75%,55%)]"
                    : row.direction === "down"
                    ? "text-[hsl(142,70%,45%)]"
                    : "text-[hsl(45,90%,55%)]";
                return (
                  <li key={row.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground text-sm">
                          Semana del {new Date(row.week_of).toLocaleDateString("es-CL", { day: "numeric", month: "long" })}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {Object.entries(row.fuel_changes ?? {}).map(([k, v]) => (
                            <Badge key={k} variant="secondary" className="text-[11px]">
                              {FUEL_LABEL[k] ?? k} {Number(v) > 0 ? "↑" : Number(v) < 0 ? "↓" : "="}${Math.abs(Number(v)).toFixed(0)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Icon className={`w-5 h-5 shrink-0 ${color}`} />
                    </div>
                    {row.source_url && (
                      <a
                        href={row.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 mt-2"
                      >
                        Fuente CNE <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}
