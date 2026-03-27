export interface FuelPrice {
  type: string;
  price: number;
  change: number; // percentage change from last week
  unit: string;
}

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
  distance?: number; // km
  isOpen: boolean;
}

// Precios promedio actuales (simulados) en pesos chilenos
export const currentFuelPrices: FuelPrice[] = [
  { type: "Bencina 93", price: 1189, change: -0.8, unit: "CLP/L" },
  { type: "Bencina 95", price: 1259, change: -0.5, unit: "CLP/L" },
  { type: "Bencina 97", price: 1339, change: 0.2, unit: "CLP/L" },
  { type: "Diésel", price: 989, change: -1.2, unit: "CLP/L" },
];

// Estaciones de bencina simuladas en Santiago, Chile
export const gasStations: GasStation[] = [
  {
    id: "1",
    name: "Copec Lo Barnechea",
    brand: "Copec",
    lat: -33.3500,
    lng: -70.5200,
    address: "Av. Las Condes 14200, Lo Barnechea",
    prices: { gasoline93: 1185, gasoline95: 1255, gasoline97: 1335, diesel: 985 },
    isOpen: true,
  },
  {
    id: "2",
    name: "Shell Providencia",
    brand: "Shell",
    lat: -33.4250,
    lng: -70.6100,
    address: "Av. Providencia 2340, Providencia",
    prices: { gasoline93: 1195, gasoline95: 1265, gasoline97: 1345, diesel: 995 },
    isOpen: true,
  },
  {
    id: "3",
    name: "Petrobras Ñuñoa",
    brand: "Petrobras",
    lat: -33.4560,
    lng: -70.5950,
    address: "Av. Irarrázaval 3450, Ñuñoa",
    prices: { gasoline93: 1179, gasoline95: 1249, gasoline97: 1329, diesel: 979 },
    isOpen: true,
  },
  {
    id: "4",
    name: "Copec Las Condes",
    brand: "Copec",
    lat: -33.4100,
    lng: -70.5700,
    address: "Av. Apoquindo 6000, Las Condes",
    prices: { gasoline93: 1190, gasoline95: 1260, gasoline97: 1340, diesel: 990 },
    isOpen: true,
  },
  {
    id: "5",
    name: "ENEX Santiago Centro",
    brand: "ENEX",
    lat: -33.4400,
    lng: -70.6500,
    address: "Alameda 1200, Santiago",
    prices: { gasoline93: 1175, gasoline95: 1245, gasoline97: 1325, diesel: 975 },
    isOpen: false,
  },
  {
    id: "6",
    name: "Shell Vitacura",
    brand: "Shell",
    lat: -33.3900,
    lng: -70.5800,
    address: "Av. Vitacura 5600, Vitacura",
    prices: { gasoline93: 1199, gasoline95: 1269, gasoline97: 1349, diesel: 999 },
    isOpen: true,
  },
  {
    id: "7",
    name: "Copec Maipú",
    brand: "Copec",
    lat: -33.5100,
    lng: -70.7600,
    address: "Av. Pajaritos 4500, Maipú",
    prices: { gasoline93: 1169, gasoline95: 1239, gasoline97: 1319, diesel: 969 },
    isOpen: true,
  },
  {
    id: "8",
    name: "Petrobras La Florida",
    brand: "Petrobras",
    lat: -33.5200,
    lng: -70.5900,
    address: "Av. Vicuña Mackenna 7200, La Florida",
    prices: { gasoline93: 1172, gasoline95: 1242, gasoline97: 1322, diesel: 972 },
    isOpen: true,
  },
];

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
