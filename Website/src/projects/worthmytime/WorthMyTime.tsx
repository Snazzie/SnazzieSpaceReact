import Calculator from './Calculator';
import CompareOffers from './CompareOffers';
import { useRoutedTab } from './lib/useRoutedTab';

const HERO = {
  worth: {
    title: 'Is it worth your time?',
    body: "Money is just stored hours. Enter your take-home (net) pay — the number that actually lands in your bank — and we'll work out your real hourly rate, then tell you how many hours of work that shiny new thing actually costs.",
  },
  compare: {
    title: 'Which offer is actually better?',
    body: 'A bigger salary can be worth less per hour of your life. Enter each offer — pay, hours, and commute — and we’ll rank them by real take-home rate after tax, NI, and travel, so you compare what actually matters.',
  },
} as const;

export default function WorthMyTime() {
  const [tab] = useRoutedTab();
  const hero = HERO[tab];
  return (
    <>
      <section className="mx-auto max-w-3xl px-6 pb-10 text-center">
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          {hero.title}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-muted-foreground leading-relaxed">
          {hero.body}
        </p>
      </section>
      {tab === 'worth' ? <Calculator /> : <CompareOffers />}
    </>
  );
}
