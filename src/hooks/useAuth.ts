import { useEffect, useState, useCallback } from 'react';

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

interface GrantsResponse {
  grants: string[];
}

interface UseAuthResult {
  isAuthenticated: boolean;
  isLoading: boolean;
  grants: string[];
  error: Error | null;
  refetch: () => void;
}

/**
 * Check if CF_Authorization cookie exists
 * Note: We can't read HttpOnly cookies directly, but we can check for existence
 * by attempting to fetch the grants endpoint
 */
function hasCFAuthCookie(): boolean {
  // CF_Authorization cookie is HttpOnly, so we can't read it directly
  // We infer auth status from the API response
  // This check is a hint - actual auth is determined by the API call
  return document.cookie.split(';').some(c => 
    c.trim().startsWith('CF_Authorization=')
  );
}

export function useAuth(): UseAuthResult {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [grants, setGrants] = useState<string[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const fetchGrants = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(getApiUrl('/api/grants'), {
        method: 'GET',
        credentials: 'include', // Include cookies for CF Access auth
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.status === 401) {
        // Not authenticated - CF Access will handle redirect
        setIsAuthenticated(false);
        setGrants([]);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch grants: ${response.status} ${response.statusText}`);
      }

      const data: GrantsResponse = await response.json();
      setIsAuthenticated(true);
      setGrants(data.grants ?? []);
    } catch (err) {
      // Network error or parsing error
      // If we can't reach the API, check cookie as fallback hint
      if (!hasCFAuthCookie()) {
        setIsAuthenticated(false);
        setGrants([]);
      } else {
        // Cookie exists but request failed - might be a server error
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGrants();
  }, [fetchGrants]);

  return {
    isAuthenticated,
    isLoading,
    grants,
    error,
    refetch: fetchGrants,
  };
}
