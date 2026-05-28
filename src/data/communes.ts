export const SITE_URL = "https://tucombustible.cl";

export interface CommuneInfo {
  slug: string;
  displayName: string;
  population: string;
  region: string;
  regionShort: string;
}

export const COMMUNES: CommuneInfo[] = [
  { slug: "puente-alto", displayName: "Puente Alto", population: "568.086", region: "Metropolitana", regionShort: "RM" },
  { slug: "maipu", displayName: "Maipú", population: "503.635", region: "Metropolitana", regionShort: "RM" },
  { slug: "santiago", displayName: "Santiago", population: "517.280", region: "Metropolitana", regionShort: "RM" },
  { slug: "antofagasta", displayName: "Antofagasta", population: "427.418", region: "Antofagasta", regionShort: "II" },
  { slug: "la-florida", displayName: "La Florida", population: "405.040", region: "Metropolitana", regionShort: "RM" },
  { slug: "san-bernardo", displayName: "San Bernardo", population: "334.249", region: "Metropolitana", regionShort: "RM" },
  { slug: "las-condes", displayName: "Las Condes", population: "335.296", region: "Metropolitana", regionShort: "RM" },
  { slug: "penalenol", displayName: "Peñalolén", population: "269.296", region: "Metropolitana", regionShort: "RM" },
  { slug: "nunoa", displayName: "Ñuñoa", population: "255.823", region: "Metropolitana", regionShort: "RM" },
  { slug: "concepcion", displayName: "Concepción", population: "233.605", region: "Biobío", regionShort: "VIII" },
  { slug: "vina-del-mar", displayName: "Viña del Mar", population: "364.472", region: "Valparaíso", regionShort: "V" },
  { slug: "valparaiso", displayName: "Valparaíso", population: "316.126", region: "Valparaíso", regionShort: "V" },
  { slug: "providencia", displayName: "Providencia", population: "160.043", region: "Metropolitana", regionShort: "RM" },
  { slug: "la-serena", displayName: "La Serena", population: "246.011", region: "Coquimbo", regionShort: "IV" },
  { slug: "temuco", displayName: "Temuco", population: "202.891", region: "Araucanía", regionShort: "IX" },
  { slug: "iquique", displayName: "Iquique", population: "221.364", region: "Tarapacá", regionShort: "I" },
  { slug: "rancagua", displayName: "Rancagua", population: "196.752", region: "O'Higgins", regionShort: "VI" },
  { slug: "talca", displayName: "Talca", population: "171.702", region: "Maule", regionShort: "VII" },
  { slug: "copiapo", displayName: "Copiapó", population: "158.438", region: "Atacama", regionShort: "III" },
  { slug: "arica", displayName: "Arica", population: "185.000", region: "Arica-Parinacota", regionShort: "XV" },
];

export function getCommuneBySlug(slug?: string) {
  return COMMUNES.find((c) => c.slug === slug);
}

export function nearbyCommunes(commune: CommuneInfo) {
  const sameRegion = COMMUNES.filter((c) => c.region === commune.region && c.slug !== commune.slug);
  const fallback = COMMUNES.filter((c) => c.slug !== commune.slug);
  return (sameRegion.length >= 4 ? sameRegion : [...sameRegion, ...fallback]).slice(0, 4);
}
