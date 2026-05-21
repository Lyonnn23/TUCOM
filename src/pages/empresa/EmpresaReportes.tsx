import { Navigate } from "react-router-dom";
import { useOrganization, useFleetBreakdown } from "@/hooks/useOrganization";
import { FleetExportButtons } from "@/components/empresa/FleetExportButtons";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";

export default function EmpresaReportes() {
  const { org, role, isLoading } = useOrganization();
  const { data: rows = [], isLoading: rowsLoading } = useFleetBreakdown(org?.id);

  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />;
  if (!org) return <Navigate to="/empresa" replace />;
  if (role !== "admin") return <Navigate to="/empresa/mi-vehiculo" replace />;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Reportes</h1>
        <p className="text-sm text-muted-foreground">Descarga reportes PDF con el logo de tu empresa o exporta a CSV para tu contador.</p>
      </div>

      <section className="bg-card rounded-2xl border border-border p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-[hsl(245,75%,60%)] flex items-center justify-center mx-auto">
          <FileText className="h-7 w-7 text-primary-foreground" />
        </div>
        <h2 className="text-lg font-semibold">Reporte del mes actual</h2>
        <p className="text-sm text-muted-foreground">
          Incluye desglose por vehículo, totales, costo por km y la última carga registrada.
        </p>
        {rowsLoading ? (
          <Skeleton className="h-10 w-48 mx-auto rounded-xl" />
        ) : (
          <div className="flex justify-center">
            <FleetExportButtons org={org} rows={rows} />
          </div>
        )}
      </section>

      <section className="bg-muted/40 rounded-2xl border border-border p-5 text-sm space-y-2">
        <h3 className="font-semibold">Compatibilidad contable</h3>
        <p className="text-muted-foreground">
          El CSV exportado es compatible con software contable chileno como <strong>Defontana</strong>,{" "}
          <strong>Softland</strong>, <strong>Manager</strong> y planillas Excel/Google Sheets. Importa la columna de
          gasto en la sección "Gastos de operación" o equivalente.
        </p>
      </section>
    </div>
  );
}
