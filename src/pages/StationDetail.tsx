import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Navigation, Share2, Zap, Star, Clock, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGasStations, formatRelativeTime, type GasStation } from "@/hooks/useGasStations";
import { useAuth } from "@/hooks/useAuth";
import FavoriteButton from "@/components/FavoriteButton";
import BrandLogo from "@/components/BrandLogo";
import StationStaticMap from "@/components/StationStaticMap";
import StationDistanceInfo from "@/components/StationDistanceInfo";
import StationPhotos from "@/components/StationPhotos";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import PriceAlertDialog from "@/components/PriceAlertDialog";
import { Helmet } from "react-helmet-async";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

const FUEL_ROWS = [
  { key: "gasoline93", label: "93" },
  { key: "gasoline95", label: "95" },
  { key: "gasoline97", label: "97" },
  { key: "diesel", label: "Diésel" },
] as const;

const StationDetail = () => {
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (!id) return;
    supabase.from("station_views").insert({ station_id: id }).then(() => {});
  }, [id]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: stations, isLoading } = useGasStations();

  const station = useMemo<GasStation | undefined>(
    () => stations?.find((s) => s.id === id),
    [stations, id],
  );

  const [history, setHistory] = useState<{ date: string; price: number }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 5 * 60 * 1000 },
    );
  }, []);

  // Aggregated 93 price history (last 7 days)
  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - 6);
    supabase
      .from("fuel_price_history")
      .select("snapshot_date, avg_price")
      .eq("fuel_type", "gasoline93")
      .gte("snapshot_date", since.toISOString().slice(0, 10))
      .order("snapshot_date", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          setHistory(
            data.map((r) => ({
              date: new Date(r.snapshot_date).toLocaleDateString("es-CL", {
                day: "2-digit",
                month: "2-digit",
              }),
              price: r.avg_price,
            })),
          );
        }
        setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadReviews = async () => {
    if (!id) return;
    setReviewsLoading(true);
    const { data } = await supabase
      .from("station_reviews")
      .select("*")
      .eq("station_id", id)
      .order("created_at", { ascending: false })
      .limit(20);
    setReviews(data ?? []);
    setReviewsLoading(false);
  };

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const handleShare = async () => {
    const url = `${window.location.origin}/station/${id}`;
    const shareData = {
      title: station ? `${station.name} · TÜcom` : "TÜcom",
      text: station
        ? `Precios de combustible en ${station.name} (${station.brand}) · ${station.address}`
        : "Mira esta estación en TÜcom",
      url,
    };
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      /* user cancelled */
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado al portapapeles");
    } catch {
      toast.error("No se pudo compartir");
    }
  };

  const handleGoogleMaps = () => {
    if (!station) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
    window.open(url, "_blank");
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast.error("Inicia sesión para escribir una reseña");
      return;
    }
    if (!id || rating < 1 || rating > 5) {
      toast.error("Selecciona una calificación");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("station_reviews").insert({
      station_id: id,
      user_id: user.id,
      rating,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("No se pudo publicar la reseña");
      return;
    }
    toast.success("¡Gracias por tu reseña!");
    setRating(0);
    setComment("");
    loadReviews();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 space-y-3">
        <Skeleton className="h-12 w-32 rounded-xl" />
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!station) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <p className="font-heading font-bold text-foreground text-lg">Estación no encontrada</p>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Es posible que ya no esté disponible.
        </p>
        <Button onClick={() => navigate("/")}>Volver al inicio</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <Helmet>
        <title>{`${station.name} · TÜcom`}</title>
        <meta name="description" content={`Precios de bencina en ${station.name} (${station.brand}) · ${station.address}`} />
        <link rel="canonical" href={`https://tucombustible.lovable.app/station/${station.id}`} />
        <meta property="og:title" content={`${station.name} — TÜcom`} />
        <meta property="og:description" content={`Precios actualizados de 93, 95, 97 y Diésel en ${station.address}.`} />
        <meta property="og:url" content={`https://tucombustible.lovable.app/station/${station.id}`} />
        <meta property="og:type" content="place" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "GasStation",
          name: station.name,
          brand: station.brand,
          address: { "@type": "PostalAddress", streetAddress: station.address, addressCountry: "CL" },
          geo: { "@type": "GeoCoordinates", latitude: station.lat, longitude: station.lng },
          url: `https://tucombustible.lovable.app/station/${station.id}`,
          ...(avgRating > 0 ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: avgRating.toFixed(1),
              reviewCount: reviews.length,
            },
          } : {}),
        })}</script>
      </Helmet>
      {/* Hero */}
      <header className="relative bg-gradient-hero text-white px-4 pt-[env(safe-area-inset-top)] pb-6 shadow-elegant">
        <div className="max-w-3xl mx-auto pt-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center press-scale"
              aria-label="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm flex items-center justify-center press-scale"
                aria-label="Compartir"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <FavoriteButton stationId={station.id} variant="glass" />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20 shrink-0">
              <BrandLogo brand={station.brand} size={36} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-white/80 font-semibold">
                {station.brand}
              </p>
              <h1 className="font-heading font-extrabold text-2xl leading-tight truncate">
                {station.name}
              </h1>
              <p className="text-sm text-white/85 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{station.address}</span>
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                station.isOpen ? "bg-fuel-green text-white" : "bg-fuel-red text-white"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              {station.isOpen ? "Abierta" : "Cerrada"}
            </span>
            {station.hasEvCharging && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/15 text-white">
                <Zap className="w-3 h-3" /> EV {station.evPowerKw ? `${station.evPowerKw} kW` : ""}
              </span>
            )}
            {reviews.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/15 text-white">
                <Star className="w-3 h-3 fill-current" /> {avgRating.toFixed(1)} ({reviews.length})
              </span>
            )}
            {station.lastUpdated && (
              <span className="inline-flex items-center gap-1 text-[11px] text-white/80 ml-auto">
                <Clock className="w-3 h-3" /> {formatRelativeTime(station.lastUpdated)}
              </span>
            )}
          </div>

          <Button
            onClick={handleGoogleMaps}
            className="mt-5 w-full h-12 rounded-xl bg-white text-primary hover:bg-white/95 font-semibold shadow-elegant"
          >
            <Navigation className="w-5 h-5 mr-2" /> Cómo llegar
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
        {/* Prices table */}
        <section className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-heading font-bold text-foreground">Precios por combustible</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Precio por litro · CLP</p>
          </div>
          <div className="divide-y divide-border">
            {FUEL_ROWS.map((row) => {
              const price = (station.prices as Record<string, number>)[row.key];
              return (
                <div key={row.key} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center font-heading font-bold text-foreground text-sm">
                      {row.label}
                    </div>
                    <span className="text-sm font-medium text-foreground">Gasolina {row.label}</span>
                  </div>
                  <span className="font-heading font-extrabold text-2xl tabular-nums text-accent">
                    ${price || "—"}
                  </span>
                </div>
              );
            })}
            {station.hasEvCharging && station.prices.electric > 0 && (
              <div className="flex items-center justify-between px-5 py-3.5 bg-[hsl(142,70%,45%)]/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[hsl(142,70%,45%)]/15 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-[hsl(142,70%,45%)]" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Carga eléctrica</span>
                </div>
                <span className="font-heading font-extrabold text-2xl tabular-nums text-[hsl(142,70%,45%)]">
                  ${station.prices.electric}
                  <span className="text-xs font-medium text-muted-foreground"> /kWh</span>
                </span>
              </div>
            )}
          </div>
          <div className="px-5 py-4 border-t border-border bg-muted/30">
            <PriceAlertDialog
              stationId={station.id}
              prices={station.prices as Record<string, number>}
            />
          </div>
        </section>

        {/* Price history chart */}
        <section className="bg-card border border-border rounded-2xl shadow-soft p-5">
          <div className="flex items-end justify-between mb-3">
            <div>
              <h2 className="font-heading font-bold text-foreground">Tendencia 7 días</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Promedio nacional · Gasolina 93
              </p>
            </div>
          </div>
          {historyLoading ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Sin datos históricos disponibles.
            </p>
          ) : (
            <div className="h-48 -ml-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--primary-glow))" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={["dataMin - 20", "dataMax + 20"]}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`$${v}`, "Promedio"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="url(#priceGradient)"
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Reviews */}
        <section className="bg-card border border-border rounded-2xl shadow-soft p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading font-bold text-foreground">Reseñas</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {reviews.length === 0
                  ? "Sé el primero en opinar"
                  : `${reviews.length} ${reviews.length === 1 ? "reseña" : "reseñas"}`}
              </p>
            </div>
            {reviews.length > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-accent text-accent" />
                <span className="font-heading font-bold text-foreground">{avgRating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* New review */}
          {user ? (
            <div className="mb-5 p-4 rounded-xl bg-muted/40 border border-border">
              <p className="text-xs font-semibold text-foreground mb-2">Tu calificación</p>
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(n)}
                    className="press-scale"
                    aria-label={`${n} estrellas`}
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        n <= (hoverRating || rating)
                          ? "fill-accent text-accent"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 200))}
                placeholder="Cuéntanos tu experiencia (máx 200 caracteres)"
                rows={3}
                className="rounded-xl"
                maxLength={200}
              />
              <p className="text-[10px] text-muted-foreground text-right mt-1">
                {comment.length}/200
              </p>
              <Button
                onClick={handleSubmitReview}
                disabled={submitting || rating < 1}
                className="mt-3 w-full rounded-xl"
              >
                {submitting ? "Publicando..." : "Publicar reseña"}
              </Button>
            </div>
          ) : (
            <div className="mb-5 p-4 rounded-xl bg-muted/40 border border-dashed border-border text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Inicia sesión para escribir una reseña
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
                Entrar
              </Button>
            </div>
          )}

          {/* Reviews list */}
          {reviewsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Aún no hay reseñas para esta estación.
            </p>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="p-4 rounded-xl border border-border bg-background">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`w-4 h-4 ${
                            n <= r.rating ? "fill-accent text-accent" : "text-muted-foreground/40"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("es-CL")}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-foreground leading-relaxed">{r.comment}</p>
                  )}
                  {user && r.user_id !== user.id && (
                    <button
                      onClick={async () => {
                        const { error } = await supabase
                          .from("review_reports")
                          .insert({ review_id: r.id, user_id: user.id, reason: "inappropriate" });
                        if (error && !error.message.includes("duplicate")) {
                          toast.error("No se pudo enviar el reporte");
                        } else {
                          toast.success("Gracias, revisaremos esta reseña");
                        }
                      }}
                      className="text-[10px] text-muted-foreground hover:text-destructive mt-2 underline-offset-2 hover:underline"
                    >
                      Reportar como inapropiada
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default StationDetail;
