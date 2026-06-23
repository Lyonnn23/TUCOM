import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );
        
        if (error) throw error;
        
        if (data.session) {
          navigate("/", { replace: true });
          return;
        }
      } catch (e) {
        // Si exchangeCodeForSession falla, intentar getSession
      }

      // Fallback: esperar que la sesión se establezca
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          clearInterval(interval);
          navigate("/", { replace: true });
        } else if (attempts >= 10) {
          clearInterval(interval);
          toast.error("Tiempo de espera agotado. Intenta de nuevo.");
          navigate("/auth", { replace: true });
        }
      }, 800);

      return () => clearInterval(interval);
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Iniciando sesión…</p>
      </div>
    </div>
  );
};

export default AuthCallback;
