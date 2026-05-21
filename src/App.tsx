import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import InstallBanner from "@/components/InstallBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Navigate, useLocation } from "react-router-dom";

// Lazy-loaded routes (code-split per page)
const Index = lazy(() => import("./pages/Index.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const FuelReport = lazy(() => import("./pages/FuelReport.tsx"));
const PriceHistory = lazy(() => import("./pages/PriceHistory.tsx"));
const Install = lazy(() => import("./pages/Install.tsx"));
const Legal = lazy(() => import("./pages/Legal.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const DeleteAccount = lazy(() => import("./pages/DeleteAccount.tsx"));
const ResponsiveCheck = lazy(() => import("./pages/ResponsiveCheck.tsx"));
const Welcome = lazy(() => import("./pages/Welcome.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const StationDetail = lazy(() => import("./pages/StationDetail.tsx"));
const Alerts = lazy(() => import("./pages/Alerts.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Compare = lazy(() => import("./pages/Compare.tsx"));

const RouteFallback = () => (
  <div className="min-h-screen bg-background p-4 space-y-3">
    <Skeleton className="h-14 rounded-2xl" />
    <Skeleton className="h-40 rounded-2xl" />
    <Skeleton className="h-64 rounded-2xl" />
  </div>
);

const isGuest = () => {
  try { return sessionStorage.getItem("tucom_guest_mode") === "1"; } catch { return false; }
};

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user && !isGuest()) return <Welcome />;
  return children;
};

const RequireOnboarded = ({ children }: { children: JSX.Element }) => {
  const { user } = useAuth();
  const { preferences, isLoading } = useUserPreferences();
  const location = useLocation();
  if (!user) return children;
  if (isLoading) return null;
  if (!preferences?.onboarding_completed && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <OfflineIndicator />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<RequireAuth><RequireOnboarded><Index /></RequireOnboarded></RequireAuth>} />
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/station/:id" element={<RequireAuth><StationDetail /></RequireAuth>} />
                <Route path="/alertas" element={<RequireAuth><Alerts /></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
                <Route path="/perfil" element={<RequireAuth><Profile /></RequireAuth>} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reporte" element={<FuelReport />} />
                <Route path="/historial" element={<PriceHistory />} />
                <Route path="/install" element={<Install />} />
                <Route path="/legal" element={<Legal />} />
                <Route path="/terms" element={<Legal />} />
                <Route path="/terminos" element={<Legal />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/privacidad" element={<Privacy />} />
                <Route path="/eliminar-cuenta" element={<DeleteAccount />} />
                <Route path="/delete-account" element={<DeleteAccount />} />
                <Route path="/responsive-check" element={<ResponsiveCheck />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <InstallBanner />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
