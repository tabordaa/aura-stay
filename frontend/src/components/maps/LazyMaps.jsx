import { lazy, Suspense } from 'react';
import styles from './Maps.module.css';

// Leaflet pesa ~150 kB: se descarga solo cuando una pantalla realmente muestra un mapa
const OrderMapImpl = lazy(() => import('./OrderMap'));
const LocationPickerImpl = lazy(() => import('./LocationPicker'));

function MapPlaceholder({ height }) {
  return <div className={styles.map} style={{ height }} aria-busy="true" />;
}

export function OrderMap(props) {
  return (
    <Suspense fallback={<MapPlaceholder height={props.height ?? 260} />}>
      <OrderMapImpl {...props} />
    </Suspense>
  );
}

export function LocationPicker(props) {
  return (
    <Suspense fallback={<MapPlaceholder height={220} />}>
      <LocationPickerImpl {...props} />
    </Suspense>
  );
}
