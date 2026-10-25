import { useEffect, useRef, useState } from 'react';
import styles from '../pages/auth/Auth.module.css';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GSI_SRC = 'https://accounts.google.com/gsi/client';

// Carga el script de Google Identity Services una sola vez
let scriptPromise = null;
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = GSI_SRC;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => { scriptPromise = null; reject(new Error('No se pudo cargar Google')); };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

/**
 * Botón oficial "Continuar con Google". Solo aparece si existe VITE_GOOGLE_CLIENT_ID; sin esa variable la app
 * funciona igual con correo y contraseña. Google entrega un ID token que el backend verifica (POST /api/auth/google).
 */
export default function GoogleButton({ label, onCredential }) {
  const slotRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  const [failed, setFailed] = useState(false);

  useEffect(() => { onCredentialRef.current = onCredential; }, [onCredential]);

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let active = true;
    loadGoogleScript()
      .then(() => {
        if (!active || !slotRef.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: ({ credential }) => onCredentialRef.current(credential),
        });
        window.google.accounts.id.renderButton(slotRef.current, {
          theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', locale: 'es',
          width: Math.min(slotRef.current.offsetWidth || 320, 400),
        });
      })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);

  if (!CLIENT_ID || failed) return null;
  return (
    <>
      <div className={styles.divider}>{label}</div>
      <div ref={slotRef} className={styles['google-slot']} />
    </>
  );
}
