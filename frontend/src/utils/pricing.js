// Única fuente de cálculo de precios, noches, impuestos y totales (COP, enteros).
import { parseISODate } from './dates';

export const TAX_RATE = 0.19; // IVA hotelero

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Noches entre dos fechas ISO (mínimo 1). Se redondea para absorber cambios de horario.
export function nights(checkIn, checkOut) {
  const diff = Math.round((parseISODate(checkOut) - parseISODate(checkIn)) / MS_PER_DAY);
  return Math.max(1, diff);
}

// Total de una línea de extra según su unidad de cobro (`per`).
export function extraLineTotal(extra, qty = 1, nightsCount = 1, guests = 1) {
  const units = { noche: nightsCount, persona_noche: nightsCount * guests, estadia: 1 }[extra.per] ?? 1;
  return Math.round(extra.price * units * qty);
}

// extras: [{ extra: {id, price, per, ...}, qty }]. Si la línea trae solo `extra_id`,
// quien llama debe resolver antes el objeto (el servicio lo hace con el catálogo de extras).
// Un paquete (category 'paquete') cobra su precio fijo y usa sus propias noches.
export function stayQuote({ roomType, checkIn, checkOut, guests = 1, extras = [] }) {
  const isPackage = roomType.category === 'paquete';
  const n = isPackage ? roomType.nights : nights(checkIn, checkOut);
  const subtotal = isPackage ? roomType.price : roomType.price_per_night * n;
  const extras_total = extras.reduce(
    (sum, line) => sum + extraLineTotal(line.extra, line.qty ?? 1, n, guests), 0);
  const taxes = Math.round((subtotal + extras_total) * TAX_RATE);
  return { nights: n, subtotal, extras_total, taxes, total: subtotal + extras_total + taxes };
}

// Suma varias cotizaciones (una por habitación) en el resumen de "Mi estadía".
export function combineQuotes(quotes) {
  return quotes.reduce(
    (sum, q) => ({
      nights: sum.nights + q.nights,
      subtotal: sum.subtotal + q.subtotal,
      extras_total: sum.extras_total + q.extras_total,
      taxes: sum.taxes + q.taxes,
      total: sum.total + q.total,
    }),
    { nights: 0, subtotal: 0, extras_total: 0, taxes: 0, total: 0 },
  );
}
