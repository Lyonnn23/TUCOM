import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Bell, Heart, LogOut, Mail, Save, Trash2, ChevronRight,
  Globe, Info, FileText, Shield, Bug, Fuel as FuelIcon, Trophy, Sparkles, Calculator, Car, ClipboardList,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import ThemeToggle from "@/components/ThemeToggle";
import PaymentMethodsPicker from "@/components/PaymentMethodsPicker";
import { CreditCard } from "lucide-react";
import BadgeChip from "@/components/BadgeChip";
import { ProBadge } from "@/components/ProBadge";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { useFavorites } from "@/hooks/useFavorites";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserPoints, useUserBadges, getLevel, BADGE_META, type BadgeKey } from "@/hooks/useGamification";
import { Crown, Sparkles as SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DRIVER_FAB_KEY = "tucom_driver_fab_enabled";
const DRIVER_AUTO_KEY = "tucom_driver_auto";

const DriverModeSettings = () => {
  const [fabOn, setFabOn] = useState<boolean>(() => {
    try { return localStorage.getItem(DRIVER_FAB_KEY) !== "0"; } catch { return true; }
  });
  const [autoOn, setAutoOn] = useState<boolean>(() => {
    try { return localStorage.getItem(DRIVER_AUTO_KEY) === "1"; } catch { return false; }
  });
  return (
    <>
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
        <div className="min-w-0">
          <p className="text-sm text-foreground flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-primary" /> Botón Modo Conductor
          </p>
          <p className="text-[11px] text-muted-foreground">Botón flotante para activar manualmente</p>
        </div>
        <Switch
          checked={fabOn}
          onCheckedChange={(v) => {
            setFabOn(v);
            try { localStorage.setItem(DRIVER_FAB_KEY, v ? "1" : "0"); } catch {}
            toast.success(v ? "Botón visible en la pantalla principal" : "Botón ocultado");
          }}
        />
      </div>
      <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
        <div className="min-w-0">
          <p className="text-sm text-foreground">Activación automática al conducir</p>
          <p className="text-[11px] text-muted-foreground">
            Te preguntará si activarlo cuando detecte velocidad &gt; 15 km/h
          </p>
        </div>
        <Switch
          checked={autoOn}
          onCheckedChange={(v) => {
            setAutoOn(v);
            try { localStorage.setItem(DRIVER_AUTO_KEY, v ? "1" : "0"); } catch {}
            toast.success(v ? "Detección automática activada" : "Detección automática desactivada");
          }}
        />
      </div>
    </>
  );
};

const FUEL_OPTIONS = [
  { key: "gasoline93", label: "93" },
  { key: "gasoline95", label: "95" },
  { key: "gasoline97", label: "97" },
  { key: "diesel", label: "Diésel" },
];

const FUEL_LABEL: Record<string, string> = {
  gasoline93: "93",
  gasoline95: "95",
  gasoline97: "97",
  diesel: "Diésel",
  electric: "EV",
};

const APP_VERSION = "1.0.0";

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { preferences, save, defaults } = useUserPreferences();
  const { alerts, remove } = usePriceAlerts();
  const { favorites } = useFavorites();

  const [fuel, setFuel] = useState(defaults.preferred_fuel);
  const [radius, setRadius] = useState(defaults.search_radius_km);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (preferences) {
      setFuel(preferences.preferred_fuel);
      setRadius(preferences.search_radius_km);
      setDirty(false);
    }
  }, [preferences]);

  useEffect(() => {
    if (!user) navigate("/welcome", { replace: true });
  }, [user, navigate]);

  if (!user) return null;

  const displayName =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    (user.user_metadata?.display_name as string) ||
    user.email ||
    "Usuario";
  const avatarUrl =
    (user.user_metadata?.avatar_url as string) ||
    (user.user_metadata?.picture as string) ||
    "";
  const initials = displayName.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  const onSave = async () => {
    setSaving(true);
    try {
      await save({ preferred_fuel: fuel, search_radius_km: radius });
      toast.success("Preferencias guardadas");
      setDirty(false);
    } catch {
      toast.error("No se pudieron guardar las preferencias");
    } finally {
      setSaving(false);
    }
  };

  const reportError = () => {
    const subject = encodeURIComponent("[TÜcom] Reporte de error");
    const body = encodeURIComponent(
      `Describe el error:\n\n\n---\nVersión: ${APP_VERSION}\nUsuario: ${user.email ?? ""}\nNavegador: ${navigator.userAgent}`
    );
    window.location.href = `mailto:soporte@tucombustible.cl?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-gradient-primary px-4 pt-[env(safe-area-inset-top)] sticky top-0 z-40 shadow-elegant">
        <div className="flex items-center gap-3 py-3 max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white/15 text-white hover:bg-white/25 transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-heading font-extrabold text-white text-lg">Mi cuenta</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Identity card */}
        <section className="bg-card rounded-2xl border border-border shadow-soft p-5 flex items-center gap-4">
          <Avatar className="w-16 h-16 ring-2 ring-primary/20">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
            <AvatarFallback className="bg-gradient-primary text-primary-foreground font-bold">
              {initials || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground truncate">{displayName}</p>
              <ProBadge />
            </div>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          </div>
        </section>

        <PlanCard />

        <EmpresaCard />

        <PointsAndBadges />



        {/* Métodos de pago */}
        <section className="bg-card rounded-2xl border border-border shadow-soft p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Mis métodos de pago</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Te mostraremos el precio real con tu mejor descuento disponible.
          </p>
          <PaymentMethodsPicker
            value={preferences?.payment_methods ?? []}
            onChange={async (next) => {
              try {
                await save({ payment_methods: next });
              } catch {
                toast.error("No se pudo guardar");
              }
            }}
          />
        </section>


        {/* Fuel preferences */}
        <section className="bg-card rounded-2xl border border-border shadow-soft p-5 space-y-4">
          <div className="flex items-center gap-2">
            <FuelIcon className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Mis preferencias de combustible</h2>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {FUEL_OPTIONS.map((f) => {
              const active = fuel === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => { setFuel(f.key); setDirty(true); }}
                  className={cn(
                    "rounded-xl border-2 py-3 text-sm font-bold transition-all press-scale",
                    active
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card text-foreground hover:border-primary/40"
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Radio de búsqueda</span>
              <span className="text-sm font-bold text-primary tabular-nums">{radius} km</span>
            </div>
            <Slider
              value={[radius]}
              min={1}
              max={50}
              step={1}
              onValueChange={(v) => { setRadius(v[0]); setDirty(true); }}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>1 km</span><span>50 km</span>
            </div>
          </div>

          <Button
            onClick={onSave}
            disabled={!dirty || saving}
            className="w-full h-11 rounded-xl bg-gradient-primary text-primary-foreground font-semibold hover-scale"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Guardando..." : "Guardar preferencias"}
          </Button>
        </section>

        {/* Active alerts */}
        <section className="bg-card rounded-2xl border border-border shadow-soft p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-foreground">Mis alertas activas</h2>
            </div>
            <button
              onClick={() => navigate("/alertas")}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Ver todas
            </button>
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No tienes alertas activas todavía.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {alerts.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {FUEL_LABEL[a.fuel_type] ?? a.fuel_type} bajo{" "}
                      <span className="text-primary font-bold">
                        ${a.target_price.toLocaleString("es-CL")}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.triggered ? "Activada" : "Esperando precio"}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(a.id)}
                    className="p-2 rounded-lg text-destructive hover:bg-destructive/10 press-scale"
                    aria-label="Eliminar alerta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Favorites link */}
        <button
          onClick={() => navigate("/?tab=favorites")}
          className="w-full bg-card rounded-2xl border border-border shadow-soft p-4 flex items-center gap-3 hover-scale text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Heart className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">Mis favoritos</p>
            <p className="text-xs text-muted-foreground">
              {favorites?.length ?? 0} estaciones guardadas
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Trip calculator link */}
        <button
          onClick={() => navigate("/calculadora")}
          className="w-full bg-card rounded-2xl border border-border shadow-soft p-4 flex items-center gap-3 hover-scale text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">Calculadora de viaje</p>
            <p className="text-xs text-muted-foreground">Estima bencina y TAG por ruta</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Fuel logs link */}
        <button
          onClick={() => navigate("/mis-cargas")}
          className="w-full bg-card rounded-2xl border border-border shadow-soft p-4 flex items-center gap-3 hover-scale text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">Mis cargas</p>
            <p className="text-xs text-muted-foreground">Bitácora y consumo real</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Settings */}
        <section className="bg-card rounded-2xl border border-border shadow-soft p-5 space-y-4">
          <h2 className="font-semibold text-foreground">Ajustes</h2>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-foreground">Tema</span>
            </div>
            <ThemeToggle />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Idioma</span>
            </div>
            <Select value="es" onValueChange={() => { /* future i18n */ }}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español (Chile)</SelectItem>
                <SelectItem value="en" disabled>English (próximamente)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
            <div className="min-w-0">
              <p className="text-sm text-foreground">Aparecer en el ranking público</p>
              <p className="text-[11px] text-muted-foreground">Top 10 reporteros del mes</p>
            </div>
            <Switch
              checked={preferences?.leaderboard_opt_in ?? true}
              onCheckedChange={async (v) => {
                try {
                  await save({ leaderboard_opt_in: v });
                  toast.success(v ? "Aparecerás en el ranking" : "Te quitamos del ranking");
                } catch {
                  toast.error("No se pudo actualizar");
                }
              }}
            />
          </div>

          <div className="pt-3 border-t border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Avisar cuando queden pocos km</span>
              <span className="text-sm font-semibold text-primary tabular-nums">
                {preferences?.low_fuel_threshold_km ?? 80} km
              </span>
            </div>
            <Slider
              value={[preferences?.low_fuel_threshold_km ?? 80]}
              min={20}
              max={200}
              step={10}
              onValueChange={(v) => {
                save({ low_fuel_threshold_km: v[0] }).catch(() => {
                  toast.error("No se pudo guardar");
                });
              }}
              aria-label="Umbral de bajo combustible en kilómetros"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
            <div className="min-w-0">
              <p className="text-sm text-foreground">Resumen mensual por email</p>
              <p className="text-[11px] text-muted-foreground">
                Cuánto gastaste y cuánto ahorraste este mes
              </p>
            </div>
            <Switch
              checked={preferences?.fuel_log_email_optin ?? false}
              onCheckedChange={async (v) => {
                try {
                  await save({ fuel_log_email_optin: v });
                  toast.success(v ? "Recibirás el resumen mensual" : "Resumen mensual desactivado");
                } catch {
                  toast.error("No se pudo actualizar");
                }
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
            <div className="min-w-0">
              <p className="text-sm text-foreground">Alerta ajuste MEPCO semanal</p>
              <p className="text-[11px] text-muted-foreground">
                Aviso cada martes: si la bencina sube o baja el jueves
              </p>
            </div>
            <Switch
              checked={preferences?.mepco_alert_enabled ?? true}
              onCheckedChange={async (v) => {
                try { await save({ mepco_alert_enabled: v }); } catch { toast.error("No se pudo actualizar"); }
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
            <div className="min-w-0">
              <p className="text-sm text-foreground">Alerta dólar &gt;2% variación diaria</p>
              <p className="text-[11px] text-muted-foreground">
                Avisar cuando el USD/CLP se mueva fuerte en un día
              </p>
            </div>
            <Switch
              checked={preferences?.fx_spike_alert_enabled ?? false}
              onCheckedChange={async (v) => {
                try { await save({ fx_spike_alert_enabled: v }); } catch { toast.error("No se pudo actualizar"); }
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-border">
            <div className="min-w-0">
              <p className="text-sm text-foreground">Resumen semanal de precios</p>
              <p className="text-[11px] text-muted-foreground">
                Resumen de tendencias y mejor día para cargar
              </p>
            </div>
            <Switch
              checked={preferences?.weekly_price_summary_enabled ?? true}
              onCheckedChange={async (v) => {
                try { await save({ weekly_price_summary_enabled: v }); } catch { toast.error("No se pudo actualizar"); }
              }}
            />
          </div>


          {/* Modo conductor */}
          <DriverModeSettings />
        </section>

        {/* About */}
        <section className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-foreground">Acerca de TÜcom</h2>
          </div>
          <ul className="divide-y divide-border">
            <li className="px-5 py-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Versión</span>
              <span className="text-sm font-mono font-semibold text-foreground">{APP_VERSION}</span>
            </li>
            <li>
              <Link
                to="/terms"
                className="px-5 py-3 flex items-center justify-between hover:bg-muted/40"
              >
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Términos y condiciones
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            </li>
            <li>
              <Link
                to="/privacy"
                className="px-5 py-3 flex items-center justify-between hover:bg-muted/40"
              >
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  Política de privacidad
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            </li>
            <li>
              <button
                onClick={reportError}
                className="w-full px-5 py-3 flex items-center justify-between hover:bg-muted/40 text-left"
              >
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <Bug className="w-4 h-4 text-muted-foreground" />
                  Reportar un error
                </span>
                <Mail className="w-4 h-4 text-muted-foreground" />
              </button>
            </li>
          </ul>
        </section>

        {/* Sign out */}
        <Button
          onClick={signOut}
          variant="destructive"
          className="w-full h-12 rounded-xl font-semibold hover-scale"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar sesión
        </Button>
      </main>
    </div>
  );
};

const PlanCard = () => {
  const navigate = useNavigate();
  const { isPro, subscription } = useSubscription();
  if (isPro) {
    return (
      <button
        onClick={() => navigate("/planes")}
        className="w-full text-left bg-gradient-to-br from-primary to-[hsl(245,75%,60%)] text-primary-foreground rounded-2xl p-5 shadow-soft hover-scale"
      >
        <div className="flex items-center gap-3">
          <Crown className="w-6 h-6" />
          <div className="flex-1 min-w-0">
            <p className="font-heading font-bold text-lg">TÜcom Pro activo</p>
            <p className="text-xs opacity-90">
              {subscription?.expires_at
                ? `Renueva el ${new Date(subscription.expires_at).toLocaleDateString("es-CL")}`
                : "Gracias por apoyar TÜcom"}
            </p>
          </div>
          <ChevronRight className="w-5 h-5" />
        </div>
      </button>
    );
  }
  return (
    <button
      onClick={() => navigate("/planes")}
      className="w-full text-left bg-card border-2 border-primary/30 rounded-2xl p-5 shadow-soft hover-scale"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-[hsl(245,75%,60%)] flex items-center justify-center text-primary-foreground shrink-0">
          <SparklesIcon className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-bold text-foreground">Hazte TÜcom Pro</p>
          <p className="text-xs text-muted-foreground">
            Alertas ilimitadas, 5 vehículos, reportes PDF · $990/mes
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-primary" />
      </div>
    </button>
  );
};

const EmpresaCard = () => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/empresa")}
      className="w-full text-left bg-card border border-border rounded-2xl p-5 shadow-soft hover-scale"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(190,90%,55%)] to-primary flex items-center justify-center text-primary-foreground shrink-0 text-lg font-bold">
          E
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-bold text-foreground">TÜcom Empresa</p>
          <p className="text-xs text-muted-foreground">Gestiona tu flota y los gastos de combustible</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>
    </button>
  );
};

const PointsAndBadges = () => {
  const navigate = useNavigate();
  const { data: points = 0, isLoading: pointsLoading } = useUserPoints();
  const { data: badges = [], isLoading: badgesLoading } = useUserBadges();
  const { level, next, progress } = getLevel(points);

  const levelColors: Record<string, string> = {
    Bronze: "from-amber-700 to-amber-500",
    Silver: "from-slate-400 to-slate-200",
    Gold: "from-yellow-500 to-amber-300",
    Platinum: "from-violet-500 to-fuchsia-400",
  };

  const earnedSet = new Set(badges.map((b) => b.badge_key));
  const allBadges: BadgeKey[] = [
    "primer_reporte",
    "diez_reportes",
    "cincuenta_reportes",
    "favorito_frecuente",
    "ahorron_del_mes",
  ];

  return (
    <section className="bg-card rounded-2xl border border-border shadow-soft p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground">Mis puntos y logros</h2>
        </div>
        <button
          onClick={() => navigate("/ranking")}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          <Trophy className="w-3.5 h-3.5" />
          Ranking
        </button>
      </div>

      <div className={`rounded-xl p-4 bg-gradient-to-br ${levelColors[level]} text-white shadow-soft`}>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider opacity-80">Nivel</p>
            <p className="font-heading font-extrabold text-2xl leading-none">{level}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wider opacity-80">Puntos</p>
            <p className="font-heading font-extrabold text-3xl leading-none tabular-nums">
              {pointsLoading ? "—" : points}
            </p>
          </div>
        </div>
        {next !== null && (
          <div className="mt-3">
            <Progress value={Math.round(progress * 100)} className="h-1.5 bg-white/20" />
            <p className="text-[10px] opacity-90 mt-1">
              {next - points} pts para el siguiente nivel
            </p>
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">
          Logros ({badges.length}/{allBadges.length})
        </p>
        {badgesLoading ? (
          <p className="text-xs text-muted-foreground">Cargando...</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allBadges.map((b) => (
              <BadgeChip key={b} badge={b} earned={earnedSet.has(b)} />
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Gana <strong>10 puntos</strong> por cada reporte verificado. Bronce 0+, Plata 50+, Oro 200+, Platino 500+.
      </p>
    </section>
  );
};

export default Profile;
