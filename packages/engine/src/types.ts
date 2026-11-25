// Core domain types. Pure data; no I/O. See docs/SPEC.md section 7.
export type RoleId = string;
export type TipOutDirection = "pay" | "receive" | "both";
export type TipOutBasis = "sales" | "tips" | "pool";
export type PaidVia = "payCard" | "paycheck" | "cash";

export interface TipOutRecipient { name: string; pct: number } // pct of basis, e.g. 2.2
export interface TipOutRule {
  direction: TipOutDirection;
  basis: TipOutBasis;
  recipients: TipOutRecipient[]; // used when direction is pay|both
  paidVia?: PaidVia;             // how received tip share arrives
}
export interface Role {
  id: RoleId; label: string; hourlyRate: number; shareOfWeeks: number; tipOut: TipOutRule;
}
export interface PayFlows {
  cardTips: { via: PaidVia; timing: "sameDay" | "nextDay" | "payday"; netOfTipOut: boolean };
  cashTips: { via: PaidVia };
  wages: { via: "paycheck"; cadence: "weekly" | "biweekly"; payday: number }; // 0=Sun..6=Sat
  payCard?: { vendor: string; transfersToBank: boolean };
}
export interface Bill { id: string; name: string; amount: number; dueDay: number }
export interface WorkProfile {
  version: number;
  workplace: { name: string; state: string; preset?: string };
  roles: Role[];
  payFlows: PayFlows;
  budget: { baselineMonthly: number; weeklySalary: number; bills: Bill[]; taxReservePct: number };
}

export type ShiftType = "lunch" | "dinner" | "double" | "other";
export interface Shift {
  id: string;
  date: string;          // YYYY-MM-DD (local)
  roleId: RoleId;
  start: string;         // ISO datetime
  end: string;           // ISO datetime (may be next calendar day)
  shiftType: ShiftType;
  sales: number;
  cashTips: number;
  cardTips: number;
  autoGrat: number;      // included in cardTips already; tracked for insight
  tipShareReceived: number;
  tipOutOverride?: Record<string, number>; // recipient name -> dollars
  status: "planned" | "logged";
  tags?: string[];
}
export type DepositSource = "payCard" | "paycheck" | "cash" | "transfer" | "bank";
export interface Deposit {
  id: string; date: string; amount: number; source: DepositSource; accountMask?: string; externalId?: string;
}
export interface ExpectedDeposit { shiftId: string; source: DepositSource; date: string; amount: number }
export interface TipOutResult { total: number; byRecipient: Record<string, number> }
