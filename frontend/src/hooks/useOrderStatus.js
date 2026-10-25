import { useCallback, useEffect, useState } from 'react';
import { orderService } from '../services/order.service';
import { isActiveOrder } from '../utils/orders';

const POLL_MS = 8000;

// Consulta el pedido y lo vuelve a consultar cada pocos segundos hasta que llegue a un estado final
const initialState = (id) => ({ order: null, loading: Boolean(id), notFound: false, error: '', updatedAt: null });

export default function useOrderStatus(id) {
  const [state, setState] = useState(() => initialState(id));
  const [trackedId, setTrackedId] = useState(id);

  // Si cambia el pedido se reinicia el estado durante el render (patrón recomendado por React en vez de un efecto)
  if (id !== trackedId) {
    setTrackedId(id);
    setState(initialState(id));
  }

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    let timer;

    async function load() {
      try {
        const order = await orderService.getOrder(id);
        if (cancelled) return;
        setState({ order, loading: false, notFound: order === null, error: '', updatedAt: new Date() });
        if (order && isActiveOrder(order.status)) timer = setTimeout(load, POLL_MS);
      } catch {
        if (cancelled) return;
        setState(s => ({ ...s, loading: false, error: 'Sin conexión con el servidor. Reintentando…' }));
        timer = setTimeout(load, POLL_MS);
      }
    }

    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  // Reemplaza el pedido con la respuesta de una acción (por ejemplo, cancelar) sin esperar al siguiente sondeo
  const replaceOrder = useCallback((order) => {
    setState(s => ({ ...s, order, updatedAt: new Date() }));
  }, []);

  return { ...state, replaceOrder };
}
