import { describe, it, expect } from "vitest";
import { CHEESECAKE_PRESET, computeTipOut, computeEarnings, expectedDeposits, matchDeposits, floorProjection, safeToSpend, weeklyRelease } from "../src/index.js";
import type { Shift } from "../src/index.js";
import { addDays } from "../src/index.js";

const P = CHEESECAKE_PRESET;
const role = (id: string) => P.roles.find((r) => r.id === id)!;
const base: Shift = { id: "s1", date: "2026-11-20", roleId: "server", start: "2026-11-20T16:00:00-07:00", end: "2026-11-20T22:00:00-07:00", shiftType: "dinner", sales: 1000, cashTips: 40, cardTips: 160, autoGrat: 0, tipShareReceived: 0, status: "logged" };

describe("server shift", () => {
  it("tips out 4.2% of sales split by recipient", () => {
    const t = computeTipOut(base, role("server").tipOut);
    expect(t.byRecipient).toEqual({ Busser: 22, Bar: 10, Runner: 10 });
    expect(t.total).toBe(42);
  });
  it("computes take-home and real hourly incl. wage", () => {
    const e = computeEarnings(base, role("server"));
    expect(e.hours).toBe(6); expect(e.wages).toBe(12.78); expect(e.takeHome).toBe(158);
    expect(e.realHourly).toBe(28.46);
  });
  it("still tips out on sales when the table stiffed (auto-grat table)", () => {
    const stiffed = { ...base, cardTips: 0, cashTips: 0, sales: 800 };
    expect(computeTipOut(stiffed, role("server").tipOut).total).toBe(33.6);
  });
  it("expects card tips net of tip-out on the pay card next day", () => {
    expect(expectedDeposits(base, P)).toEqual([{ shiftId: "s1", source: "payCard", date: "2026-11-21", amount: 118 }]);
  });
});

describe("food runner shift", () => {
  const run: Shift = { ...base, id: "s2", roleId: "runner", sales: 0, cashTips: 0, cardTips: 0, tipShareReceived: 48, start: "2026-11-17T17:00:00-07:00", end: "2026-11-17T22:30:00-07:00", date: "2026-11-17" };
  it("pays no tip-out and receives tip share", () => {
    const e = computeEarnings(run, role("runner"));
    expect(e.tipOut).toBe(0); expect(e.takeHome).toBe(48); expect(e.hours).toBe(5.5);
  });
  it("expects tip share on the pay card next day", () => {
    expect(expectedDeposits(run, P)).toEqual([{ shiftId: "s2", source: "payCard", date: "2026-11-18", amount: 48 }]);
  });
});

describe("bartender shift", () => {
  const bar: Shift = { ...base, id: "s3", roleId: "bartender", sales: 1500, cashTips: 60, cardTips: 240, tipShareReceived: 25 };
  it("tips out barback on tips and receives share from servers", () => {
    const e = computeEarnings(bar, role("bartender"));
    expect(e.tipOut).toBe(30); expect(e.tipShareIn).toBe(25); expect(e.takeHome).toBe(295);
  });
});

describe("double shift crossing midnight", () => {
  it("counts hours across the day boundary", () => {
    const dbl: Shift = { ...base, id: "s4", shiftType: "double", start: "2026-11-21T11:00:00-07:00", end: "2026-11-22T00:30:00-07:00", date: "2026-11-21" };
    expect(computeEarnings(dbl, role("server")).hours).toBe(13.5);
  });
});

describe("deposit matching", () => {
  it("matches next-day pay-card load within $1 and flags waiting shifts", () => {
    const exp = expectedDeposits(base, P);
    const r = matchDeposits(exp, [{ id: "d1", date: "2026-11-21", amount: 118.4, source: "payCard" }, { id: "d2", date: "2026-11-21", amount: 300, source: "paycheck" }]);
    expect(r.matches).toEqual([{ depositId: "d1", shiftId: "s1", delta: 0.4 }]);
    expect(r.unmatchedDeposits.map((d) => d.id)).toEqual(["d2"]);
    expect(r.waitingShifts).toEqual([]);
  });
  it("leaves a shift waiting when nothing lands", () => {
    expect(matchDeposits(expectedDeposits(base, P), []).waitingShifts).toEqual(["s1"]);
  });
});

describe("floor projection", () => {
  it("uses preset below 6 samples and applies the January season factor", () => {
    const b = floorProjection([], P.roles, "server", 5, "dinner", 1, { floor: 140, likely: 190, high: 260 });
    expect(b.source).toBe("preset"); expect(b.floor).toBe(100.8);
  });
  it("uses p25 of history once there are 6+ samples", () => {
    const hist = [120, 140, 150, 160, 180, 220, 260].map((card, i) => ({ ...base, id: `h${i}`, date: addDays("2026-09-04", i * 7), cardTips: card, cashTips: 0, sales: card * 5 }));
    const b = floorProjection(hist, P.roles, "server", 5, "dinner", 4, { floor: 0, likely: 0, high: 0 });
    expect(b.source).toBe("history"); expect(b.sampleN).toBe(7); expect(b.floor).toBeLessThan(b.likely);
  });
});

describe("budget", () => {
  it("releases weekly salary and sweeps surplus to buffer", () => {
    const b = weeklyRelease({ holding: 700, spend: 0, buffer: 0, tax: 0, slowSeason: 0, goals: 0 }, 554);
    expect(b.spend).toBe(554); expect(b.buffer).toBe(146); expect(b.holding).toBe(0);
  });
  it("safe to spend subtracts bills due before next deposit", () => {
    const s = safeToSpend({ holding: 0, spend: 500, buffer: 0, tax: 0, slowSeason: 0, goals: 0 }, [{ id: "r", name: "Rent", amount: 1100, dueDay: 1 }, { id: "p", name: "Phone", amount: 60, dueDay: 25 }], "2026-11-24", "2026-11-27");
    expect(s).toBe(440);
  });
});
