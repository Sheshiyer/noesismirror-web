import { useEffect, useState } from 'react';
import { WorldConfig } from '../types/world';
import { buildWorldConfig } from '../utils/buildWorldConfig';

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

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setConfig(null);

      try {
        const response = await fetch(`/packs/${encodeURIComponent(personId)}/world-config.json`);
        if (!response.ok) {
          throw new Error(`Failed to load config: ${response.status} ${response.statusText}`);
        }
        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
          throw new Error(`Config not found for "${personId}"`);
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
