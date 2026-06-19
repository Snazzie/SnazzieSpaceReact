import { useEffect, useState } from 'react';
import Calculator from './Calculator';
import CompareOffers from './CompareOffers';

type Tab = 'worth' | 'compare';

const TABS: { id: Tab; label: string }[] = [
  { id: 'worth', label: 'Worth my time' },
  { id: 'compare', label: 'Compare job offers' },
];

const isTab = (v: string | null): v is Tab => v === 'worth' || v === 'compare';

/** Tab backed by the `?tab=` query param, so views are deep-linkable and the
 *  browser back/forward buttons switch between them. */
function useRoutedTab(): [Tab, (t: Tab) => void] {
  const read = (): Tab => {
    const t = new URLSearchParams(window.location.search).get('tab');
    return isTab(t) ? t : 'worth';
  };

  // Start at the SSR default, then adopt the URL on mount so server and first
  // client render agree (no hydration mismatch).
  const [tab, setTab] = useState<Tab>('worth');

  useEffect(() => {
    setTab(read());
    const onPop = () => setTab(read());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (t: Tab) => {
    setTab(t);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', t);
    window.history.pushState({}, '', url);
  };

  return [tab, navigate];
}

export default function WorthMyTime() {
  const [tab, setTab] = useRoutedTab();

  return (
    <div className="space-y-8">
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-white/15 text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'worth' ? <Calculator /> : <CompareOffers />}
    </div>
  );
}
