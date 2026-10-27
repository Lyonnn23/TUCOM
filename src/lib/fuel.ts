/**
 * Central fuel type definitions — single source of truth.
 * Import FuelKey, FUEL_LABEL, FUEL_OPTIONS from here everywhere.
 */

export type FuelKey = "gasoline93" | "gasoline95" | "gasoline97" | "diesel" | "electric";

export const FUEL_LABEL: Record<FuelKey, string> = {
  gasoline93: "93",
  gasoline95: "95",
  gasoline97: "97",
  diesel: "Diésel",
  electric: "⚡ kWh",
};

export const FUEL_LABEL_FULL: Record<FuelKey, string> = {
  gasoline93: "Bencina 93",
  gasoline95: "Bencina 95",
  gasoline97: "Bencina 97",
  diesel: "Diésel",
  electric: "Eléctrico",
};

export const FUEL_OPTIONS = (Object.keys(FUEL_LABEL) as FuelKey[]).map((key) => ({
  key,
  label: FUEL_LABEL[key],
  labelFull: FUEL_LABEL_FULL[key],
}));

/** Same list without electric — for contexts where EV makes no sense (e.g. tank fill) */
export const FUEL_OPTIONS_NO_EV = FUEL_OPTIONS.filter((f) => f.key !== "electric");

export const VALID_FUEL_KEYS = Object.keys(FUEL_LABEL) as FuelKey[];

export function isFuelKey(v: unknown): v is FuelKey {
  return typeof v === "string" && VALID_FUEL_KEYS.includes(v as FuelKey);
}

/** Coerce an unknown string to a FuelKey, falling back to a default. */
export function asFuelKey(v: unknown, fallback: FuelKey = "gasoline95"): FuelKey {
  return isFuelKey(v) ? v : fallback;
}
