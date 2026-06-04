import { useMemo } from "react";
import type { FuelPrice } from "./useFuelPrices";
import type { GasStation } from "./useGasStations";
import { calculateDistance } from "./useGasStations";

interface Options {
  stations: GasStation[] | undefined;
  userLocation: { lat: number; lng: number } | null;
  nationalPrices: FuelPrice[] | undefined;
  radiusKm?: number;
}

const FUEL_KEYS: Array<keyof GasStation["prices"]> = [
  "gasoline93",
  "gasoline95",
  "gasoline97",
  "diesel",
  "electric",
];

/**
 * Calcula el precio promedio local en un radio (default 10 km) usando los
 * datos sincronizados desde la CNE en gas_stations / station_prices.
 *
 * - Si hay ubicación + estaciones cercanas con precio válido para el tipo de
 *   combustible, devuelve el promedio de ese radio.
 * - Si no, devuelve el precio nacional como fallback (manteniendo la tendencia).
 * - La tendencia (subió/bajó/estable) se hereda del feed nacional, ya que el
 *   promedio local no tiene serie histórica.
 */
export function useLocalFuelPrices({
  stations,
  userLocation,
  nationalPrices,
  radiusKm = 10,
}: Options): { prices: FuelPrice[]; isLocal: boolean; sampleSize: number } {
  return useMemo(() => {
    if (!nationalPrices || nationalPrices.length === 0) {
      return { prices: [], isLocal: false, sampleSize: 0 };
    }

    if (!userLocation || !stations || stations.length === 0) {
      return { prices: nationalPrices, isLocal: false, sampleSize: 0 };
    }

    const nearby = stations.filter((s) => {
      const d = calculateDistance(userLocation.lat, userLocation.lng, s.lat, s.lng);
      return d <= radiusKm;
    });

    if (nearby.length === 0) {
      return { prices: nationalPrices, isLocal: false, sampleSize: 0 };
    }

    // Build local averages per fuel type
    const localAvg: Partial<Record<string, number>> = {};
    for (const key of FUEL_KEYS) {
      const validPrices = nearby
        .map((s) => s.prices[key])
        .filter((p) => typeof p === "number" && p > 0);
      if (validPrices.length > 0) {
        const sum = validPrices.reduce((a, b) => a + b, 0);
        localAvg[key] = Math.round(sum / validPrices.length);
      }
    }

    const merged: FuelPrice[] = nationalPrices.map((fp) => {
      const local = localAvg[fp.type];
      if (typeof local === "number" && local > 0) {
        return { ...fp, price: local };
      }
      return fp;
    });

    const hasAnyLocal = Object.keys(localAvg).length > 0;
    return { prices: merged, isLocal: hasAnyLocal, sampleSize: nearby.length };
  }, [stations, userLocation, nationalPrices, radiusKm]);
}
