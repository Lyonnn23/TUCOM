import { lazy, Suspense, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import InstallBanner from "@/components/InstallBanner";
import ShareTargetHandler from "@/components/ShareTargetHandler";
import SkipLink from "@/components/SkipLink";
import SplashScreen from "@/components/SplashScreen";
const ChatBubble = lazy(() => import("@/components/ChatBubble"));
import FirstRunOnboarding from "@/components/FirstRunOnboarding";
import ConsentBanner from "@/components/ConsentBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Navigate, useLocation } from "react-router-dom";

// Lazy-loaded routes (code-split per page)
const Index = lazy(() => import("./pages/Index.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const AuthCallback = lazy(() => import("./pages/AuthCallback.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const FuelReport = lazy(() => import("./pages/FuelReport.tsx"));
const PriceHistory = lazy(() => import("./pages/PriceHistory.tsx"));
const Install = lazy(() => import("./pages/Install.tsx"));
const Legal = lazy(() => import("./pages/Legal.tsx"));
const Privacy = lazy(() => import("./pages/Privacy.tsx"));
const DeleteAccount = lazy(() => import("./pages/DeleteAccount.tsx"));
const ResponsiveCheck = lazy(() => import("./pages/ResponsiveCheck.tsx"));
const Welcome = lazy(() => import("./pages/Welcome.tsx"));
const Landing = lazy(() => import("./pages/Landing.tsx"));
const Contacto = lazy(() => import("./pages/Contacto.tsx"));
const Onboarding = lazy(() => import("./pages/Onboarding.tsx"));
const StationDetail = lazy(() => import("./pages/StationDetail.tsx"));
const Alerts = lazy(() => import("./pages/Alerts.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Compare = lazy(() => import("./pages/Compare.tsx"));
const Drive = lazy(() => import("./pages/Drive.tsx"));
const Leaderboard = lazy(() => import("./pages/Leaderboard.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const Calculadora = lazy(() => import("./pages/Calculadora.tsx"));
const CalculadoraRutas = lazy(() => import("./pages/CalculadoraRutas.tsx"));
const Terminos = lazy(() => import("./pages/Terminos.tsx"));
const CalculadoraEV = lazy(() => import("./pages/CalculadoraEV.tsx"));
const MisCargas = lazy(() => import("./pages/MisCargas.tsx"));
const Planes = lazy(() => import("./pages/Planes.tsx"));
const EmpresaLanding = lazy(() => import("./pages/empresa/EmpresaLanding.tsx"));
const EmpresaLayout = lazy(() => import("./pages/empresa/EmpresaLayout.tsx"));
const EmpresaDashboard = lazy(() => import("./pages/empresa/EmpresaDashboard.tsx"));
const EmpresaConfig = lazy(() => import("./pages/empresa/EmpresaConfig.tsx"));
const EmpresaReportes = lazy(() => import("./pages/empresa/EmpresaReportes.tsx"));
const EmpresaMiVehiculo = lazy(() => import("./pages/empresa/EmpresaMiVehiculo.tsx"));
const VehicleDetail = lazy(() => import("./pages/VehicleDetail.tsx"));
const MepcoInfo = lazy(() => import("./pages/MepcoInfo.tsx"));
const Descuentos = lazy(() => import("./pages/Descuentos.tsx"));
const CommuneIndexPage = lazy(() => import("./pages/CommuneIndexPage.tsx"));
const CommunePage = lazy(() => import("./pages/CommunePage.tsx"));

import RequireAdmin from "@/components/RequireAdmin";

const RouteFallback = () => (
  <div className="min-h-screen bg-background p-4 space-y-3">
    <Skeleton className="h-14 rounded-2xl" />
    <Skeleton className="h-40 rounded-2xl" />
    <Skeleton className="h-64 rounded-2xl" />
  </div>
);

const isGuest = () => {
  try {
    return (
      localStorage.getItem("guest_mode") === "true" ||
      sessionStorage.getItem("tucom_guest_mode") === "1"
    );
  } catch { return false; }
};

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user && !isGuest()) return <Welcome />;
  return children;
};

const HomeRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user && !isGuest()) return <Landing />;
  return <RequireOnboarded><Index /></RequireOnboarded>;
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min default (station data, etc.)
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000), // 1s, 2s, 4s
    },
  },
});

