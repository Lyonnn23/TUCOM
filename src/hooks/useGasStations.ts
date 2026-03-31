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
  };
  distance?: number;
  isOpen: boolean;
}

export function useGasStations() {
  return useQuery({
    queryKey: ["gas-stations"],
    queryFn: async (): Promise<GasStation[]> => {
      const { data: stations, error: stErr } = await supabase
        .from("gas_stations")
        .select("*");
      if (stErr) throw stErr;

      const { data: prices, error: prErr } = await supabase
        .from("station_prices")
        .select("*");
      if (prErr) throw prErr;

      return (stations ?? []).map((s) => {
        const sp = (prices ?? []).filter((p) => p.station_id === s.id);
        const getPrice = (type: string) => sp.find((p) => p.fuel_type === type)?.price ?? 0;
        return {
          id: s.id,
          name: s.name,
          brand: s.brand,
          lat: s.lat,
          lng: s.lng,
          address: s.address,
          isOpen: s.is_open,
          prices: {
            gasoline93: getPrice("gasoline93"),
            gasoline95: getPrice("gasoline95"),
            gasoline97: getPrice("gasoline97"),
            diesel: getPrice("diesel"),
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
