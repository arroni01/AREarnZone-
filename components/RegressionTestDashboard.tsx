import React, { useState, useEffect } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Play, 
  RefreshCw, 
  ShieldCheck, 
  AlertTriangle, 
  Cpu, 
  Lock, 
  Layers, 
  FileText,
  Activity,
  Server,
  Zap,
  Bot,
  Mail,
  CreditCard,
  Database,
  Globe,
  HelpCircle,
  Wrench,
  Check
} from "lucide-react";
import { analyzeFeatureImpact, AREARNZONE_SYSTEM_MODULES, ImpactAnalysisResult } from "../utils/impactAnalysis";
import { getApiUrl } from "../src/utils/apiConfig";

export interface TestCaseResult {
  id: string;
  module: string;
  name: string;
  passed: boolean;
  durationMs: number;
  message: string;
  details?: any;
}

export interface RegressionSuiteReport {
  timestamp: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  successRate: number;
  overallStatus: "PASS" | "FAIL";
  results: TestCaseResult[];
}

export interface ProductionDiagnosticItem {
  id: string;
  name: string;
  status: "PASS" | "WARN" | "FAIL";
  durationMs: number;
  message: string;
  details?: any;
  rootCauseAnalysis?: {
    file: string;
    issue: string;
    codeFix: string;
    externalConfigSteps: string[];
  };
}

export interface ProductionDiagnosticsReport {
  timestamp: string;
  requestOrigin: string;
  overallStatus: "PASS" | "WARN" | "FAIL";
  summary: { total: number; passCount: number; warnCount: number; failedCount: number };
  diagnostics: ProductionDiagnosticItem[];
}

interface RegressionTestDashboardProps {
  notify?: (msg: string) => void;
}

