import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, MapPin, TrendingUp, TrendingDown, Minus, Fuel } from "lucide-react";
import { useFuelReport, type FuelReportItem, type ZoneReport } from "@/hooks/useFuelReport";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const FUEL_COLORS: Record<string, string> = {
  gasoline93: "hsl(158, 65%, 42%)",
  gasoline95: "hsl(38, 95%, 55%)",
  gasoline97: "hsl(262, 70%, 58%)",
  diesel: "hsl(215, 80%, 55%)",
  electric: "hsl(142, 70%, 45%)",
};

function formatPrice(price: number) {
  return `$${price.toLocaleString("es-CL")}`;
}

function NationalSummary({ data }: { data: FuelReportItem[] }) {
  const chartData = data.map((f) => ({
    name: f.name.replace("Gasolina ", ""),
    avg: f.avg,
    min: f.min,
    max: f.max,
    key: f.key,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {data.map((fuel) => (
          <div
            key={fuel.key}
            className="bg-card rounded-2xl p-4 border border-border shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: FUEL_COLORS[fuel.key] }}
              />
              <span className="text-xs font-semibold text-muted-foreground">{fuel.name}</span>
            </div>
            <p className="text-2xl font-extrabold text-foreground">{formatPrice(fuel.avg)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {formatPrice(fuel.min)} – {formatPrice(fuel.max)}
            </p>
            <p className="text-[10px] text-muted-foreground">{fuel.count} estaciones</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Comparativa Nacional
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(245, 18%, 90%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `$${v}`}
                domain={["dataMin - 100", "dataMax + 50"]}
              />
              <Tooltip
                formatter={(value: number) => [formatPrice(value), "Promedio"]}
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid hsl(245, 18%, 90%)",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="avg" radius={[8, 8, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.key} fill={FUEL_COLORS[entry.key]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function ZoneCard({ zone }: { zone: ZoneReport }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-bold text-foreground text-sm">{zone.zone}</h3>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{zone.regions}</p>
      </div>
      <div className="divide-y divide-border">
        {zone.fuels.map((fuel) => (
          <div key={fuel.key} className="px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: FUEL_COLORS[fuel.key] }}
              />
              <span className="text-xs font-medium text-foreground">{fuel.name}</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground">Promedio</p>
                <p className="font-bold text-foreground">{formatPrice(fuel.avg)}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground">Mín</p>
                <p className="font-semibold text-fuel-green">{formatPrice(fuel.min)}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground">Máx</p>
                <p className="font-semibold text-destructive">{formatPrice(fuel.max)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const FuelReport = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useFuelReport();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-secondary px-4 pt-[env(safe-area-inset-top)] sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-3 py-3 max-w-md mx-auto">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-xl bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-heading font-extrabold text-white text-lg leading-tight">
              Reporte Nacional
            </h1>
            <p className="text-[10px] text-white/70">Precios de combustibles por zona</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-5 space-y-5">
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-52 rounded-2xl" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-destructive/10 border border-destructive/25 rounded-2xl p-4 text-center">
            <p className="text-sm text-destructive font-medium">Error al cargar el reporte</p>
            <p className="text-xs text-muted-foreground mt-1">Intenta nuevamente más tarde</p>
          </div>
        ) : data ? (
          <>
            {/* Updated timestamp */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Fuel className="w-3.5 h-3.5" />
              <span>
                Actualizado:{" "}
                {new Date(data.updated_at).toLocaleDateString("es-CL", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            {/* National Summary */}
            <div>
              <h2 className="font-heading font-bold text-foreground text-lg mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Promedios Nacionales
              </h2>
              <NationalSummary data={data.national} />
            </div>

            {/* Zones */}
            <div>
              <h2 className="font-heading font-bold text-foreground text-lg mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-secondary" />
                Precios por Zona
              </h2>
              <div className="space-y-3">
                {data.zones.map((zone) => (
                  <ZoneCard key={zone.zone} zone={zone} />
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-muted/50 rounded-2xl p-3 border border-border">
              <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                Los precios son referenciales y se basan en los datos reportados por las estaciones de servicio.
                Fuente: datos propios recopilados desde la CNE.
              </p>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
};

export default FuelReport;
