import { delay, loadDb } from './mockApi';

export const extrasService = {
  // Catálogo de servicios adicionales (desayuno, spa, traslado…)
  async list() {
    await delay();
    return loadDb().extras;
  },
};
