import { Link } from "react-router-dom";
import { Calendar, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUpcomingDeadlines, type VehicleDocType } from "@/hooks/useVehicleDocuments";

const LABELS: Record<VehicleDocType, string> = {
  revision_tecnica: "Revisión técnica",
  soap: "SOAP",
  permiso_circulacion: "Permiso de circulación",
  cambio_aceite: "Cambio de aceite",
};

function color(days: number) {
  if (days < 15) return "text-destructive bg-destructive/10";
  if (days <= 30) return "text-yellow-700 bg-yellow-500/15 dark:text-yellow-300";
  return "text-emerald-700 bg-emerald-500/15 dark:text-emerald-300";
}

export default function UpcomingDeadlinesCard() {
  const { data, isLoading } = useUpcomingDeadlines();
  if (isLoading || !data || data.length === 0) return null;

  return (
    <Card className="animate-fade-in-up">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Próximos vencimientos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.slice(0, 4).map((d, i) => (
          <Link
            key={`${d.vehicle_id}-${d.doc_type}-${i}`}
            to={`/profile/vehicle/${d.vehicle_id}`}
            className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 hover:bg-accent transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{LABELS[d.doc_type]}</p>
              <p className="text-xs text-muted-foreground truncate">{d.vehicle_name}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${color(d.days_left)}`}>
                {d.days_left === 0 ? "Hoy" : `${d.days_left}d`}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
