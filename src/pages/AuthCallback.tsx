import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase dispara onAuthStateChange con SIGNED_IN cuando procesa el hash OAuth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        subscription.unsubscribe();
        navigate("/", { replace: true });
      } else if (event === "SIGNED_OUT") {
        subscription.unsubscribe();
        toast.error("No se pudo iniciar sesión. Intenta de nuevo.");
        navigate("/auth", { replace: true });
      }
    });

    // Fallback: si la sesión ya existe al montar (recarga de página)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe();
        navigate("/", { replace: true });
      }
    });

    // Timeout de seguridad: si en 8 segundos no hay sesión, redirige a login
    const timeout = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        subscription.unsubscribe();
        if (session) {
          navigate("/", { replace: true });
        } else {
          toast.error("Tiempo de espera agotado. Intenta de nuevo.");
          navigate("/auth", { replace: true });
        }
      });
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Iniciando sesión…</p>
      </div>
    </div>
  );
};

export default AuthCallback;
