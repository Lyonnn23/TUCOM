import { SITE_URL } from "@/data/communes";

export { SITE_URL };

export interface BrandInfo {
  slug: string;
  displayName: string;
  tagline: string;
  description: string;
}

export const BRANDS: BrandInfo[] = [
  {
    slug: "copec",
    displayName: "Copec",
    tagline: "La red más grande de Chile",
    description: "Copec cuenta con la mayor red de estaciones de servicio en Chile, con presencia en todas las regiones del país.",
  },
  {
    slug: "shell",
    displayName: "Shell",
    tagline: "Combustibles con tecnología V-Power",
    description: "Shell ofrece combustibles premium y una amplia red de estaciones a lo largo de Chile.",
  },
  {
    slug: "aramco",
    displayName: "Aramco",
    tagline: "Energía global, servicio local",
    description: "Aramco (ex Esmax) opera una red de estaciones con combustibles de alta calidad y descuentos en distintas comunas.",
  },
  {
    slug: "petrobras",
    displayName: "Petrobras",
    tagline: "Combustibles Podium de alto rendimiento",
    description: "Petrobras entrega combustibles Podium y servicios pensados en el rendimiento del motor.",
  },
  {
    slug: "enex",
    displayName: "Enex",
    tagline: "Innovación en cada estación",
    description: "Enex integra estaciones bajo marcas como Shell y Upa!, con foco en experiencia y conveniencia.",
  },
  {
    slug: "terpel",
    displayName: "Terpel",
    tagline: "Combustibles con estándares internacionales",
    description: "Terpel ofrece combustibles de calidad internacional y presencia creciente en Chile.",
  },
];

export function getBrandBySlug(slug?: string) {
  return BRANDS.find((b) => b.slug === slug);
}

export function otherBrands(brand: BrandInfo) {
  return BRANDS.filter((b) => b.slug !== brand.slug).slice(0, 5);
}
