declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}


const APP_PARAMS = { app_name: "TUcom", app_version: "1.0.0", country: "CL" };

export const useAnalytics = () => {
  const track = (eventName: string, params?: Record<string, unknown>) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", eventName, { ...APP_PARAMS, ...params });
    }
  };

  return {
    track,
    trackStationView: (stationId: string, brand: string, commune: string, price95: number) =>
      track("station_viewed", { station_id: stationId, brand, commune, price_95: price95 }),
    trackStationNavigate: (stationId: string, brand: string, distanceKm: number) =>
      track("station_navigate", { station_id: stationId, brand, distance_km: distanceKm }),
    trackMapFilter: (filterType: string, filterValue: string) =>
      track("map_filter_applied", { filter_type: filterType, filter_value: filterValue }),
    trackMapSearch: (radiusKm: number, resultsCount: number) =>
      track("map_searched", { radius_km: radiusKm, results_count: resultsCount }),
    trackRouteCalculated: (vehicleBrand: string, vehicleModel: string, distanceKm: number, fuelType: string, totalCost: number) =>
      track("route_calculated", { vehicle_brand: vehicleBrand, vehicle_model: vehicleModel, distance_km: distanceKm, fuel_type: fuelType, total_cost_clp: totalCost }),
    trackDiscountViewed: (brand: string, paymentMethod: string, discountClp: number) =>
      track("discount_viewed", { brand, payment_method: paymentMethod, discount_clp: discountClp }),
    trackDiscountApplied: (brand: string, paymentMethod: string, savingsClp: number) =>
      track("discount_applied", { brand, payment_method: paymentMethod, savings_clp: savingsClp }),
    trackAlertCreated: (fuelType: string, targetPrice: number) =>
      track("alert_created", { fuel_type: fuelType, target_price: targetPrice }),
    trackFavoriteToggled: (stationId: string, action: "add" | "remove") =>
      track("favorite_toggled", { station_id: stationId, action }),
    trackShare: (stationId: string, method: "native" | "clipboard") =>
      track("station_shared", { station_id: stationId, share_method: method }),
    trackOnboardingStep: (step: number, stepName: string) =>
      track("onboarding_step_completed", { step_number: step, step_name: stepName }),
    trackOnboardingCompleted: (fuelType: string, hasVehicle: boolean, hasPaymentMethods: boolean) =>
      track("onboarding_completed", { fuel_type: fuelType, has_vehicle: hasVehicle, has_payment_methods: hasPaymentMethods }),
    trackDriverModeOpen: () => track("driver_mode_opened"),
    trackDriverModeNavigate: (stationId: string) => track("driver_mode_navigate", { station_id: stationId }),
    trackLogin: (method: "google" | "anonymous" | "email") => track("login", { method }),
    trackSignup: (method: "google" | "email") => track("sign_up", { method }),
    trackPWAInstallPrompt: (action: "shown" | "accepted" | "dismissed") => track("pwa_install_prompt", { action }),
    trackError: (errorType: string, errorMessage: string, component: string) =>
      track("app_error", { error_type: errorType, error_message: errorMessage, component }),
  };
};
