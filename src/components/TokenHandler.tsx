import { useEffect } from 'react';
import { useLocation, useNavigate, type NavigateFunction } from 'react-router-dom';

export function TokenHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith('#token=')) return;

    const token = decodeURIComponent(hash.substring(7));
    localStorage.setItem('noesis_token', token);
    navigate('/', { replace: true });
  }, [location, navigate]);

  return null;
}

/**
 * Sign out the current user. Clears the auth token while preserving
 * any other preference keys in localStorage, then navigates to the
 * root route.
 */
export function signOut(navigate: NavigateFunction) {
  localStorage.removeItem('noesis_token');
  navigate('/', { replace: true });
}
