import { delay } from './mockApi';

// El catálogo ya usa rooms.service; este servicio queda solo para AdminProducts hasta S11 (admin de habitaciones).
const unavailable = async () => {
  await delay();
  throw new Error('Esta acción aún no está disponible');
};

export const productService = {
  async getAllProducts() {
    await delay();
    return [];
  },

  async getManagedProducts() {
    await delay();
    return [];
  },

  createProduct: unavailable,
  updateProduct: unavailable,
  deactivateProduct: unavailable,
};
