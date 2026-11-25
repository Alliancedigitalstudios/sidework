import type { WorkProfile } from "./types.js";
/** Cheesecake Factory preset. Percentages from employee accounts (4.2% of sales); confirm with the user. */
export const CHEESECAKE_PRESET: WorkProfile = {
  version: 1,
  workplace: { name: "The Cheesecake Factory", state: "UT", preset: "cheesecake-factory" },
  roles: [
    { id: "server", label: "Server", hourlyRate: 2.13, shareOfWeeks: 0.7,
      tipOut: { direction: "pay", basis: "sales", recipients: [{ name: "Busser", pct: 2.2 }, { name: "Bar", pct: 1.0 }, { name: "Runner", pct: 1.0 }] } },
    { id: "runner", label: "Food Runner", hourlyRate: 2.13, shareOfWeeks: 0.3,
      tipOut: { direction: "receive", basis: "pool", recipients: [], paidVia: "payCard" } },
    { id: "bartender", label: "Bartender", hourlyRate: 2.13, shareOfWeeks: 0,
      tipOut: { direction: "both", basis: "tips", recipients: [{ name: "Barback", pct: 10 }], paidVia: "payCard" } },
  ],
  payFlows: {
    cardTips: { via: "payCard", timing: "nextDay", netOfTipOut: true },
    cashTips: { via: "cash" },
    wages: { via: "paycheck", cadence: "biweekly", payday: 5 },
    payCard: { vendor: "branch", transfersToBank: true },
  },
  budget: { baselineMonthly: 2400, weeklySalary: 554, bills: [], taxReservePct: 12 },
};
