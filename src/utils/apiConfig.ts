// src/utils/apiConfig.ts

export const DEFAULT_WORKER_URL = 'https://arearnzone.abdurrahman714915.workers.dev';

/**
 * Returns the base URL for API requests.
 * Uses environment variable VITE_API_BASE_URL, window overrides, cached settings,
 * or defaults to window origin / live Cloudflare Worker URL.
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
    const winUrl = String((window as any).VITE_API_BASE_URL).trim().replace(/\/+$/, '');
    if (winUrl) {
      return winUrl;
    }
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

  // 4. Default to current browser origin if available, or fallback to Cloudflare Worker URL
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }

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

export interface ApiLogEntry {
  id: string;
  url: string;
  endpoint: string;
  method: string;
  statusCode: number | string;
  ok: boolean;
  responseBody: any;
  rawText?: string;
  error?: string;
  timestamp: string;
  latencyMs: number;
}

type ApiLogListener = (logs: ApiLogEntry[]) => void;
const apiLogs: ApiLogEntry[] = [];
const apiLogListeners: Set<ApiLogListener> = new Set();

export const subscribeApiLogs = (listener: ApiLogListener) => {
  apiLogListeners.add(listener);
  listener([...apiLogs]);
  return () => {
    apiLogListeners.delete(listener);
  };
};

export const getApiLogs = (): ApiLogEntry[] => [...apiLogs];

export const clearApiLogs = () => {
  apiLogs.length = 0;
  apiLogListeners.forEach((fn) => fn([]));
};

const recordApiLog = (entry: ApiLogEntry) => {
  apiLogs.unshift(entry);
  if (apiLogs.length > 100) apiLogs.length = 100;
  apiLogListeners.forEach((fn) => fn([...apiLogs]));
};

/**
 * Safe fetch helper for API requests that guarantees valid JSON responses,
 * handles CORS / network errors gracefully, and prevents parsing crashes.
 */
export const apiFetch = async <T = any>(endpoint: string, options?: RequestInit): Promise<T> => {
  const url = getApiUrl(endpoint);
  const method = (options?.method || 'GET').toUpperCase();
  const startTime = Date.now();
  
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
    const latencyMs = Date.now() - startTime;
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    const trimmed = text.trim();

    // Check if the response returned an HTML document instead of JSON (e.g., static hosting 404 fallback)
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || contentType.includes('text/html')) {
      console.warn(`[API Client] Received HTML instead of JSON for endpoint: ${endpoint}.`);
      const resObj = {
        ok: false,
        success: false,
        status: 'error',
        isConfigured: false,
        isBotOnline: false,
        valid: false,
        message: `API endpoint ${endpoint} returned HTML instead of valid JSON.`,
        error: 'HTML_RESPONSE_RECEIVED'
      };
      recordApiLog({
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        url,
        endpoint,
        method,
        statusCode: response.status || 404,
        ok: false,
        responseBody: resObj,
        rawText: text.substring(0, 500),
        error: 'HTML_RESPONSE_RECEIVED',
        timestamp: new Date().toLocaleTimeString(),
        latencyMs,
      });
      return resObj as unknown as T;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      console.warn(`[API Client] Error parsing JSON for ${endpoint}:`, parseErr);
      const resObj = {
        ok: false,
        success: false,
        status: 'error',
        statusCode: response.status,
        isConfigured: false,
        isBotOnline: false,
        valid: false,
        message: `Failed to parse response from ${endpoint} (HTTP ${response.status})`,
        error: String(parseErr)
      };
      recordApiLog({
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        url,
        endpoint,
        method,
        statusCode: response.status,
        ok: false,
        responseBody: resObj,
        rawText: text.substring(0, 500),
        error: String(parseErr),
        timestamp: new Date().toLocaleTimeString(),
        latencyMs,
      });
      return resObj as unknown as T;
    }

    if (!response.ok) {
      console.warn(`[API Client] Endpoint ${endpoint} returned HTTP ${response.status}:`, parsed);
      const resObj = typeof parsed === 'object' && parsed !== null ? {
        ok: false,
        success: false,
        status: 'error',
        statusCode: response.status,
        ...parsed,
        error: parsed.error || parsed.message || `HTTP ${response.status} Error`,
      } : {
        ok: false,
        success: false,
        status: 'error',
        statusCode: response.status,
        message: `HTTP ${response.status} Error`,
        error: `HTTP ${response.status} Error`,
      };

      recordApiLog({
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        url,
        endpoint,
        method,
        statusCode: response.status,
        ok: false,
        responseBody: resObj,
        rawText: text,
        error: resObj.error,
        timestamp: new Date().toLocaleTimeString(),
        latencyMs,
      });

      return resObj as unknown as T;
    }

    recordApiLog({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      url,
      endpoint,
      method,
      statusCode: response.status,
      ok: true,
      responseBody: parsed,
      rawText: text,
      timestamp: new Date().toLocaleTimeString(),
      latencyMs,
    });

    return parsed as T;
  } catch (networkErr) {
    const latencyMs = Date.now() - startTime;
    const errorMsg = networkErr instanceof Error ? networkErr.message : String(networkErr);
    console.warn(`[API Client] Request to ${url} failed ("${errorMsg}"):`, networkErr);
    
    const resObj = {
      ok: false,
      success: false,
      status: 'error',
      isConfigured: false,
      isBotOnline: false,
      valid: false,
      message: `Unable to reach Cloudflare Worker at ${url}. (${errorMsg})`,
      error: errorMsg,
    };

    recordApiLog({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      url,
      endpoint,
      method,
      statusCode: 'ERR_NETWORK',
      ok: false,
      responseBody: resObj,
      error: errorMsg,
      timestamp: new Date().toLocaleTimeString(),
      latencyMs,
    });

    return resObj as unknown as T;
  }
};

// Global interceptor for Response.prototype.json as a secondary safety guard
if (typeof window !== 'undefined' && typeof Response !== 'undefined' && Response.prototype) {
  const originalJson = Response.prototype.json;
  Response.prototype.json = async function () {
    try {
      const clone = this.clone();
      const text = await clone.text();
      const trimmed = (text || '').trim();
      if (!trimmed) {
        return {
          ok: false,
          status: 'error',
          success: false,
          isConfigured: false,
          isBotOnline: false,
          valid: false,
          message: 'Empty response from server',
          error: 'EMPTY_RESPONSE'
        };
      }
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
      try {
        const text = await this.text().catch(() => '');
        const trimmed = (text || '').trim();
        if (trimmed && !trimmed.startsWith('<')) {
          return JSON.parse(trimmed);
        }
      } catch (fallbackErr) {}

      return {
        ok: false,
        status: 'error',
        success: false,
        isConfigured: false,
        isBotOnline: false,
        valid: false,
        message: 'Failed to parse JSON response',
        error: String(err)
      };
    }
  };
}

/**
 * Safe JSON parser for arbitrary Response objects that never throws SyntaxError
 */
export const safeParseJsonResponse = async <T = any>(res: Response, fallback: any = {}): Promise<T> => {
  try {
    const text = await res.text().catch(() => '');
    const trimmed = (text || '').trim();
    if (!trimmed) {
      return { ok: false, success: false, error: 'Empty response from server', ...fallback } as T;
    }
    if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
      return { ok: false, success: false, error: 'Received HTML response instead of JSON', ...fallback } as T;
    }
    return JSON.parse(trimmed);
  } catch (err: any) {
    return { ok: false, success: false, error: err?.message || 'Failed to parse JSON', ...fallback } as T;
  }
};

