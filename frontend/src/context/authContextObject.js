import { createContext } from 'react';

// Separado del proveedor para que el archivo del componente solo exporte componentes (Fast Refresh)
export const AuthContext = createContext(null);
