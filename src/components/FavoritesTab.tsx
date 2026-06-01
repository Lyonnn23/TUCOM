import { ArrowLeft, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import StationCard from "@/components/StationCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import type { GasStation } from "@/hooks/useGasStations";

interface Props {
  stations: GasStation[];
  onNavigate?: (s: GasStation) => void;
  onNavigateGoogle?: (s: GasStation) => void;
  onBack?: () => void;
}

const FavoritesTab = ({ stations, onNavigate, onNavigateGoogle, onBack }: Props) => {

  const { user } = useAuth();
  const { favoriteIds, loading } = useFavorites();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 animate-fade-in">
        <div className="w-20 h-20 rounded-3xl bg-gradient-primary/15 flex items-center justify-center mb-4">
          <Heart className="w-10 h-10 text-primary" />
        </div>
        <h2 className="font-heading font-bold text-foreground text-lg">Mis favoritos</h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-xs">
          Inicia sesión para guardar tus estaciones preferidas y verlas siempre a mano.
        </p>
        <Button onClick={() => navigate("/auth")} className="rounded-xl">
          Iniciar sesión
        </Button>
      </div>
    );
  }

  const favorites = stations.filter((s) => favoriteIds.has(s.id));

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-start gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver"
            className="shrink-0 mt-0.5 w-9 h-9 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center press-scale focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-heading font-bold text-foreground text-lg leading-tight tracking-tight">
            Mis favoritos
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {favorites.length === 0
              ? "Aún no guardas estaciones"
              : `${favorites.length} ${favorites.length === 1 ? "estación guardada" : "estaciones guardadas"}`}
          </p>
        </div>
      </div>


      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      ) : favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mb-4">
            <Heart className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="font-heading font-bold text-foreground">Todavía no tienes favoritos</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Toca el corazón en cualquier estación para guardarla aquí.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {favorites.map((station) => (
            <StationCard
              key={station.id}
              station={station}
              onNavigate={onNavigate}
              onNavigateGoogle={onNavigateGoogle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesTab;
