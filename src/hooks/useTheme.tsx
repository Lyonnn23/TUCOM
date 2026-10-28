import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeCtx {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx>({
  mode: "system",
  resolved: "light",
  setMode: () => {},
  toggle: () => {},
});

const STORAGE_KEY = "tucom.theme";

/** Returns true between 20:00 and 06:59 (night hours → dark theme). */
const isNightHour = (): boolean => {
  const h = new Date().getHours();
  return h >= 20 || h < 7;
};

const getSystem = (): "light" | "dark" =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

/**
 * Resolves the effective theme for "system" mode.
 * Priority: OS preference first; if OS is light but it's night → dark.
 */
const resolveSystem = (): "light" | "dark" => {
  const os = getSystem();
  if (os === "dark") return "dark";
  return isNightHour() ? "dark" : "light";
};

const apply = (resolved: "light" | "dark") => {
  const el = document.documentElement;
  el.classList.toggle("dark", resolved === "dark");
  el.style.colorScheme = resolved;
};

/** Returns ms until the next hour boundary (so we can re-evaluate at :00). */
const msToNextHour = (): number => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(now.getHours() + 1, 0, 0, 0);
  return next.getTime() - now.getTime();
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem(STORAGE_KEY) as ThemeMode) || "system";
  });
  const [resolved, setResolved] = useState<"light" | "dark">(() =>
    mode === "system" ? resolveSystem() : (mode as "light" | "dark")
  );

  useEffect(() => {
    const next = mode === "system" ? resolveSystem() : (mode as "light" | "dark");
    setResolved(next);
    apply(next);
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  // Listen to OS preference changes (when mode === "system")
  useEffect(() => {
    if (mode !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const next = resolveSystem();
      setResolved(next);
      apply(next);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [mode]);

  // Re-evaluate at every hour boundary when mode === "system"
  // This handles automatic dark/light switch at 20:00 and 07:00.
  useEffect(() => {
    if (mode !== "system") return;

    let timeout: ReturnType<typeof setTimeout>;

    const schedule = () => {
      timeout = setTimeout(() => {
        const next = resolveSystem();
        setResolved(next);
        apply(next);
        schedule(); // chain to next hour
      }, msToNextHour());
    };

    schedule();
    return () => clearTimeout(timeout);
  }, [mode]);

  const setMode = (m: ThemeMode) => setModeState(m);
  const toggle = () =>
    setModeState((prev) => {
      const current = prev === "system" ? resolveSystem() : prev;
      return current === "dark" ? "light" : "dark";
    });

  return (
    <Ctx.Provider value={{ mode, resolved, setMode, toggle }}>{children}</Ctx.Provider>
  );
};

export const useTheme = () => useContext(Ctx);
