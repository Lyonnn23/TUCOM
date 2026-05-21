import { useEffect, useState } from "react";

interface Props {
  /** Time before the splash fades out, ms */
  duration?: number;
  onDone?: () => void;
}

/**
 * Branded splash shown while the app boots.
 * Logo scales+fades in, then subtitle, then the whole thing fades to the app.
 */
const SplashScreen = ({ duration = 900, onDone }: Props) => {
  const [hide, setHide] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHide(true), duration);
    const t2 = setTimeout(() => onDone?.(), duration + 350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [duration, onDone]);

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-primary via-primary to-secondary transition-opacity duration-300 ${
        hide ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="animate-splash-logo">
        <div className="w-24 h-24 rounded-3xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-2xl">
          <span className="text-5xl font-extrabold text-white tracking-tight">
            T<span className="relative">Ü</span>
          </span>
        </div>
      </div>
      <div className="mt-6 animate-splash-subtitle">
        <p className="text-white/90 text-sm font-medium tracking-wide">
          Tu combustible, tu ahorro
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
