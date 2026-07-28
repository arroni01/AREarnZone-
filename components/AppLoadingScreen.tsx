import React from 'react';
import { ICONS } from '../constants';
import { ShieldCheck, Zap, Globe, Lock, Cpu } from 'lucide-react';

interface AppLoadingScreenProps {
  loadProgress: number;
  message?: string;
}

export const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({ loadProgress }) => {
  return (
    <div className="fixed inset-0 z-[999999] bg-[#020617] text-slate-100 flex flex-col items-center justify-between p-6 sm:p-10 overflow-hidden select-none font-sans animate-fade-in">
      {/* 1. Animated Ambient Mesh Background Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top-left Emerald Orb */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-[120px] animate-pulse" />
        {/* Bottom-right Sky Blue Orb */}
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-500/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        {/* Center Indigo Accent Orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Cyber Grid Lines Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(#10b981 1px, transparent 1px), radial-gradient(#38bdf8 1px, transparent 1px)`,
            backgroundSize: `32px 32px`,
            backgroundPosition: `0 0, 16px 16px`
          }}
        />
      </div>

      {/* 2. Top Header Brand Pill */}
      <div className="relative z-10 w-full flex items-center justify-center pt-2 animate-slide-up">
        <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-slate-900/80 backdrop-blur-xl border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.15)]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.25em] text-emerald-400 flex items-center gap-1.5">
            AREARNZONE <span className="text-slate-600">•</span> OFFICIAL PORTAL
          </span>
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-extrabold text-emerald-300 uppercase tracking-wider">
            <Lock size={10} className="text-emerald-400" /> 256-BIT SSL
          </div>
        </div>
      </div>

      {/* 3. Center Hero Logo & Orbital Rings */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto space-y-8 max-w-sm w-full text-center">
        {/* Multi-layered Glowing Orbit & Logo Badge */}
        <div className="relative flex items-center justify-center">
          {/* Outer Rotating Gradient Border Ring */}
          <div className="absolute -inset-6 rounded-[3.5rem] bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500 opacity-30 blur-lg animate-pulse" />
          
          <div className="absolute -inset-4 rounded-[3rem] border border-emerald-500/25 animate-spin" style={{ animationDuration: '10s' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#10b981]" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_12px_#38bdf8]" />
          </div>

          {/* Central Logo Box */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 bg-[#090f21]/90 rounded-[2.8rem] border-2 border-emerald-500/40 shadow-[0_0_60px_rgba(16,185,129,0.35)] backdrop-blur-2xl flex items-center justify-center p-6 transform hover:scale-105 transition-all duration-500">
            <ICONS.Logo size={64} className="text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-pulse" />
          </div>
        </div>

        {/* Title & Slogan Header */}
        <div className="space-y-2 font-sans animate-slide-up delay-100">
          <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-wider bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent">
            AREARNZONE
          </h1>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[#10b981] text-[10px] font-black uppercase tracking-[0.2em]">
            <Globe size={12} className="animate-spin text-emerald-400" style={{ animationDuration: '8s' }} /> ASIA'S #1 EARNING ECOSYSTEM
          </div>
        </div>

        {/* Dynamic Progress Indicator */}
        <div className="w-full space-y-3 pt-2 animate-slide-up delay-200">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-300 px-1">
            <span className="text-emerald-400 flex items-center gap-1.5 font-mono">
              <Cpu size={12} className="animate-bounce text-emerald-400" /> SYSTEM LOADING
            </span>
            <span className="text-emerald-400 font-mono text-xs font-black drop-shadow-[0_0_10px_rgba(16,185,129,0.6)]">
              {loadProgress}%
            </span>
          </div>

          {/* Glowing Slim Multi-Color Gradient Progress Bar */}
          <div className="w-full h-2.5 rounded-full bg-slate-900/90 border border-white/10 p-0.5 overflow-hidden shadow-inner relative">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400 transition-all duration-300 ease-out shadow-[0_0_20px_#10b981] relative overflow-hidden"
              style={{ width: `${Math.max(5, loadProgress)}%` }}
            >
              {/* Shimmer Light Reflection effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Feature Security Chips & Footer */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center space-y-4 pb-2 animate-slide-up delay-300">
        {/* Security Features Bar */}
        <div className="grid grid-cols-3 gap-2 w-full">
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/70 border border-emerald-500/20 backdrop-blur-md text-center space-y-1">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-300">Fraud Shield</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/70 border border-sky-500/20 backdrop-blur-md text-center space-y-1">
            <Zap size={14} className="text-sky-400" />
            <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-300">Fast CDN Node</span>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-slate-900/70 border border-emerald-500/20 backdrop-blur-md text-center space-y-1">
            <Lock size={14} className="text-emerald-400" />
            <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-300">SSL Safe 100%</span>
          </div>
        </div>

        {/* Footer Text */}
        <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-[0.22em] text-center">
          GLOBAL INTERNATIONAL COMPANY • ALL RIGHTS RESERVED
        </p>
      </div>
    </div>
  );
};
