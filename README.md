# Aura Stay

Reserva de hoteles: habitaciones, suites, piezas exclusivas y paquetes de acomodación.

Aura Stay se construye sobre la misma base de [Aura Food](https://github.com/tabordaa/aura-food):
el mismo sistema de diseño, la misma estructura del frontend y el mismo flujo de checkout, para demostrar que el
software se puede adaptar a otro dominio de negocio.

> **Versión 1:** solo frontend con datos de demostración (mock). No requiere backend ni base de datos: los datos
> viven en el `localStorage` del navegador.

## Qué se puede hacer
**Huésped**
- Buscar por fechas y número de huéspedes, filtrar por categoría (Habitaciones · Suites · Exclusivas · Paquetes),
  precio y orden.
- Ver el detalle de una habitación o paquete, agregar extras (desayuno, spa, traslado, late check-out) y armar
  "Mi estadía" con una o varias habitaciones.
- Confirmar la reserva pagando con tarjeta (simulado) o en el hotel.
- Consultar sus reservas, ver el detalle con la línea de tiempo y cancelar hasta 48 h antes de la llegada.
- Editar su perfil.

**Admin del hotel**
- Panel con ocupación, ingresos del mes, ADR, llegadas y salidas de hoy.
- Aprobar o rechazar reservas pendientes y marcar check-in y check-out.
- Gestionar tipos de habitación y paquetes (crear, editar, desactivar) y el estado de las habitaciones físicas.
- Consultar los huéspedes con su historial y cifras.
- Restaurar los datos de la demo.

## Requisitos
- Node.js ≥ 20.19 (el CI usa Node 24)

## Cómo correrlo
```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

Otros comandos (desde `frontend/`):
```bash
npm run lint     # ESLint
npm run build    # build de producción en dist/
npm run preview  # sirve el build
```

Variables de entorno opcionales: ver `frontend/.env.example` (`VITE_APP_NAME`, `VITE_THEME`).

### Tema de color
La app trae dos temas: `wine` (vinotinto, por defecto) y `green` (el verde original). Para cambiarlo basta con
editar `THEME` en `frontend/src/utils/brand.js` o definir `VITE_THEME=green` en `frontend/.env`. Los colores de
cada tema viven solo en `frontend/src/index.css` (bloques `[data-theme="..."]`): cambiar uno ahí lo cambia en toda la app.

## Cuentas de demostración
Las contraseñas son públicas a propósito: no hay backend y los datos son ficticios.

| Rol | Correo | Contraseña |
|-----|--------|------------|
| Huésped (con reservas en todos los estados) | `huesped@aurastay.com` | `huesped123` |
| Admin del hotel | `admin@aurastay.com` | `admin123` |
| Huéspedes adicionales | `andres.gomez@example.com`, `laura.ortiz@example.com`, `juan.martinez@example.com`, `sofia.herrera@example.com` | `demo1234` |

También puedes registrar una cuenta nueva (siempre con rol huésped).

Las reservas de ejemplo se generan **relativas a la fecha de hoy** (una estadía en curso, llegadas de hoy y de
mañana, estadías pasadas), así el panel siempre muestra datos con sentido.

## Restaurar los datos de la demo
- **Desde la app:** entra como admin y, en el panel, usa **"Restaurar datos demo"**. Se reinician reservas,
  habitaciones y huéspedes, y se vacían las estadías en armado; la sesión se conserva.
- **Desde el navegador:** en DevTools → Application → Local Storage, borra la clave `aura_stay_db_v8` (o todas las
  que empiezan por `aura_stay_`) y recarga.

## Pago simulado
El pago con tarjeta es solo una demostración: los datos de la tarjeta **nunca** se guardan ni se envían. De la
tarjeta solo se conservan los últimos 4 dígitos para mostrarlos en la reserva.

## Estructura
```
frontend/
  src/
    components/   Navbar, RoomCard, StayDrawer, CheckoutModal, modales…
    pages/        home, auth, catalog, reservations, profile, admin
    services/     capa de datos: misma interfaz que tendrá la API (hoy mock + localStorage)
    mocks/        datos semilla (habitaciones, paquetes, extras, usuarios, reservas)
    utils/        pricing (única fuente de precios), fechas, validaciones, reservas
    hooks/        useStay, useFocusTrap…
backend/          reservado para la API (v2); README con el contrato REST
```

Las páginas nunca leen los mocks directamente: todo pasa por `src/services/`. Al construir el backend solo
cambian los servicios. El contrato de la API está en [backend/README.md](backend/README.md).

Ver [CONTRIBUTING.md](CONTRIBUTING.md) para el flujo de trabajo.
