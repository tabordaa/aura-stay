// Fechas de estadía como 'YYYY-MM-DD'. Se trabaja siempre en hora local del navegador
// y con mediodía como hora de referencia para evitar saltos por zona horaria u horario de verano.

const pad = (n) => String(n).padStart(2, '0');

export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseISODate(str) {
  const [y, m, d] = String(str).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12);
}

export function todayISO() {
  return toISODate(new Date());
}

export function addDays(iso, n) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

// "vie 14 nov"
export function formatStayDate(iso) {
  return parseISODate(iso)
    .toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(/[.,]/g, '');
}

// "14 de noviembre de 2026"
export function formatLongDate(iso) {
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

// "vie 14 nov → lun 17 nov"
export function formatStayRange(checkIn, checkOut) {
  return `${formatStayDate(checkIn)} → ${formatStayDate(checkOut)}`;
}

// "10 nov" (sin día de la semana; para mensajes en frase)
export function formatShortDate(iso) {
  return parseISODate(iso)
    .toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
    .replace(/[.,]/g, '');
}

// "octubre de 2026" a partir de un ISO con hora (created_at)
export function formatMonthYear(iso) {
  return new Date(iso).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
}

// "sábado, 25 de octubre" para la barra superior del panel
export function formatLongToday(date = new Date()) {
  return date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
}
