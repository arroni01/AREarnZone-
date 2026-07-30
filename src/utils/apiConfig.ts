const BACKEND_URL = (import.meta.env.VITE_API_URL as string) || "https://arearnzone-backend.onrender.com";

export const getApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const envApiUrl = import.meta.env.VITE_API_URL || (typeof process !== 'undefined' && process.env?.VITE_API_URL);
  if (envApiUrl) {
    return `${envApiUrl.replace(/\/$/, '')}${cleanEndpoint}`;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.endsWith('.web.app') || host.endsWith('.firebaseapp.com') || host.endsWith('.vercel.app')) {
      return `${BACKEND_URL.replace(/\/$/, '')}${cleanEndpoint}`;
    }
  }

  return cleanEndpoint;
};
