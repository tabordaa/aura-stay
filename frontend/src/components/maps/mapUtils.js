import L from 'leaflet';
import styles from './Maps.module.css';

// Mapas de OpenStreetMap: no requieren API key. La atribución es obligatoria según su licencia.
export const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Marcador con emoji en lugar de las imágenes por defecto de Leaflet (que se rompen al empaquetar con Vite)
export function pinIcon(emoji, variant) {
  return L.divIcon({
    className: '',
    html: `<span class="${styles.pin} ${styles[`pin-${variant}`]}"><i>${emoji}</i></span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 34],
  });
}
