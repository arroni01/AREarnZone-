
import './src/utils/apiConfig';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initErrorTracker } from './utils/errorTracker';

// Safely handle client initialization
if (typeof window !== 'undefined') {
  const isFramed = () => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  };
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

// Register Service Worker for PWA support (skip in embedded iframe preview and dev containers)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const isFramed = () => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  };

  const isDevPreview = () => {
    try {
      return (
        window.location.hostname.includes('.run.app') ||
        window.location.hostname.includes('localhost') ||
        window.location.hostname.includes('127.0.0.1') ||
        window.location.hostname.includes('webcontainer')
      );
    } catch (e) {
      return false;
    }
  };

  if (!isFramed() && !isDevPreview()) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('AREARNZONE ServiceWorker registered successfully with scope: ', registration.scope);
          registration.update().catch((updErr) => {
            console.warn('ServiceWorker update check notice:', updErr);
          });
        })
        .catch((error) => {
          console.warn('AREARNZONE ServiceWorker registration notice: ', error);
        });
    });
  } else {
    // Gracefully clean up any stale service workers in dev/preview environments to avoid update fetch errors
    try {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().catch(() => {});
        }
      }).catch(() => {});
    } catch (e) {}
    console.log('Service Worker skipped / cleaned up inside dev/preview environment.');
  }
}

