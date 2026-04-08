import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GasStation {
  id: string;
  name: string;
  brand: string;
  lat: number;
  lng: number;
  address: string;
  prices: {
    gasoline93: number;
    gasoline95: number;
    gasoline97: number;
    diesel: number;
    electric: number;
  };
  distance?: number;
  isOpen: boolean;
  hasEvCharging: boolean;
  evConnectorTypes: string[];
  evPowerKw: number | null;
  evOperator: string | null;
}

const PRICE_RANGES: Record<string, { min: number; max: number }> = {
  gasoline93: { min: 1000, max: 3000 },
  gasoline95: { min: 1000, max: 3000 },
  gasoline97: { min: 1000, max: 3000 },
  diesel: { min: 800, max: 3000 },
  electric: { min: 50, max: 1000 },
};

function sanitizePrice(type: string, value: number | null | undefined) {
  const price = Number(value ?? 0);
  const range = PRICE_RANGES[type];

  if (!range || !Number.isFinite(price)) return 0;
  if (price < range.min || price > range.max) return 0;
  return price;
}

async function fetchAllRows<T>(table: string, select = "*"): Promise<T[]> {
  const PAGE = 1000;
  const all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

export function useGasStations() {
  return useQuery({
    queryKey: ["gas-stations"],
    queryFn: async (): Promise<GasStation[]> => {
      const [stations, prices] = await Promise.all([
        fetchAllRows<any>("gas_stations"),
        fetchAllRows<any>("station_prices"),
      ]);

      const priceMap = new Map<string, any[]>();
      for (const p of prices) {
        const arr = priceMap.get(p.station_id) || [];
        arr.push(p);
        priceMap.set(p.station_id, arr);
      }

      return stations.map((s: any) => {
        const sp = priceMap.get(s.id) || [];
        const getPrice = (type: string) => sanitizePrice(type, sp.find((p: any) => p.fuel_type === type)?.price);

        return {
          id: s.id,
          name: s.name,
          brand: s.brand,
          lat: s.lat,
          lng: s.lng,
          address: s.address,
          isOpen: s.is_open,
          hasEvCharging: s.has_ev_charging ?? false,
          evConnectorTypes: s.ev_connector_types ?? [],
          evPowerKw: s.ev_power_kw ?? null,
          evOperator: s.ev_operator ?? null,
          prices: {
            gasoline93: getPrice("gasoline93"),
            gasoline95: getPrice("gasoline95"),
            gasoline97: getPrice("gasoline97"),
            diesel: getPrice("diesel"),
            electric: getPrice("electric"),
          },
        };
      });
    },
  });
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
