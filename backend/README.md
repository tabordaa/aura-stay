# Aura Stay — backend (v2)

La v1 de Aura Stay es solo frontend: los datos son mock (`frontend/src/mocks/`) y se persisten en `localStorage`.

La capa `frontend/src/services/` ya expone las mismas funciones asíncronas que tendrá la API real: mismos nombres,
parámetros, forma de las respuestas y mensajes de error. Este documento es el **contrato REST** que debe cumplir el
backend de la v2 (FastAPI + PostgreSQL + Alembic, igual que Aura Food). Al implementarlo solo cambia el cuerpo de
cada servicio, que pasa a llamar a la API con `fetchWithAuth`; las páginas no se tocan.

## Convenciones generales
- Base: `/api`. JSON en request y response. Campos en `snake_case`.
- Fechas de estadía: `YYYY-MM-DD` (hora local del hotel, `America/Bogota`). Marcas de tiempo: ISO 8601 UTC.
- Moneda: COP, **enteros** (sin decimales).
- Autenticación: JWT Bearer (`Authorization: Bearer <token>`), como en Aura Food. El token lleva el `id` del usuario;
  el rol se lee siempre de la base de datos, nunca del token ni del cuerpo.
- Errores: `{ "detail": "<mensaje en español>" }` con el código HTTP correspondiente. El frontend muestra `detail` tal
  cual (hoy los servicios lanzan `new Error(detalle)` con esos mismos textos).
- Un `401` hace que el frontend emita `auth:expired` (`AUTH_EXPIRED_EVENT` en `services/api.js`) y cierre la sesión.

| Código | Cuándo |
|--------|--------|
| 400 | Regla de negocio incumplida (fechas, transición inválida, cancelación tardía) |
| 401 | Sin token, token inválido o vencido |
| 403 | Rol sin permiso (`"No tienes permisos para esta acción"`) |
| 404 | Recurso inexistente o ajeno (`"Reserva no encontrada"`, `"Habitación no encontrada"`, `"Huésped no encontrado"`) |
| 409 | Conflicto: correo ya registrado, sin disponibilidad |
| 422 | Validación de esquema (Pydantic) |

## Modelos

### User (`UserResponse`)
```json
{ "id": "u_huesped", "name": "Camila Rojas", "email": "huesped@aurastay.com", "role": "huesped",
  "phone": "3001234567", "document": "1020304050", "city": "Bogotá", "created_at": "2026-03-02T15:00:00Z" }
```
`role`: `huesped` | `admin`. **Nunca** se devuelve `password` (se guarda con bcrypt).

### RoomType
```json
{ "id": "suite-jacuzzi", "name": "Suite con jacuzzi", "description": "…", "category": "suite",
  "price_per_night": 520000, "old_price": 600000, "capacity": 2, "beds": "1 cama king", "size_m2": 48,
  "amenities": ["wifi", "jacuzzi", "minibar"], "images": ["https://images.unsplash.com/…"],
  "tag": "Más reservada", "is_active": true, "units": 3, "bookings_count": 42 }
```
`category`: `habitacion` | `suite` | `exclusiva` | `paquete`.
Un **paquete** usa la misma colección con `category: "paquete"` y, en lugar de `price_per_night`, trae
`price` (total por la estadía), `nights` (fijas), `includes` (array de textos) y `room_type_id` (habitación base, opcional).

### Room (habitación física)
```json
{ "id": "room_304", "number": "304", "floor": 3, "room_type_id": "suite-jacuzzi",
  "room_type_name": "Suite con jacuzzi", "status": "disponible" }
```
`status`: `disponible` | `ocupada` | `mantenimiento`. Informativo: la disponibilidad se calcula con `units`.

### Extra
```json
{ "id": "ex_breakfast", "name": "Desayuno buffet", "price": 45000, "per": "persona_noche" }
```
`per`: `noche` | `persona_noche` | `estadia`.

