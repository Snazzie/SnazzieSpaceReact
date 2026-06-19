import { evaluateOffer, type Period, type Mode, type OfferResult } from './lib/offer';
import { PERSONAL_ALLOWANCE, PA_TAPER_START } from './lib/tax';
import { gbp, gbp2 } from './lib/format';
import { MoneyField, Segmented, Stat } from './components/fields';
import { usePersistentState } from './lib/usePersistentState';

interface OfferState {
  name: string;
  mode: Mode;
  payStr: string;
  period: Period;
  hoursStr: string;
  commuteOn: boolean;
  commuteMinsStr: string;
  commuteCostStr: string;
  commuteDaysStr: string;
}

const PERIODS: { id: Period; label: string }[] = [
  { id: 'year', label: 'Year' },
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
];

function makeOffer(name: string, payStr: string, mode: Mode = 'gross'): OfferState {
  return {
    name,
    mode,
    payStr,
    period: 'year',
    hoursStr: '40',
    commuteOn: false,
    commuteMinsStr: '60',
    commuteCostStr: '5',
    commuteDaysStr: '5',
  };
}

function evaluate(o: OfferState): OfferResult {
  return evaluateOffer({
    mode: o.mode,
    pay: parseFloat(o.payStr) || 0,
    period: o.period,
    hours: parseFloat(o.hoursStr) || 0,
    commute: o.commuteOn
      ? {
          mins: parseFloat(o.commuteMinsStr) || 0,
          cost: parseFloat(o.commuteCostStr) || 0,
          days: parseFloat(o.commuteDaysStr) || 0,
        }
      : null,
  });
}

