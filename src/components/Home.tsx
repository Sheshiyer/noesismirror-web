import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '../config';

interface LocationState {
  reason?: 'session_expired' | 'no_access';
  personId?: string;
}

const FLASH_MESSAGES: Record<NonNullable<LocationState['reason']>, string> = {
  session_expired: 'Your session expired. Please sign in again.',
  no_access: 'You do not have access to that reading.',
};

interface GrantsResponse {
  grants: string[];
}

const OUTER_CLASSES =
  'min-h-screen w-full bg-noesis-void text-noesis-parchment font-sans flex flex-col items-center justify-center relative overflow-hidden';

const BUTTON_CLASSES =
  'border border-noesis-gold/60 hover:border-noesis-gold bg-transparent hover:bg-noesis-gold/10 text-noesis-gold font-mono uppercase tracking-[0.25em] text-sm px-8 py-3 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed';

function Backdrop() {
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent 0 39px, #C5A017 39px 40px),
            repeating-linear-gradient(90deg, transparent 0 39px, #C5A017 39px 40px)
          `,
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(45,0,80,0.4) 0%, transparent 60%)',
        }}
      />
    </>
  );
}

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [grants, setGrants] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const flashReason = (location.state as LocationState | null)?.reason;
  const flashMessage = flashReason ? FLASH_MESSAGES[flashReason] : null;

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
      <div className={OUTER_CLASSES}>
        <Backdrop />
        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-8 opacity-90">
            <img src="/brand-logo.svg" alt="Tryambakam Noesis" className="w-24 h-24 animate-pulse" />
          </div>
          <div className="font-mono text-xs text-noesis-parchment/60 uppercase tracking-[0.3em]">
            Entering the field…
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !isAuthenticated) {
    return (
      <div className={OUTER_CLASSES}>
        <Backdrop />
        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-8 opacity-90">
            <img src="/brand-logo.svg" alt="Tryambakam Noesis" className="w-24 h-24" />
          </div>
          <h1 className="font-display text-5xl md:text-6xl text-noesis-gold tracking-[0.3em] mb-2 text-center">
            TRYAMBAKAM NOESIS
          </h1>
          <p className="font-mono text-xs md:text-sm text-noesis-parchment/50 uppercase tracking-[0.4em] mb-12 text-center">
            Self-Consciousness as Technology
          </p>
          <div className="font-mono text-sm text-noesis-emerald uppercase tracking-wider border border-noesis-emerald/40 px-4 py-2 mb-8">
            {error}
          </div>
          <button className={BUTTON_CLASSES} onClick={handleAuth}>
            [ AUTHENTICATE ]
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={OUTER_CLASSES}>
      <Backdrop />
      <div className="relative z-10 flex flex-col items-center w-full">
        <div className="mb-8 opacity-90">
          <img src="/brand-logo.svg" alt="Tryambakam Noesis" className="w-24 h-24" />
        </div>

        <h1 className="font-display text-5xl md:text-6xl text-noesis-gold tracking-[0.3em] mb-2 text-center">
          TRYAMBAKAM NOESIS
        </h1>
        <p className="font-mono text-xs md:text-sm text-noesis-parchment/50 uppercase tracking-[0.4em] mb-12 text-center">
          Self-Consciousness as Technology
        </p>

        {flashMessage && (
          <div
            className="font-mono text-sm text-noesis-emerald uppercase tracking-wider border border-noesis-emerald/40 px-4 py-2 mb-8"
            role="status"
          >
            {flashMessage}
          </div>
        )}

        <div className="max-w-2xl font-sans text-noesis-parchment/80 text-center space-y-4 leading-relaxed mb-12 px-6">
          <p>A private 3D memory palace for witness premium packs.</p>
          <p>The 16 symbolic mirrors of the Noesis Engine are cast here as a walkable field.</p>
          <p>Terrain becomes text. Distance becomes inquiry.</p>
        </div>

        {!isAuthenticated ? (
          <div className="flex flex-col items-center gap-4">
            <div className="font-mono text-xs text-noesis-parchment/60 uppercase tracking-[0.3em]">
              Please authenticate to enter the field.
            </div>
            <button className={BUTTON_CLASSES} onClick={handleAuth}>
              [ SIGN IN ]
            </button>
          </div>
        ) : grants.length === 0 ? (
          <div className="flex flex-col items-center gap-4">
            <div className="font-mono text-xs text-noesis-parchment/60 uppercase tracking-[0.3em]">
              Your account has no granted readings.
            </div>
            <button className={BUTTON_CLASSES} onClick={handleEnterDashboard}>
              [ ENTER DASHBOARD ]
            </button>
          </div>
        ) : grants.length === 1 ? (
          <div className="flex flex-col items-center">
            <button className={BUTTON_CLASSES} onClick={() => handleEnterField(grants[0])}>
              [ ENTER FIELD — {grants[0].toUpperCase()} ]
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full max-w-md">
            <div className="font-mono text-xs text-noesis-parchment/50 uppercase tracking-[0.3em] mb-4">
              Your Readings
            </div>
            <div className="flex flex-col gap-3 w-full mb-6">
              {grants.map((grant) => (
                <button
                  key={grant}
                  className={`${BUTTON_CLASSES} w-full`}
                  onClick={() => handleEnterField(grant)}
                >
                  [ {grant.toUpperCase()} ]
                </button>
              ))}
            </div>
            <button className={BUTTON_CLASSES} onClick={handleEnterDashboard}>
              [ DASHBOARD ]
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
