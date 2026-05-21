// Lightweight haptic feedback helpers. No-op on unsupported devices.
type Pattern = "light" | "double" | "error" | "success";

const PATTERNS: Record<Pattern, number | number[]> = {
  light: 10,
  double: [10, 40, 10],
  error: 180,
  success: [10, 30, 10],
};

export function haptic(pattern: Pattern = "light") {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(PATTERNS[pattern]);
    }
  } catch {
    /* ignore */
  }
}
