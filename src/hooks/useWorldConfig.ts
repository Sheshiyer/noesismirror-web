import { useEffect, useState } from 'react';
import { WorldConfig } from '../types/world';
import { buildWorldConfig } from '../utils/buildWorldConfig';

const API_URL = import.meta.env.VITE_API_URL || '';

// Use relative paths for API calls when proxied through same domain
// This ensures CF Access cookies are sent correctly
const getApiUrl = (path: string) => {
  // If API_URL is set and not localhost, use it (for local dev)
  if (API_URL && !API_URL.includes('localhost')) {
    return `${API_URL}${path}`;
  }
  // Otherwise use relative path (proxied through Vercel/CF)
  return path;
};

/** Custom error class for auth-related failures */
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

interface UseWorldConfigResult {
  config: WorldConfig | null;
  loading: boolean;
  error: Error | null;
}

export function useWorldConfig(personId: string | undefined): UseWorldConfigResult {
  const [config, setConfig] = useState<WorldConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!personId) {
      setError(new Error('No personId provided'));
      setLoading(false);
      return;
    }

    const id = personId;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setConfig(null);

      try {
        const response = await fetch(getApiUrl(`/api/world/${encodeURIComponent(id)}`), {
          method: 'GET',
          credentials: 'include', // Include cookies for CF Access auth
          headers: {
            'Accept': 'application/json',
          },
        });

        if (response.status === 401) {
          throw new AuthError('Authentication required. Please log in via Cloudflare Access.', 401);
        }

        if (response.status === 403) {
          throw new AuthError(`You do not have access to this reading.`, 403);
        }

        if (!response.ok) {
          throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
          throw new Error(`Config not found for "${id}"`);
        }

        const raw = await response.json();
        if (cancelled) return;

        const parsed = buildWorldConfig(raw);
        setConfig(parsed);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [personId]);

  return { config, loading, error };
}
