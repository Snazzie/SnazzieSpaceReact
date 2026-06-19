// Turns a job offer's inputs into a comparable set of derived figures: annual
// take-home, and the real hourly rate after tax, NI, and commute. Shared by the
// single calculator and the offer-comparison view so the maths lives in one place.

import Big from 'big.js';
import { takeHome, personalAllowance, WEEKS_PER_YEAR } from './tax';

export type Period = 'year' | 'month' | 'week';
export type Mode = 'gross' | 'net';

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

export interface OfferInput {
  mode: Mode;
  pay: number; // per the chosen period
  period: Period;
  hours: number; // per week
  commute?: Commute | null;
}

export interface OfferResult {
  /** Annualised pay as entered, interpreted as gross. Only meaningful in gross mode. */
  grossAnnual: number;
  /** Tax-free personal allowance applied (after the £100k taper). Gross mode only. */
  personalAllowance: number;
  incomeTax: number;
  nationalInsurance: number;
  /** Annual take-home after tax + NI, before commute cost. */
  netAnnual: number;
  annualHours: number;
  commuteHoursYear: number;
  commuteCostYear: number;
  /** Take-home after commute cost. */
  effNetYear: number;
  /** Paid hours plus unpaid commute hours. */
  effHoursYear: number;
  /** The headline number: real take-home per hour of life given to the job. */
  effHourly: number;
}

export function annualisePay(pay: number, period: Period): number {
  return Number(new Big(pay || 0).times(PERIOD_PER[period]));
}

export function evaluateOffer(input: OfferInput): OfferResult {
  const annualPay = annualisePay(input.pay, input.period);
  const r = takeHome(annualPay, input.hours);
  const netAnnual = input.mode === 'gross' ? r.net : annualPay;

  const annualHours = Math.max(0, input.hours || 0) * WEEKS_PER_YEAR;
  const c = input.commute;
  const commuteHoursYear = c
    ? Number(new Big(Math.max(0, c.mins)).div(60).times(Math.max(0, c.days)).times(WEEKS_PER_YEAR))
    : 0;
  const commuteCostYear = c
    ? Number(new Big(Math.max(0, c.cost)).times(Math.max(0, c.days)).times(WEEKS_PER_YEAR))
    : 0;

  const effHoursYear = Number(new Big(annualHours).plus(commuteHoursYear));
  const effNetYear = Number(new Big(netAnnual).minus(commuteCostYear));
  const effHourly = effHoursYear > 0 ? Number(new Big(effNetYear).div(effHoursYear)) : NaN;

  return {
    grossAnnual: annualPay,
    personalAllowance: input.mode === 'gross' ? personalAllowance(annualPay) : 0,
    incomeTax: input.mode === 'gross' ? r.incomeTax : 0,
    nationalInsurance: input.mode === 'gross' ? r.nationalInsurance : 0,
    netAnnual,
    annualHours,
    commuteHoursYear,
    commuteCostYear,
    effNetYear,
    effHoursYear,
    effHourly,
  };
}
