import { Fragment, useEffect, useRef } from 'react';
import type { Item } from '../data/items';
import { gbpItem } from '../lib/format';
import { hoursForPrice, formatWorkTime } from '../lib/tax';

/** A Google ad styled as a ticker card. Rendered once per marquee half so the
 *  loop stays seamless; each <ins> pushes itself once. Same slot reused across
 *  copies is permitted by AdSense as long as each gets its own push(). The
 *  loader script lives in the page <head> (AdSenseLoader.astro). */
function AdCard() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    // Inject the <ins> client-side only. AdSense mutates the element (iframe,
    // status attr, px sizing) after render — if React owned it, that would be a
    // hydration mismatch. innerHTML keeps the ad DOM opaque to React. The guard
    // stops a double-insert under StrictMode's double-invoked effects.
    if (!el || el.childElementCount > 0) return;
    el.innerHTML =
      '<ins class="adsbygoogle" style="display:block;width:100%;height:100%" ' +
      'data-ad-client="ca-pub-8304271204200662" data-ad-slot="7653702261"></ins>';
    try {
      // adsbygoogle is injected by the loader script in <head>.
      ((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle ||= []).push({});
    } catch {
      /* loader not ready / blocked — leave the slot empty */
    }
  }, []);
  // Fixed-size wrapper so the slot matches a TickerCard footprint instead of the
  // responsive 'auto' format ballooning to fill the lane height.
  return (
    <div
      ref={ref}
      className="block h-[5.5rem] w-full overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]"
    />
  );
}

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
  withAd = false,
}: {
  items: Item[];
  netHourly: number;
  onPick: (price: number) => void;
  direction: 'up' | 'down';
  className?: string;
  withAd?: boolean;
}) {
  // One half of the seamless loop. The ad rides the marquee at the top of each
  // half so the wrap stays seamless (both halves are identical).
  const half = (copy: string) => (
    <Fragment key={copy}>
      {withAd && <AdCard />}
      {items.map((item, i) => (
        <TickerCard key={`${copy}-${item.name}-${i}`} item={item} netHourly={netHourly} onPick={onPick} />
      ))}
    </Fragment>
  );
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
        {half('a')}
        {half('b')}
      </div>
    </div>
  );
}
