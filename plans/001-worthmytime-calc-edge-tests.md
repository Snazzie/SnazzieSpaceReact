# Plan 001: Worth My Time calculator has edge-case test coverage and guarded inputs

> **Executor instructions**: Follow this plan step by step. Run every verification
> command and confirm the expected result before moving on. If a "STOP condition"
> occurs, stop and report. When done, update the status row for plan 001 in
> `plans/README.md`.
>
> **Drift check (run first)**: from the repo root,
> `git diff --stat 351c7dc..HEAD -- Website/src/projects/worthmytime/lib/`
> If `tax.ts` or `offer.ts` changed since this plan was written, compare the
> "Current state" excerpts below against the live code before proceeding; on a
> real mismatch in the functions named here, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `351c7dc`, 2026-06-22

## Why this matters

The "Worth My Time" calculator turns salary offers into a real after-tax hourly
rate that a user may base a job decision on. The pure money-math lives in
`Website/src/projects/worthmytime/lib/tax.ts` and `offer.ts` and already has good
tests, but they only cover mid-band salaries and single-feature scenarios. The
dangerous, untested regions are the **band boundaries** (personal-allowance taper
£100k-£125,140, the NI upper-earnings limit £50,270, the 45% additional rate) and
**combined inputs** (salary sacrifice + commute together, sacrifice capped at the
salary, commute cost exceeding pay). A silent off-by-a-band bug there shows a wrong
headline number exactly where the maths is hardest. This plan adds characterization
tests for those regions and confirms (does not change) the existing clamping
behaviour, so future edits can't regress it unseen.

## Current state

Files (all under `Website/`, the directory where `bun test` runs):

- `src/projects/worthmytime/lib/tax.ts` — UK 2025/26 take-home model. Key exports
  and their boundary behaviour, verified against the live code:
  - `personalAllowance(gross)` — full £12,570 at/below £100,000; tapers £1 per £2
    above; `0` at/above £125,140. Clamped at 0 via `bMax(..., 0)`.
  - `incomeTax(gross)` — 20% on the basic band (£37,700 wide), 40% on the higher
    band whose top shifts with the taper so 45% always begins at £125,140 of total
    income. Returns 0 below the personal allowance.
  - `nationalInsurance(gross)` — Class 1 employee: 8% between £12,570 and £50,270,
    2% above £50,270. 0 below £12,570.
  - `takeHome(gross, hoursPerWeek)` — clamps gross and hours to `>= 0`
    (`Math.max(0, gross || 0)`), returns `netHourly`/`grossHourly` as `NaN` when
    annual hours are 0 (guarded divide).
  - `hoursForPrice(price, netHourly)` — `NaN` when `netHourly <= 0`.
- `src/projects/worthmytime/lib/offer.ts` — `evaluateOffer(input)`:
  - Salary sacrifice applies in `gross` mode only; raw contribution is clamped with
    `Math.min(Math.max(0, raw), annualPay)` so it can never exceed the salary
    (offer.ts:81). Ignored entirely in `net` mode.
  - `effNetYear = totalValue - commuteCostYear` (can go negative), and
    `effHourly = effHoursYear > 0 ? effNetYear / effHoursYear : NaN`.

Existing tests to model the new ones on (match their structure, naming, and the
`toBeCloseTo(value, 2)` style exactly):

- `src/projects/worthmytime/lib/tax.test.ts`
- `src/projects/worthmytime/lib/offer.test.ts`

Both use `import { describe, it, expect } from 'vitest';`. Tests are colocated with
the code as `*.test.ts`. `vitest.config.ts` includes `src/**/*.test.ts`.

## Commands you will need

| Purpose   | Command (run from `Website/`)        | Expected on success |
|-----------|--------------------------------------|---------------------|
| Tests     | `bun test`                           | all pass, incl. new |
| Filtered  | `bunx vitest run src/projects/worthmytime/lib/` | all pass |
| Typecheck | `bunx astro check`                   | 0 errors (warnings from elsewhere OK) |

## Scope

**In scope** (modify only these):
- `Website/src/projects/worthmytime/lib/tax.test.ts` (add cases)
- `Website/src/projects/worthmytime/lib/offer.test.ts` (add cases)

**Out of scope** (do NOT touch):
- `tax.ts` and `offer.ts` source — the existing clamps already cover negative/zero
  inputs (verified above). This plan only *asserts* that behaviour; it does not add
  new guards. If a new test reveals an actual incorrect result (not just an
  unasserted one), that is a STOP condition — report it, do not "fix" the source.
- Any UI/calculator component (`Calculator.tsx`, `CompareOffers.tsx`, etc.).

## Git workflow

- Branch: the executor harness places you in an isolated worktree; work there.
- Commit message style (match repo `git log`, plain imperative): e.g.
  `Add boundary + combined-input tests for Worth My Time calc`.
