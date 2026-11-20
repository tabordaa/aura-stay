import { useEffect, useMemo, useState } from 'react';
import { roomsService } from '../services/rooms.service';
import { addDays, formatStayDate, parseISODate, toISODate, todayISO } from '../utils/dates';
import { nights } from '../utils/pricing';
import { MAX_NIGHTS } from '../utils/stay';
import { IconChevronLeft, IconChevronRight } from './Icons';
import styles from './AvailabilityCalendar.module.css';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MAX_MONTHS_AHEAD = 3;
// Se consultan 60 días por mes visible para poder validar rangos que cruzan de un mes a otro
const FETCH_DAYS = 60;

function toMonthObj(iso) {
  const d = parseISODate(iso);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function monthDiff(a, b) {
  return (b.year - a.year) * 12 + (b.month - a.month);
}

function shiftMonth({ year, month }, delta) {
  const d = new Date(year, month + delta, 1, 12);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function toMonthISO({ year, month }) {
  return toISODate(new Date(year, month, 1, 12));
}

// "noviembre 2026" en hora local para evitar desfases de zona horaria
function formatCalendarHeading(monthObj) {
  return parseISODate(toMonthISO(monthObj))
    .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
    .replace(/\s+de\s+/i, ' ');
}

export default function AvailabilityCalendar({
  roomTypeId,
  guests = 1,
  isPackage = false,
  packageNights = 1,
  selectedCheckIn = null,
  selectedCheckOut = null,
  onSelectDates,
}) {
  const [today] = useState(() => todayISO());
  const minMonth = useMemo(() => toMonthObj(today), [today]);

  // Si ya hay estadía elegida, abre en el mes de la llegada dentro del rango permitido
  const [viewMonth, setViewMonth] = useState(() => {
    const base = toMonthObj(today);
    if (!selectedCheckIn) return base;
    const target = toMonthObj(selectedCheckIn);
    const diff = monthDiff(base, target);
    if (diff < 0) return base;
    if (diff > MAX_MONTHS_AHEAD) return shiftMonth(base, MAX_MONTHS_AHEAD);
    return target;
  });

  const [draftStart, setDraftStart] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  const cacheKey = `${roomTypeId}|${guests}`;
  const monthStartISO = toMonthISO(viewMonth);
  const fetchFrom = monthStartISO < today ? today : monthStartISO;
  const requestKey = `${cacheKey}|${fetchFrom}|${retryKey}`;

  // Se acumulan los días cargados por habitación y huéspedes para validar rangos entre meses
  const [calendarState, setCalendarState] = useState({
    cacheKey: '',
    loadedKey: '',
    errorKey: '',
    map: {},
  });

  useEffect(() => {
    let active = true;
    roomsService.calendar(roomTypeId, { from: fetchFrom, days: FETCH_DAYS, guests })
      .then((entries) => {
        if (!active) return;
        setCalendarState((prev) => {
          const base = prev.cacheKey === cacheKey ? prev.map : {};
          const next = { ...base };
          for (const entry of entries) next[entry.date] = entry;
          return { cacheKey, loadedKey: requestKey, errorKey: '', map: next };
        });
      })
      .catch(() => {
        if (!active) return;
        setCalendarState((prev) => ({
          cacheKey: prev.cacheKey === cacheKey ? prev.cacheKey : cacheKey,
          loadedKey: prev.loadedKey,
          errorKey: requestKey,
          map: prev.cacheKey === cacheKey ? prev.map : {},
        }));
      });
    return () => { active = false; };
  }, [roomTypeId, fetchFrom, guests, cacheKey, requestKey]);

  const dayMap = calendarState.cacheKey === cacheKey ? calendarState.map : {};
  const loading = calendarState.loadedKey !== requestKey && calendarState.errorKey !== requestKey;
  const hasError = calendarState.errorKey === requestKey;

  const offset = monthDiff(minMonth, viewMonth);
  const canPrev = offset > 0;
  const canNext = offset < MAX_MONTHS_AHEAD;
  const monthLabel = formatCalendarHeading(viewMonth);

  const { leadingEmpty, monthDays } = useMemo(() => {
    const first = new Date(viewMonth.year, viewMonth.month, 1, 12);
    const total = new Date(viewMonth.year, viewMonth.month + 1, 0, 12).getDate();
    // Semana iniciando en lunes: lunes=0 ... domingo=6
    const empty = (first.getDay() + 6) % 7;
    const days = Array.from({ length: total }, (_, idx) => {
      const dayNumber = idx + 1;
      const iso = toISODate(new Date(viewMonth.year, viewMonth.month, dayNumber, 12));
      return { dayNumber, iso };
    });
    return { leadingEmpty: empty, monthDays: days };
  }, [viewMonth]);

  const rangeStart = draftStart ?? selectedCheckIn;
  const rangeEnd = draftStart ? null : selectedCheckOut;

  const handleDayClick = (date) => {
    const info = dayMap[date];
    if (!info || !info.available || date < today) return;

    // En paquetes basta elegir la llegada; la salida se calcula con las noches del paquete
    if (isPackage) {
      setDraftStart(null);
      setFeedback('');
      onSelectDates?.({ checkIn: date, checkOut: addDays(date, packageNights) });
      return;
    }

    if (!draftStart || date < draftStart) {
      setDraftStart(date);
      setFeedback('');
      return;
    }

    if (date === draftStart) {
      setFeedback('Elige una fecha posterior para la salida');
      return;
    }

    if (nights(draftStart, date) > MAX_NIGHTS) {
      setFeedback(`Máximo ${MAX_NIGHTS} noches por reserva`);
      return;
    }

    // Verifica que todas las noches intermedias [draftStart, date) tengan cupo
    for (let cursor = draftStart; cursor < date; cursor = addDays(cursor, 1)) {
      if (!dayMap[cursor]?.available) {
        setFeedback('Hay noches sin disponibilidad en ese rango');
        return;
      }
    }

    setDraftStart(null);
    setFeedback('');
    onSelectDates?.({ checkIn: draftStart, checkOut: date });
  };

  return (
    <div className={styles.calendar} role="group" aria-label={`Calendario de disponibilidad, ${monthLabel}`}>
      <div className={styles.nav}>
        <button
          type="button"
          className={styles['nav-btn']}
          onClick={() => setViewMonth((m) => shiftMonth(m, -1))}
          disabled={!canPrev}
          aria-label="Mes anterior"
        >
          <IconChevronLeft size={16} />
        </button>

        <div className={styles['month-wrap']}>
          <span className={styles.month} aria-live="polite">{monthLabel}</span>
          {loading && (
            <span className={styles.loading} role="status">
              <span className={styles.spinner} aria-hidden="true" />
              Cargando…
            </span>
          )}
        </div>

        <button
          type="button"
          className={styles['nav-btn']}
          onClick={() => setViewMonth((m) => shiftMonth(m, 1))}
          disabled={!canNext}
          aria-label="Mes siguiente"
        >
          <IconChevronRight size={16} />
        </button>
      </div>

      {hasError && (
        <div className={styles.error} role="alert">
          <span>No pudimos cargar la disponibilidad.</span>
          <button
            type="button"
            className={styles['retry-btn']}
            onClick={() => setRetryKey((k) => k + 1)}
          >
            Reintentar
          </button>
        </div>
      )}

      <div className={styles.weekdays} aria-hidden="true">
        {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
      </div>

      <div className={styles.grid}>
        {Array.from({ length: leadingEmpty }, (_, idx) => (
          <span key={`empty-${idx}`} className={styles.empty} aria-hidden="true" />
        ))}

        {monthDays.map(({ dayNumber, iso }) => {
          const isPast = iso < today;
          const isToday = iso === today;
          const info = dayMap[iso];
          const unavailable = Boolean(!isPast && info && !info.available);
          const lowStock = Boolean(!isPast && info?.available && info.remaining === 1);
          const disabled = isPast || !info || unavailable;

          const isStart = Boolean(rangeStart && iso === rangeStart);
          const isEnd = Boolean(rangeEnd && iso === rangeEnd);
          const isInRange = Boolean(rangeStart && rangeEnd && iso > rangeStart && iso < rangeEnd);
          const isSelected = isStart || isEnd || isInRange;

          const statusText = isPast
            ? 'fecha pasada'
            : !info
              ? 'cargando disponibilidad'
              : !info.available
                ? 'sin disponibilidad'
                : info.remaining === 1
                  ? 'disponible, queda 1 unidad'
                  : 'disponible';
          const selectionText = isStart ? ', llegada' : isEnd ? ', salida' : isInRange ? ', seleccionado' : '';
          const ariaLabel = `${formatStayDate(iso)}, ${statusText}${selectionText}`;

          const classNames = [
            styles.day,
            isPast ? styles['day-past'] : '',
            unavailable ? styles['day-unavailable'] : '',
            isToday ? styles['day-today'] : '',
            isStart ? styles['day-start'] : '',
            isStart && rangeEnd ? styles['day-has-end'] : '',
            isEnd ? styles['day-end'] : '',
            isInRange ? styles['day-in-range'] : '',
          ].filter(Boolean).join(' ');

          return (
            <button
              key={iso}
              type="button"
              className={classNames}
              disabled={disabled}
              aria-label={ariaLabel}
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              onClick={() => handleDayClick(iso)}
            >
              <span>{dayNumber}</span>
              {lowStock && <span className={styles['low-dot']} aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {feedback ? (
        <p className={styles.feedback} role="alert">{feedback}</p>
      ) : draftStart ? (
        <p className={styles.hint} role="status">
          Llegada: {formatStayDate(draftStart)}. Ahora elige la salida.
        </p>
      ) : isPackage ? (
        <p className={styles.hint}>
          Elige la llegada para tu paquete de {packageNights} noches.
        </p>
      ) : !selectedCheckIn ? (
        <p className={styles.hint}>
          Toca una fecha de llegada y otra de salida.
        </p>
      ) : null}

      <div className={styles.legend} aria-label="Leyenda de disponibilidad">
        <span className={styles['legend-item']}>
          <span className={[styles.swatch, styles['swatch-available']].join(' ')} aria-hidden="true" />
          Disponible
        </span>
        <span className={styles['legend-item']}>
          <span className={[styles.swatch, styles['swatch-low']].join(' ')} aria-hidden="true" />
          Quedan pocas
        </span>
        <span className={styles['legend-item']}>
          <span className={[styles.swatch, styles['swatch-unavailable']].join(' ')} aria-hidden="true" />
          Sin disponibilidad
        </span>
      </div>
    </div>
  );
}
