// Nombre de la marca: única fuente para navbar, login, registro, footer y topbars
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Aura Stay';

// Tema de color: 'wine' (vinotinto) o 'green' (verde original de Aura Food). Los colores viven en index.css
export const THEMES = ['wine', 'green'];
const requestedTheme = import.meta.env.VITE_THEME || 'wine';
export const THEME = THEMES.includes(requestedTheme) ? requestedTheme : 'wine';

// Aplica el tema en <html> y el favicon que le corresponde; se llama antes del primer render para evitar parpadeos
export function applyTheme(theme = THEME) {
  document.documentElement.dataset.theme = theme;
  const icon = document.querySelector('link[rel="icon"]');
  if (icon) icon.href = `/favicon-${theme}.svg`;
}
