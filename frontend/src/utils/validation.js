import { AMENITIES } from './categories';
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

// ---------- Tipos de habitación y paquetes (admin; mismas reglas en el modal y en el servicio) ----------
export const ROOM_CATEGORIES = ['habitacion', 'suite', 'exclusiva', 'paquete'];
export const ROOM_LIMITS = {
  nameMin: 3, nameMax: 80, descMax: 500, tagMax: 30, capacityMax: 10, unitsMax: 50, nightsMax: 14, includeMax: 80,
};

// '' o null cuentan como "sin número" para no confundirlos con 0
const toNum = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));
export const isHttps = (value) => {
  try {
    return new URL(String(value).trim()).protocol === 'https:';
  } catch {
    return false;
  }
};

// Devuelve { campo: mensaje } solo con los campos inválidos. En paquetes `price` es el total de la estadía.
export function validateRoomType(data = {}) {
  const errors = {};
  const L = ROOM_LIMITS;
  const isPackage = data.category === 'paquete';
  const name = String(data.name ?? '').trim();
  const price = toNum(isPackage ? data.price : data.price_per_night);
  const oldPrice = toNum(data.old_price);
  const images = Array.isArray(data.images) ? data.images : [];
  const amenities = Array.isArray(data.amenities) ? data.amenities : [];

  if (name.length < L.nameMin || name.length > L.nameMax) errors.name = `El nombre debe tener entre ${L.nameMin} y ${L.nameMax} caracteres`;
  if (String(data.description ?? '').trim().length > L.descMax) errors.description = `Máximo ${L.descMax} caracteres`;
  if (!ROOM_CATEGORIES.includes(data.category)) errors.category = 'Elige una categoría válida';
  if (!Number.isInteger(price) || price <= 0) errors.price = 'El precio debe ser un entero mayor que 0';
  const hasOld = data.old_price !== '' && data.old_price !== null && data.old_price !== undefined;
  if (hasOld && (!Number.isInteger(oldPrice) || (Number.isInteger(price) && oldPrice <= price))) {
    errors.old_price = 'El precio anterior debe ser un entero mayor que el precio actual';
  }
  const capacity = toNum(data.capacity);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > L.capacityMax) errors.capacity = `Capacidad entre 1 y ${L.capacityMax} huéspedes`;
  const units = toNum(data.units);
  if (!Number.isInteger(units) || units < 1 || units > L.unitsMax) errors.units = `Entre 1 y ${L.unitsMax} habitaciones`;
  if (!(toNum(data.size_m2) > 0)) errors.size_m2 = 'El tamaño debe ser mayor que 0';
  if (!String(data.beds ?? '').trim()) errors.beds = 'Describe las camas (ej. 1 cama king)';
  if (amenities.some((a) => !(typeof a === 'string' && Object.hasOwn(AMENITIES, a)))) errors.amenities = 'Hay comodidades que no existen';
  if (images.length < 1) errors.images = 'Agrega al menos una imagen';
  else if (images.some((u) => !isHttps(u))) errors.images = 'Todas las imágenes deben ser enlaces que empiecen por https://';
  if (String(data.tag ?? '').trim().length > L.tagMax) errors.tag = `Máximo ${L.tagMax} caracteres`;

  if (isPackage) {
    const nights = toNum(data.nights);
    if (!Number.isInteger(nights) || nights < 1 || nights > L.nightsMax) errors.nights = `Entre 1 y ${L.nightsMax} noches`;
    const includes = Array.isArray(data.includes) ? data.includes.map((t) => String(t).trim()).filter(Boolean) : [];
    if (includes.length < 1) errors.includes = 'Agrega al menos un ítem incluido';
    else if (includes.some((t) => t.length > L.includeMax)) errors.includes = `Cada ítem admite máximo ${L.includeMax} caracteres`;
  }
  return errors;
}
