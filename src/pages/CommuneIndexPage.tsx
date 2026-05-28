import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, MapPin } from "lucide-react";
import { COMMUNES, SITE_URL } from "@/data/communes";
import { useGasStations } from "@/hooks/useGasStations";
import { formatPrice } from "@/lib/format";

const CommuneIndexPage = () => {
  const { data: stations } = useGasStations();

  return (
    <div className="min-h-screen bg-background pb-16">
      <Helmet>
        <title>Precios de bencina por ciudad en Chile | TÜcom</title>
        <meta name="description" content="Consulta el precio de la bencina en tu ciudad. Datos CNE en tiempo real para las 20 ciudades más grandes de Chile." />
        <link rel="canonical" href={`${SITE_URL}/bencina`} />
        <meta property="og:url" content={`${SITE_URL}/bencina`} />
      </Helmet>
      <header className="bg-gradient-primary px-4 pt-[env(safe-area-inset-top)] shadow-elegant">
        <div className="max-w-5xl mx-auto py-5 text-white">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/85 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Link>
          <h1 className="font-heading font-extrabold text-3xl">Precios de bencina por ciudad en Chile</h1>
          <p className="text-sm text-white/85 mt-2 max-w-2xl">Compara bencina 93, 95, 97 y diésel con datos CNE actualizados.</p>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {COMMUNES.map((c) => {
          const communeStations = (stations ?? []).filter((s) => s.commune?.toLowerCase().includes(c.displayName.toLowerCase()));
          const cheapest95 = communeStations.map((s) => s.prices.gasoline95).filter(Boolean).sort((a, b) => a - b)[0];
          return (
            <Link key={c.slug} to={`/bencina/${c.slug}`} className="rounded-2xl bg-card border border-border p-4 shadow-soft hover:shadow-elegant transition-all">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading font-bold text-foreground">{c.displayName}</h2>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {c.regionShort} · {c.population} hab.</p>
                </div>
                <div className="text-right">
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

export default CommuneIndexPage;
