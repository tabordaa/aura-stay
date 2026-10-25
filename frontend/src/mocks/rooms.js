// Habitaciones físicas generadas a partir de los `units` de cada tipo/paquete del catálogo.
// En la v1 el estado es informativo: la disponibilidad de reservas sigue usando `units`.
const PER_FLOOR = 10;

// Tipos con una habitación en mantenimiento en la semilla (la 2.ª de cada uno)
const MAINTENANCE = ['hab-superior', 'suite-junior'];

export function buildRooms(catalog, reservations, today) {
  // Una unidad ocupada por cada reserva en curso hoy, para que el mapa de habitaciones sea coherente
  const occupiedLeft = {};
  for (const res of reservations) {
    if (res.status === 'en_curso' && res.check_in <= today && today < res.check_out) {
      occupiedLeft[res.room_type_id] = (occupiedLeft[res.room_type_id] || 0) + 1;
    }
  }

  const rooms = [];
  let index = 0;
  for (const type of catalog) {
    for (let n = 0; n < type.units; n++) {
      const floor = Math.floor(index / PER_FLOOR) + 1;
      const number = String(floor * 100 + (index % PER_FLOOR) + 1);
      let status = 'disponible';
      if (occupiedLeft[type.id] > 0) {
        status = 'ocupada';
        occupiedLeft[type.id] -= 1;
      } else if (MAINTENANCE.includes(type.id) && n === type.units - 1) {
        status = 'mantenimiento';
      }
      rooms.push({ id: `room_${number}`, number, floor, room_type_id: type.id, status });
      index += 1;
    }
  }
  return rooms;
}
