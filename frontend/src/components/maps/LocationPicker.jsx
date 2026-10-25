import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { OSM_ATTRIBUTION, OSM_TILES, pinIcon } from './mapUtils';
import styles from './Maps.module.css';

/**
 * El cliente marca su punto de entrega con un clic (o con su ubicación actual).
 * Se prefiere esto a convertir la dirección escrita en coordenadas: los geocodificadores gratuitos
 * no entienden bien las direcciones colombianas ("Calle 85 # 11-42") y pueden ubicarlas a kilómetros.
 */
export default function LocationPicker({ value, onChange, center, disabled }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // El mapa se crea una sola vez; los clics informan el punto al componente padre
  useEffect(() => {
    if (!containerRef.current) return undefined;
    const start = value ?? center;
    const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView([start.lat, start.lng], value ? 16 : 13);
    L.tileLayer(OSM_TILES, { attribution: OSM_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    map.on('click', (e) => onChangeRef.current({ lat: round(e.latlng.lat), lng: round(e.latlng.lng) }));
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- el centro inicial solo importa al crear el mapa
  }, []);

  // El marcador sigue al valor elegido
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const point = [value.lat, value.lng];
    if (markerRef.current) {
      markerRef.current.setLatLng(point);
    } else {
      markerRef.current = L.marker(point, { icon: pinIcon('🏠', 'destination'), draggable: true }).addTo(map);
      markerRef.current.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        onChangeRef.current({ lat: round(lat), lng: round(lng) });
      });
    }
  }, [value]);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no permite compartir la ubicación. Marca el punto en el mapa.');
      return;
    }
    setLocating(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point = { lat: round(coords.latitude), lng: round(coords.longitude) };
        onChangeRef.current(point);
        mapRef.current?.setView([point.lat, point.lng], 17);
        setLocating(false);
      },
      () => {
        setGeoError('No pudimos obtener tu ubicación. Marca el punto en el mapa.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className={styles.picker}>
      <div ref={containerRef} className={[styles.map, disabled ? styles.disabled : ''].join(' ')} style={{ height: 220 }} />
      <div className={styles['picker-bar']}>
        <span className={styles['picker-hint']}>
          {value ? '✓ Punto de entrega marcado. Puedes arrastrarlo para ajustarlo.' : 'Toca el mapa donde quieres recibir tu pedido.'}
        </span>
        <button type="button" className={styles['picker-btn']} onClick={useMyLocation} disabled={disabled || locating}>
          {locating ? 'Buscando…' : '📍 Usar mi ubicación'}
        </button>
      </div>
      {geoError && <p className={styles['picker-error']}>{geoError}</p>}
    </div>
  );
}

// 6 decimales (~10 cm): lo mismo que guarda la base de datos
function round(n) {
  return Math.round(n * 1e6) / 1e6;
}
