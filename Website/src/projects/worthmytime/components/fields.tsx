// Small reusable input primitives for the calculator.

/** Controlled numeric field that stores its raw string so the input stays editable. */
export function MoneyField({
  id,
  label,
  prefix,
  suffix,
  value,
  onChange,
  placeholder,
  hint,
}: {
  id: string;
  label: string;
  prefix?: string;
  suffix?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors focus-within:border-white/30">
        {prefix && <span className="text-muted-foreground select-none">{prefix}</span>}
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min="0"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-lg font-semibold text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {suffix && <span className="text-sm text-muted-foreground select-none">{suffix}</span>}
      </div>
      {hint && <span className="mt-1.5 block text-xs text-muted-foreground/60">{hint}</span>}
    </label>
  );
}

/** Generic pill segmented control. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === o.id ? 'bg-white/15 text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** One labelled value row in the breakdown panel, with an optional derivation hint. */
export function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: 'down';
  hint?: string;
}) {
  const color = tone === 'down' ? 'text-rose-400' : 'text-foreground';
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-white/5 py-2 last:border-0">
      <span className="text-sm text-muted-foreground">
        {label}
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground/60">{hint}</span>}
      </span>
      <span className={`font-semibold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

/** Compact stacked stat for the per-period pay grid (label on top, value below). */
export function PeriodCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-center">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground/70">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground/50">{sub}</div>}
    </div>
  );
}
