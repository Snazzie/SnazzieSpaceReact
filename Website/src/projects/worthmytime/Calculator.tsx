import { hoursForPrice, formatWorkTime } from './lib/tax';
import { evaluateOffer, PERIOD_PER, type Period, type Mode } from './lib/offer';
import { gbp, gbp2 } from './lib/format';
import { LEFT_LANES, RIGHT_LANES, ALL_ITEMS } from './data/items';
import { MoneyField, Segmented, Stat, PeriodCell } from './components/fields';
import { TickerColumn, TickerRow } from './components/Ticker';
import { usePersistentState } from './lib/usePersistentState';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'year', label: 'Year' },
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
];

export default function Calculator() {
  const [mode, setMode] = usePersistentState<Mode>('calc.mode', 'net');
  const [payStr, setPayStr] = usePersistentState('calc.pay', '2333');
  const [period, setPeriod] = usePersistentState<Period>('calc.period', 'month');
  const [hoursStr, setHoursStr] = usePersistentState('calc.hours', '40');
  const [priceStr, setPriceStr] = usePersistentState('calc.price', '1200');
  const [commuteOn, setCommuteOn] = usePersistentState('calc.commuteOn', false);
  const [commuteMinsStr, setCommuteMinsStr] = usePersistentState('calc.commuteMins', '60');
  const [commuteCostStr, setCommuteCostStr] = usePersistentState('calc.commuteCost', '5');
  const [commuteDaysStr, setCommuteDaysStr] = usePersistentState('calc.commuteDays', '5');

  const pay = parseFloat(payStr) || 0;
  const hours = parseFloat(hoursStr) || 0;
  const price = parseFloat(priceStr) || 0;
  const annualPay = pay * PERIOD_PER[period];

  const cMins = parseFloat(commuteMinsStr) || 0;
  const cCost = parseFloat(commuteCostStr) || 0;
  const cDays = parseFloat(commuteDaysStr) || 0;

  // Cheap pure computation — fine to run every render.
  const r = evaluateOffer({
    mode,
    pay,
    period,
    hours,
    commute: commuteOn ? { mins: cMins, cost: cCost, days: cDays } : null,
  });
  const { netAnnual, annualHours, commuteHoursYear, commuteCostYear, effHoursYear, effHourly } = r;

  const workHours = hoursForPrice(price, effHourly);

  // Take-home sliced by pay period. "Per day" is a working day — commute days
  // if the commute is on, otherwise a standard 5-day week.
  const workDaysPerWeek = commuteOn && cDays > 0 ? cDays : 5;
  const payPerMonth = netAnnual / 12;
  const payPerWeek = netAnnual / 52;
  const payPerDay = netAnnual / (52 * workDaysPerWeek);

  const pick = (p: number) => setPriceStr(String(p));
  const ready = annualPay > 0 && hours > 0;

  return (
    <div className="grid items-stretch justify-center gap-6 xl:grid-cols-[auto_minmax(0,46rem)_auto]">
      {/* Left lanes — first from xl, second from very wide screens */}
      <div className="hidden gap-4 xl:grid xl:grid-cols-1 min-[1700px]:grid-cols-2">
        <TickerColumn items={LEFT_LANES[0].items} netHourly={effHourly} onPick={pick} direction={LEFT_LANES[0].direction} />
        <TickerColumn items={LEFT_LANES[1].items} netHourly={effHourly} onPick={pick} direction={LEFT_LANES[1].direction} className="hidden min-[1700px]:block" />
      </div>

      {/* Calculator (center) */}
      <div className="grid gap-8">
        {/* Inputs */}
        <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
          {/* Pay + mode + period */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                Your {mode === 'gross' ? 'gross (pre-tax)' : 'take-home (net)'} pay
              </span>
              <Segmented
                options={[
                  { id: 'gross', label: 'Gross' },
                  { id: 'net', label: 'Net' },
                ]}
                value={mode}
                onChange={setMode}
              />
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors focus-within:border-white/30">
              <span className="text-muted-foreground select-none">£</span>
              <input
                id="pay"
                type="number"
                inputMode="decimal"
                min="0"
                value={payStr}
                onChange={(e) => setPayStr(e.target.value)}
                className="w-full bg-transparent text-lg font-semibold text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
            <div className="mt-2">
              <Segmented
                options={PERIODS.map((p) => ({ id: p.id, label: `Per ${p.label.toLowerCase()}` }))}
                value={period}
                onChange={setPeriod}
              />
            </div>
            {mode === 'gross' && (
              <p className="mt-2 text-xs text-muted-foreground/70">
                Estimated with 2025/26 rest-of-UK Income Tax + National Insurance. Scotland not modelled.
              </p>
            )}
          </div>

          <MoneyField
            id="hours"
            label="Hours worked per week"
            value={hoursStr}
            onChange={setHoursStr}
            suffix="hrs/wk"
            placeholder="40"
            hint="Include unpaid breaks — total hours committed to work"
          />

          {/* Commute (optional) */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">Factor in my commute</span>
              <input
                type="checkbox"
                checked={commuteOn}
                onChange={(e) => setCommuteOn(e.target.checked)}
                className="size-4 accent-emerald-400"
              />
            </label>
            {commuteOn && (
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <MoneyField
                  id="commute-mins"
                  label="Round trip"
                  value={commuteMinsStr}
                  onChange={setCommuteMinsStr}
                  suffix="min/day"
                  placeholder="60"
                />
                <MoneyField
                  id="commute-cost"
                  label="Cost"
                  prefix="£"
                  value={commuteCostStr}
                  onChange={setCommuteCostStr}
                  suffix="/day"
                  placeholder="5"
                />
                <MoneyField
                  id="commute-days"
                  label="Days"
                  value={commuteDaysStr}
                  onChange={setCommuteDaysStr}
                  suffix="/wk"
                  placeholder="5"
                />
              </div>
            )}
          </div>

          <div className="h-px bg-white/10" />
          <MoneyField
            id="price"
            label="Thing you want to buy"
            prefix="£"
            value={priceStr}
            onChange={setPriceStr}
            placeholder="1200"
          />
        </div>

        {/* Results */}
        <div className="space-y-6">
          {/* Headline */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 sm:p-8">
            <p className="text-sm text-muted-foreground">
              That {price > 0 ? gbp.format(price) : 'purchase'} costs you
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {ready && price > 0 ? formatWorkTime(workHours) : '—'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              of your life at the desk{' '}
              {ready && price > 0 && (
                <span className="text-muted-foreground/70">({workHours.toFixed(1)} take-home hours)</span>
              )}
            </p>
          </div>

          {/* Breakdown */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Your real hourly rate
            </h2>
            {mode === 'gross' && (
              <>
                <Stat label="Gross / year" value={ready ? gbp2.format(annualPay) : '—'} />
                {/* Deductions clustered so the gross → net waterfall is obvious */}
                <div className="my-2 rounded-lg border border-white/10 bg-white/[0.015] px-3">
                  <Stat
                    label="Tax-free allowance"
                    hint="taxed at 0%"
                    value={ready ? gbp2.format(r.personalAllowance) : '—'}
                  />
                  <Stat label="Income tax" value={ready ? `− ${gbp2.format(r.incomeTax)}/yr` : '—'} tone="down" />
                  <Stat
                    label="National Insurance"
                    value={ready ? `− ${gbp2.format(r.nationalInsurance)}/yr` : '—'}
                    tone="down"
                  />
                </div>
              </>
            )}
            <Stat label="Take-home / year" value={ready ? gbp2.format(netAnnual) : '—'} />

            {/* Take-home sliced by period — compact so it doesn't dominate */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <PeriodCell label="Month" value={ready ? gbp2.format(payPerMonth) : '—'} />
              <PeriodCell label="Week" value={ready ? gbp2.format(payPerWeek) : '—'} />
              <PeriodCell
                label="Day"
                sub={`${workDaysPerWeek}-day wk`}
                value={ready ? gbp2.format(payPerDay) : '—'}
              />
            </div>

            <div className="mt-4 space-y-0">
              {commuteOn && (
                <Stat
                  label="Commute cost"
                  hint={`${gbp.format(cCost)}/day × ${cDays} days × 52 wks`}
                  value={ready ? `− ${gbp2.format(commuteCostYear)}/yr` : '—'}
                  tone="down"
                />
              )}
              <Stat
                label="Effective hours / year"
                hint={
                  commuteOn
                    ? `${annualHours.toLocaleString('en-GB')} worked + ${Math.round(
                        commuteHoursYear,
                      ).toLocaleString('en-GB')} commute`
                    : `${annualHours.toLocaleString('en-GB')} worked`
                }
                value={ready ? Math.round(effHoursYear).toLocaleString('en-GB') : '—'}
              />
            </div>

            {/* Headline: the number this whole tool exists to produce */}
            <div className="mt-4 flex items-baseline justify-between gap-4 rounded-xl bg-emerald-400/10 px-4 py-3">
              <span className="text-sm font-medium text-emerald-200">
                Effective pay / hour
                <span className="mt-0.5 block text-xs text-emerald-200/50">take-home ÷ effective hours</span>
              </span>
              <span className="text-2xl font-bold tabular-nums text-emerald-400">
                {ready ? gbp2.format(effHourly) : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right lanes — first from xl, second from very wide screens */}
      <div className="hidden gap-4 xl:grid xl:grid-cols-1 min-[1700px]:grid-cols-2">
        <TickerColumn items={RIGHT_LANES[0].items} netHourly={effHourly} onPick={pick} direction={RIGHT_LANES[0].direction} />
        <TickerColumn items={RIGHT_LANES[1].items} netHourly={effHourly} onPick={pick} direction={RIGHT_LANES[1].direction} className="hidden min-[1700px]:block" />
      </div>

      {/* Spacer so page content clears the fixed mobile carousel below */}
      <div className="h-32 xl:hidden" aria-hidden="true" />

      {/* Mobile/tablet: stickied horizontal carousel of priced things */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/80 backdrop-blur-md xl:hidden">
        <p className="px-4 pt-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          What your money is worth · tap to price it
        </p>
        <div className="px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
          <TickerRow items={ALL_ITEMS} netHourly={effHourly} onPick={pick} />
        </div>
      </div>
    </div>
  );
}
