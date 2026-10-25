// Formatos compartidos por todas las pantallas

export function formatPrice(n) {
  return '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');
}

export function formatOrderId(id) {
  return '#' + String(id).padStart(5, '0');
}

// Las fechas antiguas del backend llegaban en UTC sin zona horaria; las nuevas ya traen la zona
export function parseServerDate(value) {
  return new Date(/(Z|[+-]\d\d:\d\d)$/.test(value) ? value : value + 'Z');
}

// Iniciales para los avatares ("Ana María Pérez" → "AM")
export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map(p => p[0]).join('') || '?').toUpperCase();
}
