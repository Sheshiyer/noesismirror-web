export const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  'https://immersiveapi.tryambakam.space';

export function buildAssetUrl(assetUrl: string): string {
  // Append the JWT from localStorage as a query param so HTML <video>/<audio>/<object>
  // elements (which can't send Authorization headers) authenticate via the URL.
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('noesis_token') : null;
  if (!token) return assetUrl;
  const u = new URL(assetUrl, API_URL);
  u.searchParams.set('token', token);
  return u.toString();
}
