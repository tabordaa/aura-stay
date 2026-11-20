import { useCallback, useEffect, useState } from 'react';
import { favoritesService } from '../services/favorites.service';

/**
 * Favoritos del usuario actual. El cambio es optimista: el corazón responde al instante
 * y, si el servicio falla, vuelve a su estado anterior y deja el error para mostrarlo.
 */
export function useFavorites(userId) {
  const [favorites, setFavorites] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    favoritesService.list()
      .then((ids) => { if (active) setFavorites(ids); })
      .catch(() => { if (active) setFavorites([]); });
    return () => { active = false; };
  }, [userId]);

  const toggleFav = useCallback((id) => {
    setError('');
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
    favoritesService.toggle(id)
      .then(setFavorites)
      .catch((err) => {
        setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
        setError(err.message);
      });
  }, []);

  return { favorites, toggleFav, error };
}
