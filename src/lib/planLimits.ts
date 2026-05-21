// Plan limits for TÜcom Free / Pro
export const PLAN_LIMITS = {
  free: {
    alerts: 3,
    vehicles: 1,
    favorites: 10,
    fuelLogMonths: 3,
    routeSearchesPerMonth: 5,
    priceHistoryDays: 30,
  },
  pro: {
    alerts: Infinity,
    vehicles: 5,
    favorites: Infinity,
    fuelLogMonths: Infinity,
    routeSearchesPerMonth: Infinity,
    priceHistoryDays: 90,
  },
} as const;

export const PRO_PRICE_CLP = 990;
export const PRO_PRICE_LABEL = "$990/mes";

export type PlanTier = "free" | "pro" | "empresa";
