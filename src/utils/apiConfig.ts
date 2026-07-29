export const getApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (typeof window === 'undefined') return cleanEndpoint;
  
  const origin = window.location.origin;
  
  // If running directly on Cloud Run dev/pre container or localhost, use relative path
  if (
    origin.includes('-dev-') || 
    origin.includes('-pre-') || 
    origin.includes('localhost') || 
    origin.includes('127.0.0.1')
  ) {
    return cleanEndpoint;
  }

  // If running on Firebase Hosting (arearnzone-asia-no1-freelance.web.app) or custom domain,
  // target the live Cloud Run backend container URL
  const backendBase = origin.includes('-pre-')
    ? 'https://ais-pre-h4thh2b6cws4brqp63elrb-90229307226.asia-southeast1.run.app'
    : 'https://ais-dev-h4thh2b6cws4brqp63elrb-90229307226.asia-southeast1.run.app';

  return `${backendBase}${cleanEndpoint}`;
};
