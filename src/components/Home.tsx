import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'https://immersiveapi.tryambakam.space';

interface GrantsResponse {
  grants: string[];
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [grants, setGrants] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const getToken = () => localStorage.getItem('noesis_token');

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const token = getToken();
    if (!token) {
      setIsAuthenticated(false);
      setGrants([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/grants`, {
        method: 'GET',
        headers: { 
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('noesis_token');
        setIsAuthenticated(false);
        setGrants([]);
        return;
      }

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: GrantsResponse = await response.json();
      setIsAuthenticated(true);
      setGrants(data.grants ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Check for token in URL hash (from redirect auth)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#token=')) {
      const token = hash.substring(7); // Remove '#token='
      localStorage.setItem('noesis_token', token);
      // Remove hash from URL without reloading
      window.history.replaceState(null, '', window.location.pathname);
      checkAuth();
    }
  }, [checkAuth]);

  const handleAuth = () => {
    // Redirect to API auth endpoint - more reliable than popup
    // After CF Access login, API will redirect back with token in URL hash
    window.location.href = `${API_URL}/auth/callback?redirect=${encodeURIComponent(window.location.origin)}`;
  };

  const handleEnterField = (personId: string) => {
    navigate(`/p/${personId}`);
  };

  const handleEnterDashboard = () => {
    navigate('/home');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="home-container">
        <div className="brand-sigil-container">
          <img src="/brand-logo.svg" alt="Tryambakam Noesis" className="brand-sigil loading" />
        </div>
        <div className="loading-text">Entering the field...</div>
      </div>
    );
  }

  // Error state
  if (error && !isAuthenticated) {
    return (
      <div className="home-container">
        <div className="brand-sigil-container">
          <img src="/brand-logo.svg" alt="Tryambakam Noesis" className="brand-sigil" />
        </div>
        <div className="title">TRYAMBAKAM NOESIS</div>
        <div className="subtitle">Self-Consciousness as Technology</div>
        <div className="error-message">{error}</div>
        <button className="auth-button" onClick={handleAuth}>
          [ AUTHENTICATE ]
        </button>
      </div>
    );
  }

  return (
    <div className="home-container">
      <div className="brand-sigil-container">
        <img src="/brand-logo.svg" alt="Tryambakam Noesis" className="brand-sigil" />
      </div>

      <div className="title">TRYAMBAKAM NOESIS</div>
      <div className="subtitle">Self-Consciousness as Technology</div>

      <div className="description">
        <p>A private 3D memory palace for witness premium packs.</p>
        <p>The 16 symbolic mirrors of the Noesis Engine are cast here as a walkable field.</p>
        <p>Terrain becomes text. Distance becomes inquiry.</p>
      </div>

      {!isAuthenticated ? (
        <div className="auth-section">
          <div className="auth-message">Please authenticate to enter the field.</div>
          <button className="auth-button" onClick={handleAuth}>
            [ SIGN IN ]
          </button>
        </div>
      ) : grants.length === 0 ? (
        <div className="auth-section">
          <div className="auth-message">Your account has no granted readings.</div>
          <button className="auth-button" onClick={handleEnterDashboard}>
            [ ENTER DASHBOARD ]
          </button>
        </div>
      ) : grants.length === 1 ? (
        <div className="auth-section">
          <button className="auth-button enter" onClick={() => handleEnterField(grants[0])}>
            [ ENTER FIELD — {grants[0].toUpperCase()} ]
          </button>
        </div>
      ) : (
        <div className="grants-section">
          <div className="grants-title">Your Readings</div>
          <div className="grants-list">
            {grants.map((grant) => (
              <button
                key={grant}
                className="grant-button"
                onClick={() => handleEnterField(grant)}
              >
                [ {grant.toUpperCase()} ]
              </button>
            ))}
          </div>
          <button className="auth-button secondary" onClick={handleEnterDashboard}>
            [ DASHBOARD ]
          </button>
        </div>
      )}
    </div>
  );
}
