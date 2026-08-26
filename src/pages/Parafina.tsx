import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Flame, Info, ShieldAlert, Tag, Thermometer, Droplet, ExternalLink, MapPin, Search, Navigation } from "lucide-react";
import { SITE_URL } from "@/data/brands";
import { useStationDiscounts } from "@/hooks/useStationDiscounts";
import { useGasStations, calculateDistance, formatRelativeTime } from "@/hooks/useGasStations";
import { formatPrice } from "@/lib/format";
import BrandLogo from "@/components/BrandLogo";

const url = `${SITE_URL}/parafina`;

const PARAFINA_KEYS = ["parafina", "kerosene", "kerosén", "keroseno"];

const FAQS = [
  {
    q: "¿La parafina y el kerosene son lo mismo?",
    a: "Sí. En Chile se le llama parafina al kerosene doméstico: es el mismo combustible destilado del petróleo, usado en estufas y calefactores de mecha o laser. En otros países se comercializa como kerosene o kerosine.",
  },
  {
    q: "¿Sirve la parafina de estación de servicio para cualquier estufa?",
    a: "La parafina doméstica que se vende en estaciones de servicio en Chile está formulada para estufas y calefactores de uso hogareño. Revisa siempre el manual de tu equipo: algunos modelos exigen parafina de bajo azufre o filtrada.",
  },
  {
    q: "¿Se puede pagar parafina con tarjetas de descuento de bencina?",
    a: "En la mayoría de los convenios no. Los descuentos por litro de tarjetas y apps suelen aplicar solo a gasolinas 93, 95, 97 y diésel. En esta página listamos únicamente los beneficios que incluyen parafina de forma explícita.",
  },
  {
    q: "¿Por qué la parafina no aparece en el mapa de precios de TÜcom?",
    a: "La CNE publica precios oficiales de gasolinas y diésel por estación. La parafina no viene en ese set de datos por estación, por eso la tratamos en una página aparte y con color propio para que no la confundas con la bencina.",
  },
];

