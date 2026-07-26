import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ExternalLink, Fuel } from "lucide-react";
import { BRANDS, SITE_URL, getBrandBySlug, otherBrands } from "@/data/brands";
import { useGasStations } from "@/hooks/useGasStations";
import { formatPrice, formatRelativeTime } from "@/lib/format";
import BrandLogo from "@/components/BrandLogo";

const BrandPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const brand = getBrandBySlug(slug) ?? BRANDS[0];
  const { data: stations } = useGasStations();
  const rows = (stations ?? [])
    .filter((s) => s.brand?.toLowerCase() === brand.displayName.toLowerCase() && s.prices.gasoline95 > 0)
    .sort((a, b) => a.prices.gasoline95 - b.prices.gasoline95);
  const top = rows.slice(0, 5);
  const prices95 = rows.map((s) => s.prices.gasoline95).filter(Boolean);
  const avg = prices95.length ? Math.round(prices95.reduce((a, b) => a + b, 0) / prices95.length) : 0;
  const min = prices95[0] ?? 0;
  const all95 = (stations ?? []).map((s) => s.prices.gasoline95).filter(Boolean);
  const national = all95.length ? Math.round(all95.reduce((a, b) => a + b, 0) / all95.length) : avg;
  const diff = avg && national ? avg - national : 0;
  const url = `${SITE_URL}/marca/${brand.slug}`;

  return (
    <div className="min-h-screen bg-background pb-16">
      <Helmet>
        <title>{`Precio bencina ${brand.displayName} hoy | TÜcom`}</title>
        <meta name="description" content={`Precios de bencina ${brand.displayName} hoy en Chile. Compara 93, 95, 97 y diésel en estaciones ${brand.displayName} con datos oficiales CNE actualizados.`} />
        <meta name="keywords" content={`bencina ${brand.displayName}, precio ${brand.displayName}, estaciones ${brand.displayName}, ${brand.displayName} 95, ${brand.displayName} diésel`} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={`Precio bencina ${brand.displayName} hoy | TÜcom`} />
        <meta property="og:description" content={`Estaciones ${brand.displayName} más baratas en Chile. Datos CNE en tiempo real.`} />
        <meta property="og:url" content={url} />
        <script type="application/ld+json">{JSON.stringify({ "@context": "https://schema.org", "@type": "WebPage", name: `Precio bencina ${brand.displayName}`, description: `Precio de bencina en estaciones ${brand.displayName} hoy. Datos CNE.`, url, breadcrumb: { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "TÜcom", item: SITE_URL }, { "@type": "ListItem", position: 2, name: "Bencina por marca", item: `${SITE_URL}/marcas` }, { "@type": "ListItem", position: 3, name: brand.displayName, item: url }] } })}</script>
      </Helmet>
      <header className="bg-gradient-primary px-4 pt-[env(safe-area-inset-top)] shadow-elegant">
        <div className="max-w-5xl mx-auto py-5 text-white">
          <Link to="/marcas" className="inline-flex items-center gap-2 text-sm text-white/85 hover:text-white mb-4"><ArrowLeft className="w-4 h-4" /> Marcas</Link>
          <div className="flex items-center gap-3">
            <BrandLogo brand={brand.displayName} size={44} />
            <div>
              <h1 className="font-heading font-extrabold text-3xl">Bencina {brand.displayName} hoy</h1>
              <p className="text-sm text-white/85 mt-1">{brand.tagline} · Datos CNE actualizados</p>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2"><Fuel className="w-4 h-4 text-primary" /><h2 className="font-heading font-bold">Top estaciones {brand.displayName} más baratas</h2></div>
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
            )) : <p className="p-4 text-sm text-muted-foreground">Aún no hay precios CNE disponibles para {brand.displayName}.</p>}
          </div>
        </section>
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-2xl p-4"><p className="text-xs text-muted-foreground">Promedio 95 {brand.displayName}</p><p className="font-heading font-extrabold text-2xl text-primary">{avg ? formatPrice(avg) : "—"}</p></div>
          <div className="bg-card border border-border rounded-2xl p-4"><p className="text-xs text-muted-foreground">Promedio nacional</p><p className="font-heading font-extrabold text-2xl">{national ? formatPrice(national) : "—"}</p></div>
          <div className="bg-card border border-border rounded-2xl p-4"><p className="text-xs text-muted-foreground">Comparación</p><p className="text-sm font-semibold">{brand.displayName} está {Math.abs(diff)} pesos {diff > 0 ? "más caro" : "más barato"} que el promedio nacional en 95.</p></div>
        </section>
        <section className="bg-gradient-primary text-primary-foreground rounded-2xl p-5 shadow-elegant">
          <h2 className="font-heading font-bold text-xl">Encuentra la estación {brand.displayName} más barata cerca tuyo</h2>
          <p className="text-sm text-white/85 mt-1">{brand.description}</p>
          <Link to={`/?tab=stations&brand=${encodeURIComponent(brand.displayName)}`} className="inline-flex mt-3 bg-card text-primary rounded-xl px-4 py-2 text-sm font-bold">Abrir TÜcom <ExternalLink className="w-4 h-4 ml-1" /></Link>
        </section>
        <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="font-heading font-bold">Preguntas frecuentes</h2>
          <p className="text-sm"><strong>¿Cuánto cuesta la bencina 95 en {brand.displayName} hoy?</strong><br />Ronda los {avg ? formatPrice(avg) : "precios disponibles"}/L según datos CNE. El precio más bajo registrado hoy en {brand.displayName} es {min ? formatPrice(min) : "—"}/L.</p>
          <p className="text-sm"><strong>¿Cuántas estaciones {brand.displayName} hay con precio disponible?</strong><br />Actualmente hay {rows.length} estaciones {brand.displayName} con precio 95 publicado.</p>
          <p className="text-sm"><strong>¿Dónde encuentro la estación {brand.displayName} más barata?</strong><br />TÜcom muestra estaciones {brand.displayName} cercanas con datos oficiales CNE para encontrar el menor precio.</p>
        </section>
        <section>
          <h2 className="font-heading font-bold mb-3">También puedes consultar precios por marca:</h2>
          <div className="flex flex-wrap gap-2">
            {otherBrands(brand).map((b) => (
              <Link key={b.slug} to={`/marca/${b.slug}`} className="rounded-full bg-muted text-foreground px-3 py-1.5 text-sm font-medium hover:bg-primary hover:text-primary-foreground">{b.displayName}</Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default BrandPage;