### Reservation
```json
{ "id": "res_…", "code": "AS-7F3K2Q", "user_id": "u_huesped", "room_type_id": "suite-jacuzzi",
  "check_in": "2026-11-14", "check_out": "2026-11-16", "guests": 2,
  "extras": [{ "extra_id": "ex_breakfast", "qty": 1 }],
  "nights": 2, "subtotal": 1040000, "extras_total": 180000, "taxes": 231800, "total": 1451800,
  "status": "confirmada", "payment_method": "card", "card_last4": "4242",
  "guest_name": "Camila Rojas", "guest_document": "1020304050", "guest_phone": "3001234567",
  "guest_email": "huesped@aurastay.com", "special_requests": "", "rejection_reason": null,
  "cancelled_at": null, "created_at": "2026-10-25T14:03:11Z" }
```
- `code`: `AS-` + 6 caracteres de `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, único.
- `card_last4` solo existe con `payment_method: "card"`. **Nunca** se recibe ni se guarda el número completo.
- Las vistas del huésped agregan `room` (`name`, `image`, `category`, `beds`, `size_m2`) y `extra_lines`
  (`extra_id`, `qty`, `name`). Las del admin agregan `room_name` y `guest_display_name`.

## Reglas de negocio (el backend es la autoridad)

### Precios (`frontend/src/utils/pricing.js`)
- `nights = max(1, días entre check_in y check_out)`. En un paquete, `nights` = las del paquete.
- `subtotal = price_per_night × nights` (paquete: `price`).
- Extra: `price × unidades × qty`, con unidades `noche` = nights, `persona_noche` = nights × guests, `estadia` = 1.
- `taxes = round((subtotal + extras_total) × 0.19)` (IVA hotelero). `total = subtotal + extras_total + taxes`.
- Los importes que mande el cliente **se ignoran**: siempre se recalculan.

### Validación de la estadía
- `check_in >= hoy`, `check_out > check_in`, máximo 30 noches; `guests` entero entre 1 y 8 y `<= capacity`.
- Paquete: `check_out = check_in + nights` (se ignora la salida enviada).

### Disponibilidad
Un tipo está disponible para `[check_in, check_out)` si las reservas **activas** (`pendiente`, `confirmada`,
`en_curso`) del mismo tipo que se cruzan con el rango son menos que `units`. Dos rangos se cruzan si
`a.check_in < b.check_out && b.check_in < a.check_out` (el día de salida queda libre).
Crear reservas debe ser atómico (transacción con bloqueo) para no vender dos veces la última unidad.

### Máquina de estados
```
pendiente ──approve──► confirmada ──check-in──► en_curso ──check-out──► finalizada
    ├──reject (motivo 5–200 caracteres)──► rechazada
    └──cancel (huésped)──► cancelada   (también desde confirmada)
