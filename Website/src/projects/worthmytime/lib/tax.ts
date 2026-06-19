// UK take-home pay model for the "Worth My Time" calculator.
//
// Uses 2025/26 rest-of-UK (England, Wales, Northern Ireland) bands. Scotland
// has different income-tax bands and is intentionally out of scope — the page
// states this assumption. No pension, student loan, salary sacrifice, or
// blind-person's allowance: just Income Tax + Class 1 employee National
// Insurance on a single annual gross salary.
//
// Money maths runs through big.js for exact decimal arithmetic (no binary
// float drift on the £ figures), then converts back to number at the boundary.

import Big from 'big.js';

/** Lower of two Bigs. */
const bMin = (a: Big, b: Big.BigSource): Big => (a.lte(b) ? a : new Big(b));
/** Higher of two Bigs. */
const bMax = (a: Big, b: Big.BigSource): Big => (a.gte(b) ? a : new Big(b));

export const PERSONAL_ALLOWANCE = 12_570;
export const BASIC_RATE_LIMIT = 37_700; // width of the 20% band (taxable income)
export const ADDITIONAL_RATE_THRESHOLD = 125_140; // total income where 45% starts / PA fully tapered
export const PA_TAPER_START = 100_000;

export const NI_PRIMARY_THRESHOLD = 12_570;
export const NI_UPPER_EARNINGS_LIMIT = 50_270;

export const WEEKS_PER_YEAR = 52;

/** Personal allowance after the £1-per-£2 taper above £100k (gone at £125,140). */
export function personalAllowance(gross: number): number {
  if (gross <= PA_TAPER_START) return PERSONAL_ALLOWANCE;
  const reduction = new Big(gross).minus(PA_TAPER_START).div(2);
  return Number(bMax(new Big(PERSONAL_ALLOWANCE).minus(reduction), 0));
}

/** Annual Income Tax (rUK 2025/26). */
export function incomeTax(gross: number): number {
  const pa = new Big(personalAllowance(gross));
  const taxable = bMax(new Big(gross).minus(pa), 0);

  // Top of the 40% band measured in taxable income. As PA tapers, this shifts
  // so the 45% rate always begins at £125,140 of total income.
  const higherBandTop = new Big(ADDITIONAL_RATE_THRESHOLD).minus(pa);

  const basic = bMin(taxable, BASIC_RATE_LIMIT);
  const higher = bMin(bMax(taxable.minus(BASIC_RATE_LIMIT), 0), bMax(higherBandTop.minus(BASIC_RATE_LIMIT), 0));
  const additional = bMax(taxable.minus(higherBandTop), 0);

  return Number(basic.times(0.2).plus(higher.times(0.4)).plus(additional.times(0.45)));
}

/** Annual Class 1 employee National Insurance (2025/26). */
export function nationalInsurance(gross: number): number {
  const main = bMax(bMin(new Big(gross), NI_UPPER_EARNINGS_LIMIT).minus(NI_PRIMARY_THRESHOLD), 0).times(0.08);
  const upper = bMax(new Big(gross).minus(NI_UPPER_EARNINGS_LIMIT), 0).times(0.02);
  return Number(main.plus(upper));
}

export interface TakeHome {
  gross: number;
  incomeTax: number;
  nationalInsurance: number;
  net: number;
  /** Take-home per hour worked, after tax + NI. */
  netHourly: number;
  /** Gross per hour worked, before deductions. */
  grossHourly: number;
}

/** Full annual breakdown plus per-hour rates for a given weekly hours figure. */
export function takeHome(gross: number, hoursPerWeek: number): TakeHome {
  const g = Math.max(0, gross || 0);
  const tax = incomeTax(g);
  const ni = nationalInsurance(g);
  const net = Number(new Big(g).minus(tax).minus(ni));
  const annualHours = Math.max(0, hoursPerWeek || 0) * WEEKS_PER_YEAR;
  return {
    gross: g,
    incomeTax: tax,
    nationalInsurance: ni,
    net,
    netHourly: annualHours > 0 ? Number(new Big(net).div(annualHours)) : NaN,
    grossHourly: annualHours > 0 ? Number(new Big(g).div(annualHours)) : NaN,
  };
}

/** Hours of work an item costs, at a given net hourly rate. */
export function hoursForPrice(price: number, netHourly: number): number {
  if (!(netHourly > 0)) return NaN;
  return Number(new Big(Math.max(0, price || 0)).div(netHourly));
}

/** Format a span of work-hours as e.g. "3 days, 6.9 hrs" (8-hour work days). */
export function formatWorkTime(hours: number, hoursPerDay = 8): string {
  if (!isFinite(hours)) return '—';
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins} min`;
  }
  const days = Math.floor(hours / hoursPerDay);
  const rem = hours - days * hoursPerDay;
  if (days === 0) return `${hours.toFixed(1)} hrs`;
  const dayLabel = `${days} work day${days === 1 ? '' : 's'}`;
  if (rem < 0.05) return dayLabel;
  return `${dayLabel}, ${rem.toFixed(1)} hrs`;
}
