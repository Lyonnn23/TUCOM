import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";
import FuelReport from "./pages/FuelReport.tsx";
import PriceHistory from "./pages/PriceHistory.tsx";
import Install from "./pages/Install.tsx";
import Legal from "./pages/Legal.tsx";
import Privacy from "./pages/Privacy.tsx";
import DeleteAccount from "./pages/DeleteAccount.tsx";
import ResponsiveCheck from "./pages/ResponsiveCheck.tsx";
import Welcome from "./pages/Welcome.tsx";
import { useAuth } from "@/hooks/useAuth";

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Welcome />;
  return children;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <OfflineIndicator />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RequireAuth><Index /></RequireAuth>} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reporte" element={<FuelReport />} />
            <Route path="/historial" element={<PriceHistory />} />
            <Route path="/install" element={<Install />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/privacidad" element={<Privacy />} />
            <Route path="/eliminar-cuenta" element={<DeleteAccount />} />
            <Route path="/delete-account" element={<DeleteAccount />} />
            <Route path="/responsive-check" element={<ResponsiveCheck />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;