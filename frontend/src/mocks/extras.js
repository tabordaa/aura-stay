// Servicios adicionales; `per` define cómo se cobra (ver utils/pricing.js). Precios en COP.
export const extras = [
  { id: 'ex_breakfast', name: 'Desayuno buffet', price: 45000, per: 'persona_noche' },
  { id: 'ex_spa', name: 'Spa', price: 180000, per: 'estadia' },
  { id: 'ex_transfer', name: 'Traslado aeropuerto', price: 90000, per: 'estadia' },
  { id: 'ex_late', name: 'Late check-out', price: 70000, per: 'estadia' },
];
