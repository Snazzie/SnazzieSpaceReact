import { describe, it, expect } from 'vitest';
import { evaluateOffer, annualisePay } from './offer';

describe('annualisePay', () => {
  it('scales by period', () => {
    expect(annualisePay(2000, 'month')).toBe(24_000);
    expect(annualisePay(500, 'week')).toBe(26_000);
    expect(annualisePay(40_000, 'year')).toBe(40_000);
  });
});

describe('evaluateOffer', () => {
  it('net mode takes pay as-is (no tax applied)', () => {
    const r = evaluateOffer({ mode: 'net', pay: 2333, period: 'month', hours: 40 });
    expect(r.netAnnual).toBeCloseTo(27_996, 2);
    expect(r.incomeTax).toBe(0);
    expect(r.effHourly).toBeCloseTo(27_996 / (40 * 52), 3);
  });

  it('gross mode applies the UK tax model', () => {
    const r = evaluateOffer({ mode: 'gross', pay: 50_000, period: 'year', hours: 40 });
    expect(r.netAnnual).toBeCloseTo(50_000 - 7_486 - 2_994.4, 2);
    expect(r.effHourly).toBeCloseTo(r.netAnnual / (40 * 52), 3);
  });

  it('commute reduces money and adds hours, lowering the real rate', () => {
    const base = evaluateOffer({ mode: 'net', pay: 2333, period: 'month', hours: 40 });
    const withCommute = evaluateOffer({
      mode: 'net',
      pay: 2333,
      period: 'month',
      hours: 40,
      commute: { mins: 60, cost: 5, days: 5 },
    });
    expect(withCommute.commuteHoursYear).toBe(260);
    expect(withCommute.commuteCostYear).toBe(1_300);
    expect(withCommute.effHourly).toBeLessThan(base.effHourly);
  });

  it('higher salary can lose to a lower one once commute is factored', () => {
    // A: £45k, no commute. B: £48k but a long, costly commute.
    const a = evaluateOffer({ mode: 'gross', pay: 45_000, period: 'year', hours: 40 });
    const b = evaluateOffer({
      mode: 'gross',
      pay: 48_000,
      period: 'year',
      hours: 40,
      commute: { mins: 150, cost: 20, days: 5 },
    });
    expect(b.netAnnual).toBeGreaterThan(a.netAnnual); // B pays more on paper
    expect(b.effHourly).toBeLessThan(a.effHourly); // ...but A is worth more per hour
  });
});
