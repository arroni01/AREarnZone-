
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initErrorTracker } from './utils/errorTracker';

// Safely redirect to the primary domain when accessed directly in a browser tab
if (typeof window !== 'undefined') {
  // Fast-path redirect for Google OAuth Callback when received on the static hosting domain
  if (window.location.pathname === '/auth/google/callback' || 
      window.location.pathname === '/api/auth/callback/google' ||
      window.location.pathname.startsWith('/api/auth/callback/')) {
    console.log('[API Proxy] Redirecting Google OAuth Callback to live server:', window.location.pathname);
    window.location.replace(`https://ais-pre-h4thh2b6cws4brqp63elrb-90229307226.asia-southeast1.run.app${window.location.pathname}${window.location.search}${window.location.hash}`);
  }

  const isFramed = () => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true; // Assume framed if cross-origin policy prevents access
    }
  };

  const hostname = window.location.hostname;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  const isTargetDomain = hostname === 'arearnzone-asia-no1-freelance.web.app' || 
                         hostname === 'arearnzone-asia-no1-freelance.firebaseapp.com' ||
                         hostname === 'arearnzone.com' ||
                         hostname === 'www.arearnzone.com';
  const isPrimaryDomain = hostname === 'arearnzone-asia-no1-freelance.web.app';
  const isBypass = window.location.search.includes('no-redirect');

  if (!isLocal && !isPrimaryDomain && !isBypass && !isFramed()) {
    console.log('[Redirect] Navigating to primary production domain: https://arearnzone-asia-no1-freelance.web.app');
    window.location.replace(`https://arearnzone-asia-no1-freelance.web.app${window.location.pathname}${window.location.search}${window.location.hash}`);
  }

  // Intercept and proxy relative API calls to the live production server when running on Firebase Hosting
  const originalFetch = window.fetch;
  try {
    Object.defineProperty(window, 'fetch', {
      value: function (input: RequestInfo | URL, init?: RequestInit) {
        if (isTargetDomain) {
          const backendBase = 'https://ais-pre-h4thh2b6cws4brqp63elrb-90229307226.asia-southeast1.run.app';
          if (typeof input === 'string' && input.startsWith('/api/')) {
            const redirectedUrl = `${backendBase}${input}`;
            console.log(`[API Proxy] Intercepting fetch: ${input} -> ${redirectedUrl}`);
            return originalFetch(redirectedUrl, init);
          }
          if (input instanceof URL && input.pathname.startsWith('/api/')) {
            const redirectedUrl = `${backendBase}${input.pathname}${input.search}`;
            console.log(`[API Proxy] Intercepting URL fetch: ${input.href} -> ${redirectedUrl}`);
            return originalFetch(redirectedUrl, init);
          }
          if (input instanceof Request && input.url.startsWith('/api/')) {
            const redirectedUrl = `${backendBase}${input.url}`;
            console.log(`[API Proxy] Intercepting Request fetch: ${input.url} -> ${redirectedUrl}`);
            const newRequest = new Request(redirectedUrl, input);
            return originalFetch(newRequest, init);
          }
        }
        return originalFetch(input, init);
      },
      writable: true,
      configurable: true,
      enumerable: true
    });
  } catch (e) {
    console.error('[API Proxy] Failed to redefine window.fetch:', e);
  }
}

// Initialize the global error and rejected API tracker
initErrorTracker();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('AREARNZONE ServiceWorker registered successfully with scope: ', registration.scope);
        // Force service worker update check so new PWA icons are fetched immediately
        registration.update();
      })
      .catch((error) => {
        console.error('AREARNZONE ServiceWorker registration failed: ', error);
      });
  });
}

