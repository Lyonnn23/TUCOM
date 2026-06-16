import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GasStation {
  id: string;
  name: string;
  brand: string;
  lat: number;
  lng: number;
  address: string;
  commune: string | null;
  region: string | null;
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
  lastUpdated: Date | null;
  electricEstimated: boolean;
  placeId: string | null;
}

import { PRICE_RANGES } from "@/lib/priceRanges";

const MAX_PRICE_AGE_DAYS = 45;
const MAX_PRICE_AGE_MS = MAX_PRICE_AGE_DAYS * 24 * 60 * 60 * 1000;
const CACHE_KEY = "cached_stations";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

function sanitizePrice(type: string, value: number | null | undefined) {
  const price = Number(value ?? 0);
  const range = PRICE_RANGES[type];
  if (!range || !Number.isFinite(price)) return 0;
  if (price < range.min || price > range.max) return 0;
  return price;
}

async function fetchAllRows(table: "gas_stations" | "station_prices_public", select = "*"): Promise<any[]> {
  const PAGE = 1000;
  const all: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await (supabase as any)
      .from(table)
      .select(select)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function readCache(): GasStation[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt: number; data: GasStation[] };
    if (!parsed?.data || Date.now() - parsed.savedAt > CACHE_MAX_AGE_MS) return null;
    return parsed.data.map((s) => ({
      ...s,
      lastUpdated: s.lastUpdated ? new Date(s.lastUpdated) : null,
    }));
  } catch {
    return null;
  }
}

function writeCache(data: GasStation[]) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), data }),
    );
  } catch {
    /* quota or disabled — ignore */
  }
}

export function useGasStations() {
  return useQuery({
    queryKey: ["gas-stations"],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    placeholderData: () => readCache() ?? undefined,
    queryFn: async (): Promise<GasStation[]> => {
      try {
        const [stations, prices] = await Promise.all([
          fetchAllRows("gas_stations"),
          fetchAllRows("station_prices_public", "id, station_id, fuel_type, price, created_at"),
        ]);

        const priceMap = new Map<string, any[]>();
        for (const p of prices) {
          const arr = priceMap.get(p.station_id) || [];
          arr.push(p);
          priceMap.set(p.station_id, arr);
        }

        const now = Date.now();
        const result: GasStation[] = stations.map((s: any) => {
          const sp = priceMap.get(s.id) || [];
          let lastUpdatedMs = 0;
          for (const row of sp) {
            const t = row.created_at ? new Date(row.created_at).getTime() : 0;
            if (t > lastUpdatedMs) lastUpdatedMs = t;
          }
          const isStale = lastUpdatedMs > 0 && now - lastUpdatedMs > MAX_PRICE_AGE_MS;
          const getPrice = (type: string) => {
            if (isStale) return 0;
            return sanitizePrice(type, sp.find((p: any) => p.fuel_type === type)?.price);
          };
          const electric = getPrice("electric");
          const electricEstimated = electric > 0;
          return {
            id: s.id,
            name: s.name,
            brand: s.brand,
            lat: s.lat,
            lng: s.lng,
            address: s.address,
            commune: s.commune ?? null,
            region: s.region ?? null,
            isOpen: s.is_open,
            hasEvCharging: s.has_ev_charging ?? false,
            evConnectorTypes: s.ev_connector_types ?? [],
            evPowerKw: s.ev_power_kw ?? null,
            evOperator: s.ev_operator ?? null,
            lastUpdated: lastUpdatedMs > 0 ? new Date(lastUpdatedMs) : null,
            electricEstimated,
            placeId: s.place_id ?? null,
            prices: {
              gasoline93: getPrice("gasoline93"),
              gasoline95: getPrice("gasoline95"),
              gasoline97: getPrice("gasoline97"),
              diesel: getPrice("diesel"),
              electric,
            },
          };
        });
        writeCache(result);
        return result;
      } catch (err) {
        // Network/server failure — fall back to last good cache if available.
        const cached = readCache();
        if (cached && cached.length) {
          console.warn("[useGasStations] using cached stations after fetch error", err);
          return cached;
        }
        throw err;
      }
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

export function formatRelativeTime(date: Date | null): string {
  if (!date) return "sin datos";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `hace ${weeks} sem`;
  const months = Math.floor(days / 30);
  return `hace ${months} mes${months > 1 ? "es" : ""}`;
}
