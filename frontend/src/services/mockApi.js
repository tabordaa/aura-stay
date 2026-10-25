// "Base de datos" simulada en localStorage. Es lo único que cambia al pasar al backend (v2).
import { users } from '../mocks/users';
import { extras } from '../mocks/extras';
import { roomTypes } from '../mocks/roomTypes';
import { packages } from '../mocks/packages';
import { buildReservations } from '../mocks/reservations';

// v3: la semilla incluye reservas · v4: totales de paquetes corregidos · v5: llegadas de hoy en la semilla
const DB_KEY = 'aura_stay_db_v5';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I para no confundir

// Simula la latencia de red
export function delay(min = 150, max = 400) {
  const ms = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function seed() {
  return {
    users: structuredClone(users),
    extras: structuredClone(extras),
    // Los paquetes comparten colección con los tipos de habitación (category: 'paquete')
    roomTypes: structuredClone([...roomTypes, ...packages]),
    rooms: [],
    reservations: buildReservations(),
  };
}

export function loadDb() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Solo se acepta si tiene la forma de la semilla (JSON válido pero distinto se descarta)
      const valid = parsed && typeof parsed === 'object'
        && Object.keys(seed()).every((k) => Array.isArray(parsed[k]));
      if (valid) return parsed;
    }
  } catch {
    // Almacenamiento bloqueado o JSON dañado: se parte de los datos semilla
  }
  const db = seed();
  saveDb(db);
  return db;
}

export function saveDb(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    // Sin almacenamiento persistente la app sigue funcionando en memoria de la sesión
  }
}

// Restaura los datos de la demo
export function resetDemoData() {
  const db = seed();
  saveDb(db);
  return db;
}

export function newId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

// "AS-7F3K2Q"
export function newReservationCode() {
  let code = '';
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return `AS-${code}`;
}
