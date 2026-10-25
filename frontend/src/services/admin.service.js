import { fetchWithAuth } from './api';

// Solo admin
export const adminService = {
  // Indicadores del panel calculados en el servidor
  async getStats() {
    return fetchWithAuth('/api/admin/stats');
  },

  // Clientes con número de pedidos, total gastado y último pedido
  async getClients() {
    return fetchWithAuth('/api/admin/clients');
  },
};
