/**
 * Safe API Client & Resilient Fetch Utility
 * 
 * Provides automated backend URL resolution, CORS fallback,
 * and robust error catching for Telegram API and SMTP requests.
 */

// Primary Cloud Run backend URLs for when frontend is accessed via external/static domains
const PRIMARY_BACKEND_URL = "https://ais-dev-h4thh2b6cws4brqp63elrb-90229307226.asia-southeast1.run.app";
const PREVIEW_BACKEND_URL = "https://ais-pre-h4thh2b6cws4brqp63elrb-90229307226.asia-southeast1.run.app";

/**
 * Returns the best backend origin URL for the current environment.
 */
export function getBackendOrigin(): string {
  if (typeof window === 'undefined') return PRIMARY_BACKEND_URL;

  const location = window.location;
  const currentOrigin = location.origin && location.origin !== 'null' ? location.origin : '';

  // If we are already running on Cloud Run or localhost, use current origin
  if (
    currentOrigin.includes('.run.app') ||
    currentOrigin.includes('localhost') ||
    currentOrigin.includes('127.0.0.1')
  ) {
    return currentOrigin;
  }

  // If on -pre- domain or explicitly configured
  if (location.href.includes('-pre-')) {
    return PREVIEW_BACKEND_URL;
  }

  return PRIMARY_BACKEND_URL;
}

/**
 * Formats full API URL for a given endpoint.
 */
export function getApiUrl(endpoint: string, forceBackendHost = false): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (forceBackendHost) {
    const backendOrigin = getBackendOrigin();
    return `${backendOrigin}${cleanEndpoint}`;
  }

  if (typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null') {
    const origin = window.location.origin;
    // If running on an external static domain like firebaseapp / web.app / custom domain,
    // relative paths won't hit Express unless forced to backendOrigin
    if (!origin.includes('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      const backendOrigin = getBackendOrigin();
      return `${backendOrigin}${cleanEndpoint}`;
    }
    return `${origin.replace(/\/$/, '')}${cleanEndpoint}`;
  }

  return `${PRIMARY_BACKEND_URL}${cleanEndpoint}`;
}

/**
 * Safe fetch wrapper that handles:
 * 1. Automatic JSON detection
 * 2. Fallback from relative URL to absolute backend URL on CORS / network error or HTML response
 * 3. Graceful error catching with user-friendly diagnostic messages (never crashes with uncaught "Failed to fetch")
 */
export async function safeApiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  // Construct primary URL (current origin) and secondary URL (direct Cloud Run backend)
  const primaryUrl = getApiUrl(endpoint, false);
  const fallbackUrl = getApiUrl(endpoint, true);

  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {})
    }
  };

  const tryFetch = async (url: string): Promise<{ ok: boolean; status: number; data?: any; error?: string }> => {
    try {
      const response = await fetch(url, fetchOptions);
      const contentType = response.headers.get('content-type') || '';

      // Check if response returned static HTML (e.g. SPA fallback index.html) instead of API JSON
      if (contentType.includes('text/html')) {
        const text = await response.text();
        if (text.trim().startsWith('<!') || text.includes('<html')) {
          return { ok: false, status: response.status, error: 'HTML_SPA_FALLBACK' };
        }
      }

      let parsedData: any = null;
      try {
        parsedData = await response.json();
      } catch (jsonErr) {
        return { ok: false, status: response.status, error: 'Invalid JSON response from server.' };
      }

      if (!response.ok) {
        const errMsg = parsedData?.error || parsedData?.message || `HTTP error ${response.status}`;
        return { ok: false, status: response.status, data: parsedData, error: errMsg };
      }

      return { ok: true, status: response.status, data: parsedData };
    } catch (err: any) {
      return { ok: false, status: 0, error: err.message || 'Network request failed' };
    }
  };

  // Attempt 1: Primary URL
  let result = await tryFetch(primaryUrl);

  // Attempt 2: If primary failed with HTML fallback or network/CORS error, try direct backend URL
  if (!result.ok && (result.error === 'HTML_SPA_FALLBACK' || result.status === 0 || primaryUrl !== fallbackUrl)) {
    if (primaryUrl !== fallbackUrl) {
      result = await tryFetch(fallbackUrl);
    }
  }

  // Handle ultimate failure with diagnostic error
  if (!result.ok && !result.error) {
    result.error = 'সার্ভার কানেকশন ত্রুটি: নেটওয়ার্ক বা CORS ব্লকের কারণে সংযোগ বিচ্ছিন্ন হয়েছে। (Network/CORS Error)';
  } else if (!result.ok && result.error === 'HTML_SPA_FALLBACK') {
    result.error = 'ব্যাকএন্ড সার্ভার রেসপন্স মেলেনি। (Backend Server Route Not Reachable)';
  } else if (!result.ok && (result.status === 0 || result.error?.includes('Failed to fetch') || result.error?.includes('NetworkError'))) {
    result.error = 'সার্ভার কানেকশন ত্রুটি: নেটওয়ার্ক বা CORS ব্লকের কারণে সংযোগ বিচ্ছিন্ন হয়েছে। (Network/CORS Error)';
  }

  return result;
}
