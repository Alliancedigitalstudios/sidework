import type { Bill } from "./types.js";
import { round2 } from "./dates.js";

export interface Buckets { holding: number; spend: number; buffer: number; tax: number; slowSeason: number; goals: number }
/** Spend bucket minus bills due before the next expected deposit date. */
export function safeToSpend(buckets: Buckets, bills: Bill[], todayYmd: string, nextDepositYmd: string): number {
  const today = Number(todayYmd.slice(8, 10));
  const next = Number(nextDepositYmd.slice(8, 10));
  const due = bills.filter((b) => (next >= today ? b.dueDay >= today && b.dueDay < next : b.dueDay >= today || b.dueDay < next));
  return round2(buckets.spend - due.reduce((a, b) => a + b.amount, 0));
}
/** Weekly release from Holding to Spend at the salary floor; surplus to Buffer. */
export function weeklyRelease(buckets: Buckets, weeklySalary: number): Buckets {
  const release = Math.min(buckets.holding, weeklySalary);
  const surplus = Math.max(0, buckets.holding - weeklySalary);
  return { ...buckets, holding: 0, spend: round2(buckets.spend + release), buffer: round2(buckets.buffer + surplus) };
}
