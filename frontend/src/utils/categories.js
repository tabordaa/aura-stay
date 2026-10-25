// Categorías del catálogo; deben coincidir con ProductCategory en backend/app/schemas.py
export const CATEGORIES = [
  { id: 'frutas',   label: 'Frutas y Verduras', icon: '🥦' },
  { id: 'dairy',    label: 'Lácteos',            icon: '🥛' },
  { id: 'meat',     label: 'Carnes',             icon: '🥩' },
  { id: 'cleaning', label: 'Aseo del Hogar',     icon: '🧴' },
  { id: 'bakery',   label: 'Panadería',          icon: '🥐' },
];

export const categoryLabel = (id) => CATEGORIES.find(c => c.id === id)?.label ?? id;
