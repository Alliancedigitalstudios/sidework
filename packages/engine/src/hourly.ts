import type { Role, Shift } from "./types.js";
import { hoursBetween, round2 } from "./dates.js";
import { computeTipOut } from "./tipout.js";

export interface ShiftEarnings {
  hours: number; wages: number; grossTips: number; tipOut: number; tipShareIn: number; takeHome: number; realHourly: number;
}
/** What she actually walked with, and the real hourly including wage, after tip-out. */
export function computeEarnings(shift: Shift, role: Role): ShiftEarnings {
  const hours = hoursBetween(shift.start, shift.end);
  const wages = round2(hours * role.hourlyRate);
  const grossTips = round2(shift.cashTips + shift.cardTips);
  const tipOut = computeTipOut(shift, role.tipOut).total;
  const tipShareIn = shift.tipShareReceived;
  const takeHome = round2(grossTips - tipOut + tipShareIn);
  const realHourly = round2((takeHome + wages) / hours);
  return { hours, wages, grossTips, tipOut, tipShareIn, takeHome, realHourly };
}