export const RegressionTestDashboard: React.FC<RegressionTestDashboardProps> = ({ notify }) => {
  const [report, setReport] = useState<RegressionSuiteReport | null>(null);
  const [prodReport, setProdReport] = useState<ProductionDiagnosticsReport | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isVerifyingIntegrations, setIsVerifyingIntegrations] = useState<boolean>(false);
  const [selectedModule, setSelectedModule] = useState<string>("auth_module");
  const [featureNameInput, setFeatureNameInput] = useState<string>("");
  const [impactResult, setImpactResult] = useState<ImpactAnalysisResult | null>(null);

  const runSuite = async () => {
    setIsRunning(true);
    try {
      const res = await fetch(getApiUrl("/api/regression-test"));
      if (res.ok) {
        const data: RegressionSuiteReport = await res.json();
        setReport(data);
        if (notify) {
          if (data.overallStatus === "PASS") {
            notify("✅ All 17 Automated Regression Tests PASSED! System Zero-Breaking.");
          } else {
            notify("⚠️ Regression Tests detected issues. Check execution logs.");
          }
        }
      } else {
        throw new Error("API returned status " + res.status);
      }
    } catch (err: any) {
      console.error("[Regression Dashboard Error]:", err);
      if (notify) notify("⚠️ Failed to run regression tests: " + err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const runProductionDiagnostics = async () => {
    setIsVerifyingIntegrations(true);
    try {
      const res = await fetch(getApiUrl("/api/admin/production-integration-verify"));
      if (res.ok) {
        const data: ProductionDiagnosticsReport = await res.json();
        setProdReport(data);
        if (notify) {
          if (data.overallStatus === "PASS") {
            notify("✅ Production Integration Verification PASSED! All live endpoints connected.");
          } else if (data.overallStatus === "WARN") {
            notify("⚠️ Integrations active with configuration warnings. Review Root Cause Analysis.");
          } else {
            notify("❌ Integration Verification detected issues! Root Cause Analysis generated.");
          }
        }
      } else {
        throw new Error("API returned status " + res.status);
      }
    } catch (err: any) {
      console.error("[Production Diagnostics Error]:", err);
      if (notify) notify("⚠️ Failed to verify production integrations: " + err.message);
    } finally {
      setIsVerifyingIntegrations(false);
    }
  };

  useEffect(() => {
    runSuite();
    runProductionDiagnostics();
  }, []);

  const handleImpactAnalysis = () => {
    if (!featureNameInput.trim()) {
      if (notify) notify("Please enter a proposed feature name.");
      return;
    }
    const result = analyzeFeatureImpact(featureNameInput, selectedModule, ["New feature implementation"]);
    setImpactResult(result);
  };

  const getIntegrationIcon = (id: string) => {
    switch (id) {
      case "tg_bot": return <Bot className="w-5 h-5 text-sky-500" />;
      case "smtp_email": return <Mail className="w-5 h-5 text-indigo-500" />;
      case "cpa_networks": return <Zap className="w-5 h-5 text-amber-500" />;
      case "payment_gateways": return <CreditCard className="w-5 h-5 text-emerald-500" />;
      case "firebase_integration": return <Database className="w-5 h-5 text-orange-500" />;
      case "api_connectivity": return <Globe className="w-5 h-5 text-teal-500" />;
      default: return <Server className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-8 text-slate-800 dark:text-slate-100">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 rounded-3xl p-6 md:p-8 text-white shadow-2xl border border-emerald-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 shadow-inner">
                <ShieldCheck className="w-8 h-8" />
              </span>
              <div>
                <h2 className="text-2xl font-black tracking-tight italic uppercase">
                  AREarnZone Production Integration Verification
                </h2>
                <p className="text-xs text-emerald-300 font-bold uppercase tracking-widest mt-1">
                  Root Cause Analysis & 17-Module Regression Suite Mode
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-300 mt-4 max-w-3xl leading-relaxed">
              সরাসরি প্রোডাকশন ইন্টিগ্রেশন ভ্যালিডেশন: Telegram Bot, SMTP Email, CPA Networks, Payment Gateways, Firebase এবং Live API Connections টেকনিক্যাল রুট কজ বিশ্লেষণসহ পরীক্ষা করা হয়।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={runProductionDiagnostics}
              disabled={isVerifyingIntegrations}
              className="px-5 py-3 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${isVerifyingIntegrations ? "animate-spin" : ""}`} />
              {isVerifyingIntegrations ? "Verifying Integrations..." : "Verify Integrations"}
            </button>

            <button
              onClick={runSuite}
              disabled={isRunning}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${isRunning ? "animate-spin" : ""}`} />
              {isRunning ? "Running Suite..." : "Run 17-Module Suite"}
            </button>
          </div>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Regression Status</p>
            <p className={`text-xl font-black mt-1.5 flex items-center gap-2 ${report?.overallStatus === "PASS" ? "text-emerald-500" : "text-amber-500"}`}>
              {report?.overallStatus === "PASS" ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {report?.overallStatus || "INITIALIZING"}
            </p>
          </div>
          <span className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
            <Activity className="w-6 h-6" />
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Production Integrations</p>
            <p className={`text-xl font-black mt-1.5 flex items-center gap-2 ${
              prodReport?.overallStatus === "PASS" ? "text-emerald-500" : prodReport?.overallStatus === "WARN" ? "text-amber-500" : "text-rose-500"
            }`}>
              {prodReport?.overallStatus === "PASS" ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              {prodReport?.overallStatus ? `${prodReport.summary?.passCount ?? (prodReport.diagnostics ? prodReport.diagnostics.filter(d => d.status === "PASS").length : 0)}/${prodReport.summary?.total ?? (prodReport.diagnostics ? prodReport.diagnostics.length : 0)} CONNECTED` : "VERIFYING"}
            </p>
          </div>
          <span className="p-3 bg-teal-500/10 rounded-2xl text-teal-500">
            <Zap className="w-6 h-6" />
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Database Security</p>
            <p className="text-xl font-black mt-1.5 text-emerald-500 flex items-center gap-1.5">
              <Lock className="w-4 h-4" /> Locked Down
            </p>
          </div>
          <span className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
            <Lock className="w-6 h-6" />
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Modules Protected</p>
            <p className="text-xl font-black mt-1.5 text-slate-900 dark:text-white">17 Core Modules</p>
          </div>
          <span className="p-3 bg-purple-500/10 rounded-2xl text-purple-500">
            <Layers className="w-6 h-6" />
          </span>
        </div>
      </div>

      {/* SECTION 1: PRODUCTION INTEGRATION VERIFICATION & ROOT CAUSE ANALYSIS */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-teal-500/10 text-teal-500 rounded-xl">
              <Wrench className="w-6 h-6" />
            </span>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white uppercase tracking-tight italic">
                Production Integrations Live Verification & Root Cause Diagnostics
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                সরাসরি লাইভ সার্ভিস কানেক্টিভিটি চেক এবং রুট কজ (RCA) বিশ্লেষণ
              </p>
            </div>
          </div>

          {prodReport?.timestamp && (
            <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
              Origin: {prodReport.requestOrigin}
            </span>
          )}
        </div>

        {!prodReport ? (
          <div className="py-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-teal-500" />
            <p className="text-sm font-bold uppercase tracking-wider">Verifying Live Integration Connections...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {(prodReport?.diagnostics || []).map((diag) => (
              <div
                key={diag.id}
                className={`rounded-2xl border p-5 md:p-6 transition-all space-y-4 ${
                  diag.status === "PASS"
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : diag.status === "WARN"
                    ? "bg-amber-500/5 border-amber-500/20"
                    : "bg-rose-500/5 border-rose-500/20"
                }`}
              >
                {/* Integration Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl">
                      {getIntegrationIcon(diag.id)}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                        {diag.name}
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          diag.status === "PASS" ? "bg-emerald-500/20 text-emerald-400" :
                          diag.status === "WARN" ? "bg-amber-500/20 text-amber-400" :
                          "bg-rose-500/20 text-rose-400"
                        }`}>
                          {diag.status === "PASS" ? "CONNECTED" : diag.status === "WARN" ? "CONFIG WARNING" : "CRITICAL FAIL"}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1">
                        {diag.message}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg shrink-0">
                    {diag.durationMs}ms
                  </span>
                </div>

                {/* Root Cause Analysis (RCA) Box if Failed or Warned */}
                {diag.rootCauseAnalysis && (
                  <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 border border-slate-700 space-y-3 font-sans text-xs">
                    <div className="flex items-center gap-2 text-amber-400 font-extrabold uppercase tracking-wider text-xs border-b border-slate-800 pb-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Root Cause Analysis & Fix Instructions (রুট কারণ ও ফিক্স নির্দেশিকা)</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Target System File:</p>
                        <p className="font-mono text-emerald-300 font-semibold bg-slate-950 px-2.5 py-1 rounded mt-1 border border-slate-800">
                          {diag.rootCauseAnalysis.file}
                        </p>
                      </div>

                      <div>
                        <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Detected Technical Cause:</p>
                        <p className="text-slate-200 mt-1 font-medium">
                          {diag.rootCauseAnalysis.issue}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80">
                      <p className="font-bold text-teal-400 uppercase tracking-widest text-[10px] mb-1">Code & System Fix Required:</p>
                      <p className="bg-slate-950 p-2.5 rounded-xl font-mono text-xs text-teal-200 border border-slate-800">
                        {diag.rootCauseAnalysis.codeFix}
                      </p>
                    </div>

                    {diag.rootCauseAnalysis.externalConfigSteps && diag.rootCauseAnalysis.externalConfigSteps.length > 0 && (
                      <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                        <p className="font-bold text-amber-300 uppercase tracking-widest text-[10px]">External Service Configuration Guide (এক্সটার্নাল সার্ভিস সেটআপ):</p>
                        <ul className="space-y-1 text-slate-300 list-none">
                          {diag.rootCauseAnalysis.externalConfigSteps.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs">
                              <span className="text-amber-400 shrink-0 font-bold">•</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: 17-MODULE AUTOMATED REGRESSION SUITE LOGS */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Server className="w-6 h-6" />
            </span>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white uppercase tracking-tight italic">
                17-Module Non-Breaking Automated Regression Suite
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                সকল ১৭টি কোর সিস্টেম মডিউলের স্বয়ংক্রিয় রিগ্রেশন টেস্ট ফলাফল
              </p>
            </div>
          </div>

          {report?.timestamp && (
            <span className="text-xs text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
              Last Suite Run: {new Date(report.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>

        {!report ? (
          <div className="py-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
            <p className="text-sm font-bold uppercase tracking-wider">Running Automated Regression Test Suite...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(report?.results || []).map((res) => (
              <div
                key={res.id}
                className={`p-4 md:p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  res.passed
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-rose-500/5 border-rose-500/20"
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <span className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${res.passed ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"}`}>
                    {res.passed ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 bg-slate-800 text-emerald-400 font-mono font-black text-xs rounded-lg border border-slate-700">
                        {res.id}
                      </span>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {res.module}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1.5">{res.name}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">{res.message}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                    {res.durationMs}ms
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 3: PRE-IMPLEMENTATION DEPENDENCY & IMPACT ANALYZER */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <span className="p-2.5 bg-purple-500/10 text-purple-500 rounded-xl">
            <Cpu className="w-6 h-6" />
          </span>
          <div>
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white uppercase tracking-tight italic">
              Pre-Implementation Dependency & Impact Analyzer
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              যেকোনো নতুন ফিচার কোড করার পূর্বে ১৭ মডিউলের উপর নির্ভরশীলতা প্রভাব হিসাব করুন
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Proposed Feature or Modification Description
            </label>
            <input
              type="text"
              value={featureNameInput}
              onChange={(e) => setFeatureNameInput(e.target.value)}
              placeholder="e.g. Add Multi-Currency Wallet Upgrade / Custom Webhook Handler"
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Target Core Module
            </label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
            >
              {Object.entries(AREARNZONE_SYSTEM_MODULES).map(([id, mod]) => (
                <option key={id} value={id}>
                  {mod.moduleName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleImpactAnalysis}
          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center gap-2"
        >
          <Activity className="w-4 h-4 text-emerald-400" /> Calculate Dependency Impact
        </button>

        {impactResult && (
          <div className="p-6 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                <span>Feature: {impactResult.featureName}</span>
              </h4>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                impactResult.riskLevel === "LOW" ? "bg-emerald-500/20 text-emerald-300" :
                impactResult.riskLevel === "MEDIUM" ? "bg-blue-500/20 text-blue-300" :
                impactResult.riskLevel === "HIGH" ? "bg-amber-500/20 text-amber-300" :
                "bg-rose-500/20 text-rose-300"
              }`}>
                Risk Level: {impactResult.riskLevel}
              </span>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Affected System Modules ({impactResult.affectedModules.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {impactResult.affectedModules.map((m) => (
                  <span key={m} className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200">
                    {AREARNZONE_SYSTEM_MODULES[m]?.moduleName || m}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Mandatory Non-Breaking Guidelines:
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                {impactResult.nonBreakingStrategy.map((strat, i) => (
                  <li key={i}>{strat}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegressionTestDashboard;
