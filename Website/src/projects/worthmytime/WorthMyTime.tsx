import Calculator from './Calculator';
import CompareOffers from './CompareOffers';
import { useRoutedTab } from './lib/useRoutedTab';

export default function WorthMyTime() {
  const [tab] = useRoutedTab();
  return tab === 'worth' ? <Calculator /> : <CompareOffers />;
}
