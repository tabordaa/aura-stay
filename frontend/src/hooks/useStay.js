import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { roomsService } from '../services/rooms.service';
import { extrasService } from '../services/extras.service';
import { combineQuotes, stayQuote } from '../utils/pricing';
import { addDays } from '../utils/dates';
import { MAX_GUESTS, validateStay } from '../utils/stay';

// Cada usuario tiene su propia estadía en este navegador; se borra al cerrar sesión
export const stayStorageKey = (userId) => `aura_stay_cart_${userId}`;
export const MAX_EXTRA_QTY = 9;

const newUid = () => `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const availKey = (l) => `${l.roomTypeId}|${l.checkIn}|${l.checkOut}|${l.guests}`;

function readStoredStay(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(stored)) return [];
    return stored
      .filter(e => typeof e?.roomTypeId === 'string' && typeof e.checkIn === 'string' && typeof e.checkOut === 'string')
      .map(e => ({
        uid: typeof e.uid === 'string' ? e.uid : newUid(),
        roomTypeId: e.roomTypeId,
        checkIn: e.checkIn,
        checkOut: e.checkOut,
        guests: Number(e.guests) || 1,
        extras: Array.isArray(e.extras) ? e.extras.filter(x => typeof x?.extraId === 'string' && x.qty > 0) : [],
      }));
  } catch {
    return [];
  }
}

// Primer problema de una línea (o '' si es válida)
function lineError(entry, roomType) {
  if (!entry.checkIn || !entry.checkOut) return 'Elige las fechas de llegada y salida';
  const [first] = Object.values(validateStay(entry));
  if (first) return first;
  if (entry.guests > roomType.capacity) return `Máximo ${roomType.capacity} huéspedes para esta habitación`;
  return '';
}

/**
 * Estadía persistente ("Mi estadía"). Solo se guardan { roomTypeId, fechas, huéspedes, extras:[{extraId, qty}] }:
 * nombre, precios y total salen siempre del catálogo y de pricing.js, así un precio viejo nunca se muestra.
 */
export function useStay(userId) {
  const key = userId ? stayStorageKey(userId) : null;
  // Las entradas llevan la clave a la que pertenecen: si cambia el usuario se recargan antes de escribir
  const [state, setState] = useState(() => ({ key, entries: key ? readStoredStay(key) : [] }));
  if (state.key !== key) setState({ key, entries: key ? readStoredStay(key) : [] });
  const { entries } = state; // tras el reset en render, state.key coincide con key
  const setEntries = useCallback(
    (updater) => setState(s => ({ ...s, entries: updater(s.entries) })),
    [],
  );
  const [rooms, setRooms] = useState({});
  const [missing, setMissing] = useState([]);
  const [extrasCatalog, setExtrasCatalog] = useState([]);
  const [avail, setAvail] = useState({});
  const [availRun, setAvailRun] = useState(0);
  const requested = useRef(new Set());

  useEffect(() => {
    // Sin usuario no se persiste (evita crear una clave huérfana al cerrar sesión)
    if (!key || state.key !== key) return;
    try {
      localStorage.setItem(key, JSON.stringify(state.entries));
    } catch {
      // Sin almacenamiento (modo privado): la estadía funciona igual mientras la página esté abierta
    }
  }, [key, state]);

  // Limpia el resto heredado del carrito de Aura Food
  useEffect(() => {
    if (userId) localStorage.removeItem(`aura_cart_${userId}`);
  }, [userId]);

  useEffect(() => {
    let active = true;
    extrasService.list().then(list => { if (active) setExtrasCatalog(list); }).catch(() => {});
    return () => { active = false; };
  }, []);

  // Resuelve los tipos de habitación que faltan; los que ya no existen o se desactivaron quedan marcados
  useEffect(() => {
    for (const id of new Set(entries.map(e => e.roomTypeId))) {
      if (requested.current.has(`room:${id}`)) continue;
      requested.current.add(`room:${id}`);
      roomsService.get(id)
        .then(room => {
          setRooms(r => ({ ...r, [id]: room }));
          setMissing(m => m.filter(x => x !== id));
        })
        .catch(() => {
          // Se quita de lo solicitado para reintentar en recheck() (puede reactivarse)
          requested.current.delete(`room:${id}`);
          setMissing(m => (m.includes(id) ? m : [...m, id]));
        });
    }
  }, [entries, availRun]);

  // Una línea cuyo tipo ya no existe o está inactivo se conserva (sin roomType) para avisar al huésped
  const lines = useMemo(() => entries.flatMap(e => {
    if (missing.includes(e.roomTypeId)) return [{ ...e, roomType: null, gone: true, error: 'Esta habitación ya no está disponible' }];
    const room = rooms[e.roomTypeId];
    return room ? [{ ...e, roomType: room, error: lineError(e, room) }] : [];
  }), [entries, rooms, missing]);

  // Revalida disponibilidad de cada línea válida cuando cambian fechas o huéspedes
  useEffect(() => {
    for (const l of lines) {
      const k = availKey(l);
      if (l.error || requested.current.has(`av:${k}`)) continue;
      requested.current.add(`av:${k}`);
      roomsService.availability({ checkIn: l.checkIn, checkOut: l.checkOut, guests: l.guests })
        .then(map => setAvail(a => ({ ...a, [k]: map[l.roomTypeId]?.available ? 'ok' : 'unavailable' })))
        .catch(() => {
          // Se quita de lo solicitado para poder reintentar (recheck) en vez de quedar bloqueado
          requested.current.delete(`av:${k}`);
          setAvail(a => ({ ...a, [k]: 'error' }));
        });
    }
  }, [lines, availRun]);

  // Limpia la caché de disponibilidad y reintenta los tipos faltantes (`missing` se limpia solo si get() responde) (p. ej. al abrir el drawer)
  const recheck = useCallback(() => {
    for (const k of [...requested.current]) if (k.startsWith('av:')) requested.current.delete(k);
    setAvail({});
    setAvailRun(n => n + 1);
  }, []);

  const items = useMemo(() => lines.map(l => {
    const status = l.error ? 'invalid' : (avail[availKey(l)] ?? 'checking');
    const extras = l.extras
      .map(x => ({ extra: extrasCatalog.find(c => c.id === x.extraId), qty: x.qty }))
      .filter(x => x.extra);
    const quote = l.error ? null : stayQuote({ roomType: l.roomType, checkIn: l.checkIn, checkOut: l.checkOut, guests: l.guests, extras });
    return { ...l, extras, status, quote };
  }), [lines, avail, extrasCatalog]);

  const totals = useMemo(() => combineQuotes(items.filter(i => i.quote).map(i => i.quote)), [items]);
  const canReserve = items.length > 0 && items.every(i => i.status === 'ok');

  // Devuelve 'added' o 'duplicate' (misma habitación y mismas fechas: no se duplica)
  const add = ({ roomTypeId, checkIn, checkOut, guests }) => {
    if (entries.some(e => e.roomTypeId === roomTypeId && e.checkIn === checkIn && e.checkOut === checkOut)) return 'duplicate';
    setEntries(list => [...list, { uid: newUid(), roomTypeId, checkIn, checkOut, guests, extras: [] }]);
    return 'added';
  };

  const update = useCallback((uid, changes) => {
    setEntries(list => list.map(e => {
      if (e.uid !== uid) return e;
      const next = { ...e, ...changes };
      const room = rooms[e.roomTypeId];
      // Paquete: noches fijas, la salida siempre sale de la llegada
      if (room?.category === 'paquete' && 'checkIn' in changes) {
        next.checkOut = changes.checkIn ? addDays(changes.checkIn, room.nights) : '';
      }
      if ('guests' in changes) next.guests = Math.min(MAX_GUESTS, Math.max(1, Number(changes.guests) || 1));
      return next;
    }));
  }, [rooms, setEntries]);

  const changeExtra = useCallback((uid, extraId, delta) => {
    setEntries(list => list.map(e => {
      if (e.uid !== uid) return e;
      const current = e.extras.find(x => x.extraId === extraId)?.qty ?? 0;
      const qty = Math.min(MAX_EXTRA_QTY, Math.max(0, current + delta));
      const rest = e.extras.filter(x => x.extraId !== extraId);
      return { ...e, extras: qty > 0 ? [...rest, { extraId, qty }] : rest };
    }));
  }, [setEntries]);

  const remove = (uid) => setEntries(list => list.filter(e => e.uid !== uid));
  const clear = () => setEntries([]);

  return { items, count: items.length, totals, canReserve, extrasCatalog, recheck, add, update, changeExtra, remove, clear };
}
