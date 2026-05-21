import { Link, NavLink, Outlet, useLocation, Navigate } from "react-router-dom";
import { useOrganization } from "@/hooks/useOrganization";
import { Building2, LayoutDashboard, FileText, Settings, Car, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function EmpresaLayout() {
  const { org, role, isLoading } = useOrganization();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 space-y-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  // Not in any org → redirect to landing
  if (!org && location.pathname !== "/empresa") {
    return <Navigate to="/empresa" replace />;
  }

  const adminLinks = [
    { to: "/empresa/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/empresa/reportes", icon: FileText, label: "Reportes" },
    { to: "/empresa/configuracion", icon: Settings, label: "Configuración" },
  ];

  const driverLinks = [
    { to: "/empresa/mi-vehiculo", icon: Car, label: "Mi vehículo" },
  ];

  const links = role === "admin" ? adminLinks : driverLinks;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Volver a TÜcom
          </Link>
          {org && (
            <div className="flex items-center gap-2">
              {org.logo_url ? (
                <img src={org.logo_url} alt={org.name} className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-[hsl(245,75%,60%)] flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <div className="text-right">
                <div className="text-sm font-semibold leading-tight">{org.name}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {role === "admin" ? "Administrador" : "Conductor"}
                </div>
              </div>
            </div>
          )}
        </div>
        {org && (
          <nav className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 px-3 py-2 text-sm border-b-2 whitespace-nowrap ${
                    isActive ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </div>
    </div>
  );
}
