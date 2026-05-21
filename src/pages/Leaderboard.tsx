import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Medal, Award } from "lucide-react";
import { useMonthlyLeaderboard } from "@/hooks/useGamification";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

const medalFor = (idx: number) => {
  if (idx === 0) return { icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-500/10" };
  if (idx === 1) return { icon: Medal, color: "text-gray-400", bg: "bg-gray-400/10" };
  if (idx === 2) return { icon: Award, color: "text-amber-700", bg: "bg-amber-700/10" };
  return null;
};

const shortId = (id: string) => `Usuario ${id.slice(0, 4).toUpperCase()}`;

const Leaderboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useMonthlyLeaderboard();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-gradient-primary px-4 pt-[env(safe-area-inset-top)] sticky top-0 z-40 shadow-elegant">
        <div className="flex items-center gap-3 py-3 max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white/15 text-white hover:bg-white/25"
            aria-label="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-heading font-extrabold text-white text-lg">Ranking del mes</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-3">
        <p className="text-sm text-muted-foreground">
          Top 10 colaboradores con más reportes verificados este mes. Puedes desactivar tu
          aparición desde tu perfil.
        </p>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <Trophy className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Aún no hay reportes verificados este mes. ¡Sé el primero!
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {data.map((row, idx) => {
              const medal = medalFor(idx);
              const isMe = user?.id === row.user_id;
              return (
                <li
                  key={row.user_id}
                  className={`flex items-center gap-3 p-4 rounded-xl border ${
                    isMe ? "border-primary bg-primary/5" : "border-border bg-card"
                  } shadow-soft`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      medal ? medal.bg : "bg-muted"
                    }`}
                  >
                    {medal ? (
                      <medal.icon className={`w-5 h-5 ${medal.color}`} />
                    ) : (
                      <span className="text-sm text-foreground">{idx + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">
                      {isMe ? "Tú" : shortId(row.user_id)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.reports} reportes verificados
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-heading font-extrabold text-lg text-primary tabular-nums">
                      {row.points}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">pts</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
};

export default Leaderboard;
