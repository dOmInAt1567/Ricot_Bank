export function formatMoney(amount: number, currency = 'USD'): string {
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'RUB' ? '₽' : currency;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${symbol}${formatted}`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function maskCardNumber(num: string): string {
  if (num.length < 8) return num;
  return `${num.slice(0, 4)} ${'•'.repeat(4)} ${'•'.repeat(4)} ${num.slice(-4)}`;
}

export function maskAccountNumber(num: string): string {
  if (num.length <= 6) return num;
  return `${num.slice(0, 2)}${'•'.repeat(num.length - 6)}${num.slice(-4)}`;
}

export function validateUsername(username: string): string | null {
  if (!username) return 'Username is required';
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (username.length > 20) return 'Username must be at most 20 characters';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username must contain only English letters, numbers, and underscores';
  return null;
}
