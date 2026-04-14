export const moneyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0
});

export const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

export function formatMoney(value) {
  return moneyFormatter.format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return 'Sin fecha';
  return dateFormatter.format(new Date(value));
}

export function getTodayDateInputMax() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
