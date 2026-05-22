// Pure helpers for the trip-cost calculator.
import type { CatalogVehicle } from "@/hooks/useVehiclesCatalog";

export type RouteType = "city" | "mixed" | "hwy";

export const QUICK_DESTINATIONS = [
  { id: "vina",      label: "Viña del Mar / Valparaíso", km: 150 },
  { id: "conce",     label: "Concepción",                km: 400 },
  { id: "serena",    label: "La Serena",                 km: 580 },
  { id: "pmontt",    label: "Puerto Montt",              km: 1000 },
  { id: "antofa",    label: "Antofagasta",               km: 1350 },
  { id: "arica",     label: "Arica",                     km: 2050 },
  { id: "pucon",     label: "Pucón",                     km: 800 },
  { id: "atacama",   label: "San Pedro de Atacama",      km: 1650 },
] as const;

export function getConsumption(v: CatalogVehicle, route: RouteType): number | null {
  if (v.fuel_type === "electric") return null;
  switch (route) {
    case "city": return v.consumption_city ?? v.consumption_mixed ?? null;
    case "hwy":  return v.consumption_hwy  ?? v.consumption_mixed ?? null;
    case "mixed":
    default:     return v.consumption_mixed ?? null;
  }
}

export function bodyEmoji(body?: string | null): string {
  switch ((body ?? "").toLowerCase()) {
    case "sedán":
    case "sedan":     return "🚗";
    case "hatchback": return "🚙";
    case "suv":       return "🚙";
    case "pickup":    return "🛻";
    case "minivan":   return "🚐";
    default:          return "🚗";
  }
}

export function formatFuelType(f: CatalogVehicle["fuel_type"]): string {
  switch (f) {
    case "gasoline93": return "Gasolina 93";
    case "gasoline95": return "Gasolina 95";
    case "gasoline97": return "Gasolina 97";
    case "diesel":     return "Diésel";
    case "electric":   return "Eléctrico";
    case "hybrid":     return "Híbrido";
  }
}

export interface TripCalc {
  km: number;
  consumption: number;          // km/L (or km/kWh equivalent: 1/kwh_per_km)
  units: number;                // litros o kWh
  pricePerUnit: number;         // CLP/L o CLP/kWh
  total: number;                // CLP
  isElectric: boolean;
}

export function calcTrip(
  vehicle: CatalogVehicle,
  km: number,
  route: RouteType,
  pricePerUnit: number,
): TripCalc {
  const isElectric = vehicle.fuel_type === "electric";
  if (isElectric) {
    const kwhPerKm = vehicle.kwh_per_km ?? 0.17;
    const units = km * kwhPerKm;
    return {
      km,
      consumption: kwhPerKm > 0 ? 1 / kwhPerKm : 0,
      units,
      pricePerUnit,
      total: Math.round(units * pricePerUnit),
      isElectric: true,
    };
  }
  const consumption = getConsumption(vehicle, route) ?? 12;
  const units = consumption > 0 ? km / consumption : 0;
  return {
    km,
    consumption,
    units,
    pricePerUnit,
    total: Math.round(units * pricePerUnit),
    isElectric: false,
  };
}

export function vehicleLabel(v: CatalogVehicle): string {
  return `${v.brand} ${v.model} ${v.year} · ${v.version}`;
}
