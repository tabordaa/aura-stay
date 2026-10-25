// Usuarios demo. Las contraseñas son visibles a propósito: no hay backend.
export const users = [
  {
    id: 'u_huesped', name: 'Camila Rojas', email: 'huesped@aurastay.com', password: 'huesped123',
    role: 'huesped', phone: '3001234567', document: '1020304050', city: 'Bogotá',
  },
  {
    id: 'u_admin', name: 'Administrador Aura Stay', email: 'admin@aurastay.com', password: 'admin123',
    role: 'admin', phone: '3109876543', document: '80123456', city: 'Medellín',
  },
  // Huéspedes extra para que el panel de huéspedes tenga variedad (uno sin reservas)
  {
    id: 'u_andres', name: 'Andrés Felipe Gómez', email: 'andres.gomez@example.com', password: 'demo1234',
    role: 'huesped', phone: '3112345678', document: '1017654321', city: 'Medellín',
  },
  {
    id: 'u_laura', name: 'Laura Valentina Ortiz', email: 'laura.ortiz@example.com', password: 'demo1234',
    role: 'huesped', phone: '3205558899', document: '1098765432', city: 'Cali',
  },
  {
    id: 'u_juan', name: 'Juan David Martínez', email: 'juan.martinez@example.com', password: 'demo1234',
    role: 'huesped', phone: '3153217788', document: '79456123', city: 'Barranquilla',
  },
  {
    id: 'u_sofia', name: 'Sofía Herrera Castro', email: 'sofia.herrera@example.com', password: 'demo1234',
    role: 'huesped', phone: '3009871234', document: '1032456789', city: 'Cartagena',
  },
];
