import type { Role, Shift, ShiftType } from "./types.js";
import { computeEarnings } from "./hourly.js";
import { round2 } from "./dates.js";

export interface Band { floor: number; likely: number; high: number; sampleN: number; source: "history" | "preset" }
export interface PresetBand { floor: number; likely: number; high: number }
/** Default restaurant seasonality multipliers by month (1-12). Override with user history after a year. */
export const SEASON_FACTOR: Record<number, number> = { 1: 0.72, 2: 0.78, 3: 0.95, 4: 1.0, 5: 1.05, 6: 1.0, 7: 0.97, 8: 0.95, 9: 0.98, 10: 1.0, 11: 1.02, 12: 1.08 };

export function keyFor(roleId: string, weekday: number, shiftType: ShiftType) { return `${roleId}:${weekday}:${shiftType}`; }

/** p25/p50/p75 of take-home for a shift type; falls back to preset below 6 samples. Floor is the number the budget runs on. */
export function floorProjection(
  history: Shift[], roles: Role[], roleId: string, weekday: number, shiftType: ShiftType, month: number, preset: PresetBand
): Band {
  const role = roles.find((r) => r.id === roleId)!;
  const vals = history
    .filter((s) => s.status === "logged" && s.roleId === roleId && s.shiftType === shiftType && new Date(s.date + "T00:00:00Z").getUTCDay() === weekday)
    .map((s) => computeEarnings(s, role).takeHome + computeEarnings(s, role).wages)
    .sort((a, b) => a - b);
  const f = SEASON_FACTOR[month] ?? 1;
  if (vals.length < 6) return { floor: round2(preset.floor * f), likely: round2(preset.likely * f), high: round2(preset.high * f), sampleN: vals.length, source: "preset" };
  const q = (p: number) => vals[Math.min(vals.length - 1, Math.floor(p * vals.length))];
  return { floor: round2(q(0.25) * f), likely: round2(q(0.5) * f), high: round2(q(0.75) * f), sampleN: vals.length, source: "history" };
}
