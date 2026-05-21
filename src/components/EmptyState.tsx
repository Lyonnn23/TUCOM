import { ReactNode } from "react";
import { Bell, Car, Fuel, Heart, MapPinOff, WifiOff, LucideIcon, RefreshCw, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  className?: string;
  children?: ReactNode;
  tone?: "default" | "error";
}

const EmptyState = ({ icon: Icon = Fuel, title, description, action, className, children, tone = "default" }: Props) => {
  const ActionIcon = action?.icon;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-12 animate-fade-in",
        className,
      )}
    >
      <div
        className={cn(
          "relative w-24 h-24 rounded-full flex items-center justify-center mb-5",
          tone === "error"
            ? "bg-destructive/10 text-destructive"
            : "bg-gradient-to-br from-primary/15 to-secondary/15 text-primary",
        )}
      >
        <div className="absolute inset-0 rounded-full animate-ping-slow opacity-30 bg-current" />
        <Icon className="w-10 h-10 relative" strokeWidth={1.75} />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-5 press-scale" size="sm">
          {ActionIcon && <ActionIcon className="w-4 h-4 mr-2" />}
          {action.label}
        </Button>
      )}
      {children}
    </div>
  );
};

// Preset variants for common cases
export const NoStationsFound = ({ onRetry }: { onRetry?: () => void }) => (
  <EmptyState
    icon={MapPinOff}
    title="No encontramos estaciones"
    description="Intenta ampliar el radio de búsqueda o cambiar los filtros."
    action={onRetry ? { label: "Reintentar", onClick: onRetry, icon: RefreshCw } : undefined}
  />
);

export const NoFavorites = ({ onExplore }: { onExplore?: () => void }) => (
  <EmptyState
    icon={Heart}
    title="Aún no tienes favoritos"
    description="Guarda tus estaciones favoritas para acceder rápido a sus precios."
    action={onExplore ? { label: "Ver estaciones", onClick: onExplore } : undefined}
  />
);

export const NoAlerts = ({ onCreate }: { onCreate?: () => void }) => (
  <EmptyState
    icon={Bell}
    title="Sin alertas activas"
    description="Crea alertas para que te avisemos cuando baje el precio del combustible."
    action={onCreate ? { label: "Crear alerta", onClick: onCreate } : undefined}
  />
);

export const NoFuelLogs = ({ onAdd }: { onAdd?: () => void }) => (
  <EmptyState
    icon={Fuel}
    title="Sin cargas registradas"
    description="Registra tus cargas para ver tus estadísticas de consumo y ahorro."
    action={onAdd ? { label: "Registrar carga", onClick: onAdd } : undefined}
  />
);

export const OfflineState = ({ onRetry }: { onRetry?: () => void }) => (
  <EmptyState
    tone="error"
    icon={WifiOff}
    title="Sin conexión"
    description="Mostrando la última información guardada. Conéctate para ver precios actualizados."
    action={onRetry ? { label: "Reintentar", onClick: onRetry, icon: RefreshCw } : undefined}
  />
);

export const LocationDeniedState = ({ onAction }: { onAction?: () => void }) => (
  <EmptyState
    icon={MapPin}
    title="Activa tu ubicación"
    description="Necesitamos acceso a tu ubicación para mostrarte las estaciones más cercanas."
    action={onAction ? { label: "Cómo activarla", onClick: onAction } : undefined}
  />
);

export const ApiErrorState = ({ onRetry }: { onRetry?: () => void }) => (
  <EmptyState
    tone="error"
    icon={Car}
    title="Algo salió mal"
    description="No pudimos cargar la información. Intenta de nuevo en un momento."
    action={onRetry ? { label: "Reintentar", onClick: onRetry, icon: RefreshCw } : undefined}
  />
);

export default EmptyState;
