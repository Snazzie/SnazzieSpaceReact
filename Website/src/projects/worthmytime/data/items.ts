// Common purchases shown in the side ticker lanes. Clicking one loads its price
// into the calculator. Grouped into themed lanes, cheap → dear.

export interface Item {
  emoji: string;
  name: string;
  price: number;
}

export interface Lane {
  id: string;
  items: Item[];
  direction: 'up' | 'down';
}

const EVERYDAY: Item[] = [
  { emoji: '🥪', name: 'Meal deal', price: 3.95 },
  { emoji: '☕', name: 'Flat white', price: 3.4 },
  { emoji: '🍺', name: 'Pint', price: 5.5 },
  { emoji: '🚌', name: 'Bus fare', price: 2.5 },
  { emoji: '🍫', name: 'Chocolate bar', price: 1 },
  { emoji: '🍔', name: 'McDonald’s', price: 5.99 },
  { emoji: '🎟️', name: 'Lottery ticket', price: 2 },
  { emoji: '🎧', name: 'Spotify / month', price: 11.99 },
  { emoji: '📺', name: 'Netflix / month', price: 10.99 },
];

const TREATS: Item[] = [
  { emoji: '🎬', name: 'Cinema ticket', price: 12 },
  { emoji: '🍕', name: 'Takeaway for two', price: 28 },
  { emoji: '💈', name: 'Haircut', price: 25 },
  { emoji: '👖', name: 'Jeans', price: 70 },
  { emoji: '🏋️', name: 'Gym / month', price: 40 },
  { emoji: '⛽', name: 'Tank of fuel', price: 75 },
  { emoji: '🎸', name: 'Concert ticket', price: 65 },
  { emoji: '🎮', name: 'New video game', price: 59.99 },
  { emoji: '👟', name: 'Trainers', price: 110 },
];

const TECH: Item[] = [
  { emoji: '🎧', name: 'AirPods Pro', price: 229 },
  { emoji: '⌚', name: 'Apple Watch', price: 399 },
  { emoji: '🎮', name: 'PS5', price: 479 },
  { emoji: '📱', name: 'iPhone 16', price: 799 },
  { emoji: '📲', name: 'iPad', price: 599 },
  { emoji: '📺', name: '4K TV', price: 650 },
  { emoji: '💻', name: 'MacBook Air', price: 1099 },
  { emoji: '🖥️', name: 'Gaming PC', price: 1500 },
  { emoji: '🚲', name: 'E-bike', price: 1200 },
];

const BIG_LIFE: Item[] = [
  { emoji: '🛋️', name: 'New sofa', price: 900 },
  { emoji: '🛫', name: 'Weekend in Rome', price: 450 },
  { emoji: '🎪', name: 'Festival ticket', price: 280 },
  { emoji: '🏝️', name: 'Two-week holiday', price: 2500 },
  { emoji: '💍', name: 'Engagement ring', price: 3000 },
  { emoji: '🚗', name: 'Used car', price: 7000 },
  { emoji: '⌚', name: 'Rolex', price: 8000 },
  { emoji: '💒', name: 'Wedding', price: 20000 },
  { emoji: '🏠', name: 'House deposit', price: 30000 },
];

// Two lanes per side. The first lane on each side shows from xl up; the second
// from 2xl up (see WorthMyTime layout).
export const LEFT_LANES: Lane[] = [
  { id: 'everyday', items: EVERYDAY, direction: 'up' },
  { id: 'treats', items: TREATS, direction: 'down' },
];
export const RIGHT_LANES: Lane[] = [
  { id: 'tech', items: TECH, direction: 'up' },
  { id: 'big-life', items: BIG_LIFE, direction: 'down' },
];

// Flat list for the mobile/tablet chip row.
export const ALL_ITEMS: Item[] = [...EVERYDAY, ...TREATS, ...TECH, ...BIG_LIFE];
