import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type FuelTypeKey =
  | "gasoline93" | "gasoline95" | "gasoline97" | "diesel" | "electric";

export interface NearbyStationRow {
  id: string;
  name: string;
  brand: string;
  address: string;
  commune: string | null;
  region: string | null;
  lat: number;
  lng: number;
  distance_m: number;
  price: number | null;
  price_updated_at: string | null;
}

/**
 * Nearby stations using PostGIS (ST_DWithin + ST_Distance via the
 * public.nearby_stations RPC). Falls back to no results if location isn't set.
 *
 * Cache: 5 minutes for general lists, override via `staleTime`.
 */
export function useNearbyStations(
  lat: number | null,
  lng: number | null,
  radiusMeters = 15000,
  fuelType: FuelTypeKey = "gasoline95",
  limit = 50,
  staleTime = 5 * 60 * 1000
) {
  return useQuery<NearbyStationRow[]>({
    queryKey: ["nearby-stations", lat, lng, radiusMeters, fuelType, limit],
    enabled: lat != null && lng != null,
    staleTime,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("nearby_stations", {
        _lat: lat!,
        _lng: lng!,
        _radius_m: radiusMeters,
        _fuel_type: fuelType,
        _limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as NearbyStationRow[];
    },
  });
}

/**
 * The 10 cheapest stations near the user for a given fuel.
 * Tight 30s cache because users open this expecting "right now" prices.
 */
export function useCheapestStations(
  lat: number | null,
  lng: number | null,
  radiusMeters = 15000,
  fuelType: FuelTypeKey = "gasoline95",
  limit = 10
) {
  return useQuery<NearbyStationRow[]>({
    queryKey: ["cheapest-stations", lat, lng, radiusMeters, fuelType, limit],
    enabled: lat != null && lng != null,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("nearby_stations", {
        _lat: lat!,
        _lng: lng!,
        _radius_m: radiusMeters,
        _fuel_type: fuelType,
        _limit: 200,
      });
      if (error) throw error;
      const rows = ((data ?? []) as NearbyStationRow[])
        .filter((r) => typeof r.price === "number" && (r.price as number) > 0)
        .sort((a, b) => (a.price as number) - (b.price as number))
        .slice(0, limit);
      return rows;
    },
  });
}
