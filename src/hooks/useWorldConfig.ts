import { useEffect, useState } from 'react';
import { WorldConfig } from '../types/world';
import { buildWorldConfig } from '../utils/buildWorldConfig';
import { API_URL } from '../config';

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
        const token = localStorage.getItem('noesis_token');
        const headers: Record<string, string> = {
          'Accept': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}/api/world/${encodeURIComponent(id)}`, {
          method: 'GET',
          headers,
        });

        if (response.status === 401) {
          throw new AuthError('Authentication required. Please log in.', 401);
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
