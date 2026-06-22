// Turns a job offer's inputs into a comparable set of derived figures: annual
// take-home, and the real hourly rate after tax, NI, and commute. Shared by the
// single calculator and the offer-comparison view so the maths lives in one place.

import Big from 'big.js';
import { takeHome, personalAllowance, WEEKS_PER_YEAR } from './tax';

export type Period = 'year' | 'month' | 'week';
export type Mode = 'gross' | 'net';
export type SacrificeKind = 'pct' | 'amount';

export const PERIOD_PER: Record<Period, number> = {
  year: 1,
  month: 12,
  week: WEEKS_PER_YEAR,
};

export interface Commute {
  mins: number; // round trip per day
  cost: number; // per day
  days: number; // per week
}

export interface Sacrifice {
  kind: SacrificeKind;
  /** pct: percent of annualised gross. amount: per the offer's pay period. */
  value: number;
}

export interface OfferInput {
  mode: Mode;
  pay: number; // per the chosen period
  period: Period;
  hours: number; // per week
  commute?: Commute | null;
  /** Pension via salary sacrifice. Gross mode only; ignored in net mode. */
  sacrifice?: Sacrifice | null;
}

export interface OfferResult {
  /** Annualised pay as entered, interpreted as gross. Only meaningful in gross mode. */
  grossAnnual: number;
  /** Tax-free personal allowance applied (after the £100k taper). Gross mode only. */
  personalAllowance: number;
  incomeTax: number;
  nationalInsurance: number;
  /** Annual salary-sacrifice pension contribution (gross mode only). */
  salarySacrifice: number;
  /** Annual take-home cash after tax + NI (and after sacrifice leaves the gross), before commute cost. */
  netAnnual: number;
  /** Take-home cash plus the salary-sacrifice pension: the money the job is really worth, before commute cost. */
  totalValue: number;
  annualHours: number;
  commuteHoursYear: number;
  commuteCostYear: number;
  /** Total value after commute cost. */
  effNetYear: number;
  /** Paid hours plus unpaid commute hours. */
  effHoursYear: number;
  /** The headline number: real worth (cash + pension) per hour of life given to the job. */
  effHourly: number;
}

export function annualisePay(pay: number, period: Period): number {
  return Number(new Big(pay || 0).times(PERIOD_PER[period]));
}

export function evaluateOffer(input: OfferInput): OfferResult {
  const annualPay = annualisePay(input.pay, input.period);

  // Salary sacrifice only applies to a gross salary: it trades taxable pay for a
  // pension contribution, lowering the gross that Income Tax and NI bite on. The
  // sacrifice can't exceed the salary itself.
  const sac = input.mode === 'gross' ? input.sacrifice : null;
  let salarySacrifice = 0;
  if (sac) {
    const raw =
      sac.kind === 'pct'
        ? Number(new Big(annualPay).times(Math.max(0, sac.value)).div(100))
        : annualisePay(Math.max(0, sac.value), input.period);
    salarySacrifice = Math.min(Math.max(0, raw), annualPay);
  }

  const grossForTax = Number(new Big(annualPay).minus(salarySacrifice));
  const r = takeHome(grossForTax, input.hours);
  const netAnnual = input.mode === 'gross' ? r.net : annualPay;
  // The sacrificed pay is still yours, just locked in a pension, so it counts
  // toward the offer's real worth.
  const totalValue = Number(new Big(netAnnual).plus(salarySacrifice));

  const annualHours = Math.max(0, input.hours || 0) * WEEKS_PER_YEAR;
  const c = input.commute;
  const commuteHoursYear = c
    ? Number(new Big(Math.max(0, c.mins)).div(60).times(Math.max(0, c.days)).times(WEEKS_PER_YEAR))
    : 0;
  const commuteCostYear = c
    ? Number(new Big(Math.max(0, c.cost)).times(Math.max(0, c.days)).times(WEEKS_PER_YEAR))
    : 0;

  const effHoursYear = Number(new Big(annualHours).plus(commuteHoursYear));
  const effNetYear = Number(new Big(totalValue).minus(commuteCostYear));
  const effHourly = effHoursYear > 0 ? Number(new Big(effNetYear).div(effHoursYear)) : NaN;

  return {
    grossAnnual: annualPay,
    personalAllowance: input.mode === 'gross' ? personalAllowance(grossForTax) : 0,
    incomeTax: input.mode === 'gross' ? r.incomeTax : 0,
    nationalInsurance: input.mode === 'gross' ? r.nationalInsurance : 0,
    salarySacrifice,
    netAnnual,
    totalValue,
    annualHours,
    commuteHoursYear,
    commuteCostYear,
    effNetYear,
    effHoursYear,
    effHourly,
  };
}
