// Validación de la estadía buscada (llegada, salida, huéspedes). Compartida por la barra,
// la página y el servicio de disponibilidad para que las reglas sean las mismas.
import { parseISODate, toISODate, todayISO } from './dates';
import { nights } from './pricing';

export const MAX_NIGHTS = 30;
export const MAX_GUESTS = 8;

const isValidISO = (str) => /^\d{4}-\d{2}-\d{2}$/.test(str) && toISODate(parseISODate(str)) === str;

// Lee ?in=&out=&guests= de la URL (siempre strings; vacío si no vienen)
export function readStay(params) {
  return {
    checkIn: params.get('in') ?? '',
    checkOut: params.get('out') ?? '',
    guests: params.get('guests') ?? '',
  };
}

// Devuelve { checkIn?, checkOut?, guests? } con mensajes; objeto vacío = válida.
// Las fechas son opcionales como par: ambas vacías significa "sin búsqueda".
export function validateStay({ checkIn = '', checkOut = '', guests = '' }, today = todayISO()) {
  const errors = {};
  if (checkIn || checkOut) {
    if (!checkIn) errors.checkIn = 'Elige la fecha de llegada';
    else if (!isValidISO(checkIn)) errors.checkIn = 'La fecha de llegada no es válida';
    else if (checkIn < today) errors.checkIn = 'La llegada no puede ser anterior a hoy';

    if (!checkOut) errors.checkOut = 'Elige la fecha de salida';
    else if (!isValidISO(checkOut)) errors.checkOut = 'La fecha de salida no es válida';
    else if (!errors.checkIn && checkOut <= checkIn) errors.checkOut = 'La salida debe ser posterior a la llegada';
    else if (!errors.checkIn && nights(checkIn, checkOut) > MAX_NIGHTS) {
      errors.checkOut = `Máximo ${MAX_NIGHTS} noches por reserva`;
    }
  }
  if (guests !== '' && guests != null) {
    const n = Number(guests);
    if (!Number.isInteger(n) || n < 1 || n > MAX_GUESTS) errors.guests = `Entre 1 y ${MAX_GUESTS} huéspedes`;
  }
  return errors;
}

// Estadía lista para consultar disponibilidad, o null si no hay fechas o son inválidas
export function activeStay(raw) {
  if (!raw.checkIn || !raw.checkOut) return null;
  if (Object.keys(validateStay(raw)).length > 0) return null;
  return { checkIn: raw.checkIn, checkOut: raw.checkOut, guests: Number(raw.guests) || 1 };
}
