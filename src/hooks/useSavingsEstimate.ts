/**
 * useSavingsEstimate — estima cuánto ha ahorrado el usuario en el mes actual
 * comparando el precio que pagó vs el promedio nacional MEPCO.
 *
 * Si el usuario no tiene registros, devuelve null (no mostrar el widget).
 */
import { useMemo } from "react";
import { useMonthlySpend } from "@/hooks/useFuelStats";
import { useFuelPrices } from "@/hooks/useFuelPrices";
import { useUserPreferences } from "@/hooks/useUserPreferences";

export interface SavingsEstimate {
  /** Ahorro estimado en CLP este mes (puede ser negativo = gastó más que el promedio) */
  savedCLP: number;
  /** Litros cargados este mes */
  litersThisMonth: number;
  /** Precio promedio que pagó */
  avgPricePaid: number;
  /** Precio promedio nacional de referencia */
  nationalAvg: number;
  /** true si hay datos suficientes para mostrar el widget */
  hasSavings: boolean;
}

export function useSavingsEstimate(): SavingsEstimate | null {
  const { data: monthlySpend } = useMonthlySpend(1);
  const { data: prices } = useFuelPrices();
  const { preferences } = useUserPreferences();

  return useMemo(() => {
    if (!monthlySpend || monthlySpend.length === 0) return null;
    if (!prices || prices.length === 0) return null;

    const thisMonth = monthlySpend[0];
    if (!thisMonth || thisMonth.liters < 5) return null; // menos de 5 L — no mostrar

    // Usar el precio del combustible preferido del usuario como referencia nacional
    // (no siempre G95 — puede ser G93, Diesel, etc.)
    const userFuel = preferences?.preferred_fuel ?? "gasoline95";
    const fuelRef = prices.find((p) => p.type === userFuel) ?? prices.find((p) => p.type === "gasoline95");
    const nationalAvg = fuelRef?.price ?? 0;
    if (!nationalAvg) return null;

    const avgPricePaid = thisMonth.avg_price ?? thisMonth.total_clp / thisMonth.liters;
    const savedCLP = Math.round((nationalAvg - avgPricePaid) * thisMonth.liters);

    return {
      savedCLP,
      litersThisMonth: thisMonth.liters,
      avgPricePaid: Math.round(avgPricePaid),
      nationalAvg,
      hasSavings: Math.abs(savedCLP) > 500, // solo mostrar si hay diferencia significativa
    };
  }, [monthlySpend, prices, preferences]);
}
