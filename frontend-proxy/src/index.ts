/**
 * Noesis Frontend Proxy
 * Proxies all requests to Vercel with CF Access enforcement
 */

const VERCEL_URL = 'https://noesismirror-web-falseearth-ds3wh13o3-sheshiyers-projects.vercel.app';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Build target URL on Vercel
    const targetUrl = new URL(url.pathname + url.search + url.hash, VERCEL_URL);
    
    // Clone request with new URL
    const modifiedRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    
    // Fetch from Vercel
    const response = await fetch(modifiedRequest);
    
    // Clone response to modify headers
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
    
    // Add CORS headers for the frontend domain
    newResponse.headers.set('Access-Control-Allow-Origin', url.origin);
    newResponse.headers.set('Access-Control-Allow-Credentials', 'true');
    
    return newResponse;
  }
};

type Env = Record<string, never>;
