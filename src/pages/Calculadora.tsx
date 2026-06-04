import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Calculator, Car, Share2, Sparkles, ExternalLink, MapPin, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import CatalogVehiclePicker from "@/components/calculadora/CatalogVehiclePicker";
import ConsumptionStrip from "@/components/calculadora/ConsumptionStrip";
import CompareCarsTab from "@/components/calculadora/CompareCarsTab";
import RealVsOfficialStrip from "@/components/calculadora/RealVsOfficialStrip";
import { QUICK_DESTINATIONS, calcTrip, vehicleLabel, type RouteType } from "@/lib/tripCalc";
import type { CatalogVehicle } from "@/hooks/useVehiclesCatalog";
import { useFuelPrices } from "@/hooks/useFuelPrices";
import { useCheapestStations } from "@/hooks/useNearbyStations";
import { formatPrice, formatDistance } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DEFAULT_PRICES } from "@/lib/priceRanges";

const LOADING_MSGS = [
  "Buscando precios CNE...",
  "Calculando rendimiento oficial...",
  "Consultando estaciones en tu ruta...",
  "Generando análisis personalizado...",
];

const Calculadora = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const [savingVehicle, setSavingVehicle] = useState(false);


  // Vehicle selection state
  const [brand, setBrand] = useState<string | null>(params.get("brand"));
  const [model, setModel] = useState<string | null>(params.get("model"));
  const [year, setYear] = useState<number | null>(params.get("year") ? Number(params.get("year")) : null);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<CatalogVehicle | null>(null);

  // Destination
  const initialKm = params.get("km") ? Number(params.get("km")) : 0;
  const [destKm, setDestKm] = useState<number>(initialKm);
  const [destLabel, setDestLabel] = useState<string>(params.get("dest") ?? "");
  const [route, setRoute] = useState<RouteType>("mixed");
  const [roundTrip, setRoundTrip] = useState(false);

  // Pre-select destination chip from URL ?dest=
  useEffect(() => {
    const slug = params.get("dest");
    if (slug && !destKm) {
      const found = QUICK_DESTINATIONS.find((d) => d.id === slug || d.label.toLowerCase().includes(slug.toLowerCase()));
      if (found) { setDestKm(found.km); setDestLabel(found.label); }
    }
  }, [params, destKm]);

  // Geolocation for "cheapest station near you"
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  const fuelKey = vehicle?.fuel_type === "hybrid" ? "gasoline95" : (vehicle?.fuel_type ?? "gasoline95");
  const cheapestRPC = useCheapestStations(loc?.lat ?? null, loc?.lng ?? null, 10000, fuelKey === "electric" ? "electric" : (fuelKey as any), 3);
  const fuelPrices = useFuelPrices();

  // Loading / step state
  const [calculating, setCalculating] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const [showResult, setShowResult] = useState(false);
  useEffect(() => {
    if (!calculating) return;
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % LOADING_MSGS.length), 600);
    return () => clearInterval(id);
  }, [calculating]);

  const step: 1 | 2 | 3 = showResult ? 3 : !vehicle ? 1 : destKm > 0 ? 2 : 2;

  const referencePrice = useMemo(() => {
    if (!vehicle) return 0;
    if (vehicle.fuel_type === "electric") return DEFAULT_PRICES.electric;
    const row = fuelPrices.data?.find((r) => r.type === fuelKey);
    return row?.price ?? DEFAULT_PRICES[fuelKey] ?? DEFAULT_PRICES.gasoline95;
  }, [vehicle, fuelKey, fuelPrices.data]);

  const cheapestStation = cheapestRPC.data?.[0] ?? null;
  const effectivePrice = cheapestStation?.price ?? referencePrice;

  const totalKm = roundTrip ? destKm * 2 : destKm;
  const calc = vehicle ? calcTrip(vehicle, totalKm, route, effectivePrice) : null;
  const avgSavings = calc && referencePrice > effectivePrice
    ? Math.round((referencePrice - effectivePrice) * calc.units)
    : 0;

  // AI analysis
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const fetchAnalysis = async (v: CatalogVehicle, c: ReturnType<typeof calcTrip>, station: typeof cheapestStation) => {
    setAnalysisLoading(true);
    setAnalysis(null);
    try {
      const ctx = {
        vehicle: vehicleLabel(v),
        consumption_kml: c.consumption.toFixed(1),
        km: c.km,
        route,
        fuel: v.fuel_type,
        price_cne: effectivePrice,
        avg_price: referencePrice,
        total: c.total,
        station: station ? `${station.brand} ${station.name}` : null,
      };
      const prompt = `Analiza este viaje en Chile y entrega exactamente:\n1) Una oración con el costo y si el vehículo es eficiente para esta ruta.\n2) Si hay ahorro vs promedio: cuánto y dónde cargar.\n3) Si conviene cargar ahora o esperar al MEPCO del jueves.\n4) Una recomendación breve de conducción eficiente para esta ruta.\nResponde en español formal, claro y cercano, máximo 4 oraciones, sin bullet points.\n\nDatos: ${JSON.stringify(ctx)}`;
      const { data, error } = await (await import("@/integrations/supabase/client")).supabase.functions.invoke("tucom-assistant", {
        body: { messages: [{ role: "user", content: prompt }] },
      });
      if (error) throw error;
      const text = (data as any)?.message ?? (data as any)?.reply ?? (data as any)?.content ?? null;
      setAnalysis(typeof text === "string" ? text : null);
    } catch (e) {
      console.error("ai analysis failed", e);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleCalculate = async () => {
    if (!vehicle) { toast.error("Elige un vehículo"); return; }
    if (!destKm) { toast.error("Indica un destino o km"); return; }
    setCalculating(true);
    setMsgIdx(0);
    setShowResult(false);
    await new Promise((r) => setTimeout(r, 1800));
    setCalculating(false);
    setShowResult(true);
    if (vehicle && calc) fetchAnalysis(vehicle, calc, cheapestStation);
  };

  const reset = () => {
    setShowResult(false);
    setAnalysis(null);
    setDestKm(0);
    setDestLabel("");
    setRoundTrip(false);
  };

  const shareCalc = async () => {
    if (!calc || !vehicle) return;
    const text = `Mi ${vehicle.brand} ${vehicle.model} ${vehicle.year} gastaría ${formatPrice(calc.total)} para ir ${destLabel || `${totalKm} km`}. Calculado con TÜcom.`;
    try {
      if (navigator.share) { await navigator.share({ title: "Costo de viaje · TÜcom", text }); return; }
      await navigator.clipboard.writeText(text);
      toast.success("Resumen copiado");
    } catch { /* cancelled */ }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Helmet>
        <title>Calculadora de viaje | TÜcom</title>
        <meta name="description" content="Calcula cuánto te cuesta tu viaje en bencina con el catálogo oficial de vehículos del Ministerio de Energía y precios CNE en tiempo real." />
        <link rel="canonical" href="https://tucombustible.lovable.app/calculadora" />
      </Helmet>

      {/* Header */}
      <header className="bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(238_84%_67%)] px-4 pt-[env(safe-area-inset-top)] sticky top-0 z-40 shadow-elegant">
        <div className="max-w-3xl mx-auto py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/15 text-white hover:bg-white/25" aria-label="Volver">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-heading font-extrabold text-white text-lg leading-tight">Calculadora de viaje</h1>
              <p className="text-[11px] text-white/85">Catálogo oficial · Precios CNE en tiempo real</p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1 mt-3 text-[10px] text-white/90">
            {["Vehículo","Destino","Resultado"].map((label, i) => {
              const n = (i + 1) as 1|2|3;
              const active = step === n;
              const done = step > n;
              return (
                <div key={label} className="flex items-center gap-1">
                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${done ? "bg-white text-primary" : active ? "bg-white/90 text-primary" : "bg-white/20 text-white/80"}`}>{n}</span>
                  <span className={active || done ? "text-white font-semibold" : "text-white/70"}>{label}</span>
                  {n < 3 && <span className="mx-1 opacity-50">→</span>}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5">
        <Tabs defaultValue="calc" className="w-full">
          <TabsList className="grid grid-cols-2 w-full rounded-xl h-11">
            <TabsTrigger value="calc" className="rounded-lg">Calcular</TabsTrigger>
            <TabsTrigger value="compare" className="rounded-lg">Comparar autos</TabsTrigger>
          </TabsList>

          {/* TAB 1 */}
          <TabsContent value="calc" className="space-y-4 mt-4">
            {/* Vehicle */}
            <section className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-soft">
              <h2 className="font-heading font-bold text-foreground text-sm flex items-center gap-2">
                <Car className="w-4 h-4 text-primary" aria-hidden="true" /> Tu vehículo
              </h2>
              <CatalogVehiclePicker
                brand={brand}
                model={model}
                year={year}
                versionId={versionId}
                onChange={(next) => {
                  setBrand(next.brand);
                  setModel(next.model);
                  setYear(next.year);
                  setVersionId(next.versionId);
                  setVehicle(next.vehicle);
                }}
              />
              {vehicle && <ConsumptionStrip vehicle={vehicle} />}
              {vehicle && (
                <RealVsOfficialStrip officialKml={vehicle.consumption_mixed ?? vehicle.consumption_city ?? 12} />
              )}
              {vehicle && user && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={savingVehicle}
                  onClick={async () => {
                    setSavingVehicle(true);
                    const { error } = await supabase.from("user_vehicles").insert({
                      user_id: user.id,
                      brand: vehicle.brand,
                      model: vehicle.model,
                      year: vehicle.year,
                      fuel_type: vehicle.fuel_type === "hybrid" ? "gasoline95" : vehicle.fuel_type,
                      consumption_kml: vehicle.consumption_mixed ?? vehicle.consumption_city ?? 12,
                      tank_size_l: 50,
                      nickname: `${vehicle.brand} ${vehicle.model}`,
                    });
                    setSavingVehicle(false);
                    if (error) { toast.error("No se pudo guardar"); return; }
                    toast.success("Vehículo guardado en tu perfil");
                  }}
                  className="w-full rounded-xl"
                >
                  <Save className="w-4 h-4 mr-1" /> Guardar vehículo en mi perfil
                </Button>
              )}
            </section>

            {/* Destination */}
            <section className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-soft">
              <h2 className="font-heading font-bold text-foreground text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" aria-hidden="true" /> Tu destino
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_DESTINATIONS.map((d) => {
                  const active = destKm === d.km && destLabel === d.label;
                  return (
                    <button
                      key={d.id}
                      onClick={() => { setDestKm(d.km); setDestLabel(d.label); }}
                      className={`rounded-xl border px-3 py-2 text-left text-xs press-scale transition ${active ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 text-foreground hover:bg-muted"}`}
                    >
                      <div className="font-semibold truncate">{d.label}</div>
                      <div className="text-[10px] text-muted-foreground">~{d.km} km</div>
                    </button>
                  );
                })}
              </div>
              <div>
                <Label htmlFor="custom-km" className="text-xs">O ingresa los km del viaje</Label>
                <Input
                  id="custom-km"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={destKm || ""}
                  onChange={(e) => { setDestKm(Number(e.target.value) || 0); setDestLabel("Personalizado"); }}
                  placeholder="Ej. 220"
                  className="h-11 mt-1 rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs">Tipo de ruta</Label>
                <div className="flex gap-2 mt-1">
                  {([
                    { v: "city", label: "🏙 Ciudad" },
                    { v: "mixed", label: "🔀 Mixta" },
                    { v: "hwy", label: "🛣 Carretera" },
                  ] as const).map((r) => (
                    <button
                      key={r.v}
                      onClick={() => setRoute(r.v)}
                      className={`flex-1 rounded-xl px-2 py-2 text-xs font-semibold press-scale transition ${route === r.v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                <span className="text-sm text-foreground">Ida y vuelta</span>
                <Switch checked={roundTrip} onCheckedChange={setRoundTrip} />
              </div>

              <Button
                onClick={handleCalculate}
                disabled={!vehicle || !destKm || calculating}
                className="w-full h-12 rounded-xl bg-gradient-primary text-white font-semibold shadow-glow"
              >
                <Calculator className="w-4 h-4 mr-2" /> Calcular costo del viaje
              </Button>
            </section>

            {/* Loading */}
            {calculating && (
              <section className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
                <div className="inline-block w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-sm text-foreground font-medium animate-fade-in" key={msgIdx}>{LOADING_MSGS[msgIdx]}</p>
              </section>
            )}

            {/* Result */}
            {showResult && calc && vehicle && (
              <>
                <section className="rounded-3xl bg-gradient-to-br from-[hsl(262_83%_58%)] to-[hsl(238_84%_67%)] text-white p-5 shadow-glow space-y-2 animate-scale-in">
                  <p className="font-heading font-extrabold text-4xl tabular-nums leading-none">{formatPrice(calc.total)}</p>
                  <p className="text-xs text-white/85">
                    {roundTrip ? "Ida y vuelta" : "Solo ida"} · {totalKm} km · ruta {route === "city" ? "ciudad" : route === "hwy" ? "carretera" : "mixta"}
                  </p>
                  <p className="inline-flex text-[11px] font-semibold bg-white/15 rounded-full px-2 py-0.5">
                    {vehicle.brand} {vehicle.model} {vehicle.year} · {vehicle.version}
                  </p>
                </section>

                <section className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-card border border-border p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{calc.isElectric ? "Energía" : "Litros"}</p>
                    <p className="font-heading font-bold text-primary text-lg tabular-nums">{calc.units.toFixed(1)} {calc.isElectric ? "kWh" : "L"}</p>
                  </div>
                  <div className="rounded-2xl bg-card border border-border p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rendimiento</p>
                    <p className="font-heading font-bold text-foreground text-lg tabular-nums">{calc.consumption.toFixed(1)} km/{calc.isElectric ? "kWh" : "L"}</p>
                  </div>
                  <div className="rounded-2xl bg-card border border-border p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Precio CNE</p>
                    <p className="font-heading font-bold text-foreground text-lg tabular-nums">{formatPrice(effectivePrice)}/{calc.isElectric ? "kWh" : "L"}</p>
                  </div>
                  <div className="rounded-2xl bg-card border border-border p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ahorro vs prom.</p>
                    <p className={`font-heading font-bold text-lg tabular-nums ${avgSavings > 0 ? "text-success" : "text-muted-foreground"}`}>
                      {avgSavings > 0 ? `−${formatPrice(avgSavings)}` : "Precio promedio"}
                    </p>
                  </div>
                </section>

                {cheapestStation && (
                  <button
                    onClick={() => navigate(`/station/${cheapestStation.id}`)}
                    className="w-full text-left bg-card border-2 border-primary/30 rounded-2xl p-3 hover:bg-accent transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-primary font-bold">Estación más barata cerca</p>
                        <p className="font-semibold text-foreground truncate">{cheapestStation.brand} · {cheapestStation.name}</p>
                        <p className="text-[11px] text-muted-foreground">{formatDistance((cheapestStation.distance_m ?? 0) / 1000)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-heading font-bold text-primary text-lg">{formatPrice(cheapestStation.price ?? 0)}</p>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground">Más barata</span>
                      </div>
                    </div>
                  </button>
                )}

                <details className="bg-muted/30 rounded-xl px-3 py-2 text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver cálculo</summary>
                  <p className="mt-2 text-foreground tabular-nums">
                    {totalKm} km ÷ {calc.consumption.toFixed(1)} km/{calc.isElectric ? "kWh" : "L"} = {calc.units.toFixed(1)} {calc.isElectric ? "kWh" : "L"} × {formatPrice(effectivePrice)} = {formatPrice(calc.total)}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Fuente rendimiento: consumovehicular.cl · Ciclo WLTC oficial</p>
                </details>

                {/* AI analysis */}
                <section className="rounded-2xl bg-primary/5 border border-primary/30 p-4 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-primary font-bold inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Análisis del asistente TÜcom
                  </p>
                  {analysisLoading ? (
                    <Skeleton className="h-16 rounded-xl" />
                  ) : analysis ? (
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{analysis}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">No se pudo generar el análisis. Toca un chip abajo para preguntarle al asistente.</p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      "💡 Cómo mejorar mi rendimiento",
                      "📅 ¿Cuándo conviene cargar?",
                      "🔀 Comparar con otro auto",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          try { sessionStorage.setItem("tucom_chat_prefill", q); } catch { /* noop */ }
                          window.dispatchEvent(new CustomEvent("tucom-open-chat"));
                        }}
                        className="text-[11px] bg-card border border-primary/30 rounded-full px-2.5 py-1 text-foreground hover:bg-primary/10"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </section>

                <div className="grid grid-cols-2 gap-2">
                  {cheapestStation && (
                    <Button variant="outline" className="rounded-xl" onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${cheapestStation.lat},${cheapestStation.lng}&travelmode=driving`;
                      window.open(url, "_blank");
                    }}>
                      <MapPin className="w-4 h-4 mr-1" /> Cómo llegar
                    </Button>
                  )}
                  <Button variant="outline" className="rounded-xl" onClick={shareCalc}>
                    <Share2 className="w-4 h-4 mr-1" /> Compartir
                  </Button>
                </div>

                <Button variant="ghost" className="w-full" onClick={reset}>
                  <RotateCcw className="w-4 h-4 mr-1" /> Calcular otro viaje
                </Button>

                <p className="text-[10px] text-muted-foreground text-center px-4 leading-relaxed">
                  Rendimiento oficial: consumovehicular.cl · Ministerio de Energía de Chile.{" "}
                  Precio combustible: CNE Bencina en Línea.
                </p>

                <div className="text-center">
                  <button onClick={() => navigate("/calculadora-rutas")} className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                    Modo ruta avanzada con TAG <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </>
            )}
          </TabsContent>

          {/* TAB 2 */}
          <TabsContent value="compare" className="mt-4">
            <CompareCarsTab
              defaultFuelPrice={fuelPrices.data?.find((r) => r.type === "gasoline95")?.price ?? DEFAULT_PRICES.gasoline95}
              defaultElectricPrice={DEFAULT_PRICES.electric}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Calculadora;
