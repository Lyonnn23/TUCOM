import { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Fuel, Flag, Users, BarChart3, Sparkles, Settings, LogOut, ArrowLeft, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/stations", label: "Estaciones", icon: Fuel },
  { to: "/admin/reports", label: "Reportes", icon: Flag },
  { to: "/admin/users", label: "Usuarios", icon: Users },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/insights", label: "IA Insights", icon: Sparkles },
  { to: "/admin/discounts", label: "Descuentos", icon: Tag },
  { to: "/admin/config", label: "Configuración", icon: Settings },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const loc = useLocation();
  const title = navItems.find(n => n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to))?.label ?? "Admin";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r bg-card/50 sticky top-0 h-screen">
        <div className="p-4 border-b">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent" />
            <div>
              <div className="font-bold leading-tight">TÜcom</div>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Admin</Badge>
            </div>
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t space-y-2">
          <div className="text-xs text-muted-foreground truncate" title={user?.email ?? ""}>{user?.email}</div>
          <div className="flex gap-1">
            <Link to="/" className="flex-1">
              <Button size="sm" variant="ghost" className="w-full justify-start"><ArrowLeft className="h-3.5 w-3.5 mr-2" />App</Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={signOut}><LogOut className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur px-4 py-3 flex items-center gap-3">
          <div className="md:hidden">
            <Link to="/"><Button size="sm" variant="ghost"><ArrowLeft className="h-4 w-4" /></Button></Link>
          </div>
          <h1 className="text-lg md:text-xl font-bold">{title}</h1>
          <Badge variant="secondary" className="ml-1">Admin</Badge>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="hidden sm:inline text-muted-foreground truncate max-w-[180px]">{user?.email}</span>
            <Button size="sm" variant="ghost" onClick={signOut} aria-label="Cerrar sesión"><LogOut className="h-4 w-4" /></Button>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="md:hidden flex gap-1 overflow-x-auto px-3 py-2 border-b bg-card/40">
          {navItems.map(item => (
            <NavLink
              key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap",
                isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              <item.icon className="h-3.5 w-3.5" />{item.label}
            </NavLink>
          ))}
        </nav>

        <main className="p-4 md:p-6 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