```
- Nace `confirmada` si se paga con tarjeta y `pendiente` si se paga en el hotel.
- **Cancelar (huésped):** solo el dueño, solo `pendiente`/`confirmada`, y con más de 48 h hasta las 15:00 del día
  de llegada. Si no: `400 "Ya no puedes cancelar: faltan menos de 48 horas para tu llegada."`.
- **Check-in (admin):** solo si `check_in <= hoy < check_out`.
- Transición inválida: `400 "No se puede aplicar \"<acción>\" a una reserva <estado>"`.

## Endpoints

### Auth — `authService`
| Método | Ruta | Rol | Body | Respuesta |
|--------|------|-----|------|-----------|
| POST | `/api/auth/register` | público | `{ name, email, phone, password, city }` | `201` User |
| POST | `/api/auth/login` | público | `{ email, password }` | `200` `{ access_token, token_type: "bearer", user }` |
| GET | `/api/auth/me` | autenticado | — | `200` User |
| PATCH | `/api/auth/me` | autenticado | `{ name?, phone?, document?, city? }` | `200` User |

- Register: nombre 3–100, correo válido (se guarda en minúsculas), contraseña 8–72; correo duplicado →
  `409 "Ya existe una cuenta con ese correo"`. El rol siempre es `huesped`.
- Login inválido: `401 "Correo o contraseña incorrectos"` (mismo mensaje si el correo no existe).
- PATCH `/me`: cualquier otro campo (`email`, `role`, `password`, `id`) se ignora.
- Logout: sin endpoint; el cliente descarta el token.

### Catálogo — `roomsService`, `extrasService`
| Método | Ruta | Rol | Query / Body | Respuesta |
|--------|------|-----|--------------|-----------|
| GET | `/api/room-types` | público | `category`, `q`, `min_price`, `max_price`, `guests`, `sort` | `200` RoomType[] |
| GET | `/api/room-types/{id}` | público | — | `200` RoomType · `404` |
| GET | `/api/room-types/availability` | público | `check_in`, `check_out`, `guests` | `200` `{ [room_type_id]: { available, remaining, reason } }` |
| GET | `/api/extras` | público | — | `200` Extra[] |

- Solo tipos activos. `q` busca en nombre y descripción, sin tildes ni mayúsculas.
- Precio para filtrar y ordenar: `price_per_night` (paquete: `price`). `sort`: `recommended` | `price_asc` |
  `price_desc` | `popular` (por `bookings_count`).
- `reason`: `null` | `"capacity"` | `"sold_out"`. Sin fechas: `400 "Elige las fechas de llegada y salida"`.

### Reservas del huésped — `reservationsService`
| Método | Ruta | Rol | Body | Respuesta |
|--------|------|-----|------|-----------|
| POST | `/api/reservations` | huésped | ver abajo | `201` Reservation[] |
| GET | `/api/reservations/me` | huésped | — | `200` Reservation[] (más recientes primero) |
| GET | `/api/reservations/{id}` | dueño | — | `200` Reservation · `404` si es ajena |
| POST | `/api/reservations/{id}/cancel` | dueño | — | `200` Reservation |

Body de creación (una reserva por cada item, **todo o nada**):
```json
{
  "items": [{ "room_type_id": "suite-jacuzzi", "check_in": "2026-11-14", "check_out": "2026-11-16",
              "guests": 2, "extras": [{ "extra_id": "ex_breakfast", "qty": 1 }] }],
  "holder": { "name": "Camila Rojas", "document": "1020304050", "phone": "3001234567",
              "email": "huesped@aurastay.com", "special_requests": "" },
  "payment": { "method": "card", "card_last4": "4242" }
}
```
- `payment.method`: `card` (exige `card_last4` de 4 dígitos) o `hotel`.
- Errores: `400 "Tu estadía está vacía"`, `400 "<Habitación>: máximo N huéspedes"`,
  `409 "Ya no hay disponibilidad de <Habitación> del 14 nov al 16 nov. Cambia las fechas o elige otra habitación."`,
  `400 "Uno de los servicios adicionales ya no está disponible"`.

### Admin — `adminService` (todas exigen rol `admin`; si no, `403`)
| Método | Ruta | Body / Query | Respuesta |
|--------|------|--------------|-----------|
| GET | `/api/admin/stats` | — | `200` Stats |
| GET | `/api/admin/reservations` | `status?` | `200` Reservation[] (más recientes primero) |
| POST | `/api/admin/reservations/{id}/approve` | — | `200` Reservation |
| POST | `/api/admin/reservations/{id}/reject` | `{ reason }` | `200` Reservation |
| POST | `/api/admin/reservations/{id}/check-in` | — | `200` Reservation |
| POST | `/api/admin/reservations/{id}/check-out` | — | `200` Reservation |
| GET | `/api/admin/room-types` | `category?` | `200` RoomType[] (incluye inactivos) |
| POST | `/api/admin/room-types` | RoomType sin `id` | `201` RoomType |
| PUT | `/api/admin/room-types/{id}` | RoomType sin `id` | `200` RoomType |
| PATCH | `/api/admin/room-types/{id}/active` | `{ active }` | `200` RoomType |
| GET | `/api/admin/rooms` | — | `200` Room[] (por número) |
| PATCH | `/api/admin/rooms/{id}/status` | `{ status }` | `200` Room |
| GET | `/api/admin/guests` | — | `200` Guest[] (más gasto primero) |
| GET | `/api/admin/guests/{id}` | — | `200` Guest + `reservations` |
| POST | `/api/admin/demo/reset` | — | `204` (solo en entornos de demo) |

Stats:
```json
{ "occupied_units": 6, "total_units": 40, "occupancy_pct": 15, "month_revenue": 18450000,
  "month_reservations": 12, "adr": 410000, "arrivals_today": 2, "departures_today": 1 }
```
- Ocupada hoy: `confirmada`/`en_curso` con `check_in <= hoy < check_out`, solo de tipos activos.
- Ingresos y ADR: reservas no canceladas ni rechazadas con `check_in` en el mes actual; ADR = Σ `subtotal` / Σ `nights`.
- Llegadas: `pendiente`/`confirmada` con `check_in = hoy`. Salidas: `en_curso` con `check_out = hoy`.

Guest = User sin `password` más `stays`, `nights`, `total_spent`, `last_stay`, `next_stay`, `cancelled_count`
(las cifras excluyen canceladas y rechazadas).

Room types:
- Borrado **lógico** (`is_active: false`): las reservas siguen apuntando al tipo.
- Al cambiar `units` se crean o quitan habitaciones físicas; solo se pueden quitar las `disponible`
  (si no, `400` explicando cuántas faltan por liberar).
- Imágenes: solo URLs `https://`. Paquete con `room_type_id` inexistente: `400 "La habitación base del paquete no existe"`.
