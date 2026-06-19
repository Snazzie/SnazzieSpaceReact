import { useEffect, useRef } from 'react';
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

/** Horizontal priced-card carousel for the mobile sticky bar. Auto-advances
 *  slowly; the user can swipe to scroll faster with native momentum (velocity),
 *  which pauses the auto-scroll briefly. Three copies give a seamless wrap in
 *  both directions. */
export function TickerRow({
  items,
  netHourly,
  onPick,
}: {
  items: Item[];
  netHourly: number;
  onPick: (price: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const loop = [...items, ...items, ...items];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const AUTO_PX_PER_FRAME = 0.35; // gentle drift
    let raf = 0;
    let paused = false;
    let resumeTimer: ReturnType<typeof setTimeout> | undefined;

    // Keep scrollLeft inside the middle copy so wrapping is invisible.
    const wrap = () => {
      const unit = el.scrollWidth / 3;
      if (el.scrollLeft >= unit * 2) el.scrollLeft -= unit;
      else if (el.scrollLeft < unit) el.scrollLeft += unit;
    };

    const tick = () => {
      if (!paused) {
        el.scrollLeft += AUTO_PX_PER_FRAME;
        wrap();
      }
      raf = requestAnimationFrame(tick);
    };

    const pause = () => {
      paused = true;
      if (resumeTimer) clearTimeout(resumeTimer);
    };
    // Resume after the flick's momentum has settled.
    const resumeSoon = () => {
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        paused = false;
      }, 2500);
    };

    el.scrollLeft = el.scrollWidth / 3; // start in the middle copy
    raf = requestAnimationFrame(tick);
    el.addEventListener('pointerdown', pause);
    el.addEventListener('touchstart', pause, { passive: true });
    el.addEventListener('pointerup', resumeSoon);
    el.addEventListener('touchend', resumeSoon);
    el.addEventListener('scroll', wrap, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      if (resumeTimer) clearTimeout(resumeTimer);
      el.removeEventListener('pointerdown', pause);
      el.removeEventListener('touchstart', pause);
      el.removeEventListener('pointerup', resumeSoon);
      el.removeEventListener('touchend', resumeSoon);
      el.removeEventListener('scroll', wrap);
    };
  }, [items]);

  return (
    <div
      ref={ref}
      className="overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div className="flex w-max gap-2">
        {loop.map((item, i) => (
          <div key={`${item.name}-${i}`} className="w-40 shrink-0">
            <TickerCard item={item} netHourly={netHourly} onPick={onPick} />
          </div>
        ))}
      </div>
    </div>
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