const RouteTransition = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-enter">
      {children}
    </div>
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    try {
      // Show splash only once per session
      return sessionStorage.getItem("tucom_splash_shown") !== "1";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    if (!showSplash) return;
    try { sessionStorage.setItem("tucom_splash_shown", "1"); } catch { /* ignore */ }
  }, [showSplash]);

  return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
        <OfflineIndicator />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <SkipLink />
            <ShareTargetHandler />
            <main id="main-content" tabIndex={-1}>
            <Suspense fallback={<RouteFallback />}>
              <RouteTransition>
              <Routes>
                <Route path="/" element={<HomeRoute />} />
                <Route path="/contacto" element={<Contacto />} />
                <Route path="/welcome" element={<Welcome />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/station/:id" element={<RequireAuth><StationDetail /></RequireAuth>} />
                <Route path="/alertas" element={<RequireAuth><Alerts /></RequireAuth>} />
                <Route path="/alerts" element={<Navigate to="/alertas" replace />} />
                <Route path="/favorites" element={<Navigate to="/?tab=favoritos" replace />} />
                <Route path="/favoritos" element={<Navigate to="/?tab=favoritos" replace />} />
                <Route path="/map" element={<Navigate to="/?tab=estaciones&sort=price" replace />} />
                <Route path="/mapa" element={<Navigate to="/?tab=estaciones" replace />} />
                <Route path="/report" element={<Navigate to="/?tab=estaciones&action=report" replace />} />
                <Route path="/reportar" element={<Navigate to="/?tab=estaciones&action=report" replace />} />
                <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
                <Route path="/compare" element={<RequireAuth><Compare /></RequireAuth>} />
                <Route path="/comparar" element={<RequireAuth><Compare /></RequireAuth>} />
                <Route path="/drive" element={<RequireAuth><Drive /></RequireAuth>} />
                <Route path="/conducir" element={<RequireAuth><Drive /></RequireAuth>} />
                <Route path="/perfil" element={<RequireAuth><Profile /></RequireAuth>} />
                <Route path="/profile/vehicle/:id" element={<RequireAuth><VehicleDetail /></RequireAuth>} />
                <Route path="/perfil/vehiculo/:id" element={<RequireAuth><VehicleDetail /></RequireAuth>} />
                <Route path="/ranking" element={<RequireAuth><Leaderboard /></RequireAuth>} />
                <Route path="/leaderboard" element={<RequireAuth><Leaderboard /></RequireAuth>} />
                <Route path="/admin/*" element={<RequireAuth><RequireAdmin><Admin /></RequireAdmin></RequireAuth>} />
                <Route path="/calculadora" element={<RequireAuth><Calculadora /></RequireAuth>} />
                <Route path="/calculadora-rutas" element={<RequireAuth><CalculadoraRutas /></RequireAuth>} />
                <Route path="/calculator" element={<Navigate to="/calculadora" replace />} />
                <Route path="/calculadora-ev" element={<RequireAuth><CalculadoraEV /></RequireAuth>} />
                <Route path="/mis-cargas" element={<RequireAuth><MisCargas /></RequireAuth>} />
                <Route path="/fuel-logs" element={<Navigate to="/mis-cargas" replace />} />
                <Route path="/planes" element={<Planes />} />
                <Route path="/pricing" element={<Navigate to="/planes" replace />} />
                <Route path="/empresa" element={<RequireAuth><EmpresaLanding /></RequireAuth>} />
                <Route path="/empresa/*" element={<RequireAuth><EmpresaLayout /></RequireAuth>}>
                  <Route path="dashboard" element={<EmpresaDashboard />} />
                  <Route path="configuracion" element={<EmpresaConfig />} />
                  <Route path="reportes" element={<EmpresaReportes />} />
                  <Route path="mi-vehiculo" element={<EmpresaMiVehiculo />} />
                </Route>
                <Route path="/auth" element={<Auth />} />
                <Route path="/login" element={<Navigate to="/auth" replace />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/reporte" element={<FuelReport />} />
                <Route path="/historial" element={<PriceHistory />} />
                <Route path="/mepco-info" element={<MepcoInfo />} />
                <Route path="/mepco" element={<Navigate to="/mepco-info" replace />} />
                <Route path="/descuentos" element={<RequireAuth><Descuentos /></RequireAuth>} />
                <Route path="/discounts" element={<Navigate to="/descuentos" replace />} />
                <Route path="/bencina" element={<CommuneIndexPage />} />
                <Route path="/bencina/:slug" element={<CommunePage />} />

                <Route path="/install" element={<Install />} />
                <Route path="/legal" element={<Legal />} />
                <Route path="/terms" element={<Legal />} />
                <Route path="/terminos" element={<Terminos />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/privacidad" element={<Privacy />} />
                <Route path="/eliminar-cuenta" element={<DeleteAccount />} />
                <Route path="/delete-account" element={<DeleteAccount />} />
                <Route path="/responsive-check" element={<ResponsiveCheck />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              </RouteTransition>
            </Suspense>
            </main>
            <InstallBanner />
            <ConsentBanner />
            <Suspense fallback={null}>
              <ChatBubble />
            </Suspense>
            <FirstRunOnboarding />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
