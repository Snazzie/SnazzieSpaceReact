// Shared GBP formatters for the Worth My Time UI.

export const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

export const gbp2 = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const gbpItem = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});
