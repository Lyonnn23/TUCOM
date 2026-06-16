import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Wait for auth state to resolve (cloud-auth handles the token exchange).
    if (loading) return;
    if (user) {
      navigate("/", { replace: true });
    } else {
      // No session after callback: surface error and send back to login.
      toast.error("No se pudo iniciar sesión. Intenta de nuevo.");
      navigate("/auth", { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-white gap-4"
      style={{ background: "linear-gradient(160deg, #7C3AED 0%, #5B21B6 100%)" }}
    >
      <Loader2 className="w-8 h-8 animate-spin" aria-hidden="true" />
      <p className="text-sm text-white/90">Iniciando sesión…</p>
    </div>
  );
};

export default AuthCallback;
