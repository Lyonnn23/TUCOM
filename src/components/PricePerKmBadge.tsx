/**
 * PricePerKmBadge — muestra "$X/km" en lugar de "$X/L" cuando el usuario
 * tiene un vehículo con consumo registrado. Hace el precio de combustible
 * concreto y personal para cada conductor.
 */
import { Gauge } from "lucide-react";

interface Props {
  pricePerLiter: number;
  consumptionKml: number;
  className?: string;
}

const PricePerKmBadge = ({ pricePerLiter, consumptionKml, className = "" }: Props) => {
  if (!consumptionKml || consumptionKml <= 0 || !pricePerLiter) return null;

  const perKm = pricePerLiter / consumptionKml;
  const formatted = perKm < 100
    ? perKm.toFixed(1)
    : Math.round(perKm).toLocaleString("es-CL");

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold ${className}`}
      title={`Basado en consumo de ${consumptionKml} km/L`}
    >
      <Gauge className="w-3 h-3" aria-hidden="true" />
      ${formatted}/km
    </span>
  );
};

export default PricePerKmBadge;
