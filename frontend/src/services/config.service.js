import { fetchWithAuth } from './api';

export const configService = {
  // Valores de negocio definidos en el backend (costo de domicilio, tiempo de entrega)
  async getConfig() {
    return fetchWithAuth('/api/config');
  },
};
