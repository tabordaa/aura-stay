// Reglas del titular compartidas entre el modal de reserva y el servicio (mismo criterio en ambos lados)
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_REQUESTS = 300;
const PHONE_RE = /^\+?[\d\s]+$/;

// Solo dígitos y espacios; el '+' se admite únicamente al inicio
export function normalizePhone(value) {
  const text = String(value ?? '');
  const plus = text.trimStart().startsWith('+') ? '+' : '';
  return (plus + text.replace(/[^\d\s]/g, '')).slice(0, 20);
}

// Devuelve { campo: mensaje } solo con los campos inválidos
export function validateHolder(holder = {}) {
  const errors = {};
  const name = String(holder.name ?? '').trim();
  const document = String(holder.document ?? '').trim();
  const phone = String(holder.phone ?? '').trim();
  const email = String(holder.email ?? '').trim();
  const requests = String(holder.requests ?? '');
  const phoneDigits = phone.replace(/\D/g, '').length;
  if (name.length < 3) errors.name = 'Escribe el nombre completo del titular';
  if (!/^[A-Za-z0-9]{5,15}$/.test(document)) errors.document = 'Entre 5 y 15 letras o números, sin espacios';
  if (!PHONE_RE.test(phone) || phoneDigits < 7 || phoneDigits > 15) errors.phone = 'Teléfono de 7 a 15 dígitos';
  if (!EMAIL_RE.test(email)) errors.email = 'Escribe un correo válido';
  if (requests.trim().length > MAX_REQUESTS) errors.requests = `Máximo ${MAX_REQUESTS} caracteres`;
  return errors;
}
