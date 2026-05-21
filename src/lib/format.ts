/**
 * Chilean locale formatters (es-CL).
 * Use these helpers everywhere instead of ad-hoc toLocaleString calls
 * to keep prices, distances and dates consistent.
 */

const priceFmt = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

const intFmt = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });

const distanceFmt = new Intl.NumberFormat("es-CL", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const relativeFmt = new Intl.RelativeTimeFormat("es-CL", { numeric: "auto" });

const longDateFmt = new Intl.DateTimeFormat("es-CL", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

const timeFmt = new Intl.DateTimeFormat("es-CL", {
  hour: "2-digit",
  minute: "2-digit",
});

/** Format a CLP price: 1050 → "$1.050" */
export function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return priceFmt.format(Math.round(value));
}

/** Format a plain integer with Chilean thousands separator */
export function formatInt(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return intFmt.format(Math.round(value));
}

/**
 * Format a distance in kilometres:
 * - < 1 km   → "a 850 m"
 * - >= 1 km  → "a 1,2 km"
 */
export function formatDistance(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return "";
  if (km < 1) return `a ${Math.round(km * 1000)} m`;
  return `a ${distanceFmt.format(km)} km`;
}

/** Just the numeric value with unit, no "a " prefix. */
export function formatKm(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${distanceFmt.format(km)} km`;
}

/**
 * Relative time in Spanish:
 * "hace 5 minutos", "hace 2 horas", "ayer", "hace 3 días"…
 */
export function formatRelativeTime(input: string | number | Date): string {
  const date = new Date(input);
  const diffMs = date.getTime() - Date.now();
  const sec = Math.round(diffMs / 1000);
  const abs = Math.abs(sec);

  if (abs < 60) return "hace unos segundos";
  if (abs < 3600) return relativeFmt.format(Math.round(sec / 60), "minute");
  if (abs < 86_400) return relativeFmt.format(Math.round(sec / 3600), "hour");
  if (abs < 7 * 86_400) return relativeFmt.format(Math.round(sec / 86_400), "day");
  if (abs < 30 * 86_400) return relativeFmt.format(Math.round(sec / (7 * 86_400)), "week");
  if (abs < 365 * 86_400) return relativeFmt.format(Math.round(sec / (30 * 86_400)), "month");
  return relativeFmt.format(Math.round(sec / (365 * 86_400)), "year");
}

/**
 * Smart date for activity timestamps:
 * - hoy        → "hoy a las 14:30"
 * - ayer       → "ayer a las 14:30"
 * - < 7 días   → "lunes a las 14:30"
 * - else       → "lunes 19 de mayo"
 */
export function formatSmartDate(input: string | number | Date): string {
  const date = new Date(input);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffDays = Math.floor((startToday - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86_400_000);
  const time = timeFmt.format(date);

  if (diffDays === 0) return `hoy a las ${time}`;
  if (diffDays === 1) return `ayer a las ${time}`;
  if (diffDays > 1 && diffDays < 7) {
    const weekday = new Intl.DateTimeFormat("es-CL", { weekday: "long" }).format(date);
    return `${weekday} a las ${time}`;
  }
  return longDateFmt.format(date);
}

/** Full long-form date: "lunes 19 de mayo" (no year). */
export function formatLongDate(input: string | number | Date): string {
  return longDateFmt.format(new Date(input));
}
