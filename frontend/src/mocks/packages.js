import { PHOTOS as P } from './photos';

// Paquetes de acomodación. Viven en la misma colección roomTypes de la "base de datos" (category: 'paquete').
// A diferencia de un RoomType, `price` es el TOTAL por las `nights` noches (no hay price_per_night).
// room_type_id apunta al tipo de habitación base del paquete.
export const packages = [
  { id: 'paq-escapada-romantica', name: 'Escapada romántica', category: 'paquete',
    description: 'Dos noches en suite con jacuzzi, cena a la luz de las velas y desayuno en la cama.',
    nights: 2, price: 1900000, old_price: 2200000, capacity: 2, beds: '1 cama king', size_m2: 52,
    amenities: ['jacuzzi', 'breakfast', 'minibar', 'wifi'], includes: ['Cena romántica', 'Desayuno en la cama', 'Botella de vino'],
    room_type_id: 'suite-jacuzzi', images: [P.dinner, P.suite2, P.bath], tag: 'Más reservado', is_active: true, units: 2, bookings_count: 76 },
  { id: 'paq-fin-semana-spa', name: 'Fin de semana spa', category: 'paquete',
    description: 'Dos noches de descanso con circuito de spa y masaje relajante para desconectarte.',
    nights: 2, price: 1500000, old_price: null, capacity: 2, beds: '1 cama king', size_m2: 42,
    amenities: ['spa', 'breakfast', 'wifi', 'ac'], includes: ['Circuito de spa', 'Masaje de 50 minutos', 'Desayuno buffet'],
    room_type_id: 'suite-junior', images: [P.spa, P.spa2, P.suite1], tag: null, is_active: true, units: 3, bookings_count: 61 },
  { id: 'paq-luna-de-miel', name: 'Luna de miel', category: 'paquete',
    description: 'Tres noches en suite panorámica con decoración especial, cena y masaje en pareja.',
    nights: 3, price: 4800000, old_price: 5400000, capacity: 2, beds: '1 cama king', size_m2: 65,
    amenities: ['jacuzzi', 'view', 'spa', 'breakfast'], includes: ['Decoración de bienvenida', 'Cena romántica', 'Masaje en pareja', 'Late check-out'],
    room_type_id: 'suite-panoramica', images: [P.suite5, P.dinner, P.beach], tag: 'Oferta', is_active: true, units: 2, bookings_count: 44 },
  { id: 'paq-familia', name: 'Paquete Familia', category: 'paquete',
    description: 'Tres noches en habitación familiar con desayuno, parqueadero y actividades para los niños.',
    nights: 3, price: 1650000, old_price: null, capacity: 5, beds: '1 cama king + 2 camas sencillas', size_m2: 40,
    amenities: ['breakfast', 'parking', 'wifi', 'ac'], includes: ['Desayuno buffet para todos', 'Entradas a la piscina', 'Actividades infantiles'],
    room_type_id: 'hab-familiar', images: [P.pool, P.bedroom, P.resort], tag: 'Nuevo', is_active: true, units: 2, bookings_count: 33 },
  { id: 'paq-ejecutivo', name: 'Paquete Ejecutivo', category: 'paquete',
    description: 'Dos noches en suite ejecutiva con acceso al lounge, traslado al aeropuerto y lavandería.',
    nights: 2, price: 1500000, old_price: null, capacity: 2, beds: '1 cama king', size_m2: 48,
    amenities: ['wifi', 'breakfast', 'parking', 'ac'], includes: ['Acceso al lounge ejecutivo', 'Traslado al aeropuerto', 'Lavandería express'],
    room_type_id: 'suite-ejecutiva', images: [P.work, P.suite3, P.lobby], tag: null, is_active: true, units: 3, bookings_count: 52 },
];
