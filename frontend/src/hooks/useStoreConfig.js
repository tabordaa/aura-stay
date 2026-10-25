import { useEffect, useState } from 'react';
import { configService } from '../services/config.service';

// La configuración no cambia mientras la app está abierta: se pide una sola vez y se comparte entre pantallas
let cached = null;
let pending = null;

function loadConfig() {
  if (!pending) {
    pending = configService.getConfig()
      .then(config => { cached = config; return config; })
      .catch(err => { pending = null; throw err; });
  }
  return pending;
}

// Devuelve la configuración pública (domicilio, tiempo estimado y ubicación de la tienda) o null mientras carga
export function useStoreConfig() {
  const [config, setConfig] = useState(cached);

  useEffect(() => {
    if (cached) return undefined;
    let active = true;
    loadConfig().then(c => { if (active) setConfig(c); }).catch(() => {});
    return () => { active = false; };
  }, []);

  return config;
}
