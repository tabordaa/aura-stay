// Categorías del catálogo de hospedaje
export const CATEGORIES = [
  { id: 'habitacion', label: 'Habitaciones', icon: '🛏️' },
  { id: 'suite',      label: 'Suites',       icon: '🛎️' },
  { id: 'exclusiva',  label: 'Exclusivas',   icon: '💎' },
  { id: 'paquete',    label: 'Paquetes',     icon: '🎁' },
];

export const categoryLabel = (id) => CATEGORIES.find(c => c.id === id)?.label ?? id;

// Etiquetas cortas de las comodidades (claves de `amenities` en los mocks)
export const AMENITIES = {
  wifi: '📶 Wifi',
  breakfast: '🥐 Desayuno',
  jacuzzi: '🛁 Jacuzzi',
  view: '🌄 Vista',
  balcony: 'Balcón',
  minibar: 'Minibar',
  ac: '❄️ A/C',
  parking: '🚗 Parqueadero',
  spa: '💆 Spa',
  tv: '📺 TV',
};

export const amenityLabel = (key) => AMENITIES[key] ?? key;
