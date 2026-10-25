import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { OSM_ATTRIBUTION, OSM_TILES, pinIcon } from './mapUtils';
import styles from './Maps.module.css';

// Mapa de solo lectura con la tienda y el punto de entrega (seguimiento del cliente y panel del domiciliario)
export default function OrderMap({ store, destination, height = 260 }) {
  const containerRef = useRef(null);
  // Dependencias primitivas: el pedido se vuelve a cargar cada pocos segundos y no debe recrear el mapa
  const toLat = destination?.lat;
  const toLng = destination?.lng;
  const fromLat = store?.lat;
  const fromLng = store?.lng;

  useEffect(() => {
    if (!containerRef.current || toLat == null || toLng == null) return undefined;
    const map = L.map(containerRef.current, { scrollWheelZoom: false, attributionControl: true });
    L.tileLayer(OSM_TILES, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map);

    const to = [toLat, toLng];
    L.marker(to, { icon: pinIcon('🏠', 'destination'), title: 'Entrega' }).addTo(map);
    if (fromLat != null && fromLng != null) {
      const from = [fromLat, fromLng];
      L.marker(from, { icon: pinIcon('🏪', 'store'), title: 'Tienda' }).addTo(map);
      L.polyline([from, to], { color: '#1B5E35', weight: 3, dashArray: '6 8', opacity: 0.7 }).addTo(map);
      map.fitBounds([from, to], { padding: [36, 36], maxZoom: 16 });
    } else {
      map.setView(to, 16);
    }
    // React 19 en modo estricto monta los efectos dos veces: se destruye el mapa para no duplicarlo
    return () => map.remove();
  }, [toLat, toLng, fromLat, fromLng]);

  return <div ref={containerRef} className={styles.map} style={{ height }} role="img" aria-label="Mapa de la entrega" />;
}
