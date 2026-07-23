import React, { useEffect, useState } from 'react';
import { Globe, CheckCircle2 } from 'lucide-react';

interface WelcomeSplashScreenProps {
  onComplete: () => void;
  userName?: string;
  imageUrl?: string;
  durationSeconds?: number;
}

export const WelcomeSplashScreen: React.FC<WelcomeSplashScreenProps> = ({ 
  onComplete, 
  imageUrl = "/welcome_asset.png",
  durationSeconds = 3,
}) => {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const startTime = Date.now();
    const duration = Math.max(500, (durationSeconds || 3) * 1000);

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(interval);
        setIsFadingOut(true);
        setTimeout(() => {
          onComplete();
        }, 350); // 350ms fade-out transition
      }
    }, 20);

    return () => clearInterval(interval);
  }, [onComplete, durationSeconds]);

  // Subtle zoom scale from 1.0 to 1.1 synced with progress
  const currentScale = 1 + (progress / 100) * 0.1;

  return (
    <div
      className={`fixed inset-0 z-[99999] w-screen h-screen m-0 p-0 overflow-hidden select-none transition-opacity duration-300 bg-black ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        width: '100vw',
        height: '100vh',
        top: 0,
        left: 0,
        margin: 0,
        padding: 0,
      }}
    >
      {/* 1. True Full Screen Image Direct Viewport Child with Zoom-In Animation */}
      <img
        src={imageUrl || "/welcome_asset.png"}
        alt="AR Group Welcome"
        referrerPolicy="no-referrer"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "/welcome_asset.png";
        }}
        className="absolute inset-0 w-[100vw] h-[100vh] object-cover m-0 p-0 border-0 pointer-events-none"
        style={{
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          margin: 0,
          padding: 0,
          transform: `scale(${currentScale})`,
          transition: 'transform 100ms linear',
        }}
      />

      {/* Subtle Top & Bottom Gradient Overlay for High Contrast Text Readability */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10" />

      {/* 2. Top Sleek Dark Blue Badge */}
      <div className="absolute top-4 sm:top-6 inset-x-0 z-20 flex items-center justify-center px-4 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0d1829] border border-blue-500/30 shadow-2xl">
          <Globe className="w-3.5 h-3.5 text-sky-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-white">
            AR GROUP OFFICIAL PORTAL
          </span>
        </div>
      </div>

      {/* 3. Bottom Slim Progress Bar & Subtitle Text */}
      <div className="absolute bottom-6 sm:bottom-8 inset-x-0 z-20 flex flex-col items-center justify-center px-6 pointer-events-none">
        <div className="w-full max-w-xs sm:max-w-sm flex flex-col items-center space-y-2">
          {/* Progress Header */}
          <div className="w-full flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-slate-200 px-0.5">
            <span className="flex items-center gap-1 text-sky-400">
              <CheckCircle2 size={11} /> INITIALIZING
            </span>
            <span className="text-sky-300 font-mono text-[10px]">{progress}%</span>
          </div>

          {/* Slim 3px Progress Bar */}
          <div className="w-full h-[3px] rounded-full bg-slate-900/80 border border-white/10 p-0 overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-sky-400 to-cyan-300 transition-all duration-75 shadow-[0_0_10px_rgba(56,189,248,0.9)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Subtitle Text */}
          <p className="text-[9px] font-extrabold text-white/90 tracking-[0.18em] uppercase pt-1 text-center drop-shadow-md">
            GLOBAL INTERNATIONAL COMPANY - ENCRYPTED SESSION
          </p>
        </div>
      </div>
    </div>
  );
};

