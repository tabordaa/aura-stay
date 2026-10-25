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

export const MAX_CITY = 60;

// Reglas por campo compartidas (registro, perfil y titular): devuelven el mensaje o null
export function nameError(value) {
  return String(value ?? '').trim().length < 3 ? 'Escribe tu nombre completo (mínimo 3 letras)' : null;
}

export function documentError(value) {
  return /^[A-Za-z0-9]{5,15}$/.test(String(value ?? '').trim()) ? null : 'Entre 5 y 15 letras o números, sin espacios';
}

export function phoneError(value) {
  const phone = String(value ?? '').trim();
  const digits = phone.replace(/\D/g, '').length;
  return PHONE_RE.test(phone) && digits >= 7 && digits <= 15 ? null : 'Teléfono de 7 a 15 dígitos';
}

// Perfil: mismas reglas del titular, pero documento, teléfono y ciudad pueden quedar vacíos
// (las cuentas nuevas empiezan sin ellos). Solo se validan los campos presentes en `fields`.
export function validateProfile(fields = {}) {
  const errors = {};
  const filled = (v) => String(v ?? '').trim() !== '';
  if ('name' in fields && nameError(fields.name)) errors.name = nameError(fields.name);
  if ('document' in fields && filled(fields.document) && documentError(fields.document)) errors.document = documentError(fields.document);
  if ('phone' in fields && filled(fields.phone) && phoneError(fields.phone)) errors.phone = phoneError(fields.phone);
  if ('city' in fields && String(fields.city ?? '').trim().length > MAX_CITY) errors.city = `Máximo ${MAX_CITY} caracteres`;
  return errors;
}

// Devuelve { campo: mensaje } solo con los campos inválidos
export function validateHolder(holder = {}) {
  const errors = {};
  const email = String(holder.email ?? '').trim();
  const requests = String(holder.requests ?? '');
  if (nameError(holder.name)) errors.name = 'Escribe el nombre completo del titular';
  if (documentError(holder.document)) errors.document = documentError(holder.document);
  if (phoneError(holder.phone)) errors.phone = phoneError(holder.phone);
  if (!EMAIL_RE.test(email)) errors.email = 'Escribe un correo válido';
  if (requests.trim().length > MAX_REQUESTS) errors.requests = `Máximo ${MAX_REQUESTS} caracteres`;
  return errors;
}
