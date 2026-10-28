/**
 * MonthlySavingsCard — widget compacto que muestra el ahorro estimado
 * del usuario este mes comparado con el promedio nacional.
 *
 * Se muestra solo si el usuario tiene registros de carga (FuelLog).
 * Si el ahorro es > $2.000 CLP, ofrece botones para compartir.
 */
import { useState } from "react";
import { TrendingDown, TrendingUp, Wallet, Share2, X } from "lucide-react";
import { useSavingsEstimate } from "@/hooks/useSavingsEstimate";
import CountUp from "@/components/CountUp";
import { ShareAppCard } from "@/components/ShareAppCard";

const SHARE_PROMPT_KEY = "tucom_share_prompted_v1";
const SHARE_THRESHOLD_CLP = 2000;

const MonthlySavingsCard = () => {
  const estimate = useSavingsEstimate();
  const [showShare, setShowShare] = useState(false);
  const [shareDismissed, setShareDismissed] = useState(() => {
    try { return localStorage.getItem(SHARE_PROMPT_KEY) === "1"; } catch { return false; }
  });

  if (!estimate || !estimate.hasSavings) return null;

  const saved = estimate.savedCLP;
  const isPositive = saved > 0;
  const showSharePrompt = isPositive && saved >= SHARE_THRESHOLD_CLP && !shareDismissed;

  const dismissShare = () => {
    setShareDismissed(true);
    setShowShare(false);
    try { localStorage.setItem(SHARE_PROMPT_KEY, "1"); } catch {}
  };

  return (
    <div className="space-y-3">
      <div
        className={`rounded-2xl p-4 border flex items-center gap-4 animate-scale-in ${
          isPositive
            ? "bg-fuel-green/10 border-fuel-green/25"
            : "bg-fuel-red/10 border-fuel-red/25"
        }`}
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isPositive ? "bg-fuel-green/20" : "bg-fuel-red/20"
          }`}
        >
          {isPositive ? (
            <TrendingDown className="w-5 h-5 text-[hsl(var(--fuel-green))]" />
          ) : (
            <TrendingUp className="w-5 h-5 text-[hsl(var(--fuel-red))]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {isPositive ? "Ahorro estimado este mes" : "Gasto extra este mes"}
          </p>
          <p
            className={`font-heading font-black text-xl tabular-nums leading-tight ${
              isPositive
                ? "text-[hsl(var(--fuel-green))]"
                : "text-[hsl(var(--fuel-red))]"
            }`}
          >
            {isPositive ? "−" : "+"}$
            <CountUp value={Math.abs(saved)} duration={800} />
            <span className="text-xs font-semibold ml-0.5">CLP</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            vs. promedio nacional · {estimate.litersThisMonth.toFixed(0)} L cargados
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-right">
            <Wallet className="w-4 h-4 text-muted-foreground mx-auto mb-0.5" />
            <p className="text-[9px] text-muted-foreground font-mono">
              ${estimate.avgPricePaid.toLocaleString("es-CL")}/L<br />pagado
            </p>
          </div>
          {/* Share trigger button */}
          {showSharePrompt && !showShare && (
            <button
              onClick={() => setShowShare(true)}
              className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:opacity-80 transition-opacity"
              aria-label="Compartir ahorro"
            >
              <Share2 className="w-3 h-3" />
              Compartir
            </button>
          )}
        </div>
      </div>

      {/* Share prompt inline */}
      {showShare && showSharePrompt && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">
              🎉 ¡Comparte tu ahorro!
            </p>
            <button
              onClick={dismissShare}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Cuéntale a tus amigos cómo ahorras en combustible con TÜcom.
          </p>
          <ShareAppCard variant="savings" savingsAmount={saved} compact />
        </div>
      )}
    </div>
  );
};

export default MonthlySavingsCard;
