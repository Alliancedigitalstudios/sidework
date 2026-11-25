export function hoursBetween(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms <= 0) throw new Error("shift end must be after start");
  return Math.round((ms / 36e5) * 100) / 100;
}
export function addDays(ymd: string, n: number): string {
  const d = new Date(ymd + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function nextWeekday(fromYmd: string, weekday: number): string {
  const d = new Date(fromYmd + "T00:00:00Z");
  const diff = (weekday - d.getUTCDay() + 7) % 7 || 7;
  return addDays(fromYmd, diff);
}
export const round2 = (n: number) => Math.round(n * 100) / 100;
