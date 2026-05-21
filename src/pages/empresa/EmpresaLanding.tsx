import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Building2, Users, BarChart3, FileText, Check, ArrowLeft } from "lucide-react";
import { CreateOrgDialog, JoinOrgDialog } from "@/components/empresa/OrgDialogs";

export default function EmpresaLanding() {
  const { user } = useAuth();
  const { org, role, isLoading } = useOrganization();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  // Already in an org → go to relevant section
  if (!isLoading && org) {
    return <Navigate to={role === "admin" ? "/empresa/dashboard" : "/empresa/mi-vehiculo"} replace />;
  }

  const features = [
    { icon: Building2, title: "Crea tu organización", text: "Genera un código único y suma a tus conductores en segundos." },
    { icon: Users, title: "Gestión de conductores", text: "Cada conductor registra sus cargas y tú ves todo en un solo panel." },
    { icon: BarChart3, title: "Dashboard en tiempo real", text: "Gasto del mes, costo por km, vehículo con más consumo y alertas." },
    { icon: FileText, title: "Reportes PDF y CSV", text: "Descarga reportes mensuales con tu logo, compatibles con tu contador." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Volver a TÜcom
          </Link>
          <span className="text-xs font-semibold text-primary">TÜcom Empresa</span>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 pt-12 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
          <Building2 className="h-3.5 w-3.5" /> Para empresas y flotas
        </div>
        <h1 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-[hsl(245,75%,60%)] bg-clip-text text-transparent">
          Gestiona los gastos de combustible de tu empresa
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
          Controla cada carga, cada km y cada peso. Tus conductores cargan, tú decides. Plan gratuito hasta 3 vehículos.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {user ? (
            <>
              <Button
                size="lg"
                onClick={() => setCreateOpen(true)}
                className="bg-gradient-to-r from-primary to-[hsl(245,75%,60%)] text-primary-foreground"
              >
                Crear organización
              </Button>
              <Button size="lg" variant="outline" onClick={() => setJoinOpen(true)}>
                Unirme con código
              </Button>
            </>
          ) : (
            <Button asChild size="lg" className="bg-gradient-to-r from-primary to-[hsl(245,75%,60%)]">
              <Link to="/auth">Crear cuenta para empezar</Link>
            </Button>
          )}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 lg:grid-cols-4 gap-4 pb-12">
        {features.map((f) => (
          <div key={f.title} className="bg-card rounded-2xl border border-border p-5 shadow-soft">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-[hsl(245,75%,60%)] flex items-center justify-center mb-3">
              <f.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <h3 className="font-semibold mb-1">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>

      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-center mb-6">Planes Empresa</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Empresa Básico</div>
            <div className="text-3xl font-bold my-2">Gratis</div>
            <p className="text-sm text-muted-foreground mb-4">Hasta 3 vehículos. Ideal para flotas pequeñas.</p>
            <ul className="space-y-2 text-sm mb-6">
              {["Hasta 3 vehículos", "Conductores ilimitados", "Dashboard básico", "Exportar CSV"].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> {t}</li>
              ))}
            </ul>
            {user ? (
              <Button variant="outline" className="w-full" onClick={() => setCreateOpen(true)}>Empezar gratis</Button>
            ) : (
              <Button asChild variant="outline" className="w-full"><Link to="/auth">Crear cuenta</Link></Button>
            )}
          </div>
          <div className="bg-gradient-to-br from-primary to-[hsl(245,75%,60%)] rounded-2xl p-6 text-primary-foreground relative overflow-hidden">
            <div className="absolute top-3 right-3 text-[10px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">Recomendado</div>
            <div className="text-xs uppercase tracking-wider opacity-90">Empresa Pro</div>
            <div className="text-3xl font-bold my-2">Contactar</div>
            <p className="text-sm opacity-90 mb-4">Vehículos ilimitados, reporte PDF con logo, soporte prioritario.</p>
            <ul className="space-y-2 text-sm mb-6">
              {["Vehículos ilimitados", "Reportes PDF con tu logo", "Alertas de gasto anómalo", "Soporte prioritario"].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4" /> {t}</li>
              ))}
            </ul>
            <Button
              asChild
              variant="secondary"
              className="w-full bg-white text-primary hover:bg-white/90"
            >
              <a href="https://wa.me/56900000000?text=Hola%2C%20quiero%20info%20de%20TÜcom%20Empresa%20Pro" target="_blank" rel="noopener noreferrer">
                Contactar ventas
              </a>
            </Button>
          </div>
        </div>
      </section>

      <CreateOrgDialog open={createOpen} onOpenChange={setCreateOpen} />
      <JoinOrgDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </div>
  );
}
