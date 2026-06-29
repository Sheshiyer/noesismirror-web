import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function TokenHandler() {
  const location = useLocation();

  useEffect(() => {
    // Check for token in URL hash on every route change
    const hash = window.location.hash;
    if (hash.startsWith('#token=')) {
      const token = hash.substring(7); // Remove '#token='
      localStorage.setItem('noesis_token', token);
      // Remove hash from URL without reloading
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      // Refresh the page to trigger auth check
      window.location.reload();
    }
  }, [location]);

  return null;
}