function OfferCard({
  offer,
  result,
  winner,
  winnerLabel,
  onChange,
  onRemove,
}: {
  offer: OfferState;
  result: OfferResult;
  winner: boolean;
  winnerLabel: string;
  onChange: (patch: Partial<OfferState>) => void;
  onRemove?: () => void;
}) {
  const ready = result.effHoursYear > 0 && parseFloat(offer.payStr) > 0;
  return (
    <div
      className={`space-y-4 rounded-2xl border p-5 sm:p-6 transition-colors ${
        winner ? 'border-emerald-400/40 bg-emerald-400/[0.04]' : 'border-white/10 bg-white/[0.02]'
      }`}
    >
      <div className="flex items-center gap-2">
        {/* Editable title — styled so it's obviously renameable */}
        <label className="group relative flex min-w-0 flex-1 items-center gap-1.5">
          <input
            value={offer.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Name this offer"
            aria-label="Offer name"
            className="min-w-0 flex-1 rounded-md border-b border-dashed border-white/20 bg-transparent px-1 py-0.5 text-lg font-semibold text-foreground outline-none transition-colors hover:border-white/40 focus:border-emerald-400/60"
          />
          <svg
            viewBox="0 0 24 24"
            className="size-3.5 shrink-0 fill-none stroke-current text-muted-foreground/50 transition-colors group-focus-within:text-emerald-400/70"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M12 20h9" strokeLinecap="round" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" strokeLinejoin="round" />
          </svg>
        </label>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Delete ${offer.name}`}
            title="Delete offer"
            className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-rose-500/15 hover:text-rose-400"
          >
            <svg viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="2" aria-hidden="true">
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 11v6M14 11v6" strokeLinecap="round" />
            </svg>
          </button>
        )}
        {winner && ready && (
          <span className="ml-auto shrink-0 rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
            {winnerLabel}
          </span>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Left: the form */}
        <div className="space-y-4">
      {/* Pay + mode + period */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {offer.mode === 'gross' ? 'Gross pay' : 'Take-home pay'}
          </span>
          <Segmented
            options={[
              { id: 'gross', label: 'Gross' },
              { id: 'net', label: 'Net' },
            ]}
            value={offer.mode}
            onChange={(mode) => onChange({ mode })}
          />
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors focus-within:border-white/30">
          <span className="text-muted-foreground select-none">£</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={offer.payStr}
            onChange={(e) => onChange({ payStr: e.target.value })}
            className="w-full bg-transparent text-lg font-semibold text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>
        <div className="mt-2">
          <Segmented
            options={PERIODS.map((p) => ({ id: p.id, label: `Per ${p.label.toLowerCase()}` }))}
            value={offer.period}
            onChange={(period) => onChange({ period })}
          />
        </div>
      </div>

      <MoneyField
        id={`hours-${offer.name}`}
        label="Hours / week"
        value={offer.hoursStr}
        onChange={(v) => onChange({ hoursStr: v })}
        suffix="hrs/wk"
        placeholder="40"
        hint="Include unpaid breaks — total hours committed to work"
      />

      {/* Commute */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm font-medium text-foreground">Commute</span>
          <input
            type="checkbox"
            checked={offer.commuteOn}
            onChange={(e) => onChange({ commuteOn: e.target.checked })}
            className="size-4 accent-emerald-400"
          />
        </label>
        {offer.commuteOn && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <MoneyField
              id={`cm-${offer.name}`}
              label="Trip"
              value={offer.commuteMinsStr}
              onChange={(v) => onChange({ commuteMinsStr: v })}
              suffix="min"
            />
            <MoneyField
              id={`cc-${offer.name}`}
              label="Cost"
              prefix="£"
              value={offer.commuteCostStr}
              onChange={(v) => onChange({ commuteCostStr: v })}
            />
            <MoneyField
              id={`cd-${offer.name}`}
              label="Days"
              value={offer.commuteDaysStr}
              onChange={(v) => onChange({ commuteDaysStr: v })}
              suffix="/wk"
            />
          </div>
        )}
      </div>
        </div>

        {/* Right: the breakdown */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 md:self-start">
        {offer.mode === 'gross' && (
          <>
            {result.grossAnnual > PA_TAPER_START && (
              <Stat
                label="Allowance lost"
                hint={`£1 per £2 over ${gbp.format(PA_TAPER_START)} taper`}
                value={ready ? `− ${gbp.format(PERSONAL_ALLOWANCE - result.personalAllowance)}` : '—'}
                tone="down"
              />
            )}
            <Stat label="Income tax" value={ready ? `− ${gbp.format(result.incomeTax)}` : '—'} tone="down" />
            <Stat
              label="National Insurance"
              value={ready ? `− ${gbp.format(result.nationalInsurance)}` : '—'}
              tone="down"
            />
          </>
        )}
        {offer.commuteOn && (
          <Stat
            label="Commute cost"
            hint={`${gbp.format(parseFloat(offer.commuteCostStr) || 0)}/day × ${
              parseFloat(offer.commuteDaysStr) || 0
            } days × 52 wks`}
            value={ready ? `− ${gbp.format(result.commuteCostYear)}` : '—'}
            tone="down"
          />
        )}
        <Stat label="Take-home / year" value={ready ? gbp.format(result.netAnnual) : '—'} />
        <Stat
          label="Effective hours / year"
          hint={
            offer.commuteOn
              ? `${Math.round(result.annualHours).toLocaleString('en-GB')} worked + ${Math.round(
                  result.commuteHoursYear,
                ).toLocaleString('en-GB')} commute`
              : `${Math.round(result.annualHours).toLocaleString('en-GB')} worked`
          }
          value={ready ? Math.round(result.effHoursYear).toLocaleString('en-GB') : '—'}
        />
        <div className="mt-3 flex items-baseline justify-between gap-3 rounded-lg bg-emerald-400/10 px-3 py-2.5">
          <span className="text-sm font-medium text-emerald-200">Real / hour</span>
          <span className="text-xl font-bold tabular-nums text-emerald-400">
            {ready ? gbp2.format(result.effHourly) : '—'}
          </span>
        </div>
      </div>
      </div>
    </div>
  );
}

export default function CompareOffers() {
  const [offers, setOffers] = usePersistentState<OfferState[]>('compare.offers', [
    makeOffer('Current job', '42000'),
    makeOffer('New offer', '48000'),
  ]);

  const update = (i: number, patch: Partial<OfferState>) =>
    setOffers((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));

  const addOffer = () =>
    setOffers((prev) => [...prev, makeOffer(`Offer ${prev.length + 1}`, '45000')]);

  const removeOffer = (i: number) => setOffers((prev) => prev.filter((_, idx) => idx !== i));

  // What "best" means: most take-home per hour of life, or biggest yearly total.
  const [priority, setPriority] = usePersistentState<'hour' | 'total'>('compare.priority', 'hour');

  const MAX_OFFERS = 6;
  const results = offers.map(evaluate);
  const metric = (i: number) => (priority === 'hour' ? results[i].effHourly : results[i].effNetYear);
  const isReady = (i: number) => parseFloat(offers[i].payStr) > 0 && results[i].effHoursYear > 0;

  // Rank every filled-in offer by the chosen priority metric.
  const readyIdx = offers.map((_, i) => i).filter(isReady);
  const ranked = [...readyIdx].sort((x, y) => metric(y) - metric(x));
  const bestIdx = ranked.length >= 2 ? ranked[0] : -1;
  const runnerUp = ranked.length >= 2 ? ranked[1] : -1;

  const hourlyGap = bestIdx >= 0 ? results[bestIdx].effHourly - results[runnerUp].effHourly : 0;
  const netGap = bestIdx >= 0 ? results[bestIdx].effNetYear - results[runnerUp].effNetYear : 0;
  const hoursGap = bestIdx >= 0 ? results[bestIdx].effHoursYear - results[runnerUp].effHoursYear : 0;
  const primaryGap = bestIdx >= 0 ? metric(bestIdx) - metric(runnerUp) : 0;
  const tie = bestIdx >= 0 && Math.abs(primaryGap) < (priority === 'hour' ? 0.005 : 1);
  const winnerName = bestIdx >= 0 ? offers[bestIdx].name : '';
  const runnerName = runnerUp >= 0 ? offers[runnerUp].name || 'the runner-up' : '';
  const bestHourly = bestIdx >= 0 ? results[bestIdx].effHourly : 0;
  const bestNet = bestIdx >= 0 ? results[bestIdx].effNetYear : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Verdict — sticky so it stays in view while scrolling offers */}
      <div className="sticky top-4 z-20 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-black/40 p-6 text-center backdrop-blur-md">
        <div className="mb-4 flex items-center justify-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground/70">Prioritise</span>
          <Segmented
            options={[
              { id: 'hour', label: 'Time' },
              { id: 'total', label: 'Net pay' },
            ]}
            value={priority}
            onChange={setPriority}
          />
        </div>
        {ranked.length < 2 ? (
          <p className="text-muted-foreground">Fill in at least two offers to compare.</p>
        ) : tie ? (
          <p className="text-lg font-semibold text-foreground">
            Line-ball — the top two are worth the same {priority === 'hour' ? 'per hour' : 'per year'}.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Best for {priority === 'hour' ? 'your time' : 'total take-home'}
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-emerald-400">{winnerName}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {priority === 'hour'
                ? `${gbp2.format(bestHourly)} / hour effective`
                : `${gbp.format(bestNet)} / year take-home`}{' '}
              · vs <span className="text-foreground">{runnerName}</span>
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {/* Primary badge = the metric being prioritised */}
              {priority === 'hour' ? (
                <span className="inline-flex items-baseline gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-sm font-semibold text-emerald-300">
                  +{gbp2.format(hourlyGap)} <span className="font-medium text-emerald-300/60">/ hour</span>
                </span>
              ) : (
                <span className="inline-flex items-baseline gap-1.5 rounded-full bg-emerald-400/20 px-3 py-1 text-sm font-semibold text-emerald-300">
                  +{gbp.format(netGap)} <span className="font-medium text-emerald-300/60">/ year</span>
                </span>
              )}
              {/* Secondary badge = the other metric, amber when it's a trade-off */}
              {priority === 'hour'
                ? Math.abs(netGap) >= 1 && (
                    <span
                      className={`inline-flex items-baseline gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                        netGap >= 0 ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300'
                      }`}
                    >
                      {netGap >= 0 ? `+${gbp.format(netGap)}` : `− ${gbp.format(-netGap)}`}
                      <span className={netGap >= 0 ? 'text-emerald-300/60' : 'text-amber-300/60'}>
                        / year {netGap >= 0 ? 'overall' : 'overall (fewer hours)'}
                      </span>
                    </span>
                  )
                : Math.abs(hourlyGap) >= 0.005 && (
                    <span
                      className={`inline-flex items-baseline gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                        hourlyGap >= 0 ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300'
                      }`}
                    >
                      {hourlyGap >= 0 ? `+${gbp2.format(hourlyGap)}` : `− ${gbp2.format(-hourlyGap)}`}
                      <span className={hourlyGap >= 0 ? 'text-emerald-300/60' : 'text-amber-300/60'}>
                        / hour {hourlyGap >= 0 ? 'effective' : 'effective (longer hours)'}
                      </span>
                    </span>
                  )}
              {/* Hours of life: fewer than the runner-up is the win */}
              {Math.abs(hoursGap) >= 1 && (
                <span
                  className={`inline-flex items-baseline gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                    hoursGap <= 0 ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-300'
                  }`}
                >
                  {hoursGap <= 0
                    ? `− ${Math.round(-hoursGap).toLocaleString('en-GB')}`
                    : `+ ${Math.round(hoursGap).toLocaleString('en-GB')}`}
                  <span className={hoursGap <= 0 ? 'text-emerald-300/60' : 'text-amber-300/60'}>
                    hrs / year {hoursGap <= 0 ? '(less time)' : '(more time)'}
                  </span>
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Offer cards — stacked, each form-left / breakdown-right */}
      <div className="space-y-4">
        {offers.map((offer, i) => (
          <OfferCard
            key={i}
            offer={offer}
            result={results[i]}
            winner={i === bestIdx && !tie}
            winnerLabel={priority === 'hour' ? 'Best per hour' : 'Best total'}
            onChange={(patch) => update(i, patch)}
            onRemove={offers.length > 2 ? () => removeOffer(i) : undefined}
          />
        ))}
      </div>

      {offers.length < MAX_OFFERS && (
        <button
          type="button"
          onClick={addOffer}
          className="w-full rounded-2xl border border-dashed border-white/15 py-4 text-sm font-medium text-muted-foreground transition-colors hover:border-white/30 hover:text-foreground"
        >
          + Add another offer
        </button>
      )}

      <p className="text-center text-xs text-muted-foreground/70">
        Compares the real hourly rate — take-home after tax, NI &amp; commute, divided by all the hours
        the job actually costs you. A bigger salary can still lose.
      </p>
    </div>
  );
}
