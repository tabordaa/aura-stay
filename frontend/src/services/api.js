export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

// Evento que AuthContext escucha para cerrar la sesión cuando el token expira o deja de ser válido
export const AUTH_EXPIRED_EVENT = 'auth:expired';

// Mensajes legibles para los errores de validación (422) que devuelve FastAPI como lista
const FIELD_MESSAGES = {
  name: 'El nombre debe tener entre 2 y 100 caracteres',
  email: 'El correo electrónico no es válido',
  password: 'La contraseña debe tener entre 8 y 72 caracteres',
  phone: 'El teléfono no es válido',
  address: 'La dirección es demasiado larga',
  delivery_address: 'La dirección de entrega debe tener entre 5 y 200 caracteres',
  notes: 'Las indicaciones no pueden superar 300 caracteres',
  quantity: 'Cada producto admite entre 1 y 99 unidades',
  items: 'El pedido debe tener entre 1 y 50 productos',
  payment_method: 'Selecciona un método de pago válido',
  reason: 'Escribe el motivo del rechazo (mínimo 3 caracteres)',
  price: 'El precio debe ser mayor que 0',
  old_price: 'El precio anterior debe ser mayor que el precio actual',
  stock: 'El stock no puede ser negativo',
  image_url: 'La imagen debe ser un enlace que empiece por http:// o https://',
  category: 'Selecciona una categoría válida',
};

export function getErrorMessage(detail, fallback = 'Error en la petición') {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const field = detail[0].loc?.[detail[0].loc.length - 1];
    if (FIELD_MESSAGES[field]) return FIELD_MESSAGES[field];
    // Solo los mensajes de nuestros validadores están en español ("Value error, ...")
    const msg = detail[0].msg || '';
    return msg.startsWith('Value error, ') ? msg.slice('Value error, '.length) : 'Revisa los datos ingresados';
  }
  return fallback;
}

// Wrapper de fetch: inyecta el Bearer Token, traduce errores y avisa cuando la sesión expiró.
// Los errores llevan `status` con el código HTTP para que cada pantalla decida qué mostrar.
export async function fetchWithAuth(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    if (response.status === 401 && token) {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
    const error = new Error(getErrorMessage(data?.detail));
    error.status = response.status;
    throw error;
  }

  return data;
}
