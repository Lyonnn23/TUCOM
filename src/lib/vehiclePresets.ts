// Top 20 vehicles populares en Chile con rendimiento mixto típico (km/L).
// Fuente: fichas técnicas oficiales y promedios reportados por usuarios.

export interface VehiclePreset {
  brand: string;
  model: string;
  fuel_type: "gasoline93" | "gasoline95" | "gasoline97" | "diesel";
  tank_size_l: number;
  consumption_kml: number;
}

export const VEHICLE_PRESETS: VehiclePreset[] = [
  { brand: "Toyota",   model: "Yaris",        fuel_type: "gasoline93", tank_size_l: 42, consumption_kml: 16 },
  { brand: "Toyota",   model: "Corolla",      fuel_type: "gasoline93", tank_size_l: 50, consumption_kml: 14 },
  { brand: "Toyota",   model: "Hilux",        fuel_type: "diesel",     tank_size_l: 80, consumption_kml: 11 },
  { brand: "Toyota",   model: "RAV4",         fuel_type: "gasoline95", tank_size_l: 55, consumption_kml: 12 },
  { brand: "Suzuki",   model: "Swift",        fuel_type: "gasoline93", tank_size_l: 37, consumption_kml: 17 },
  { brand: "Suzuki",   model: "Baleno",       fuel_type: "gasoline93", tank_size_l: 37, consumption_kml: 16 },
  { brand: "Suzuki",   model: "Vitara",       fuel_type: "gasoline93", tank_size_l: 47, consumption_kml: 13 },
  { brand: "Hyundai",  model: "Accent",       fuel_type: "gasoline93", tank_size_l: 45, consumption_kml: 15 },
  { brand: "Hyundai",  model: "Tucson",       fuel_type: "diesel",     tank_size_l: 62, consumption_kml: 13 },
  { brand: "Hyundai",  model: "Creta",        fuel_type: "gasoline93", tank_size_l: 50, consumption_kml: 13 },
  { brand: "Kia",      model: "Morning",      fuel_type: "gasoline93", tank_size_l: 35, consumption_kml: 16 },
  { brand: "Kia",      model: "Rio",          fuel_type: "gasoline93", tank_size_l: 43, consumption_kml: 15 },
  { brand: "Kia",      model: "Sportage",     fuel_type: "gasoline95", tank_size_l: 54, consumption_kml: 12 },
  { brand: "Chevrolet",model: "Sail",         fuel_type: "gasoline93", tank_size_l: 42, consumption_kml: 14 },
  { brand: "Chevrolet",model: "Spark",        fuel_type: "gasoline93", tank_size_l: 35, consumption_kml: 16 },
  { brand: "Nissan",   model: "V-Drive",      fuel_type: "gasoline93", tank_size_l: 41, consumption_kml: 15 },
  { brand: "Nissan",   model: "Qashqai",      fuel_type: "gasoline95", tank_size_l: 55, consumption_kml: 12 },
  { brand: "Mazda",    model: "3",            fuel_type: "gasoline95", tank_size_l: 51, consumption_kml: 13 },
  { brand: "MG",       model: "ZS",           fuel_type: "gasoline93", tank_size_l: 48, consumption_kml: 13 },
  { brand: "Peugeot",  model: "208",          fuel_type: "gasoline95", tank_size_l: 44, consumption_kml: 15 },
];

export const VEHICLE_COLORS = [
  "#7C3AED", // morado
  "#6366F1", // índigo
  "#06B6D4", // cian
  "#EC4899", // rosa
  "#F59E0B", // ámbar
  "#10B981", // verde
  "#EF4444", // rojo
  "#0EA5E9", // celeste
];
