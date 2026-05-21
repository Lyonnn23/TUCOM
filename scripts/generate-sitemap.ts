// Generates public/sitemap.xml at predev/prebuild time.
// Fetches all public stations from Supabase (public schema, RLS allows anon select on gas_stations).
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = "https://tucombustible.lovable.app";
const SUPABASE_URL = "https://laldmbpaleeykbsgtchk.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhbGRtYnBhbGVleWtic2d0Y2hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5MjQ3ODEsImV4cCI6MjA5MDUwMDc4MX0.ZW7WqCdMeyqWCdGcK8-D9eSNbxfME5r6ltsGOg4uGC0";

interface Entry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const staticEntries: Entry[] = [
  { path: "/", changefreq: "hourly", priority: "1.0" },
  { path: "/compare", changefreq: "weekly", priority: "0.6" },
  { path: "/alerts", changefreq: "weekly", priority: "0.5" },
  { path: "/favorites", changefreq: "weekly", priority: "0.5" },
  { path: "/leaderboard", changefreq: "daily", priority: "0.4" },
  { path: "/legal", changefreq: "yearly", priority: "0.2" },
  { path: "/privacy", changefreq: "yearly", priority: "0.2" },
  { path: "/install", changefreq: "monthly", priority: "0.3" },
];

async function fetchStations(): Promise<Array<{ id: string; updated_at: string | null }>> {
  const all: Array<{ id: string; updated_at: string | null }> = [];
  const PAGE = 1000;
  let from = 0;
  try {
    while (true) {
      const to = from + PAGE - 1;
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/gas_stations?select=id,updated_at`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            Range: `${from}-${to}`,
            "Range-Unit": "items",
          },
        },
      );
      if (!res.ok) {
        console.warn(`[sitemap] gas_stations fetch failed: ${res.status}`);
        break;
      }
      const rows = (await res.json()) as Array<{ id: string; updated_at: string | null }>;
      all.push(...rows);
      if (rows.length < PAGE) break;
      from += PAGE;
    }
  } catch (err) {
    console.warn("[sitemap] fetch error:", err);
  }
  return all;
}

function render(entries: Entry[]): string {
  const urls = entries
    .map((e) =>
      [
        "  <url>",
        `    <loc>${BASE_URL}${e.path}</loc>`,
        e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
        e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
        e.priority ? `    <priority>${e.priority}</priority>` : null,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
  ].join("\n");
}

const stations = await fetchStations();
const stationEntries: Entry[] = stations.map((s) => ({
  path: `/station/${s.id}`,
  lastmod: s.updated_at ? s.updated_at.slice(0, 10) : undefined,
  changefreq: "daily",
  priority: "0.7",
}));

const all = [...staticEntries, ...stationEntries];
writeFileSync(resolve("public/sitemap.xml"), render(all));
console.log(`[sitemap] wrote ${all.length} entries (${stationEntries.length} stations)`);
