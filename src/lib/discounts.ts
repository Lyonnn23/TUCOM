// Motor de descuentos TÜcom
// Calcula el precio real que paga el usuario tras aplicar el mejor descuento
// disponible según sus métodos de pago configurados.

export interface StationDiscount {
  id: string;
  brand: string; // 'COPEC', 'SHELL', 'ENEX', 'PETROBRAS', 'ALL', ...
  payment_method: string;
  discount_clp: number;
  fuel_types: string[]; // ['95','93','97','diesel']
  day_of_week: string[] | null; // ['viernes'] o null = todos
  time_start: string | null;
  time_end: string | null;
  max_liters: number | null;
  max_per_day: number | null;
  valid_from: string;
  valid_to: string | null;
  description: string | null;
  source_url: string | null;
  is_active: boolean;
  updated_at: string;
}

export interface PaymentMethodMeta {
  key: string; // matches station_discounts.payment_method
  label: string;
  emoji: string; // logo placeholder
  category: "tarjeta" | "app" | "efectivo";
}

// Catálogo de métodos de pago soportados en TÜcom
export const PAYMENT_METHODS: PaymentMethodMeta[] = [
  { key: "Tenpo Mastercard", label: "Tenpo", emoji: "💳", category: "tarjeta" },
  { key: "Lider BCI", label: "Líder BCI", emoji: "💳", category: "tarjeta" },
  { key: "Consorcio", label: "Banco Consorcio", emoji: "💳", category: "tarjeta" },
  { key: "Ripley", label: "Ripley", emoji: "💳", category: "tarjeta" },
  { key: "Banco Internacional", label: "Banco Internacional", emoji: "💳", category: "tarjeta" },
  { key: "MACH", label: "MACH", emoji: "📱", category: "app" },
  { key: "Cuenta RUT BancoEstado", label: "Cuenta RUT", emoji: "💳", category: "tarjeta" },
  { key: "Copec Pay App", label: "Copec Pay", emoji: "📱", category: "app" },
  { key: "Shell App", label: "Shell App", emoji: "📱", category: "app" },
  { key: "CMR Falabella", label: "CMR Falabella", emoji: "💳", category: "tarjeta" },
  { key: "Santander", label: "Santander", emoji: "💳", category: "tarjeta" },
  { key: "Scotiabank", label: "Scotiabank", emoji: "💳", category: "tarjeta" },
  { key: "Efectivo", label: "Solo efectivo", emoji: "💵", category: "efectivo" },
];

// Piso absoluto por combustible (sin descuento puede bajar de esto)
export const FLOOR_PRICES: Record<string, number> = {
  gasoline93: 1150,
  gasoline95: 1200,
  gasoline97: 1250,
  diesel: 1100,
};

export const DISCOUNT_DISCLAIMER =
  "Precio estimado con descuento. Sujeto a disponibilidad en cada estación.";

const DAY_MAP: Record<number, string> = {
  0: "domingo",
  1: "lunes",
  2: "martes",
  3: "miércoles",
  4: "jueves",
  5: "viernes",
  6: "sábado",
};

export function dayName(dow: number): string {
  return DAY_MAP[dow] ?? "";
}

// Normaliza fuel_type del app ("gasoline93") al token del descuento ("93")
function fuelTokens(fuelType: string): string[] {
  if (fuelType === "gasoline93") return ["93", "gasoline93"];
  if (fuelType === "gasoline95") return ["95", "gasoline95"];
  if (fuelType === "gasoline97") return ["97", "gasoline97"];
  if (fuelType === "diesel") return ["diesel"];
  return [fuelType];
}

export function isDiscountApplicable(
  d: StationDiscount,
  stationBrand: string,
  userMethods: string[],
  fuelType: string,
  date: Date = new Date(),
): boolean {
  if (!d.is_active) return false;
  if (d.valid_to && new Date(d.valid_to) < date) return false;
  if (new Date(d.valid_from) > date) return false;

  const brandUp = stationBrand.toUpperCase();
  const dBrand = d.brand.toUpperCase();
  if (dBrand !== "ALL" && dBrand !== brandUp) return false;

  if (!userMethods.includes(d.payment_method)) return false;

  const tokens = fuelTokens(fuelType);
  if (!d.fuel_types.some((f) => tokens.includes(f))) return false;

  if (d.day_of_week && d.day_of_week.length > 0) {
    const today = dayName(date.getDay());
    const normalized = d.day_of_week.map((x) =>
      x.toLowerCase().replace("miercoles", "miércoles").replace("sabado", "sábado"),
    );
    if (!normalized.includes(today)) return false;
  }

  return true;
}

export interface BestDiscountResult {
  discount: StationDiscount;
  cnePrice: number;
  finalPrice: number;
  savings: number;
  capped: boolean;
}

export function getBestDiscount(
  discounts: StationDiscount[] | undefined,
  stationBrand: string,
  userMethods: string[],
  fuelType: string,
  cnePrice: number,
  date: Date = new Date(),
): BestDiscountResult | null {
  if (!cnePrice || cnePrice <= 0) return null;
  if (!userMethods || userMethods.length === 0) return null;
  if (!discounts || discounts.length === 0) return null;

  const applicable = discounts.filter((d) =>
    isDiscountApplicable(d, stationBrand, userMethods, fuelType, date),
  );
  if (applicable.length === 0) return null;

  const best = applicable.reduce((a, b) => (b.discount_clp > a.discount_clp ? b : a));
  return applyDiscount(cnePrice, best, fuelType);
}

export function applyDiscount(
  cnePrice: number,
  d: StationDiscount,
  fuelType: string,
): BestDiscountResult {
  const floor = FLOOR_PRICES[fuelType] ?? 0;
  const raw = cnePrice - d.discount_clp;
  const capped = raw < floor;
  const finalPrice = Math.max(floor, raw);
  return {
    discount: d,
    cnePrice,
    finalPrice,
    savings: cnePrice - finalPrice,
    capped,
  };
}

// Mejor descuento disponible para CUALQUIER usuario que tenga un método dado.
// Sirve para mostrar "Hasta $X/L" junto al método en el picker.
export function maxDiscountForMethod(
  discounts: StationDiscount[] | undefined,
  method: string,
  date: Date = new Date(),
): number {
  if (!discounts) return 0;
  let max = 0;
  for (const d of discounts) {
    if (!d.is_active) continue;
    if (d.payment_method !== method) continue;
    if (d.valid_to && new Date(d.valid_to) < date) continue;
    if (d.discount_clp > max) max = d.discount_clp;
  }
  return max;
}

// Descuentos vigentes hoy (cualquier marca/método)
export function discountsActiveToday(
  discounts: StationDiscount[] | undefined,
  date: Date = new Date(),
): StationDiscount[] {
  if (!discounts) return [];
  const today = dayName(date.getDay());
  return discounts.filter((d) => {
    if (!d.is_active) return false;
    if (d.valid_to && new Date(d.valid_to) < date) return false;
    if (new Date(d.valid_from) > date) return false;
    if (d.day_of_week && d.day_of_week.length > 0) {
      const normalized = d.day_of_week.map((x) => x.toLowerCase());
      return normalized.includes(today);
    }
    return true;
  });
}
