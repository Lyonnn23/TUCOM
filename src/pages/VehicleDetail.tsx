import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useUserVehicles } from "@/hooks/useUserVehicles";
import VehicleDocumentsCard from "@/components/VehicleDocumentsCard";
import RecallBanner from "@/components/RecallBanner";

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { vehicles, isLoading } = useUserVehicles();

  const vehicle = vehicles.find((v) => v.id === id);

  if (isLoading) {
    return <div className="p-4"><div className="h-40 rounded-2xl bg-muted animate-pulse" /></div>;
  }

  if (!vehicle) {
    return (
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/perfil")}>
          <ArrowLeft className="h-4 w-4 mr-2" />Volver al perfil
        </Button>
        <Card><CardContent className="pt-6 text-center text-muted-foreground">
          Vehículo no encontrado.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild aria-label="Volver">
          <Link to="/perfil"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center text-white shrink-0"
            style={{ backgroundColor: vehicle.color }}
          >
            <Car className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-semibold text-lg leading-tight truncate">
              {vehicle.nickname || `${vehicle.brand} ${vehicle.model}`}
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              {vehicle.brand} {vehicle.model}{vehicle.year ? ` · ${vehicle.year}` : ""}
            </p>
          </div>
        </div>
      </div>

      <RecallBanner brand={vehicle.brand} model={vehicle.model} year={vehicle.year} />

      <VehicleDocumentsCard vehicleId={vehicle.id} />
    </div>
  );
}
