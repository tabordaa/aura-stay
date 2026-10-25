// Categorías del catálogo de hospedaje (se conectan al catálogo real en S03)
export const CATEGORIES = [
  { id: 'habitacion', label: 'Habitaciones', icon: '🛏️' },
  { id: 'suite',      label: 'Suites',       icon: '🛎️' },
  { id: 'exclusiva',  label: 'Exclusivas',   icon: '💎' },
  { id: 'paquete',    label: 'Paquetes',     icon: '🎁' },
];

export const categoryLabel = (id) => CATEGORIES.find(c => c.id === id)?.label ?? id;
