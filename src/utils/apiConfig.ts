export const getApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (typeof window === 'undefined') return cleanEndpoint;
  
  const origin = window.location.origin;
  
  // If running directly on Cloud Run (.run.app / .ai.studio) or localhost, use relative path
  if (
    origin.includes('.run.app') || 
    origin.includes('.ai.studio') || 
    origin.includes('localhost') || 
    origin.includes('127.0.0.1')
  ) {
    return cleanEndpoint;
  }

  // If running on Firebase Hosting (arearnzone-asia-no1-freelance.web.app) or custom domain,
  // target the live production Cloud Run backend container URL
  const backendBase = 'https://ais-pre-h4thh2b6cws4brqp63elrb-90229307226.asia-southeast1.run.app';

  return `${backendBase}${cleanEndpoint}`;
};