const Parafina = () => {
  const navigate = useNavigate();
  const { data: discounts, isLoading } = useStationDiscounts();

  const parafinaDiscounts = useMemo(
    () =>
      (discounts ?? []).filter((d) =>
        (d.fuel_types ?? []).some((f) => PARAFINA_KEYS.includes(String(f).toLowerCase())),
      ),
    [discounts],
  );

  const otherDiscounts = useMemo(() => (discounts ?? []).slice(0, 6), [discounts]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Helmet>
        <title>Parafina (kerosene) en Chile: precio, dónde comprar y descuentos | TÜcom</title>
        <meta
          name="description"
          content="Todo sobre la parafina o kerosene doméstico en Chile: qué es, dónde comprarla, cómo usarla con seguridad y qué descuentos por litro existen realmente."
        />
        <meta name="keywords" content="parafina, kerosene, parafina precio, parafina Copec, kerosene doméstico, estufa a parafina, descuentos parafina" />
        <link rel="canonical" href={url} />
        <meta property="og:title" content="Parafina (kerosene) en Chile: precio, dónde comprar y descuentos" />
        <meta property="og:description" content="Guía TÜcom de la parafina doméstica: usos, seguridad, dónde cargarla y beneficios de descuento vigentes." />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "TÜcom", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Parafina (kerosene)", item: url },
            ],
          })}
        </script>
      </Helmet>

      {/* Cabecera con identidad cromática propia: ámbar = parafina, no bencina */}
      <header className="px-4 pt-[env(safe-area-inset-top)] shadow-elegant bg-[linear-gradient(135deg,hsl(28_95%_48%),hsl(45_98%_52%))]">
        <div className="max-w-3xl mx-auto py-5 text-[hsl(24_60%_12%)]">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-semibold opacity-80 hover:opacity-100 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[hsl(24_60%_12%)] flex items-center justify-center shrink-0">
              <Flame className="w-6 h-6 text-[hsl(45_98%_52%)]" />
            </div>
            <div>
              <span className="inline-block rounded-full bg-[hsl(24_60%_12%)] text-[hsl(45_98%_60%)] text-[11px] font-extrabold tracking-widest uppercase px-2.5 py-1">
                Parafina · Kerosene
              </span>
              <h1 className="font-heading font-extrabold text-3xl mt-2">Parafina (kerosene) en Chile</h1>
              <p className="text-sm font-medium mt-1 opacity-85">
                No es bencina ni diésel: es el combustible de calefacción. Por eso en TÜcom tiene su propio color ámbar.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Diferenciador visual */}
        <section className="rounded-2xl border-2 border-[hsl(28_95%_48%)] bg-[hsl(45_98%_52%/0.12)] p-5">
          <div className="flex items-center gap-2 mb-3">
            <Droplet className="w-4 h-4 text-[hsl(28_95%_40%)]" />
            <h2 className="font-heading font-bold text-foreground">Parafina = kerosene. Mismo producto, dos nombres</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { t: "Para qué sirve", d: "Estufas y calefactores domésticos de mecha o láser. No es combustible de auto." },
              { t: "Cómo se llama", d: "«Parafina» en Chile, «kerosene» o «kerosén» en el resto de Latinoamérica." },
              { t: "Cómo la reconoces", d: "Surtidor o bidón identificado aparte del de bencinas, normalmente en zona de despacho separada." },
            ].map((c) => (
              <div key={c.t} className="rounded-xl bg-card border border-[hsl(28_95%_48%/0.35)] p-3">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-[hsl(28_95%_38%)]">{c.t}</p>
                <p className="text-sm text-foreground mt-1">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Beneficios y descuentos */}
        <section className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Tag className="w-4 h-4 text-[hsl(28_95%_45%)]" />
            <h2 className="font-heading font-bold">Descuentos y beneficios en parafina</h2>
          </div>

          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Cargando beneficios vigentes…</p>
          ) : parafinaDiscounts.length > 0 ? (
            <ul className="divide-y divide-border">
              {parafinaDiscounts.map((d) => (
                <li key={d.id} className="p-4 flex items-center gap-3">
                  <BrandLogo brand={d.brand} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground">{d.payment_method}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.description ?? `Descuento en parafina en ${d.brand}`}
                      {d.day_of_week?.length ? ` · ${d.day_of_week.join(", ")}` : ""}
                    </p>
                  </div>
                  <span className="rounded-lg bg-[hsl(45_98%_52%/0.2)] text-[hsl(28_95%_35%)] font-extrabold text-sm px-2.5 py-1 tabular-nums">
                    -${d.discount_clp}/L
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 space-y-3">
              <div className="rounded-xl border border-[hsl(28_95%_48%/0.4)] bg-[hsl(45_98%_52%/0.1)] p-3 flex gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-[hsl(28_95%_40%)]" />
                <p className="text-sm text-foreground">
                  Hoy <strong>no hay convenios vigentes que incluyan parafina</strong> en nuestro registro. Los descuentos
                  por litro de tarjetas y apps en Chile aplican a gasolinas 93, 95, 97 y diésel, y casi siempre excluyen
                  parafina en sus bases. Si aparece uno, lo verás aquí automáticamente.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Beneficios vigentes en otros combustibles (no aplican a parafina):</p>
              <div className="flex flex-wrap gap-2">
                {otherDiscounts.map((d) => (
                  <span key={d.id} className="rounded-full bg-muted text-muted-foreground text-xs px-3 py-1.5">
                    {d.brand} · {d.payment_method} −${d.discount_clp}/L
                  </span>
                ))}
              </div>
              <Link to="/descuentos" className="inline-flex items-center gap-1 text-sm font-bold text-primary">
                Ver todos los descuentos <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </section>

        {/* Ahorro y consumo */}
        <section className="bg-card border border-border rounded-2xl p-5 space-y-2">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-[hsl(28_95%_45%)]" />
            <h2 className="font-heading font-bold">Cómo gastar menos parafina</h2>
          </div>
          <ul className="text-sm text-foreground list-disc pl-5 space-y-1">
            <li>Una estufa laser de 3.000 kcal/h consume aproximadamente 0,3 L por hora en potencia media.</li>
            <li>Limpia la mecha y el filtro: una combustión sucia quema más litros y ensucia el ambiente.</li>
            <li>Compra en bidón lleno; los recargos por despacho a domicilio suelen superar cualquier descuento.</li>
            <li>Sella filtraciones de aire antes de subir la potencia del calefactor.</li>
          </ul>
        </section>

        {/* Seguridad */}
        <section className="rounded-2xl border-2 border-[hsl(0_75%_50%/0.5)] bg-[hsl(0_75%_50%/0.07)] p-5">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-[hsl(0_75%_45%)]" />
            <h2 className="font-heading font-bold text-foreground">Seguridad: nunca confundas parafina con bencina</h2>
          </div>
          <ul className="text-sm text-foreground list-disc pl-5 space-y-1">
            <li>Jamás cargues parafina en un vehículo a gasolina o diésel: daña el motor y el sistema de inyección.</li>
            <li>Usa solo bidones autorizados, rotulados y bien cerrados; nunca envases de bebida.</li>
            <li>Ventila la habitación al menos 10 minutos por hora mientras la estufa esté encendida.</li>
            <li>Nunca rellenes el estanque con el calefactor encendido o caliente.</li>
          </ul>
        </section>

        {/* FAQ */}
        <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="font-heading font-bold">Preguntas frecuentes sobre la parafina</h2>
          {FAQS.map((f) => (
            <div key={f.q}>
              <p className="text-sm font-semibold text-foreground">{f.q}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{f.a}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl p-5 text-[hsl(24_60%_12%)] bg-[linear-gradient(135deg,hsl(28_95%_48%),hsl(45_98%_52%))] shadow-elegant">
          <h2 className="font-heading font-extrabold text-xl">¿Y la bencina de tu auto?</h2>
          <p className="text-sm mt-1 opacity-85">
            TÜcom compara precios oficiales CNE de 93, 95, 97 y diésel en estaciones cercanas a ti.
          </p>
          <Link to="/" className="inline-flex mt-3 bg-[hsl(24_60%_12%)] text-[hsl(45_98%_60%)] rounded-xl px-4 py-2 text-sm font-bold">
            Ver precios de bencina
          </Link>
        </section>
      </main>
    </div>
  );
};

export default Parafina;
