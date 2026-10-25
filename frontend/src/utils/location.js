// Ayudas de ubicación sin Leaflet (así las pantallas no cargan la librería de mapas hasta mostrar uno)

// Punto de entrega del pedido o null si el cliente no lo marcó
export function toLocation(order) {
  return order?.delivery_lat != null && order?.delivery_lng != null
    ? { lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) }
    : null;
}

// Enlace para abrir la ruta en Google Maps (app o web) hasta el punto de entrega
export function directionsUrl({ lat, lng }) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
