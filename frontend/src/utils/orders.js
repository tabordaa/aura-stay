// Estados del backend (models.OrderStatus) traducidos para el cliente
export const ORDER_STEPS = [
  { status: 'pendiente', label: 'Recibido',  desc: 'La tienda recibió tu pedido',        icon: '📝' },
  { status: 'preparado', label: 'Preparado', desc: 'Empacamos tus productos frescos',     icon: '🧺' },
  { status: 'asignado',  label: 'En camino', desc: 'Un domiciliario va hacia tu casa',    icon: '🛵' },
  { status: 'entregado', label: 'Entregado', desc: 'Tu pedido llegó. ¡Buen provecho!',    icon: '🏠' },
];

export const DELIVERY_MINUTES = 45;

export function stepIndex(status) {
  return Math.max(0, ORDER_STEPS.findIndex(s => s.status === status));
}

// Se reexportan desde utils/format para no cambiar los imports existentes
export { formatOrderId, formatPrice, parseServerDate } from './format';

// Estados finales que no siguen la línea de tiempo normal del pedido
export const CLOSED_STATUSES = {
  rechazado: { status: 'rechazado', label: 'Rechazado', desc: 'La tienda no pudo atender tu pedido', icon: '✖️' },
  cancelado: { status: 'cancelado', label: 'Cancelado', desc: 'Cancelaste este pedido', icon: '🚫' },
};

// Un pedido activo todavía puede cambiar de estado (se sigue consultando)
export function isActiveOrder(status) {
  return status !== 'entregado' && !CLOSED_STATUSES[status];
}

export function getStatusInfo(status) {
  return CLOSED_STATUSES[status] || ORDER_STEPS[stepIndex(status)];
}

export const PAYMENT_LABELS = {
  card: 'Tarjeta crédito / débito',
  cash: 'Efectivo al recibir',
};

// Versiones anteriores guardaban los recibos en el navegador (sin distinguir usuarios): se eliminan
export function clearLegacyOrderStorage() {
  try {
    localStorage.removeItem('aura_orders');
  } catch {
    // Sin acceso al almacenamiento: no hay nada que limpiar
  }
}
