export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PESO = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

export function formatMoney(amount: string | number): string {
  return PESO.format(typeof amount === 'number' ? amount : Number(amount));
}

/** Formats a 'YYYY-MM-DD' string without timezone conversion. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  });
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** AR screens: MM/DD/YYYY without timezone shift (from YYYY-MM-DD). */
export function formatDateMdY(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`;
}

const PLAIN_AMOUNT = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Thousand separators for amount previews (not currency symbol). */
export function formatAmountPlain(amount: string | number): string {
  const n = typeof amount === 'number' ? amount : Number(String(amount).replace(/,/g, ''));
  if (!Number.isFinite(n)) return '';
  return PLAIN_AMOUNT.format(n);
}

/** Format a money input on blur; leaves the field unchanged when empty or invalid. */
export function formatAmountOnBlur(value: string): string {
  const preview = formatAmountPlain(value);
  return preview && value.trim() ? preview : value;
}
