import type { Shift, TipOutRule, TipOutResult } from "./types.js";
import { round2 } from "./dates.js";

/** Dollars this shift pays out, by recipient. Sales-based rules apply even if tables stiffed you. */
export function computeTipOut(shift: Shift, rule: TipOutRule): TipOutResult {
  const byRecipient: Record<string, number> = {};
  if (rule.direction === "receive") return { total: 0, byRecipient };
  const basis = rule.basis === "sales" ? shift.sales : rule.basis === "tips" ? shift.cashTips + shift.cardTips : 0;
  for (const r of rule.recipients) {
    const override = shift.tipOutOverride?.[r.name];
    byRecipient[r.name] = round2(override ?? (basis * r.pct) / 100);
  }
  const total = round2(Object.values(byRecipient).reduce((a, b) => a + b, 0));
  return { total, byRecipient };
}
