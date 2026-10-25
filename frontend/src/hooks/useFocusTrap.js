import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Trampa de foco para diálogos: foco inicial, Tab/Shift+Tab cíclico dentro del contenedor,
 * cierre con Escape y devolución del foco al elemento que abrió el diálogo.
 * - containerRef: contenedor del diálogo (con tabIndex={-1} si no hay `initialFocusRef`).
 * - initialFocusRef: elemento que recibe el foco al abrir (por defecto, el contenedor).
 * - onEscape: se invoca con Escape; pasar undefined mientras el diálogo esté ocupado.
 * - active: permite montar el hook siempre y activarlo solo cuando el diálogo está abierto.
 */
export default function useFocusTrap(containerRef, { active = true, initialFocusRef, onEscape } = {}) {
  // Siempre la última versión de onEscape sin reiniciar el efecto
  const escapeRef = useRef(onEscape);
  useEffect(() => { escapeRef.current = onEscape; });

  // Disparador que abrió el diálogo; sobrevive a los re-montajes de StrictMode
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;
    const container = containerRef.current;
    // Solo se captura si el foco aún está fuera del diálogo (en un re-montaje ya estaría dentro)
    const current = document.activeElement;
    if (current && container && !container.contains(current)) triggerRef.current = current;
    (initialFocusRef?.current ?? container)?.focus?.();

    const onKeyDown = (e) => {
      // Con diálogos apilados solo responde el de más arriba
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      if (dialogs.length && dialogs[dialogs.length - 1] !== containerRef.current) return;
      if (e.key === 'Escape') {
        if (escapeRef.current) escapeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = containerRef.current;
      if (!root) return;
      const nodes = [...root.querySelectorAll(FOCUSABLE)].filter(n => n.offsetParent !== null || n === document.activeElement);
      if (nodes.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const current = document.activeElement;
      if (e.shiftKey && (current === first || current === root || !root.contains(current))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || !root.contains(current))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // Si se cerró para abrir otro diálogo (p. ej. drawer -> checkout), no le robamos el foco
      const otherOpen = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].some(d => d !== container);
      const trigger = triggerRef.current;
      if (!otherOpen && trigger && document.contains(trigger)) trigger.focus?.();
    };
  }, [active, containerRef, initialFocusRef]);
}
