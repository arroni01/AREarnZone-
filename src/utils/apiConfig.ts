const DEFAULT_BACKEND_URL = (import.meta.env.VITE_API_URL as string) || "https://arearnzone.onrender.com";

export const getBackendUrl = (): string => {
  if (typeof window !== 'undefined') {
    // 1. Check URL query parameters for backend URL override (e.g. ?backend_url=https://...)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryBackend = urlParams.get('backend_url') || urlParams.get('api_url') || urlParams.get('backend');
      if (queryBackend && queryBackend.trim()) {
        const cleanQuery = queryBackend.trim().replace(/\/$/, '');
        localStorage.setItem('AREARNZONE_BACKEND_URL', cleanQuery);
        return cleanQuery;
      }
    } catch (e) {}

    // 2. Check localStorage custom backend URL set by Admin
    let localBackend = localStorage.getItem('AREARNZONE_BACKEND_URL') || localStorage.getItem('VITE_API_URL');
    if (localBackend && localBackend.trim()) {
      let clean = localBackend.trim().replace(/\/$/, '');
      // Auto-migrate old non-existent 'arearnzone-backend.onrender.com' to active 'arearnzone.onrender.com'
      if (clean.includes('arearnzone-backend.onrender.com')) {
        clean = clean.replace('arearnzone-backend.onrender.com', 'arearnzone.onrender.com');
        localStorage.setItem('AREARNZONE_BACKEND_URL', clean);
      }
      return clean;
    }
  }

  // 3. Environment variable if available
  const envApiUrl = import.meta.env.VITE_API_URL || (typeof process !== 'undefined' && process.env?.VITE_API_URL);
  if (envApiUrl && envApiUrl.trim()) {
    let clean = envApiUrl.trim().replace(/\/$/, '');
    if (clean.includes('arearnzone-backend.onrender.com')) {
      clean = clean.replace('arearnzone-backend.onrender.com', 'arearnzone.onrender.com');
    }
    return clean;
  }

  return DEFAULT_BACKEND_URL.replace(/\/$/, '');
};

export const setBackendUrl = (url: string): void => {
  if (typeof window !== 'undefined') {
    if (!url || !url.trim()) {
      localStorage.removeItem('AREARNZONE_BACKEND_URL');
    } else {
      localStorage.setItem('AREARNZONE_BACKEND_URL', url.trim().replace(/\/$/, ''));
    }
  }
};

export const getApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // On external hosted domains (Firebase Hosting, Vercel, Netlify, custom domain), route to backend URL
    if (
      host.endsWith('.web.app') ||
      host.endsWith('.firebaseapp.com') ||
      host.endsWith('.vercel.app') ||
      host.endsWith('.netlify.app') ||
      (!host.includes('localhost') && !host.includes('127.0.0.1') && !host.includes('run.app') && !host.includes('onrender.com'))
    ) {
      const backend = getBackendUrl();
      return `${backend}${cleanEndpoint}`;
    }
  }

  // Local or Cloud Run container where relative URLs work
  const envApiUrl = import.meta.env.VITE_API_URL || (typeof process !== 'undefined' && process.env?.VITE_API_URL);
  if (envApiUrl) {
    return `${envApiUrl.trim().replace(/\/$/, '')}${cleanEndpoint}`;
  }

  return cleanEndpoint;
};

