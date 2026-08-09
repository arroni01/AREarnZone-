// src/utils/apiConfig.ts

export const DEFAULT_WORKER_URL = 'https://arearnzone.abdurrahman714915.workers.dev';

/**
 * Returns the base URL for API requests.
 * Checks for VITE_API_BASE_URL from environment variables, window overrides,
 * or localStorage before falling back to the default Cloudflare Worker endpoint.
 */
export const getApiBaseUrl = (): string => {
  let envUrl: string | undefined;

  // 1. Environment Variable (from Vite build/runtime)
  try {
    envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
      return envUrl.trim().replace(/\/+$/, '');
    }
  } catch (e) {
    // Ignore if import.meta is not available
  }

  // 2. Window object override (dynamic client configuration)
  if (typeof window !== 'undefined' && (window as any).VITE_API_BASE_URL) {
    return String((window as any).VITE_API_BASE_URL).trim().replace(/\/+$/, '');
  }

  // 3. LocalStorage override (for user-configured Cloudflare Worker endpoint)
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('arez_api_base_url');
      if (cached && cached.trim()) {
        return cached.trim().replace(/\/+$/, '');
      }
    } catch (e) {
      // Ignore localStorage restriction
    }
  }

  // Log a helpful warning in dev/browser console if env var was not provided
  if (!envUrl && typeof console !== 'undefined') {
    console.info(
      `[API Config] VITE_API_BASE_URL is not explicitly set in environment. Falling back to default Cloudflare Worker URL: ${DEFAULT_WORKER_URL}`
    );
  }

  // 4. Default: Cloudflare Worker absolute backend URL
  return DEFAULT_WORKER_URL;
};

/**
 * Constructs a full API URL for a given endpoint route.
 * Automatically prepends the configured Cloudflare Worker API base URL.
 */
export const getApiUrl = (endpoint: string): string => {
  if (!endpoint) return getApiBaseUrl();
  
  // If endpoint is already a full URL (http/https), return as is
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${cleanEndpoint}`;
};

/**
 * Safe fetch helper for API requests that guarantees valid JSON responses,
 * handles CORS / network errors gracefully, and prevents parsing crashes.
 */
export const apiFetch = async <T = any>(endpoint: string, options?: RequestInit): Promise<T> => {
  const url = getApiUrl(endpoint);
  
  const defaultHeaders: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (options?.body && typeof options.body === 'string') {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const mergedOptions: RequestInit = {
    mode: 'cors',
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options?.headers || {}),
    },
  };

  try {
    const response = await fetch(url, mergedOptions);
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    const trimmed = text.trim();

    // Check if the response returned an HTML document instead of JSON (e.g., static hosting 404 fallback)
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || contentType.includes('text/html')) {
      console.warn(`[API Client] Received HTML instead of JSON for endpoint: ${endpoint}.`);
      return {
        ok: false,
        success: false,
        status: 'error',
        isConfigured: false,
        isBotOnline: false,
        valid: false,
        message: `API endpoint ${endpoint} returned HTML instead of valid JSON.`,
        error: 'HTML_RESPONSE_RECEIVED'
      } as unknown as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch (parseErr) {
      console.warn(`[API Client] Error parsing JSON for ${endpoint}:`, parseErr);
      return {
        ok: false,
        success: false,
        status: 'error',
        isConfigured: false,
        isBotOnline: false,
        valid: false,
        message: `Failed to parse response from ${endpoint}`,
        error: String(parseErr)
      } as unknown as T;
    }
  } catch (networkErr) {
    const errorMsg = networkErr instanceof Error ? networkErr.message : String(networkErr);
    console.warn(`[API Client] Request to ${url} failed ("${errorMsg}"):`, networkErr);
    
    return {
      ok: false,
      success: false,
      status: 'error',
      isConfigured: false,
      isBotOnline: false,
      valid: false,
      message: `Unable to reach Cloudflare Worker at ${url}. (${errorMsg})`,
      error: errorMsg,
    } as unknown as T;
  }
};

// Global interceptor for Response.prototype.json as a secondary safety guard
if (typeof window !== 'undefined' && typeof Response !== 'undefined' && Response.prototype) {
  const originalJson = Response.prototype.json;
  Response.prototype.json = async function () {
    try {
      const clone = this.clone();
      const text = await clone.text();
      const trimmed = text.trim();
      if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<?xml')) {
        console.warn('[API Safety Guard] Prevented HTML parse crash. Returning error status.');
        return {
          ok: false,
          status: 'error',
          success: false,
          isConfigured: false,
          isBotOnline: false,
          valid: false,
          message: 'Endpoint returned HTML instead of valid JSON',
          error: 'HTML_RESPONSE_RECEIVED'
        };
      }
      return JSON.parse(text);
    } catch (err) {
      return originalJson.call(this).catch(() => ({
        ok: false,
        status: 'error',
        success: false,
        isConfigured: false,
        isBotOnline: false,
        valid: false,
        message: 'Failed to parse JSON response',
        error: String(err)
      }));
    }
  };
}
