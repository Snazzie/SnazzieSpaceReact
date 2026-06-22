import { describe, it, expect } from 'vitest';
import {
  personalAllowance,
  incomeTax,
  nationalInsurance,
  takeHome,
  hoursForPrice,
  formatWorkTime,
} from './tax';

describe('personalAllowance', () => {
  it('is full below the taper threshold', () => {
    expect(personalAllowance(30_000)).toBe(12_570);
    expect(personalAllowance(100_000)).toBe(12_570);
  });

  it('tapers £1 for every £2 over £100k', () => {
    expect(personalAllowance(110_000)).toBe(12_570 - 5_000);
  });

  it('is fully gone at £125,140', () => {
    expect(personalAllowance(125_140)).toBe(0);
    expect(personalAllowance(200_000)).toBe(0);
  });

  it('taper midpoint at £124,000 → £570', () => {
    expect(personalAllowance(124_000)).toBeCloseTo(570, 2); // 12,570 − (124,000−100,000)/2
  });
});

describe('incomeTax (rUK 2025/26)', () => {
  it('£30,000 → £3,486', () => {
    expect(incomeTax(30_000)).toBeCloseTo(3_486, 2);
  });

  it('£50,000 → £7,486 (all basic rate)', () => {
    expect(incomeTax(50_000)).toBeCloseTo(7_486, 2);
  });

  it('£100,000 → £27,432', () => {
    expect(incomeTax(100_000)).toBeCloseTo(27_432, 2);
  });

  it('£125,140 → £42,516 (PA fully tapered)', () => {
    expect(incomeTax(125_140)).toBeCloseTo(42_516, 2);
  });

  it('£150,000 → £53,703 (additional rate biting)', () => {
    // PA 0; basic 37,700×0.2=7,540; higher 87,440×0.4=34,976; additional 24,860×0.45=11,187.
    expect(incomeTax(150_000)).toBeCloseTo(53_703, 2);
  });

  it('additional rate makes £130k tax exceed the £125,140 threshold tax', () => {
    expect(incomeTax(130_000)).toBeGreaterThan(incomeTax(125_140));
  });

  it('no tax under the personal allowance', () => {
    expect(incomeTax(10_000)).toBe(0);
  });
});

describe('nationalInsurance (Class 1 employee 2025/26)', () => {
  it('£30,000 → £1,394.40', () => {
    expect(nationalInsurance(30_000)).toBeCloseTo(1_394.4, 2);
  });

  it('£50,000 → £2,994.40 (all 8% band)', () => {
    expect(nationalInsurance(50_000)).toBeCloseTo(2_994.4, 2);
  });

  it('£100,000 → £4,010.60 (8% then 2%)', () => {
    expect(nationalInsurance(100_000)).toBeCloseTo(4_010.6, 2);
  });

  it('£50,270 → £3,016 (exactly the 8% band, nothing in 2%)', () => {
    expect(nationalInsurance(50_270)).toBeCloseTo(3_016, 2); // 37,700×0.08
  });

  it('£60,000 → £3,210.60 (8% on 37,700 + 2% on 9,730)', () => {
    expect(nationalInsurance(60_000)).toBeCloseTo(3_210.6, 2);
  });

  it('is monotonic non-decreasing across the UEL boundary', () => {
    expect(nationalInsurance(40_000)).toBeLessThanOrEqual(nationalInsurance(50_000));
    expect(nationalInsurance(50_000)).toBeLessThanOrEqual(nationalInsurance(60_000));
  });

  it('none below the primary threshold', () => {
    expect(nationalInsurance(10_000)).toBe(0);
  });
});

describe('takeHome', () => {
  it('combines tax + NI into net and per-hour rates', () => {
    const r = takeHome(50_000, 40);
    expect(r.net).toBeCloseTo(50_000 - 7_486 - 2_994.4, 2);
    expect(r.grossHourly).toBeCloseTo(50_000 / (40 * 52), 4);
    expect(r.netHourly).toBeCloseTo(r.net / (40 * 52), 4);
  });

  it('returns NaN hourly when hours are zero (no divide-by-zero)', () => {
    const r = takeHome(50_000, 0);
    expect(Number.isNaN(r.netHourly)).toBe(true);
  });
});

describe('hoursForPrice', () => {
  it('price ÷ net hourly', () => {
    expect(hoursForPrice(1_200, 19)).toBeCloseTo(63.16, 2);
  });

  it('NaN when hourly is not positive', () => {
    expect(Number.isNaN(hoursForPrice(1_200, 0))).toBe(true);
  });
});

describe('formatWorkTime', () => {
  it('sub-hour shows minutes', () => {
    expect(formatWorkTime(0.5)).toBe('30 min');
  });

  it('under a day shows hours', () => {
    expect(formatWorkTime(6.9)).toBe('6.9 hrs');
  });

  it('multiple days plus remainder', () => {
    expect(formatWorkTime(30, 8)).toBe('3 work days, 6.0 hrs');
  });

  it('whole days drop the remainder', () => {
    expect(formatWorkTime(16, 8)).toBe('2 work days');
  });

  it('non-finite shows a dash', () => {
    expect(formatWorkTime(NaN)).toBe('—');
  });
});
