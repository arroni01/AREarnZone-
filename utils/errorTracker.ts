export interface SystemErrorLog {
  id: string;
  timestamp: string;
  message: string;
  stack?: string;
  context: string;
  type: 'runtime' | 'api' | 'unhandled_rejection';
  url?: string;
  status?: number;
}

const STORAGE_KEY = 'arearnzone_system_audit_logs';
const MAX_LOGS = 100;

export function getErrors(): SystemErrorLog[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to parse system audit logs from localStorage:', e);
    return [];
  }
}

export function clearErrors(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    // Dispatch event to notify listeners
    window.dispatchEvent(new Event('arearnzone_audit_logs_cleared'));
  } catch (e) {
    console.error('Failed to clear system audit logs:', e);
  }
}

export function trackError(
  error: any,
  context: string,
  type: 'runtime' | 'api' | 'unhandled_rejection' = 'runtime',
  extra?: { url?: string; status?: number }
): void {
  try {
    const message = error instanceof Error ? error.message : String(error || 'Unknown Error');
    const msgLower = message.toLowerCase();
    const isQuota = msgLower.includes("quota") ||
                    msgLower.includes("exhausted") ||
                    msgLower.includes("resource-exhausted") ||
                    msgLower.includes("limit exceeded") ||
                    msgLower.includes("code=resource-exhausted");

    if (isQuota) {
      try {
        localStorage.setItem('arez_firestore_quota_exceeded_timestamp', Date.now().toString());
        window.dispatchEvent(new Event('arez_quota_exceeded_detected'));
      } catch (e) {}
    }

    const logs = getErrors();
    const newLog: SystemErrorLog = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      message,
      stack: error instanceof Error ? error.stack : undefined,
      context,
      type,
      url: extra?.url,
      status: extra?.status,
    };

    // Prepend new log and keep up to MAX_LOGS
    const updatedLogs = [newLog, ...logs].slice(0, MAX_LOGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));

    // Dispatch event to notify components about the new error log
    window.dispatchEvent(new CustomEvent('arearnzone_new_audit_log', { detail: newLog }));
  } catch (e) {
    console.error('Failed to write system audit log:', e);
  }
}

let isInitialized = false;

export function initErrorTracker(): void {
  if (isInitialized) return;
  isInitialized = true;

  // 1. Intercept Global Error
  window.addEventListener('error', (event) => {
    // Avoid double logging if the error was handled or not genuine
    if (!event.error && !event.message) return;
    trackError(
      event.error || new Error(event.message || 'Unknown Global Error'),
      'Global Window Error',
      'runtime'
    );
  });

  // 2. Intercept Unhandled Rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    // Don't log if it's firebase-related fetch errors that are handled lazily, but let's log major rejections
    trackError(
      reason || new Error('Unhandled Promise Rejection'),
      'Global Unhandled Rejection',
      'unhandled_rejection'
    );
  });

  // 3. Intercept fetch safely without crashing when window.fetch is read-only
  try {
    const originalFetch = window.fetch;
    if (originalFetch) {
      Object.defineProperty(window, 'fetch', {
        value: async function (...args: any[]) {
          try {
            const res = await originalFetch(...args);
            // We only track rejections on our API / domain, or failed calls
            if (!res.ok) {
              const urlStr = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url || '';
              // Skip logging benign/expected failures if needed, but log everything else
              trackError(
                new Error(`API Rejected with status ${res.status}`),
                `Fetch response rejection`,
                'api',
                { url: urlStr, status: res.status }
              );
            }
            return res;
          } catch (err: any) {
            const urlStr = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url || '';
            trackError(
              err || new Error('Network Connection Error'),
              `Network fetch failed`,
              'api',
              { url: urlStr }
            );
            throw err;
          }
        },
        writable: true,
        configurable: true,
        enumerable: true
      });
    }
  } catch (e) {
    console.warn("Could not patch window.fetch directly due to environment restrictions. Global fetch monitoring is disabled.", e);
  }
}
