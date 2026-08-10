import React, { useState, useEffect } from "react";
import {
  Terminal,
  Activity,
  CheckCircle,
  AlertTriangle,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Trash2,
  Key,
  Database,
  Mail,
  Zap,
  Globe,
  Copy,
  Check,
} from "lucide-react";
import {
  apiFetch,
  subscribeApiLogs,
  clearApiLogs,
  ApiLogEntry,
  getApiBaseUrl,
} from "../src/utils/apiConfig";

interface HealthCheckData {
  supabaseConnected: boolean;
  keysMissing: string[];
  smtpReady: boolean;
  timestamp?: string;
  report?: {
    supabaseUrl?: string;
    supabaseKey?: string;
    gmailAppPassword?: string;
    supabaseQueryError?: string;
    activeSmtpTransporters?: number;
  };
  message?: string;
}

export const DebugOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [healthData, setHealthData] = useState<HealthCheckData | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [filter, setFilter] = useState<"all" | "errors" | "success">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Subscribe to apiFetch intercepted logs
  useEffect(() => {
    const unsubscribe = subscribeApiLogs((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return () => unsubscribe();
  }, []);

  // Run self-test diagnostic on mount
  const runSelfTest = async (isManual = false) => {
    setIsDiagnosing(true);
    try {
      const res = await apiFetch<HealthCheckData>("/api/health-check");
      setHealthData(res);

      if (res) {
        const missing = res.keysMissing || [];
        const isFail = missing.length > 0 || !res.supabaseConnected || !res.smtpReady;
        
        // Dispatch toast notification for system status
        let toastMsg = "";
        if (missing.length > 0) {
          toastMsg = `⚠️ Health Check Alert: Missing keys (${missing.join(", ")})`;
        } else if (!res.supabaseConnected) {
          toastMsg = `⚠️ Health Check Alert: Supabase database connection failed!`;
        } else if (!res.smtpReady) {
          toastMsg = `⚠️ Health Check Notice: Gmail App Password not configured.`;
        } else {
          toastMsg = `✅ System Diagnostic Passed: All backend keys & DB connected.`;
        }

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("arez_notify", { detail: { message: toastMsg } })
          );
        }
      }
    } catch (err: any) {
      console.warn("[Debug Panel] Health check failed:", err);
      setHealthData({
        supabaseConnected: false,
        keysMissing: ["NETWORK_ERROR"],
        smtpReady: false,
        message: err?.message || String(err),
      });
    } finally {
      setIsDiagnosing(false);
    }
  };

  useEffect(() => {
    runSelfTest();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === "errors") return !log.ok || log.statusCode >= 400 || log.statusCode === "ERR_NETWORK";
    if (filter === "success") return log.ok && (log.statusCode === 200 || log.statusCode === 201);
    return true;
  });

  const errorCount = logs.filter((l) => !l.ok || l.statusCode >= 400 || l.statusCode === "ERR_NETWORK").length;

  return (
    <div id="debug-overlay-root" className="fixed bottom-4 right-4 z-50 font-sans">
      {/* Floating Launcher Button */}
      {!isOpen && (
        <button
          id="debug-overlay-toggle-btn"
          onClick={() => setIsOpen(true)}
          className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-full text-xs font-semibold shadow-2xl transition-all duration-200 border backdrop-blur-md ${
            errorCount > 0
              ? "bg-rose-950/90 hover:bg-rose-900 border-rose-500/40 text-rose-200 animate-pulse"
              : "bg-slate-900/90 hover:bg-slate-800 border-slate-700/60 text-emerald-400"
          }`}
          title="Open API Debugger & System Diagnostics Panel"
        >
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-mono font-medium">⚡ API Debugger</span>
          {errorCount > 0 ? (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white">
              {errorCount} Err
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {logs.length} req
            </span>
          )}
        </button>
      )}

      {/* Expanded Debug Panel Modal */}
      {isOpen && (
        <div className="w-[92vw] max-w-2xl h-[580px] bg-slate-950/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden text-slate-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/60">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  AREarnZone API Debugger
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                    Cloudflare Worker
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 font-mono truncate max-w-md">
                  Base URL: {getApiBaseUrl()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => runSelfTest(true)}
                disabled={isDiagnosing}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                title="Re-run System Diagnostics"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isDiagnosing ? "animate-spin text-indigo-400" : ""}`} />
                <span>Diagnostics</span>
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Diagnostic Summary Card */}
          <div className="p-3 bg-slate-900/40 border-b border-slate-800/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                Backend Key & Connection Status:
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {healthData?.timestamp ? new Date(healthData.timestamp).toLocaleTimeString() : "Pending"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Supabase Box */}
              <div
                className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                  healthData?.supabaseConnected
                    ? "bg-emerald-950/20 border-emerald-800/50 text-emerald-300"
                    : "bg-rose-950/30 border-rose-800/50 text-rose-300"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-semibold truncate">Supabase DB</span>
                </div>
                {healthData?.supabaseConnected ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
              </div>

              {/* SMTP Box */}
              <div
                className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                  healthData?.smtpReady
                    ? "bg-emerald-950/20 border-emerald-800/50 text-emerald-300"
                    : "bg-amber-950/30 border-amber-800/50 text-amber-300"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-semibold truncate">Gmail SMTP</span>
                </div>
                {healthData?.smtpReady ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
              </div>

              {/* Env Keys Box */}
              <div
                className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                  healthData && (healthData.keysMissing || []).length === 0
                    ? "bg-emerald-950/20 border-emerald-800/50 text-emerald-300"
                    : "bg-rose-950/30 border-rose-800/50 text-rose-300"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Key className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="font-semibold truncate">
                    {healthData?.keysMissing?.length ? `${healthData.keysMissing.length} Key Missing` : "Env Keys OK"}
                  </span>
                </div>
                {healthData && (healthData.keysMissing || []).length === 0 ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
              </div>
            </div>

            {/* Missing Keys details banner */}
            {healthData?.keysMissing && healthData.keysMissing.length > 0 && (
              <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/60 text-[11px] text-rose-200 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>
                  Missing variables in Worker: <strong className="font-mono">{healthData.keysMissing.join(", ")}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Intercepted Requests Header Controls */}
          <div className="px-4 py-2 bg-slate-900/80 border-b border-slate-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-medium">Live Intercepted Requests ({filteredLogs.length})</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-2 py-0.5 rounded ${
                    filter === "all" ? "bg-slate-800 text-white font-medium" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  All ({logs.length})
                </button>
                <button
                  onClick={() => setFilter("errors")}
                  className={`px-2 py-0.5 rounded ${
                    filter === "errors" ? "bg-rose-950 text-rose-300 font-medium" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Errors ({errorCount})
                </button>
                <button
                  onClick={() => setFilter("success")}
                  className={`px-2 py-0.5 rounded ${
                    filter === "success" ? "bg-emerald-950 text-emerald-300 font-medium" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Success ({logs.length - errorCount})
                </button>
              </div>

              <button
                onClick={() => clearApiLogs()}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Clear Logs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Log Stream List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs custom-scrollbar">
            {filteredLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12 space-y-2">
                <Globe className="w-8 h-8 opacity-40 text-slate-400" />
                <p className="text-xs">No intercepted API requests recorded yet.</p>
                <p className="text-[10px] text-slate-600">
                  Trigger actions like SMTP test, CPA postback, or balance update to view live logs.
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const isError = !log.ok || log.statusCode >= 400 || log.statusCode === "ERR_NETWORK";

                return (
                  <div
                    key={log.id}
                    className={`rounded-xl border transition-all ${
                      isError
                        ? "bg-rose-950/20 border-rose-800/60 hover:border-rose-700"
                        : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    {/* Log Row Top */}
                    <div
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="p-2.5 flex items-center justify-between cursor-pointer select-none gap-2"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            log.method === "POST"
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {log.method}
                        </span>

                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            log.ok
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800/60"
                              : "bg-rose-950 text-rose-400 border border-rose-800/60"
                          }`}
                        >
                          {log.statusCode}
                        </span>

                        <span className="text-slate-200 text-xs font-semibold truncate hover:text-white" title={log.url}>
                          {log.endpoint}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-[11px] text-slate-400">
                        <span className="text-slate-500 font-mono text-[10px]">{log.latencyMs}ms</span>
                        <span className="text-slate-500">{log.timestamp}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Log Details Expanded View */}
                    {isExpanded && (
                      <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 rounded-b-xl space-y-2 text-[11px]">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="text-slate-500 truncate max-w-md" title={log.url}>
                            URL: <span className="text-slate-300">{log.url}</span>
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(
                                JSON.stringify(
                                  {
                                    url: log.url,
                                    endpoint: log.endpoint,
                                    status: log.statusCode,
                                    ok: log.ok,
                                    responseBody: log.responseBody,
                                    error: log.error,
                                  },
                                  null,
                                  2
                                ),
                                log.id
                              );
                            }}
                            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-800"
                          >
                            {copiedId === log.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy JSON</span>
                              </>
                            )}
                          </button>
                        </div>

                        {log.error && (
                          <div className="p-2 rounded bg-rose-950/60 border border-rose-800/60 text-rose-300 font-mono text-[11px]">
                            <strong>Exact Error:</strong> {log.error}
                          </div>
                        )}

                        <div className="space-y-1">
                          <div className="text-slate-400 text-[10px] uppercase tracking-wider font-semibold">
                            Response Body:
                          </div>
                          <pre className="p-2.5 rounded bg-slate-900 border border-slate-800/80 text-emerald-400/90 text-[11px] overflow-x-auto max-h-48 custom-scrollbar whitespace-pre-wrap">
                            {JSON.stringify(log.responseBody || log.rawText || {}, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
