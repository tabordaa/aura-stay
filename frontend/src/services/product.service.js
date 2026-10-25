import { delay } from './mockApi';

// Se reemplaza por rooms.service en S03; mientras tanto el catálogo viene vacío.
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
