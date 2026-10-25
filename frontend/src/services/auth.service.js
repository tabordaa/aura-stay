import { delay } from './mockApi';

// Hasta S02 no hay sesión: la capa mock de autenticación llega en la siguiente tarea.
const notReady = async () => {
  await delay();
  throw new Error('El inicio de sesión estará disponible muy pronto');
};

export const authService = {
  login: notReady,
  register: notReady,
  updateMe: notReady,

  // Sin sesión guardada no hay usuario
  async getMe() {
    await delay();
    return null;
  },
};
