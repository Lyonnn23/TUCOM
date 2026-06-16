import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Mail, AlertTriangle, CheckCircle2, Loader2, Shield, Bell, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const SUPPORT_EMAIL = "soporte@tucom.cl";

const DeleteAccount = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, signOut } = useAuth();

  const [email, setEmail] = useState(user?.email ?? "");
  const [reason, setReason] = useState("");
  const [confirmFull, setConfirmFull] = useState(false);
  const [confirmIrreversible, setConfirmIrreversible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [partialLoading, setPartialLoading] = useState<null | "push" | "reports">(null);

  const handlePartialDelete = async (kind: "push" | "reports") => {
    if (!user) return;
    setPartialLoading(kind);
    try {
      if (kind === "push") {
        await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
        toast({
          title: "Suscripciones eliminadas",
          description: "Ya no recibirás notificaciones push. Tu cuenta sigue activa.",
        });
      } else {
        await supabase.from("reported_prices").delete().eq("user_id", user.id);
        toast({
          title: "Reportes eliminados",
          description: "Borramos todos tus reportes de precios. Tu cuenta sigue activa.",
        });
      }
    } catch {
      toast({
        title: "Error al procesar",
        description: "Por favor escríbenos a " + SUPPORT_EMAIL,
        variant: "destructive",
      });
    } finally {
      setPartialLoading(null);
    }
  };

  const canSubmit = email.trim().length > 5 && confirmFull && confirmIrreversible && !submitting;

  const handleSelfDelete = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      // Borra datos del usuario que sí son suyos (RLS lo permite)
      await supabase.from("push_subscriptions").delete().eq("user_id", user.id);
      await supabase.from("reported_prices").delete().eq("user_id", user.id);

      // Cierra sesión. La eliminación definitiva del registro en auth.users
      // se procesa por el equipo dentro de 30 días tras la solicitud por email.
      await signOut();
      setDone(true);
      toast({
        title: "Solicitud registrada",
        description: "Tus datos fueron borrados. Te enviaremos confirmación por correo.",
      });
    } catch (e) {
      toast({
        title: "Error al procesar",
        description: "Por favor escríbenos a " + SUPPORT_EMAIL,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailRequest = () => {
    const subject = encodeURIComponent("Solicitud de eliminación de cuenta TÜcom");
    const body = encodeURIComponent(
      `Hola equipo TÜcom,\n\nSolicito la eliminación completa de mi cuenta y todos mis datos personales asociados.\n\nCorreo de la cuenta: ${email}\nMotivo (opcional): ${reason || "No indicado"}\n\nConfirmo que entiendo que esta acción es irreversible.\n\nGracias.`
    );
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-to-r from-primary to-secondary px-4 pt-[env(safe-area-inset-top)] sticky top-0 z-40 shadow-lg">
        <div className="flex items-center gap-3 py-3 max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white/15 text-white hover:bg-white/25 transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-white text-lg leading-tight">
                Eliminar mi cuenta
              </h1>
              <p className="text-[10px] text-white/70">TÜcom · Eliminación de datos</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5 text-sm leading-relaxed text-foreground">
        {/* Intro */}
        <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h2 className="font-heading font-bold text-base mb-1">
                Tienes derecho a eliminar tu cuenta
              </h2>
              <p className="text-muted-foreground">
                En cumplimiento de la Ley N° 19.628 de Chile, el RGPD y los requisitos de Google
                Play, puedes solicitar la eliminación total de tu cuenta de TÜcom y de todos los
                datos personales asociados a ella.
              </p>
            </div>
          </div>
        </section>

        {/* Qué se elimina */}
        <section className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h2 className="font-heading font-bold text-base">¿Qué datos se eliminan?</h2>
          <ul className="space-y-2 text-muted-foreground list-disc pl-5">
            <li>Tu cuenta de usuario (correo, identificador, método de inicio de sesión)</li>
            <li>Tus suscripciones a notificaciones push y preferencias de combustible</li>
            <li>Los reportes de precios que hayas enviado</li>
            <li>Cualquier preferencia o configuración almacenada en tu perfil</li>
          </ul>
          <div className="bg-muted/40 border border-border rounded-xl p-3 text-xs text-muted-foreground">
            <strong className="text-foreground">Datos que se conservan de forma anónima:</strong>{" "}
            estadísticas agregadas (promedios de precios por zona, historial de mercado) sin ningún
            vínculo con tu identidad. Esto se mantiene para el funcionamiento general del servicio.
          </div>
        </section>

        {/* Eliminación parcial */}
        <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="font-heading font-bold text-base mb-1">
              Eliminar solo algunos datos (sin cerrar la cuenta)
            </h2>
            <p className="text-muted-foreground text-xs">
              Puedes borrar datos específicos y mantener tu cuenta activa.
            </p>
          </div>

          {!user ? (
            <div className="bg-muted/40 border border-border rounded-xl p-3 text-xs">
              Debes <Link to="/auth" className="text-primary font-semibold underline">iniciar sesión</Link>{" "}
              para usar estas opciones.
            </div>
          ) : (
            <div className="grid gap-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={partialLoading !== null}
                onClick={() => handlePartialDelete("push")}
              >
                {partialLoading === "push" ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                Eliminar mis suscripciones a notificaciones
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={partialLoading !== null}
                onClick={() => handlePartialDelete("reports")}
              >
                {partialLoading === "reports" ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Eliminar mis reportes de precios
              </Button>
              <p className="text-[11px] text-muted-foreground pt-1">
                Para borrar fotos adjuntas u otros datos específicos, escríbenos a{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
            </div>
          )}
        </section>

        {/* Opción 1: Auto-servicio */}
        <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="font-heading font-bold text-base mb-1">
              Opción 1 · Eliminar desde la app (recomendado)
            </h2>
            <p className="text-muted-foreground text-xs">
              Si tienes sesión iniciada, puedes borrar tus datos personales ahora mismo.
            </p>
          </div>

          {!user ? (
            <div className="bg-muted/40 border border-border rounded-xl p-3 text-xs">
              Debes <Link to="/auth" className="text-primary font-semibold underline">iniciar sesión</Link>{" "}
              primero para usar esta opción.
            </div>
          ) : done ? (
            <div className="flex items-start gap-2 bg-success/10 border border-success/30 rounded-xl p-3 text-xs">
              <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
              <div>
                Tus datos fueron eliminados y tu sesión cerrada. La eliminación definitiva del
                registro de autenticación se completa en un plazo máximo de 30 días.
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="confirmFull"
                    checked={confirmFull}
                    onCheckedChange={(c) => setConfirmFull(Boolean(c))}
                  />
                  <Label htmlFor="confirmFull" className="text-xs leading-snug cursor-pointer">
                    Entiendo que se borrarán mis suscripciones push, mis reportes de precios y mi
                    perfil.
                  </Label>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="confirmIrr"
                    checked={confirmIrreversible}
                    onCheckedChange={(c) => setConfirmIrreversible(Boolean(c))}
                  />
                  <Label htmlFor="confirmIrr" className="text-xs leading-snug cursor-pointer">
                    Entiendo que esta acción es <strong>irreversible</strong>.
                  </Label>
                </div>
              </div>
              <Button
                variant="destructive"
                className="w-full"
                disabled={!confirmFull || !confirmIrreversible || submitting}
                onClick={handleSelfDelete}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Eliminar mi cuenta y datos
              </Button>
            </>
          )}
        </section>

        {/* Opción 2: Por correo */}
        <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="font-heading font-bold text-base mb-1">
              Opción 2 · Solicitar por correo
            </h2>
            <p className="text-muted-foreground text-xs">
              Si no puedes iniciar sesión o prefieres que lo procesemos manualmente, envíanos una
              solicitud por correo.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">
                Correo de la cuenta
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@correo.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reason" className="text-xs">
                Motivo (opcional)
              </Label>
              <Textarea
                id="reason"
                placeholder="Cuéntanos brevemente por qué quieres eliminar tu cuenta…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleEmailRequest}
              disabled={email.trim().length < 5}
            >
              <Mail className="w-4 h-4 mr-2" />
              Enviar solicitud por correo
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              También puedes escribir directamente a{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-primary font-semibold underline"
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>
        </section>

        {/* Plazos */}
        <section className="bg-card border border-border rounded-2xl p-5 space-y-2">
          <h2 className="font-heading font-bold text-base">Plazos de procesamiento</h2>
          <ul className="space-y-1 text-muted-foreground text-xs list-disc pl-5">
            <li>
              <strong className="text-foreground">Inmediato:</strong> borrado de suscripciones push,
              reportes de precios y preferencias.
            </li>
            <li>
              <strong className="text-foreground">Hasta 30 días:</strong> eliminación definitiva del
              registro de autenticación.
            </li>
            <li>
              <strong className="text-foreground">Hasta 90 días:</strong> eliminación de copias de
              seguridad cifradas.
            </li>
          </ul>
        </section>

        {/* Aviso */}
        <section className="bg-warning/10 border border-warning/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
          <div className="text-xs text-foreground">
            Una vez eliminada tu cuenta no podrás recuperar tu historial de reportes ni tus
            preferencias. Si solo quieres dejar de recibir notificaciones, puedes desactivarlas
            desde la app sin eliminar la cuenta.
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground space-x-3 pt-2">
          <Link to="/privacidad" className="text-primary underline">
            Política de privacidad
          </Link>
          <span>·</span>
          <Link to="/terminos" className="text-primary underline">
            Términos
          </Link>
          <span>·</span>
          <Link to="/" className="text-primary underline">
            Inicio
          </Link>
        </div>
      </main>
    </div>
  );
};

export default DeleteAccount;
