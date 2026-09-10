import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft,
  Car,
  Share2,
  Fuel,
  Gauge,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TripPlanner from "@/components/calculadora/TripPlanner";
import { useFuelPrices } from "@/hooks/useFuelPrices";
import { useCheapestStations, type FuelTypeKey } from "@/hooks/useNearbyStations";
import { useUserVehicles } from "@/hooks/useUserVehicles";
import { formatPrice } from "@/lib/format";
import { DEFAULT_PRICES } from "@/lib/priceRanges";
import { toast } from "sonner";

type FuelKey = "gasoline93" | "gasoline95" | "gasoline97" | "diesel" | "electric";

const FUEL_OPTIONS: { key: FuelKey; label: string }[] = [
  { key: "gasoline93", label: "93" },
  { key: "gasoline95", label: "95" },
  { key: "gasoline97", label: "97" },
  { key: "diesel", label: "Diésel" },
  { key: "electric", label: "⚡ EV" },
];

const fuelLabel = (k: FuelKey) => FUEL_OPTIONS.find((f) => f.key === k)?.label ?? k;


const Calculadora = () => {
  const navigate = useNavigate();
  const { primary: primaryVehicle } = useUserVehicles();
  const fuelPrices = useFuelPrices();

  // GPS
  const [activeTab, setActiveTab] = useState("viaje");
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setGps({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  // === Shared fuel + consumption (prefilled from vehicle when available) ===
  const [fuelType, setFuelType] = useState<FuelKey>("gasoline95");
  const [consumption, setConsumption] = useState<number>(12);
  const [tankSize, setTankSize] = useState<number>(50);
  const [vehicleHydrated, setVehicleHydrated] = useState(false);

  useEffect(() => {
    if (!primaryVehicle || vehicleHydrated) return;
    const ft = primaryVehicle.fuel_type as FuelKey;
    if (FUEL_OPTIONS.some((o) => o.key === ft)) setFuelType(ft);
    if (primaryVehicle.consumption_kml > 0) setConsumption(primaryVehicle.consumption_kml);
    if (primaryVehicle.tank_size_l > 0) setTankSize(primaryVehicle.tank_size_l);
    setVehicleHydrated(true);
  }, [primaryVehicle, vehicleHydrated]);

  // Cheapest nearby station for selected fuel (smart prefill)
  const cheapest = useCheapestStations(
    gps?.lat ?? null,
    gps?.lng ?? null,
    10000,
    fuelType as FuelTypeKey,
    5,
  );
  const cheapestStation = cheapest.data?.[0] ?? null;
  const avgPrice = useMemo(() => {
    const row = fuelPrices.data?.find((r) => r.type === fuelType);
    return row?.price ?? DEFAULT_PRICES[fuelType] ?? DEFAULT_PRICES.gasoline95;
  }, [fuelPrices.data, fuelType]);
  const cheapestPrice = cheapestStation?.price ?? avgPrice;

  // === MODO VIAJE === (ver src/components/calculadora/TripPlanner.tsx)



  // === MODO ESTANQUE ===
  const [pct, setPct] = useState<number>(50);
  const currentL = (tankSize * pct) / 100;
  const rangeKm = Math.round(currentL * Math.max(consumption, 0.1));
  const toFillL = Math.max(0, tankSize - currentL);
  const fillCost = Math.round(toFillL * cheapestPrice);
  const lowFuel = rangeKm < 50;

  const shareTank = async () => {
    const text = `Con ${pct}% de estanque me quedan ${rangeKm} km. Llenar el estanque cuesta ${formatPrice(fillCost)} (${fuelLabel(fuelType)}). · TÜcom`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Mi estanque · TÜcom", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("Resumen copiado");
    } catch { /* cancelled */ }
  };

  // === MODO COMPARAR (rebuilt: 93/95/97/Diesel side-by-side) ===
  type CompareFuel = "gasoline93" | "gasoline95" | "gasoline97" | "diesel";
  const COMPARE_OPTIONS: { key: CompareFuel; label: string }[] = [
    { key: "gasoline93", label: "93" },
    { key: "gasoline95", label: "95" },
    { key: "gasoline97", label: "97" },
    { key: "diesel", label: "Diésel" },
  ];
  const [fuelA, setFuelA] = useState<CompareFuel>("gasoline93");
  const [fuelB, setFuelB] = useState<CompareFuel>("gasoline95");
  const [litros, setLitros] = useState<number>(40);
  const [litrosHydrated, setLitrosHydrated] = useState(false);
  const [weeksFreq, setWeeksFreq] = useState<number>(2);
  const [priceAOverride, setPriceAOverride] = useState<number | null>(null);
  const [priceBOverride, setPriceBOverride] = useState<number | null>(null);
  const [editingA, setEditingA] = useState(false);
  const [editingB, setEditingB] = useState(false);

  // Prefill litros from vehicle tank size once
  useEffect(() => {
    if (litrosHydrated) return;
    if (primaryVehicle && primaryVehicle.tank_size_l > 0) {
      setLitros(Math.round(primaryVehicle.tank_size_l));
      setLitrosHydrated(true);
    }
  }, [primaryVehicle, litrosHydrated]);

  const pickA = (k: CompareFuel) => {
    if (k === fuelB) setFuelB(fuelA);
    setFuelA(k);
    setPriceAOverride(null);
  };
  const pickB = (k: CompareFuel) => {
    if (k === fuelA) setFuelA(fuelB);
    setFuelB(k);
    setPriceBOverride(null);
  };

  const cheapestA = useCheapestStations(gps?.lat ?? null, gps?.lng ?? null, 10000, fuelA as FuelTypeKey, 1);
  const cheapestB = useCheapestStations(gps?.lat ?? null, gps?.lng ?? null, 10000, fuelB as FuelTypeKey, 1);
  const autoPriceA =
    cheapestA.data?.[0]?.price ??
    fuelPrices.data?.find((r) => r.type === fuelA)?.price ??
    DEFAULT_PRICES[fuelA];
  const autoPriceB =
    cheapestB.data?.[0]?.price ??
    fuelPrices.data?.find((r) => r.type === fuelB)?.price ??
    DEFAULT_PRICES[fuelB];
  const priceA = priceAOverride ?? autoPriceA;
  const priceB = priceBOverride ?? autoPriceB;

  const costA = Math.round(priceA * litros);
  const costB = Math.round(priceB * litros);
  const tankDiff = costB - costA; // >0 → B más caro
  const fillsPerYear = Math.round(52 / Math.max(weeksFreq, 1));
  const annualA = costA * fillsPerYear;
  const annualB = costB * fillsPerYear;
  const annualDiff = Math.abs(annualB - annualA);

  const labelA = COMPARE_OPTIONS.find((o) => o.key === fuelA)?.label ?? "";
  const labelB = COMPARE_OPTIONS.find((o) => o.key === fuelB)?.label ?? "";

  const pair = [fuelA, fuelB].sort().join("|");
  const hasDiesel = fuelA === "diesel" || fuelB === "diesel";
  let explanation = "";
  if (hasDiesel) {
    explanation =
      "El Diésel rinde más por litro (~15–20% más autonomía) pero solo funciona en motores Diésel. No mezcles combustibles distintos al especificado por el fabricante.";
  } else if (pair === "gasoline93|gasoline95") {
    explanation = `¿Vale la pena el 95? Para la mayoría de los autos estándar, el 95 no mejora el rendimiento pero cuesta ${formatPrice(Math.abs(tankDiff))} más por estanque. En un año (${fillsPerYear} cargas): ${formatPrice(annualDiff)} de diferencia.`;
  } else if (pair === "gasoline95|gasoline97") {
    explanation = `¿Vale la pena el 97? Solo recomendado si tu manual lo especifica. El costo extra por estanque es ${formatPrice(Math.abs(tankDiff))}.`;
  } else if (pair === "gasoline93|gasoline97") {
    explanation = `Saltar de 93 a 97 suele costar ${formatPrice(Math.abs(tankDiff))} más por estanque. Solo úsalo si el fabricante lo exige.`;
  } else if (fuelA === fuelB) {
    explanation = "Selecciona dos combustibles distintos para comparar costos.";
  } else {
    explanation = "Selecciona dos combustibles distintos para comparar.";
  }

  const shareCompare = async () => {
    const cheaperLabel = costA <= costB ? labelA : labelB;
    const pricierLabel = costA <= costB ? labelB : labelA;
    const ahorro = Math.abs(tankDiff);
    const text = `Usando ${cheaperLabel} en vez de ${pricierLabel} ahorro ${formatPrice(ahorro)} por estanque. tucombustible.cl`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Comparé bencina con TÜcom", text, url: "https://tucombustible.cl" });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("¡Copiado!");
    } catch { /* cancelled */ }
  };


  return (
    <div className="min-h-screen bg-background pb-24">
      <Helmet>
        <title>Calculadora de combustible | TÜcom</title>
        <meta
          name="description"
          content="Calcula cuánto cuesta tu viaje, la autonomía de tu estanque y si vale la pena usar 95 vs 93. Precios CNE en tiempo real."
        />
        <link rel="canonical" href="https://tucombustible.cl/calculadora" />
      </Helmet>

      {/* Header */}
      <header className="bg-gradient-to-r from-[hsl(262_83%_58%)] to-[hsl(238_84%_67%)] px-4 pt-[env(safe-area-inset-top)] sticky top-0 z-40 shadow-elegant">
        <div className="max-w-3xl mx-auto py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-white/15 text-white hover:bg-white/25"
              aria-label="Volver"
              style={{ touchAction: "manipulation", minHeight: 44, minWidth: 44 }}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-heading font-extrabold text-white text-lg leading-tight">Calculadora</h1>
              <p className="text-[11px] text-white/85">Viaje · Estanque · Comparar</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5">
        <Tabs defaultValue="viaje" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="relative grid grid-cols-3 w-full rounded-xl h-11">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-1 left-0 h-0.5 w-1/3 px-3"
              style={{
                transform: `translateX(${["viaje", "estanque", "comparar"].indexOf(activeTab) * 100}%)`,
                transition: "transform 250ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <span className="block h-0.5 w-full rounded-full bg-primary" />
            </span>
            <TabsTrigger value="viaje" className="rounded-lg text-xs sm:text-sm">Modo Viaje</TabsTrigger>
            <TabsTrigger value="estanque" className="rounded-lg text-xs sm:text-sm">Modo Estanque</TabsTrigger>
            <TabsTrigger value="comparar" className="rounded-lg text-xs sm:text-sm">Comparar</TabsTrigger>
          </TabsList>

          {/* ============== MODO VIAJE ============== */}
          <TabsContent value="viaje" className="space-y-4 mt-4">
            <TripPlanner
              fuelType={fuelType}
              fuelLabel={fuelLabel(fuelType)}
              consumption={consumption}
              pricePerUnit={cheapestPrice}
              vehicleName={primaryVehicle?.nickname ?? (primaryVehicle ? `${primaryVehicle.brand} ${primaryVehicle.model}` : null)}
            />


            <section className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-soft">
              <h2 className="font-heading font-bold text-foreground text-sm flex items-center gap-2">
                <Car className="w-4 h-4 text-primary" aria-hidden="true" /> Tu vehículo
              </h2>
              {primaryVehicle && vehicleHydrated && (
                <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" /> Prellenado desde {primaryVehicle.nickname ?? `${primaryVehicle.brand} ${primaryVehicle.model}`}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="consumption" className="text-xs">Rendimiento (km/L)</Label>
                  <Input
                    id="consumption"
                    type="number"
                    inputMode="decimal"
                    min={3.3}
                    max={33.3}
                    step={0.1}
                    value={consumption || ""}
                    onChange={(e) => setConsumption(Number(e.target.value) || 0)}
                    className="h-11 mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs">Combustible</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {FUEL_OPTIONS.map((o) => (
                      <button
                        key={o.key}
                        type="button"
                        onClick={() => setFuelType(o.key)}
                        style={{ touchAction: "manipulation", minHeight: 36 }}
                        className={`shrink-0 text-[11px] font-semibold px-2.5 rounded-full border transition-colors ${
                          fuelType === o.key
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-transparent text-muted-foreground border-border hover:bg-muted/60"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

          </TabsContent>

          {/* ============== MODO ESTANQUE ============== */}
          <TabsContent value="estanque" className="space-y-4 mt-4">
            <section className="bg-card border border-border rounded-2xl p-4 space-y-4 shadow-soft">
              <h2 className="font-heading font-bold text-foreground text-sm flex items-center gap-2">
                <Fuel className="w-4 h-4 text-primary" aria-hidden="true" /> Mi estanque
              </h2>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="tank" className="text-xs">Capacidad (L)</Label>
                  <Input
                    id="tank"
                    type="number"
                    inputMode="numeric"
                    min={10}
                    max={200}
                    value={tankSize || ""}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 0;
                      setTankSize(v);
                    }}
                    className="h-11 mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="tank-cons" className="text-xs">Rendimiento (km/L)</Label>
                  <Input
                    id="tank-cons"
                    type="number"
                    inputMode="decimal"
                    min={3.3}
                    max={33.3}
                    step={0.1}
                    value={consumption || ""}
                    onChange={(e) => setConsumption(Number(e.target.value) || 0)}
                    className="h-11 mt-1 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Combustible</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {FUEL_OPTIONS.map((o) => (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => setFuelType(o.key)}
                      style={{ touchAction: "manipulation", minHeight: 36 }}
                      className={`shrink-0 text-[11px] font-semibold px-2.5 rounded-full border transition-colors ${
                        fuelType === o.key
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-transparent text-muted-foreground border-border hover:bg-muted/60"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs inline-flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5" /> Nivel actual
                  </Label>
                  <span className="text-xs font-bold tabular-nums text-primary">{pct}% · {currentL.toFixed(1)} L</span>
                </div>
                <Slider
                  value={[pct]}
                  onValueChange={(v) => setPct(v[0])}
                  min={0}
                  max={100}
                  step={1}
                  aria-label="Nivel del estanque"
                />
              </div>
            </section>

            <section className="grid grid-cols-2 gap-2">
              <div className={`rounded-2xl p-4 ${lowFuel ? "bg-fuel-red/10 border-2 border-fuel-red/40" : "bg-card border border-border"}`}>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Te quedan</p>
                <p className={`font-heading font-extrabold text-3xl tabular-nums ${lowFuel ? "text-fuel-red" : "text-foreground"}`}>{rangeKm} km</p>
                {lowFuel && (
                  <p className="mt-1 text-[11px] font-bold text-fuel-red inline-flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Carga pronto
                  </p>
                )}
              </div>
              <div className="rounded-2xl bg-card border border-border p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Para llenar</p>
                <p className="font-heading font-extrabold text-3xl tabular-nums text-primary">{formatPrice(fillCost)}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                  {toFillL.toFixed(1)} L × {formatPrice(cheapestPrice)}
                </p>
              </div>
            </section>

            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={shareTank}
              style={{ touchAction: "manipulation", minHeight: 44 }}
            >
              <Share2 className="w-4 h-4 mr-1" /> Compartir cálculo
            </Button>
          </TabsContent>

          {/* ============== MODO COMPARAR (93/95/97/Diésel) ============== */}
          <TabsContent value="comparar" className="space-y-4 mt-4">
            {/* Fuel selectors */}
            <section className="bg-card border border-border rounded-2xl p-4 shadow-soft space-y-4">
              <h2 className="font-heading font-bold text-foreground text-sm flex items-center gap-2">
                <Fuel className="w-4 h-4 text-primary" aria-hidden="true" /> Elige los combustibles a comparar
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Combustible A</Label>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {COMPARE_OPTIONS.map((o) => (
                      <button
                        key={o.key}
                        type="button"
                        onClick={() => pickA(o.key)}
                        style={{ touchAction: "manipulation", minHeight: 36 }}
                        className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                          fuelA === o.key
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-transparent text-muted-foreground border-border hover:bg-muted/60"
                        }`}
                      >
                        {o.label}
                        {fuelA === o.key && (
                          <span className="block text-[9px] font-normal opacity-80 mt-0.5 leading-tight">
                            {o.key === "gasoline93" && "Estándar · más económico"}
                            {o.key === "gasoline95" && "Mayor octanaje · +rendimiento"}
                            {o.key === "gasoline97" && "Premium · máx octanaje"}
                            {o.key === "diesel" && "Rinde ~20% más por litro"}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Combustible B</Label>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {COMPARE_OPTIONS.map((o) => (
                      <button
                        key={o.key}
                        type="button"
                        onClick={() => pickB(o.key)}
                        style={{ touchAction: "manipulation", minHeight: 36 }}
                        className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                          fuelB === o.key
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-transparent text-muted-foreground border-border hover:bg-muted/60"
                        }`}
                      >
                        {o.label}
                        {fuelB === o.key && (
                          <span className="block text-[9px] font-normal opacity-80 mt-0.5 leading-tight">
                            {o.key === "gasoline93" && "Estándar · más económico"}
                            {o.key === "gasoline95" && "Mayor octanaje · +rendimiento"}
                            {o.key === "gasoline97" && "Premium · máx octanaje"}
                            {o.key === "diesel" && "Rinde ~20% más por litro"}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Prices */}
            <section className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
              {/* Card A */}
              <div className="bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-2xl p-4 shadow-lg shadow-violet-500/30 flex flex-col justify-center text-center">
                <p className="text-white/80 text-xs font-bold tracking-widest uppercase">⛽ Combustible A · {labelA}</p>
                {editingA ? (
                  <Input
                    autoFocus
                    type="number"
                    inputMode="numeric"
                    value={priceA || ""}
                    onChange={(e) => setPriceAOverride(Number(e.target.value) || 0)}
                    onBlur={() => setEditingA(false)}
                    onKeyDown={(e) => { if (e.key === "Enter") setEditingA(false); }}
                    className="h-10 mt-1 rounded-xl text-center tabular-nums bg-white/20 border-white/30 text-white placeholder:text-white/50"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingA(true)}
                    className="block w-full font-heading font-black text-3xl tabular-nums text-white mt-1 hover:opacity-90"
                    aria-label="Editar precio A"
                  >
                    {formatPrice(priceA)}<span className="text-xs text-white/70 font-normal">/L</span>
                  </button>
                )}
                <p className="text-white/70 text-xs mt-1">
                  {priceAOverride != null ? (
                    <button type="button" onClick={() => setPriceAOverride(null)} className="underline">Volver al automático</button>
                  ) : (
                    "📍 Estación más barata cercana"
                  )}
                </p>
              </div>

              {/* VS badge */}
              <div className="flex items-center justify-center">
                <span className="bg-background border-2 border-border rounded-full w-8 h-8 flex items-center justify-center text-xs font-black text-muted-foreground shadow-sm">
                  VS
                </span>
              </div>

              {/* Card B */}
              <div className="bg-gradient-to-br from-orange-500 to-rose-500 text-white rounded-2xl p-4 shadow-lg shadow-orange-500/30 flex flex-col justify-center text-center">
                <p className="text-white/80 text-xs font-bold tracking-widest uppercase">⛽ Combustible B · {labelB}</p>
                {editingB ? (
                  <Input
                    autoFocus
                    type="number"
                    inputMode="numeric"
                    value={priceB || ""}
                    onChange={(e) => setPriceBOverride(Number(e.target.value) || 0)}
                    onBlur={() => setEditingB(false)}
                    onKeyDown={(e) => { if (e.key === "Enter") setEditingB(false); }}
                    className="h-10 mt-1 rounded-xl text-center tabular-nums bg-white/20 border-white/30 text-white placeholder:text-white/50"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingB(true)}
                    className="block w-full font-heading font-black text-3xl tabular-nums text-white mt-1 hover:opacity-90"
                    aria-label="Editar precio B"
                  >
                    {formatPrice(priceB)}<span className="text-xs text-white/70 font-normal">/L</span>
                  </button>
                )}
                <p className="text-white/70 text-xs mt-1">
                  {priceBOverride != null ? (
                    <button type="button" onClick={() => setPriceBOverride(null)} className="underline">Volver al automático</button>
                  ) : (
                    "📍 Estación más barata cercana"
                  )}
                </p>
              </div>
            </section>

            {/* Litros input */}
            <section className="bg-card border border-border rounded-2xl p-4 shadow-soft">
              <Label htmlFor="cmp-litros" className="text-xs font-semibold">Litros a cargar</Label>
              <Input
                id="cmp-litros"
                type="number"
                inputMode="numeric"
                min={1}
                max={200}
                value={litros || ""}
                onChange={(e) => setLitros(Number(e.target.value) || 0)}
                className="h-11 mt-1 rounded-xl tabular-nums"
              />
              {primaryVehicle && primaryVehicle.tank_size_l > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1 inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" /> Sugerido por tu estanque ({Math.round(primaryVehicle.tank_size_l)} L)
                </p>
              )}
            </section>

            {/* Result */}
            <section className="rounded-3xl bg-gradient-to-br from-[hsl(262_83%_58%)] to-[hsl(238_84%_67%)] text-white p-5 shadow-glow space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/80 font-bold">Costo {labelA}</p>
                  <p className="font-heading font-extrabold text-2xl tabular-nums">{formatPrice(costA)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/80 font-bold">Costo {labelB}</p>
                  <p className="font-heading font-extrabold text-2xl tabular-nums">{formatPrice(costB)}</p>
                </div>
              </div>
              <div className="border-t border-white/20 pt-2">
                <p className="text-[11px] text-white/85">Diferencia por estanque</p>
                <p className="font-heading font-extrabold text-xl tabular-nums">
                  {tankDiff === 0
                    ? "Mismo costo"
                    : `${formatPrice(Math.abs(tankDiff))} más ${tankDiff > 0 ? "caro" : "barato"} usar ${labelB}`}
                </p>
              </div>
            </section>

            {/* Explanation */}
            <section className="rounded-2xl bg-card border border-border p-4">
              <p className="text-xs leading-relaxed text-foreground">{explanation}</p>
            </section>

            {/* Annual cost */}
            <section className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Cada cuántas semanas cargas</Label>
                <span className="text-xs font-bold text-primary tabular-nums">cada {weeksFreq} sem · {fillsPerYear}/año</span>
              </div>
              <Slider value={[weeksFreq]} onValueChange={(v) => setWeeksFreq(v[0] ?? 2)} min={1} max={4} step={1} />
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Anual {labelA}</p>
                  <p className="font-heading font-bold text-foreground tabular-nums">{formatPrice(annualA)}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Anual {labelB}</p>
                  <p className="font-heading font-bold text-foreground tabular-nums">{formatPrice(annualB)}</p>
                </div>
              </div>
              <div className="bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-2xl p-3 text-center shadow-md mt-2">
                <p className="font-bold">📅 En un año ahorras: {formatPrice(annualDiff)}</p>
              </div>
            </section>

            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={shareCompare}
              style={{ touchAction: "manipulation", minHeight: 44 }}
            >
              <Share2 className="w-4 h-4 mr-1" /> Compartir comparación
            </Button>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Calculadora;
