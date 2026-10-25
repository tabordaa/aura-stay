// Destino interno seguro tras el login: solo rutas que empiezan por "/" (nunca "//", "/\" ni URLs absolutas),
// para evitar un open redirect desde location.state.from.
export function safeFrom(from) {
  if (typeof from !== 'string') return null;
  if (!from.startsWith('/') || from.startsWith('//') || from.startsWith('/\\')) return null;
  // Evita bucles con las páginas de auth y rutas con caracteres de control o barra invertida
  if (/^\/(login|register)(\/|\?|#|$)/.test(from)) return null;
  for (let i = 0; i < from.length; i++) {
    const c = from.charCodeAt(i);
    if (c <= 31 || c === 92) return null;
  }
  return from;
}

// Adónde va el usuario recién autenticado: el admin siempre a su panel; el huésped vuelve a `from` si es válido
export function landingFor(user, from) {
  if (user.role === 'admin') return '/admin';
  return safeFrom(from) ?? '/habitaciones';
}
