import { useRoutedTab, TABS } from './lib/useRoutedTab';

/** Tab selector, rendered in the nav bar. Syncs with the page body via the
 *  shared routed-tab hook. */
export default function WorthMyTimeTabs() {
  const [tab, setTab] = useRoutedTab();
  return (
    <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-0.5">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTab(t.id)}
          aria-pressed={tab === t.id}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            tab === t.id ? 'bg-white/15 text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span className="sm:hidden">{t.short}</span>
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
