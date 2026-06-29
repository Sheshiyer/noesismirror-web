import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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
