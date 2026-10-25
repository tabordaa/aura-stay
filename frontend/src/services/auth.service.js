import { delay, loadDb, saveDb, newId } from './mockApi';

const SESSION_KEY = 'aura_stay_session';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Nunca se expone el password fuera del servicio
function publicUser(user) {
  if (!user) return null;
  const { password: _password, ...rest } = user; // eslint-disable-line no-unused-vars
  return rest;
}

// La sesión guarda solo el id del usuario
function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed.userId === 'string' ? parsed.userId : null;
  } catch {
    return null;
  }
}

function writeSession(userId) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId }));
  } catch {
    // Sin almacenamiento la sesión no se podrá restaurar al recargar
  }
}

// Id del usuario en sesión (otros servicios lo usan para no duplicar la clave)
export function getSessionUserId() {
  return readSession();
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nada que limpiar si el almacenamiento está bloqueado
  }
}

export const authService = {
  async login(email, password) {
    await delay();
    const normalized = String(email ?? '').trim().toLowerCase();
    const user = loadDb().users.find((u) => u.email.toLowerCase() === normalized);
    if (!user || user.password !== password) throw new Error('Correo o contraseña incorrectos');
    writeSession(user.id);
    return publicUser(user);
  },

  async register({ name, email, phone, password, city }) {
    await delay();
    const cleanName = String(name ?? '').trim();
    const cleanEmail = String(email ?? '').trim().toLowerCase();
    if (cleanName.length < 2 || cleanName.length > 100) throw new Error('El nombre debe tener entre 2 y 100 caracteres');
    if (!EMAIL_RE.test(cleanEmail)) throw new Error('El correo electrónico no es válido');
    if (!password || password.length < 8 || password.length > 72) {
      throw new Error('La contraseña debe tener entre 8 y 72 caracteres');
    }
    const db = loadDb();
    if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error('Ya existe una cuenta con ese correo');
    }
    const user = {
      id: newId('u'),
      name: cleanName,
      email: cleanEmail,
      password,
      role: 'huesped', // el rol nunca viene del formulario
      phone: String(phone ?? '').trim(),
      document: '',
      city: String(city ?? '').trim(),
    };
    db.users.push(user);
    saveDb(db);
    return publicUser(user);
  },

  // Usuario de la sesión, o null si no hay sesión o el usuario ya no existe
  async me() {
    await delay();
    const userId = readSession();
    if (!userId) return null;
    const user = loadDb().users.find((u) => u.id === userId);
    if (!user) {
      clearSession();
      return null;
    }
    return publicUser(user);
  },

  async updateMe(fields = {}) {
    await delay();
    const userId = readSession();
    const db = loadDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new Error('Tu sesión expiró. Inicia sesión de nuevo');
    if ('name' in fields) {
      const name = String(fields.name ?? '').trim();
      if (name.length < 2 || name.length > 100) throw new Error('El nombre debe tener entre 2 y 100 caracteres');
      user.name = name;
    }
    // Solo se pueden editar estos campos; email y rol no
    for (const key of ['phone', 'document', 'city']) {
      if (key in fields) user[key] = String(fields[key] ?? '').trim();
    }
    saveDb(db);
    return publicUser(user);
  },

  async logout() {
    // Se limpia primero: si el usuario recarga durante la latencia simulada no debe seguir logueado
    clearSession();
    await delay();
  },
};
