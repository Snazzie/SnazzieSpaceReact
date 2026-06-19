import { useEffect, useState } from 'react';

export type Tab = 'worth' | 'compare';

export const TABS: { id: Tab; label: string; short: string }[] = [
  { id: 'worth', label: 'Worth my time', short: 'Worth it?' },
  { id: 'compare', label: 'Compare job offers', short: 'Compare offers' },
];

const isTab = (v: string | null): v is Tab => v === 'worth' || v === 'compare';

const TAB_EVENT = 'wmt:tabchange';

/** Tab state backed by the `?tab=` query param so views are deep-linkable and
 *  back/forward work. A custom event keeps multiple islands (e.g. the nav
 *  selector and the page body) in sync without a reload, since pushState alone
 *  doesn't fire popstate. */
export function useRoutedTab(): [Tab, (t: Tab) => void] {
  const read = (): Tab => {
    const t = new URLSearchParams(window.location.search).get('tab');
    return isTab(t) ? t : 'worth';
  };

  // Start at the SSR default, adopt the URL on mount (no hydration mismatch).
  const [tab, setTab] = useState<Tab>('worth');

  useEffect(() => {
    setTab(read());
    const sync = () => setTab(read());
    window.addEventListener('popstate', sync);
    window.addEventListener(TAB_EVENT, sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener(TAB_EVENT, sync);
    };
  }, []);

  const navigate = (t: Tab) => {
    setTab(t);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', t);
    window.history.pushState({}, '', url);
    window.dispatchEvent(new Event(TAB_EVENT));
  };

  return [tab, navigate];
}
