import { fetchWithAuth } from './api';

export const orderService = {
  async createOrder(orderData) {
    return fetchWithAuth('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  },

  // Devuelve null si el pedido no existe (o no pertenece al usuario)
  async getOrder(id) {
    try {
      return await fetchWithAuth(`/api/orders/${id}`);
    } catch (err) {
      if (err.status === 404) return null;
      throw err;
    }
  },

  // Pedidos del usuario autenticado, del más reciente al más antiguo
  async getMyOrders(limit = 50) {
    return fetchWithAuth(`/api/orders/me?limit=${limit}`);
  },

  // El cliente cancela su pedido mientras está pendiente (el stock vuelve al inventario)
  async cancelOrder(id) {
    return fetchWithAuth(`/api/orders/${id}/cancel`, { method: 'POST' });
  },

  // Solo admin: rechaza un pedido pendiente; el cliente verá el motivo
  async rejectOrder(id, reason) {
    return fetchWithAuth(`/api/orders/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // Solo para admin y domiciliario
  async getOrders(status) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return fetchWithAuth(`/api/orders${query}`);
  },

  // Solo domiciliario: pedidos disponibles, sus entregas en curso y su historial
  async getCourierOrders() {
    return fetchWithAuth('/api/orders/courier/me');
  },

  // El domiciliario toma un pedido preparado (409 si otro lo tomó primero)
  async takeOrder(id) {
    return fetchWithAuth(`/api/orders/${id}/take`, { method: 'POST' });
  },

  // Solo el domiciliario que tomó el pedido puede entregarlo
  async deliverOrder(id) {
    return fetchWithAuth(`/api/orders/${id}/deliver`, { method: 'POST' });
  },

  // Solo admin: acepta un pedido pendiente (pasa a preparado)
  async updateStatus(id, status) {
    return fetchWithAuth(`/api/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};
