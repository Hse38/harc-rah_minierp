/** Dashboard tasarım sistemi renkleri */
export const DASHBOARD_COLORS = {
  primary: "#1E40AF",
  success: "#059669",
  warning: "#D97706",
  danger: "#DC2626",
  purple: "#7C3AED",
  neutral: "#6B7280",
  cyan: "#0891B2",
} as const;

/** Recharts grafik paleti (sırayla kullan) */
export const CHART_COLORS = [
  DASHBOARD_COLORS.primary,
  DASHBOARD_COLORS.success,
  DASHBOARD_COLORS.warning,
  DASHBOARD_COLORS.purple,
  DASHBOARD_COLORS.danger,
  DASHBOARD_COLORS.cyan,
] as const;

export const CHART_GRID_STROKE = "#f0f0f0";
export const CHART_GRID_STROKE_DASHARRAY = "3 3";

/** Türkçe para formatı (tooltip vb.) */
export function formatCurrencyTR(value: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);
}
