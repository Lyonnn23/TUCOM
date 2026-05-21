import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Bell, Heart, LogOut, Mail, Save, Trash2, ChevronRight,
  Globe, Info, FileText, Shield, Bug, Fuel as FuelIcon, Trophy, Sparkles,
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
import BadgeChip from "@/components/BadgeChip";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { usePriceAlerts } from "@/hooks/usePriceAlerts";
import { useFavorites } from "@/hooks/useFavorites";
import { useUserPoints, useUserBadges, getLevel, BADGE_META, type BadgeKey } from "@/hooks/useGamification";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
            <p className="font-semibold text-foreground truncate">{displayName}</p>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          </div>
        </section>

        <PointsAndBadges />



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

export default Profile;
