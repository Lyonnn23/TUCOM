import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "@/integrations/cloud-auth";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const result = await auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth/callback`,
      });
      if (result.error) {
        toast.error("No se pudo iniciar sesión. Intenta de nuevo.");
        setLoading(false);
        return;
      }
      if (result.redirected) return; // browser is navigating away
      navigate("/", { replace: true });
    } catch {
      toast.error("No se pudo iniciar sesión. Intenta de nuevo.");
      setLoading(false);
    }
  };

  const handleGuest = () => {
    try {
      localStorage.setItem("guest_mode", "true");
    } catch {
      /* noop */
    }
    navigate("/", { replace: true });
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between px-6 py-10 text-white"
      style={{
        background: "linear-gradient(160deg, #7C3AED 0%, #5B21B6 100%)",
        paddingTop: "calc(env(safe-area-inset-top) + 2.5rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 2.5rem)",
      }}
    >
      {/* Brand */}
      <div className="flex flex-col items-center text-center mt-8">
        <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-xl mb-5">
          <Zap className="w-10 h-10 text-white" aria-hidden="true" />
        </div>
        <h1 className="font-heading font-extrabold text-white text-[32px] leading-none">
          TÜcom
        </h1>
        <p className="text-white/80 text-base mt-3 max-w-[280px]">
          La bencina más barata cerca de ti
        </p>
      </div>

      {/* Actions */}
      <div className="w-full flex flex-col items-center gap-5">
        <button
          onClick={handleGoogle}
          disabled={loading}
          aria-label="Continuar con Google"
          className="w-full max-w-[320px] h-12 rounded-full bg-white text-gray-800 font-semibold flex items-center justify-center gap-3 shadow-lg hover:shadow-xl active:scale-[0.99] transition disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          <span>{loading ? "Conectando..." : "Continuar con Google"}</span>
        </button>

        <button
          onClick={handleGuest}
          className="text-white/90 text-sm underline underline-offset-4 hover:text-white"
        >
          Explorar sin cuenta →
        </button>
      </div>

      {/* Legal */}
      <div className="text-center text-white/80 text-xs leading-relaxed max-w-[320px]">
        Al continuar aceptas nuestros{" "}
        <button
          onClick={() => navigate("/terminos")}
          className="underline font-medium text-white"
        >
          Términos de Uso
        </button>{" "}
        y la{" "}
        <button
          onClick={() => navigate("/privacidad")}
          className="underline font-medium text-white"
        >
          Política de Privacidad
        </button>
        .
      </div>
    </div>
  );
};

export default Auth;
