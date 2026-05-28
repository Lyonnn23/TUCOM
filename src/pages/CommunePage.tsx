import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ExternalLink, Fuel } from "lucide-react";
import { COMMUNES, SITE_URL, getCommuneBySlug, nearbyCommunes } from "@/data/communes";
import { useGasStations } from "@/hooks/useGasStations";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import BrandLogo from "@/components/BrandLogo";

const CommunePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const commune = getCommuneBySlug(slug) ?? COMMUNES[0];
  const { data: stations } = useGasStations();
  const rows = (stations ?? [])
    .filter((s) => s.commune?.toLowerCase().includes(commune.displayName.toLowerCase()) && s.prices.gasoline95 > 0)
    .sort((a, b) => a.prices.gasoline95 - b.prices.gasoline95);
  const top = rows.slice(0, 5);
  const prices95 = rows.map((s) => s.prices.gasoline95).filter(Boolean);
  const avg = prices95.length ? Math.round(prices95.reduce((a, b) => a + b, 0) / prices95.length) : 0;
  const min = prices95[0] ?? 0;
  const all95 = (stations ?? []).map((s) => s.prices.gasoline95).filter(Boolean);
  const national = all95.length ? Math.round(all95.reduce((a, b) => a + b, 0) / all95.length) : avg;
  const diff = avg && national ? avg - national : 0;
  const url = `${SITE_URL}/bencina/${commune.slug}`;

  return (
    <div className="min-h-screen bg-background pb-16">
      <Helmet>
        <title>{`Bencina más barata en ${commune.displayName} hoy | TÜcom`}</title>
        <meta name="description" content={`Precio de bencina en ${commune.displayName} hoy. Compara precios de bencina 93, 95, 97 y diésel en ${commune.displayName}, ${commune.region}. Datos oficiales CNE actualizados. Encuentra la estación más barata cerca tuyo.`} />
        <meta name="keywords" content={`bencina ${commune.displayName}, precio combustible ${commune.displayName}, bencinera ${commune.displayName}, bencina 95 ${commune.displayName}, precio bencina hoy ${commune.displayName}`} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={`Precio bencina en ${commune.displayName} hoy | TÜcom`} />
        <meta property="og:description" content={`Encuentra la bencinera más barata en ${commune.displayName}. Precios CNE en tiempo real.`} />
        <meta property="og:url" content={url} />
        <script type="application/ld+json">{JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: `Bencina más barata en ${commune.displayName}`, description: `Precio de bencina en ${commune.displayName} hoy. Datos CNE.`, url, breadcrumb: { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "TÜcom", item: SITE_URL }, { "@type": "ListItem", position: 2, name: "Bencina por ciudad", item: `${SITE_URL}/bencina` }, { "@type": "ListItem", position: 3, name: commune.displayName, item: url }] } })}</script>
      </Helmet>
      <header className="bg-gradient-primary px-4 pt-[env(safe-area-inset-top)] shadow-elegant">
        <div className="max-w-5xl mx-auto py-5 text-white">
          <Link to="/bencina" className="inline-flex items-center gap-2 text-sm text-white/85 hover:text-white mb-4"><ArrowLeft className="w-4 h-4" /> Ciudades</Link>
          <h1 className="font-heading font-extrabold text-3xl">Bencina más barata en {commune.displayName} hoy</h1>
          <p className="text-sm text-white/85 mt-2">Región {commune.region} · {commune.population} habitantes · Datos CNE actualizados</p>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2"><Fuel className="w-4 h-4 text-primary" /><h2 className="font-heading font-bold">Top estaciones más baratas</h2></div>
          <div className="divide-y divide-border">
            {top.length ? top.map((s, i) => (
              <Link key={s.id} to={`/station/${s.id}`} className={`grid grid-cols-[1fr_auto] sm:grid-cols-[1.5fr_repeat(4,auto)_auto] gap-3 p-4 items-center ${i === 0 ? "bg-primary/10" : ""}`}>
                <div className="min-w-0 flex items-center gap-2"><BrandLogo brand={s.brand} size={28} /><div><p className="font-semibold text-foreground truncate">{s.name}</p><p className="text-xs text-muted-foreground truncate">{s.address}</p></div></div>
                <p className="text-sm tabular-nums">93 {s.prices.gasoline93 ? formatPrice(s.prices.gasoline93) : "—"}</p>
                <p className="text-sm font-bold text-primary tabular-nums">95 {formatPrice(s.prices.gasoline95)}</p>
                <p className="text-sm tabular-nums">97 {s.prices.gasoline97 ? formatPrice(s.prices.gasoline97) : "—"}</p>
                <p className="text-sm tabular-nums">Diésel {s.prices.diesel ? formatPrice(s.prices.diesel) : "—"}</p>
                <p className="text-xs text-muted-foreground">{formatRelativeTime(s.lastUpdated)}</p>
              </Link>
            )) : <p className="p-4 text-sm text-muted-foreground">Aún no hay precios CNE disponibles para esta comuna.</p>}
          </div>
        </section>
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-2xl p-4"><p className="text-xs text-muted-foreground">Promedio 95</p><p className="font-heading font-extrabold text-2xl text-primary">{avg ? formatPrice(avg) : "—"}</p></div>
          <div className="bg-card border border-border rounded-2xl p-4"><p className="text-xs text-muted-foreground">Promedio nacional</p><p className="font-heading font-extrabold text-2xl">{national ? formatPrice(national) : "—"}</p></div>
          <div className="bg-card border border-border rounded-2xl p-4"><p className="text-xs text-muted-foreground">Comparación</p><p className="text-sm font-semibold">En {commune.displayName} la 95 está {Math.abs(diff)} pesos {diff > 0 ? "más cara" : "más barata"} que el promedio nacional.</p></div>
        </section>
        <section className="bg-gradient-primary text-primary-foreground rounded-2xl p-5 shadow-elegant"><h2 className="font-heading font-bold text-xl">Encuentra la bencinera más barata en {commune.displayName} en tiempo real</h2><Link to={`/?tab=stations&commune=${commune.slug}`} className="inline-flex mt-3 bg-card text-primary rounded-xl px-4 py-2 text-sm font-bold">Abrir TÜcom →</Link></section>
        <section className="bg-card border border-border rounded-2xl p-5 space-y-3"><h2 className="font-heading font-bold">Preguntas frecuentes</h2><p className="text-sm"><strong>¿Cuánto cuesta la bencina 95 en {commune.displayName} hoy?</strong><br />Ronda los {avg ? formatPrice(avg) : "precios disponibles"}/L según datos de la CNE. El precio más bajo registrado hoy es {min ? formatPrice(min) : "—"}/L.</p><p className="text-sm"><strong>¿Cuántas bencineras hay en {commune.displayName}?</strong><br />Según los datos disponibles, hay {rows.length} estaciones activas con precio 95 en {commune.displayName}.</p><p className="text-sm"><strong>¿Dónde cargar bencina más barata en {commune.displayName}?</strong><br />TÜcom muestra estaciones cercanas con datos oficiales CNE para encontrar el menor precio.</p></section>
        <section><h2 className="font-heading font-bold mb-3">También puedes consultar precios en:</h2><div className="flex flex-wrap gap-2">{nearbyCommunes(commune).map((c) => <Link key={c.slug} to={`/bencina/${c.slug}`} className="rounded-full bg-muted text-foreground px-3 py-1.5 text-sm font-medium hover:bg-primary hover:text-primary-foreground">{c.displayName}</Link>)}</div></section>
      </main>
    </div>
  );
};

export default CommunePage;
