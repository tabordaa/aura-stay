// Evento que AuthContext escucha para cerrar la sesión cuando deja de ser válida.
// (Sin backend en la v1 nada lo dispara; se conserva para la v2.)
export const AUTH_EXPIRED_EVENT = 'auth:expired';
