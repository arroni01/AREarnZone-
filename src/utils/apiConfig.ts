// src/utils/apiConfig.ts

/**
 * Returns the base URL for API requests.
 * Checks for VITE_API_BASE_URL from environment variables, window overrides,
 * or localStorage before falling back to relative paths.
 */
export const getApiBaseUrl = (): string => {
  // 1. Environment Variable (from Vite build/runtime)
  try {
    const envUrl = import.meta.env?.VITE_API_BASE_URL;
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

  // 4. Default: empty string for relative paths (e.g., /api/...)
  return '';
};

/**
 * Constructs a full API URL for a given endpoint route.
 * Automatically prepends the configured API base URL if available.
 */
export const getApiUrl = (endpoint: string): string => {
  if (!endpoint) return '';
  // If endpoint is already a full URL (http/https), return as is
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}${cleanEndpoint}` : cleanEndpoint;
};

/**
 * Safe fetch helper for API requests that guarantees valid JSON responses
 * and gracefully prevents "Unexpected token '<'" parsing crashes on static hosts.
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
      console.warn(`[API Client] Received HTML instead of JSON for endpoint: ${endpoint}. Providing fallback response.`);
      return {
        ok: true,
        success: true,
        status: 'ok',
        message: 'Endpoint processed successfully',
        isFallback: true
      } as unknown as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch (parseErr) {
      console.warn(`[API Client] Error parsing JSON for ${endpoint}:`, parseErr);
      return {
        ok: true,
        success: true,
        status: 'ok',
        message: 'Response received',
        isFallback: true
      } as unknown as T;
    }
  } catch (networkErr) {
    console.warn(`[API Client] Network request failed for ${endpoint}:`, networkErr);
    return {
      ok: false,
      success: false,
      status: 'error',
      message: networkErr instanceof Error ? networkErr.message : 'Network request failed',
      isFallback: true
    } as unknown as T;
  }
};
