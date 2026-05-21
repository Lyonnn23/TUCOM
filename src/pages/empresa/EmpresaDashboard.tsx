import { Navigate } from "react-router-dom";
import { useOrganization, useFleetStats, useFleetBreakdown, useFleetMonthlySpend } from "@/hooks/useOrganization";
import { FleetSummaryCards } from "@/components/empresa/FleetSummaryCards";
import { FleetVehiclesTable } from "@/components/empresa/FleetVehiclesTable";
import { FleetSpendBarChart, FleetSpendLineChart } from "@/components/empresa/FleetCharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function EmpresaDashboard() {
  const { org, role, isLoading } = useOrganization();
  const { data: stats } = useFleetStats(org?.id);
  const { data: rows = [], isLoading: rowsLoading } = useFleetBreakdown(org?.id);
  const { data: monthly = [] } = useFleetMonthlySpend(org?.id, 6);

  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />;
  if (!org) return <Navigate to="/empresa" replace />;
  if (role !== "admin") return <Navigate to="/empresa/mi-vehiculo" replace />;

  const top = rows.length > 0 ? rows[0] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard de flota</h1>
        <p className="text-sm text-muted-foreground">Resumen de gastos, consumo y conductores.</p>
      </div>
      <FleetSummaryCards stats={stats} topVehicle={top ? { nickname: top.nickname, brand: top.brand, model: top.model, month_spend: top.month_spend } : null} />
      <div className="grid lg:grid-cols-2 gap-4">
        <FleetSpendBarChart rows={rows} />
        <FleetSpendLineChart data={monthly} />
      </div>
      {rowsLoading ? <Skeleton className="h-64 rounded-2xl" /> : <FleetVehiclesTable rows={rows} />}
    </div>
  );
}
