import type { Item } from '../data/items';
import { gbpItem } from '../lib/format';
import { hoursForPrice, formatWorkTime } from '../lib/tax';

/** One purchase card inside a ticker lane. Click to load its price. */
function TickerCard({
  item,
  netHourly,
  onPick,
}: {
  item: Item;
  netHourly: number;
  onPick: (price: number) => void;
}) {
  const cost = netHourly > 0 ? formatWorkTime(hoursForPrice(item.price, netHourly)) : '—';
  return (
    <button
      type="button"
      onClick={() => onPick(item.price)}
      className="block w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition-colors hover:border-white/25 hover:bg-white/[0.06]"
    >
      <div className="flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">
          {item.emoji}
        </span>
        <span className="truncate text-sm font-medium text-foreground">{item.name}</span>
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <span className="text-xs text-muted-foreground">{gbpItem.format(item.price)}</span>
        <span className="text-xs font-semibold tabular-nums text-emerald-400">{cost}</span>
      </div>
    </button>
  );
}

/** Auto-scrolling vertical marquee lane. Items duplicated for a seamless loop. */
export function TickerColumn({
  items,
  netHourly,
  onPick,
  direction,
  className = '',
}: {
  items: Item[];
  netHourly: number;
  onPick: (price: number) => void;
  direction: 'up' | 'down';
  className?: string;
}) {
  const loop = [...items, ...items];
  return (
    <div
      className={`relative h-full min-h-[28rem] w-48 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_8%,black_92%,transparent)] ${className}`}
    >
      {/* Absolutely positioned so the (tall) marquee never dictates row height —
          the calculator does, and the lane scrolls within whatever height it gets. */}
      <div
        className={`absolute inset-x-0 top-0 flex flex-col gap-3 ${
          direction === 'up' ? 'wmt-marquee-up' : 'wmt-marquee-down'
        }`}
      >
        {loop.map((item, i) => (
          <TickerCard key={`${item.name}-${i}`} item={item} netHourly={netHourly} onPick={onPick} />
        ))}
      </div>
    </div>
  );
}
