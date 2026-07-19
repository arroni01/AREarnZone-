import React, { Component, ErrorInfo, ReactNode } from 'react';
import { trackError } from '../utils/errorTracker';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error captured by AREARNZONE ErrorBoundary:", error, errorInfo);
    trackError(error, `ErrorBoundary Component Stack: ${errorInfo.componentStack || ''}`, 'runtime');
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReboot = () => {
    window.location.hash = '/';
    window.location.reload();
  };

  private handleResetApp = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      window.location.hash = '/';
      window.location.reload();
    } catch (e) {
      console.error("Failed to clear storage:", e);
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans select-none">
          {/* Ambient Visual Backdrops */}
          <div className="absolute inset-0 z-0 bg-cover bg-center opacity-30 filter blur-3xl pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.15) 0%, transparent 60%), radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.1) 0%, transparent 40%)' }}></div>
          
          <div className="relative z-10 w-full max-w-lg bg-slate-900/60 border border-red-500/20 rounded-[2.5rem] p-8 text-center shadow-[0_0_80px_rgba(239,68,68,0.15)] backdrop-blur-3xl space-y-8">
            
            {/* Warning Ring with Glow */}
            <div className="w-24 h-24 bg-gradient-to-tr from-red-500 to-amber-500 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-red-500/20 border-4 border-slate-800 animate-pulse">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>

            {/* Title & Description */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-400 rounded-full border border-red-500/20 text-[9px] font-black uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                System Error Intercepted
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-100">
                ECOSYSTEM RECOVERY
              </h2>
              <p className="text-[11px] text-slate-400 font-bold leading-relaxed max-w-sm mx-auto uppercase">
                A rendering or runtime exception has occurred. Our self-healing safety barrier successfully intercepted the crash to protect your balance and data.
              </p>
            </div>

            {/* Interactive Error Details Accordion */}
            {this.state.error && (
              <div className="bg-slate-950/80 rounded-2xl border border-white/5 p-4 text-left font-mono text-[10px] space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between text-red-400 font-extrabold pb-1.5 border-b border-white/5">
                  <span className="uppercase tracking-wider">EXCEPTION DETECTED</span>
                  <span className="text-[8px] bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">CRITICAL</span>
                </div>
                <div className="text-slate-300 font-bold break-all">
                  {this.state.error.toString()}
                </div>
                {this.state.errorInfo && (
                  <div className="text-slate-500 text-[9px] whitespace-pre-wrap leading-normal font-medium mt-1">
                    {this.state.errorInfo.componentStack}
                  </div>
                )}
              </div>
            )}

            {/* Recovery Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={this.handleReboot}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-[1.5rem] shadow-xl shadow-emerald-500/10 uppercase text-[10px] tracking-wider active:scale-95 transition-all cursor-pointer border border-emerald-400/25"
              >
                Reboot Application
              </button>
              
              <button
                onClick={this.handleResetApp}
                className="w-full bg-slate-800 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/30 text-slate-300 font-black py-4 rounded-[1.5rem] uppercase text-[10px] tracking-wider active:scale-95 transition-all cursor-pointer border border-white/5"
              >
                Flush App Cache
              </button>
            </div>

            {/* Diagnostic Footer */}
            <div className="text-[8px] text-slate-500 font-black uppercase tracking-widest pt-2">
              AREARNZONE Safety Core • Ver 1.4.2 • Protected Client Environment
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
