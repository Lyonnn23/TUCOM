/**
 * MonthlySavingsCard — widget compacto que muestra el ahorro estimado
 * del usuario este mes comparado con el promedio nacional.
 *
 * Se muestra solo si el usuario tiene registros de carga (FuelLog).
 */
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useSavingsEstimate } from "@/hooks/useSavingsEstimate";
import CountUp from "@/components/CountUp";

const MonthlySavingsCard = () => {
  const estimate = useSavingsEstimate();

  if (!estimate || !estimate.hasSavings) return null;

  const saved = estimate.savedCLP;
  const isPositive = saved > 0;

  return (
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
      <div className="text-right shrink-0">
        <Wallet className="w-4 h-4 text-muted-foreground mx-auto mb-0.5" />
        <p className="text-[9px] text-muted-foreground font-mono">
          ${estimate.avgPricePaid}/L<br />pagado
        </p>
      </div>
    </div>
  );
};

export default MonthlySavingsCard;
