import { delay } from './mockApi';

// Solo admin. Los indicadores reales llegan en S10.
export const adminService = {
  async getStats() {
    await delay();
    return null;
  },

  async getClients() {
    await delay();
    return [];
  },
};
