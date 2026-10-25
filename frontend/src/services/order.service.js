import { delay } from './mockApi';

// Se reemplaza por reservations.service en S05; mientras tanto no hay reservas.
const unavailable = async () => {
  await delay();
  throw new Error('Esta acción aún no está disponible');
};

export const orderService = {
  createOrder: unavailable,
  cancelOrder: unavailable,
  rejectOrder: unavailable,
  updateStatus: unavailable,

  // Devuelve null si no existe
  async getOrder() {
    await delay();
    return null;
  },

  async getMyOrders() {
    await delay();
    return [];
  },

  async getOrders() {
    await delay();
    return [];
  },
};
