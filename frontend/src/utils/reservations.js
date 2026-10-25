// Reglas y etiquetas de las reservas del huésped (compartidas por servicio y pantallas)
import { parseISODate, todayISO } from './dates';

export const CANCEL_WINDOW_HOURS = 48;
const CHECK_IN_HOUR = 15;
export const CANCELLABLE = ['pendiente', 'confirmada'];

// Momento de la llegada: las 15:00 hora local del día de check-in
export function checkInMoment(checkIn) {
  const d = parseISODate(checkIn);
  d.setHours(CHECK_IN_HOUR, 0, 0, 0);
  return d;
}

// Única fuente de la regla de cancelación: estado válido y más de 48 h para la llegada
export function canCancel(reservation, now = new Date()) {
  if (!reservation || !CANCELLABLE.includes(reservation.status)) return false;
  return checkInMoment(reservation.check_in).getTime() - now.getTime() > CANCEL_WINDOW_HOURS * 3600000;
}

export const CANCEL_TOO_LATE_MESSAGE = 'Ya no puedes cancelar: faltan menos de 48 horas para tu llegada.';

// tone corresponde a las clases .status-* del sistema de diseño
export const STATUS_META = {
  pendiente:  { label: 'Pendiente',  tone: 'pending',  icon: '📝' },
  confirmada: { label: 'Confirmada', tone: 'progress', icon: '✅' },
  en_curso:   { label: 'En curso',   tone: 'progress', icon: '🛎️' },
  finalizada: { label: 'Finalizada', tone: 'done',     icon: '🏁' },
  cancelada:  { label: 'Cancelada',  tone: 'rejected', icon: '🚫' },
  rechazada:  { label: 'Rechazada',  tone: 'rejected', icon: '✖️' },
};

export const statusMeta = (status) => STATUS_META[status] ?? { label: status, tone: 'progress', icon: '📝' };

// Línea de tiempo del flujo normal; `status` indica hasta dónde llegó la reserva
export const TIMELINE = [
  { status: 'pendiente',  label: 'Solicitud',  desc: 'El hotel recibió tu reserva',  icon: '📝' },
  { status: 'confirmada', label: 'Confirmada', desc: 'Tu habitación está asegurada', icon: '✅' },
  { status: 'en_curso',   label: 'Check-in',   desc: 'Ya estás hospedado',           icon: '🛎️' },
  { status: 'finalizada', label: 'Check-out',  desc: 'Gracias por hospedarte',       icon: '🏁' },
];

export const timelineIndex = (status) => Math.max(0, TIMELINE.findIndex((s) => s.status === status));

export const TABS = [
  { id: 'proximas',   label: 'Próximas',   statuses: ['pendiente', 'confirmada', 'en_curso'], order: 'asc' },
  { id: 'pasadas',    label: 'Pasadas',    statuses: ['finalizada'], order: 'desc' },
  { id: 'canceladas', label: 'Canceladas', statuses: ['cancelada', 'rechazada'], order: 'desc' },
];

export function filterByTab(list, tabId) {
  const tab = TABS.find((t) => t.id === tabId) ?? TABS[0];
  const sign = tab.order === 'asc' ? 1 : -1;
  return list
    .filter((r) => tab.statuses.includes(r.status))
    .sort((a, b) => sign * a.check_in.localeCompare(b.check_in));
}

// Reserva a destacar: en curso primero; si no, la pendiente/confirmada con llegada más próxima
export function pickNextStay(list) {
  const active = list.filter((r) => r.status === 'en_curso');
  if (active.length) return active.sort((a, b) => a.check_in.localeCompare(b.check_in))[0];
  return list
    // Una reserva cuya salida ya pasó no es una "próxima estadía"
    .filter((r) => (r.status === 'pendiente' || r.status === 'confirmada') && r.check_out > todayISO())
    .sort((a, b) => a.check_in.localeCompare(b.check_in))[0] ?? null;
}

export const PAYMENT_LABELS = {
  card: 'Tarjeta crédito / débito',
  hotel: 'Pagar en el hotel',
};
