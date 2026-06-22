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

  it('salary sacrifice (%) cuts tax + NI and counts the pension as value', () => {
    const base = evaluateOffer({ mode: 'gross', pay: 50_000, period: 'year', hours: 40 });
    const sacced = evaluateOffer({
      mode: 'gross',
      pay: 50_000,
      period: 'year',
      hours: 40,
      sacrifice: { kind: 'pct', value: 10 },
    });
    // Pension contribution = 10% of gross.
    expect(sacced.salarySacrifice).toBeCloseTo(5_000, 2);
    // Tax + NI are computed on the reduced gross, so both fall.
    expect(sacced.incomeTax).toBeLessThan(base.incomeTax);
    expect(sacced.nationalInsurance).toBeLessThan(base.nationalInsurance);
    // Cash take-home drops (pay diverted to pension)...
    expect(sacced.netAnnual).toBeLessThan(base.netAnnual);
    // ...but total value (cash + pension) beats plain pay, thanks to the tax + NI saved.
    expect(sacced.totalValue).toBeGreaterThan(base.totalValue);
    expect(sacced.effHourly).toBeGreaterThan(base.effHourly);
  });

  it('salary sacrifice as a fixed £ amount annualises by the pay period', () => {
    const r = evaluateOffer({
      mode: 'gross',
      pay: 4_000,
      period: 'month',
      hours: 40,
      sacrifice: { kind: 'amount', value: 200 },
    });
    expect(r.salarySacrifice).toBeCloseTo(2_400, 2); // £200/month × 12
  });

  it('salary sacrifice is ignored in net mode', () => {
    const r = evaluateOffer({
      mode: 'net',
      pay: 30_000,
      period: 'year',
      hours: 40,
      sacrifice: { kind: 'pct', value: 10 },
    });
    expect(r.salarySacrifice).toBe(0);
    expect(r.totalValue).toBeCloseTo(30_000, 2);
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

  it('salary sacrifice (%) is capped at the salary, zeroing tax + NI', () => {
    const r = evaluateOffer({
      mode: 'gross',
      pay: 40_000,
      period: 'year',
      hours: 40,
      sacrifice: { kind: 'pct', value: 200 }, // 80,000 raw, clamped to the salary
    });
    expect(r.salarySacrifice).toBeCloseTo(40_000, 2);
    expect(r.incomeTax).toBe(0);
    expect(r.nationalInsurance).toBe(0);
  });

  it('salary sacrifice (£ amount) is capped at the salary', () => {
    const r = evaluateOffer({
      mode: 'gross',
      pay: 30_000,
      period: 'year',
      hours: 40,
      sacrifice: { kind: 'amount', value: 50_000 }, // exceeds salary, clamped
    });
    expect(r.salarySacrifice).toBeCloseTo(30_000, 2);
  });

  it('sacrifice and commute combine, dragging the real rate below sacrifice-only', () => {
    const saccedOnly = evaluateOffer({
      mode: 'gross',
      pay: 60_000,
      period: 'year',
      hours: 40,
      sacrifice: { kind: 'pct', value: 10 },
    });
    const both = evaluateOffer({
      mode: 'gross',
      pay: 60_000,
      period: 'year',
      hours: 40,
      sacrifice: { kind: 'pct', value: 10 },
      commute: { mins: 90, cost: 12, days: 5 },
    });
    expect(both.salarySacrifice).toBeCloseTo(6_000, 2);
    expect(both.commuteHoursYear).toBe(390); // 90/60 × 5 × 52
    expect(both.commuteCostYear).toBe(3_120); // 12 × 5 × 52
    expect(Number.isFinite(both.effHourly)).toBe(true);
    expect(both.effHourly).toBeLessThan(saccedOnly.effHourly);
  });

  it('commute cost exceeding total value yields a negative real rate (not clamped)', () => {
    const r = evaluateOffer({
      mode: 'net',
      pay: 1_000,
      period: 'year',
      hours: 40,
      commute: { mins: 0, cost: 100, days: 5 },
    });
    expect(r.effNetYear).toBeLessThan(0);
    expect(r.effHourly).toBeLessThan(0);
  });

  it('zero hours gives a NaN real hourly rate', () => {
    const r = evaluateOffer({ mode: 'gross', pay: 50_000, period: 'year', hours: 0 });
    expect(Number.isNaN(r.effHourly)).toBe(true);
  });
});
