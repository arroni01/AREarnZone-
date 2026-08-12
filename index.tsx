
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

// Register Service Worker for PWA support (skip in embedded iframe preview)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const isFramed = () => {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  };

  if (!isFramed()) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('AREARNZONE ServiceWorker registered successfully with scope: ', registration.scope);
          // Safely check for updates
          registration.update().catch((updErr) => {
            console.warn('ServiceWorker update check notice:', updErr);
          });
        })
        .catch((error) => {
          console.warn('AREARNZONE ServiceWorker registration notice: ', error);
        });
    });
  } else {
    console.log('Service Worker skipped inside preview frame.');
  }
}

