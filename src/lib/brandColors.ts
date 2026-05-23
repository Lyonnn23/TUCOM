/**
 * Official brand colors for fuel-station markers and legend.
 * Single source of truth — used by StationMap and MapLegend.
 */
export const BRAND_COLORS: Record<string, string> = {
  COPEC: "#E5003B",
  ENEX: "#FF6B00",
  SHELL: "#DD1D21",
  PETROBRAS: "#009A44",
  TERPEL: "#FFD100",
  ABASTIBLE: "#0057A8",
  GULF: "#F47920",
  PRIMAX: "#E31837",
  ARAMCO: "#00843D",
  INDEPENDIENTE: "#6B7280",
};

export const PRICE_INDICATORS = {
  cheapest: "#16A34A", // green
  expensive: "#7F1D1D", // dark red
};

export const brandColor = (brand: string | null | undefined): string => {
  if (!brand) return BRAND_COLORS.INDEPENDIENTE;
  const key = brand.toUpperCase().trim();
  return BRAND_COLORS[key] ?? BRAND_COLORS.INDEPENDIENTE;
};

export const brandInitials = (brand: string | null | undefined): string => {
  if (!brand) return "??";
  return brand.trim().slice(0, 2).toUpperCase();
};
