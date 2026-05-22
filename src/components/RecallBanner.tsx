import { AlertTriangle, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useVehicleRecalls } from "@/hooks/useVehicleRecalls";

const SEVERITY_STYLE: Record<string, string> = {
  low: "border-yellow-500/50 bg-yellow-500/5",
  medium: "border-orange-500/60 bg-orange-500/5",
  high: "border-destructive/70 bg-destructive/10",
  critical: "border-destructive bg-destructive/15",
};

const SEVERITY_LABEL: Record<string, string> = {
  low: "Aviso",
  medium: "Importante",
  high: "Alta gravedad",
  critical: "Crítico",
};

export default function RecallBanner({
  brand, model, year,
}: { brand: string; model: string; year?: number | null }) {
  const { data: recalls } = useVehicleRecalls({ brand, model, year });
  if (!recalls || recalls.length === 0) return null;

  return (
    <div className="space-y-2">
      {recalls.map((r) => (
        <Card key={r.id} className={`border-2 ${SEVERITY_STYLE[r.severity] ?? ""}`}>
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-destructive">
                    Llamado a revisión · {SEVERITY_LABEL[r.severity]}
                  </span>
                </div>
                <p className="text-sm font-medium">{r.description}</p>
                {r.official_url && (
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <a href={r.official_url} target="_blank" rel="noopener noreferrer">
                      Ver información oficial <ExternalLink className="ml-2 h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
