import type { Deposit, ExpectedDeposit, Role, Shift, WorkProfile } from "./types.js";
import { addDays, round2 } from "./dates.js";
import { computeTipOut } from "./tipout.js";

/** Which deposits this shift should produce, where, and when. Wages are left to the paycheck explainer. */
export function expectedDeposits(shift: Shift, profile: WorkProfile): ExpectedDeposit[] {
  const role = profile.roles.find((r) => r.id === shift.roleId) as Role;
  const out: ExpectedDeposit[] = [];
  const cf = profile.payFlows.cardTips;
  const lag = cf.timing === "nextDay" ? 1 : 0;
  if (cf.via !== "cash" && cf.timing !== "payday") {
    let amt = shift.cardTips;
    if (cf.netOfTipOut) amt -= computeTipOut(shift, role.tipOut).total;
    if (amt > 0) out.push({ shiftId: shift.id, source: cf.via === "payCard" ? "payCard" : "bank", date: addDays(shift.date, lag), amount: round2(amt) });
  }
  const share = role.tipOut.paidVia;
  if (shift.tipShareReceived > 0 && share && share !== "paycheck") {
    out.push({ shiftId: shift.id, source: share === "payCard" ? "payCard" : "cash", date: addDays(shift.date, lag), amount: round2(shift.tipShareReceived) });
  }
  return out;
}

export interface Match { depositId: string; shiftId: string; delta: number }
export interface MatchResult { matches: Match[]; unmatchedDeposits: Deposit[]; waitingShifts: string[] }

/** Greedy match: same source, date within [0,+2] days of expected, amount within tolerance. */
export function matchDeposits(expected: ExpectedDeposit[], deposits: Deposit[], tolerance = 1): MatchResult {
  const used = new Set<string>();
  const matches: Match[] = [];
  for (const e of expected) {
    const cands = deposits
      .filter((d) => !used.has(d.id) && d.source === e.source && Math.abs(d.amount - e.amount) <= tolerance)
      .filter((d) => { const dd = daysDiff(e.date, d.date); return dd >= 0 && dd <= 2; })
      .sort((a, b) => Math.abs(a.amount - e.amount) - Math.abs(b.amount - e.amount));
    if (cands[0]) { used.add(cands[0].id); matches.push({ depositId: cands[0].id, shiftId: e.shiftId, delta: round2(cands[0].amount - e.amount) }); }
  }
  const matchedShifts = new Set(matches.map((m) => m.shiftId));
  return {
    matches,
    unmatchedDeposits: deposits.filter((d) => !used.has(d.id)),
    waitingShifts: expected.filter((e) => !matchedShifts.has(e.shiftId)).map((e) => e.shiftId),
  };
}
function daysDiff(a: string, b: string): number {
  return Math.round((new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 864e5);
}
