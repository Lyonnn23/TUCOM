import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";
import { BRANDS, SITE_URL } from "@/data/brands";
import { useGasStations } from "@/hooks/useGasStations";
import { formatPrice } from "@/lib/format";
import BrandLogo from "@/components/BrandLogo";

const BrandIndexPage = () => {
  const { data: stations } = useGasStations();

  return (
    <div className="min-h-screen bg-background pb-16">
      <Helmet>
        <title>Precios de bencina por marca en Chile | TÜcom</title>
        <meta name="description" content="Compara precios de bencina por marca en Chile: Copec, Shell, Aramco, Petrobras, Enex y Terpel. Datos CNE en tiempo real." />
        <link rel="canonical" href={`${SITE_URL}/marcas`} />
        <meta property="og:title" content="Precios de bencina por marca en Chile | TÜcom" />
        <meta property="og:description" content="Compara Copec, Shell, Aramco, Petrobras, Enex y Terpel con datos CNE en tiempo real." />
        <meta property="og:url" content={`${SITE_URL}/marcas`} />
      </Helmet>
      <header className="bg-gradient-primary px-4 pt-[env(safe-area-inset-top)] shadow-elegant">
        <div className="max-w-5xl mx-auto py-5 text-white">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/85 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Link>
          <h1 className="font-heading font-extrabold text-3xl">Precios de bencina por marca</h1>
          <p className="text-sm text-white/85 mt-2 max-w-2xl">Compara bencina 93, 95, 97 y diésel entre las principales marcas de Chile con datos CNE.</p>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {BRANDS.map((b) => {
          const brandStations = (stations ?? []).filter((s) => s.brand?.toLowerCase() === b.displayName.toLowerCase());
          const cheapest95 = brandStations.map((s) => s.prices.gasoline95).filter(Boolean).sort((a, c) => a - c)[0];
          return (
            <Link key={b.slug} to={`/marca/${b.slug}`} className="rounded-2xl bg-card border border-border p-4 shadow-soft hover:shadow-elegant transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <BrandLogo brand={b.displayName} size={36} />
                  <div className="min-w-0">
                    <h2 className="font-heading font-bold text-foreground truncate">{b.displayName}</h2>
                    <p className="text-xs text-muted-foreground truncate">{b.tagline}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground">95 desde</p>
                  <p className="font-heading font-extrabold text-primary tabular-nums">{cheapest95 ? formatPrice(cheapest95) : "—"}</p>
                </div>
              </div>
              <p className="text-xs font-semibold text-primary mt-4">Ver precios →</p>
            </Link>
          );
        })}
      </main>
    </div>
  );
};

export default BrandIndexPage;
