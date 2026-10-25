import { API_URL, fetchWithAuth, getErrorMessage } from './api';

export const authService = {
  async login(email, password) {
    // FastAPI OAuth2 espera x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(getErrorMessage(errorData.detail, 'Error al iniciar sesión'));
    }

    return response.json(); // { access_token, token_type }
  },

  async register(userData) {
    return fetchWithAuth('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Intercambia el ID token de Google por la sesión de Aura Food (crea la cuenta de cliente si no existe)
  async loginWithGoogle(credential) {
    return fetchWithAuth('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
  },

  async getMe() {
    return fetchWithAuth('/api/auth/me');
  },

  // Nombre, dirección y teléfono (el correo y el rol no se pueden cambiar)
  async updateMe(changes) {
    return fetchWithAuth('/api/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(changes),
    });
  },
};