- Do NOT push or open a PR.

## Steps

### Step 1: Add band-boundary tests to `tax.test.ts`

Append new `it(...)` cases inside the existing `describe` blocks (or add new
describes). Use these anchors — each value is hand-computed from the 2025/26 model
above; assert with `toBeCloseTo(expected, 2)`:

- `incomeTax(150_000)` → `53_703` (PA 0; basic 37,700×0.2=7,540; higher
  87,440×0.4=34,976; additional 24,860×0.45=11,187).
- `nationalInsurance(50_270)` → `3_016` (exactly the 8% band, nothing in the 2%
  band: 37,700×0.08).
- `nationalInsurance(60_000)` → `3_210.6` (8% on 37,700 = 3,016; 2% on 9,730 =
  194.6).
- `personalAllowance(124_000)` → `12_570 - 12_000` = `570` (taper: (124,000−100,000)/2 = 12,000).
- `incomeTax(100_000)` is already tested (£27,432) — do not duplicate.

Also add relationship assertions (no magic numbers needed):

- `incomeTax(130_000)` is greater than `incomeTax(125_140)` (additional rate biting).
- `nationalInsurance` is monotonic non-decreasing: `nationalInsurance(40_000) <= nationalInsurance(50_000) <= nationalInsurance(60_000)`.

**Verify**: `bunx vitest run src/projects/worthmytime/lib/tax.test.ts` → all pass.

### Step 2: Add combined-input + clamp tests to `offer.test.ts`

Append `it(...)` cases inside the existing `describe('evaluateOffer', ...)`:

- **Sacrifice capped at salary**: gross £40,000/year, `sacrifice: { kind: 'pct', value: 200 }`
  → `salarySacrifice` equals `40_000` (clamped, not 80,000), and `incomeTax` and
  `nationalInsurance` are `0` (taxable gross becomes 0).
- **Sacrifice amount exceeding salary**: gross £30,000/year,
  `sacrifice: { kind: 'amount', value: 50_000 }` → `salarySacrifice` equals `30_000`.
- **Sacrifice + commute together** (gross mode): build a base offer (gross £60,000,
  40h) and one that adds BOTH `sacrifice: { kind: 'pct', value: 10 }` AND
  `commute: { mins: 90, cost: 12, days: 5 }`. Assert: `salarySacrifice` ≈ `6_000`;
  `commuteHoursYear` equals `90/60*5*52 = 390`; `commuteCostYear` equals
  `12*5*52 = 3_120`; and `effHourly` is finite and less than the sacrifice-only
  variant's `effHourly` (commute drags it down).
- **Commute cost exceeds total value**: net mode, pay £1,000/year (low), 40h,
  `commute: { mins: 0, cost: 100, days: 5 }` → `effNetYear` is negative and
  `effHourly` is negative (sanity: the function does not clamp this to 0).
- **Zero hours → NaN hourly**: any gross offer with `hours: 0` → `Number.isNaN(r.effHourly)` is `true`.

**Verify**: `bunx vitest run src/projects/worthmytime/lib/offer.test.ts` → all pass.

### Step 3: Full suite

**Verify**: from `Website/`, `bun test` → all pass (existing + new). Note the new
test count in your report.

## Test plan

- New cases live in the two existing `*.test.ts` files, modelled structurally on the
  cases already there (same imports, same `toBeCloseTo(_, 2)` precision, same
  describe grouping).
- Cases cover: PA taper midpoint, NI UEL boundary, additional-rate band, sacrifice
  clamp (both pct and amount), sacrifice+commute interaction, negative effHourly,
  zero-hours NaN.
- Verification: `bun test` from `Website/` → all green.

## Done criteria

ALL must hold:

- [ ] `bun test` (from `Website/`) exits 0; the new cases above all exist and pass.
- [ ] `bunx astro check` reports 0 type errors in the two edited files.
- [ ] `git status` shows only `tax.test.ts` and `offer.test.ts` modified — no source files.
- [ ] `plans/README.md` row 001 updated to DONE.

## STOP conditions

Stop and report (do not improvise) if:

- A computed anchor above does not match the function's actual output. This means
  either the plan's hand-computation is wrong OR there's a real source bug — either
  way the human must decide; do not edit the source to force the test green.
- The live `tax.ts`/`offer.ts` signatures differ from the "Current state" excerpts.
- A verification command fails twice after a reasonable fix to the test.

## Maintenance notes

- These are 2025/26 tax-year values. When HMRC bands change, the anchor numbers
  (and the source constants) must be updated together — a reviewer should check the
  test anchors were recomputed, not just shifted.
- If `evaluateOffer` ever gains student-loan or Scotland bands, the combined-input
  tests here are the regression net for the existing rUK path.
</content>
