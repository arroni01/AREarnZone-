import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Globe, CheckCircle2 } from 'lucide-react';

interface WelcomeSplashScreenProps {
  onComplete: () => void;
  userName?: string;
  imageUrl?: string;
  durationSeconds?: number;
}

const DEFAULT_WELCOME_ASSET = "/welcome_asset.png";

// Static CSS injected once to prevent 60fps style re-evaluation layout thrashing
const STATIC_SPLASH_STYLES = `
  .welcome-splash-root {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    inset: 0 !important;
    width: 100vw !important;
    width: 100% !important;
    height: 100vh !important;
    height: 100dvh !important;
    min-height: 100vh !important;
    min-height: 100dvh !important;
    z-index: 999999 !important;
    background: #000000 !important;
    background-color: #000000 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    will-change: transform !important;
    contain: layout size !important;
  }
  .welcome-splash-img {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    min-width: 100% !important;
    min-height: 100% !important;
    object-fit: cover !important;
    object-position: center !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    backface-visibility: hidden !important;
    -webkit-backface-visibility: hidden !important;
    transform-style: preserve-3d !important;
    will-change: transform !important;
  }
  @keyframes welcomeZoom3D {
    0% {
      transform: scale3d(1.0, 1.0, 1) translate3d(0, 0, 0);
    }
    100% {
      transform: scale3d(1.1, 1.1, 1) translate3d(0, 0, 0);
    }
  }
  .animate-welcome-zoom-3d {
    animation-name: welcomeZoom3D;
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
    animation-fill-mode: forwards;
    will-change: transform;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    transform-style: preserve-3d;
  }
`;

export const WelcomeSplashScreen: React.FC<WelcomeSplashScreenProps> = ({ 
  onComplete, 
  imageUrl = DEFAULT_WELCOME_ASSET,
  durationSeconds = 3,
}) => {
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [displaySrc, setDisplaySrc] = useState<string>(imageUrl || DEFAULT_WELCOME_ASSET);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const completedRef = useRef(false);

  const durationMs = Math.max(800, (durationSeconds || 3) * 1000);

  // Synchronize and pre-decode image cleanly before triggering animation
  useEffect(() => {
    let isMounted = true;
    const targetUrl = imageUrl || DEFAULT_WELCOME_ASSET;
    
    setDisplaySrc(targetUrl);
    setIsImageLoaded(false);

    const img = new Image();
    img.src = targetUrl;

    const handleSuccess = () => {
      if (isMounted) {
        setIsImageLoaded(true);
      }
    };

    const handleError = () => {
      if (isMounted) {
        if (targetUrl !== DEFAULT_WELCOME_ASSET) {
          setDisplaySrc(DEFAULT_WELCOME_ASSET);
          const fallbackImg = new Image();
          fallbackImg.src = DEFAULT_WELCOME_ASSET;
          fallbackImg.onload = () => isMounted && setIsImageLoaded(true);
          fallbackImg.onerror = () => isMounted && setIsImageLoaded(true);
        } else {
          setIsImageLoaded(true);
        }
      }
    };

    if (img.complete && img.naturalWidth !== 0) {
      handleSuccess();
    } else {
      img.onload = handleSuccess;
      img.onerror = handleError;
      if (img.decode) {
        img.decode().then(handleSuccess).catch(() => {});
      }
    }

    return () => {
      isMounted = false;
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);

  useEffect(() => {
    // Lock scroll and force black background on html & body while splash screen is active
    const originalBodyOverflow = document.body.style.overflow;
    const originalDocOverflow = document.documentElement.style.overflow;
    const originalBodyBg = document.body.style.backgroundColor;
    const originalDocBg = document.documentElement.style.backgroundColor;

    // Instantly scroll window to top to eliminate scroll offset displacement on mobile viewports
    window.scrollTo(0, 0);

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.backgroundColor = '#000000';
    document.documentElement.style.backgroundColor = '#000000';

    const startTime = performance.now();
    let animationFrameId: number;

    const cleanup = () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.backgroundColor = originalBodyBg;
      document.documentElement.style.overflow = originalDocOverflow;
      document.documentElement.style.backgroundColor = originalDocBg;
    };

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(100, Math.floor((elapsed / durationMs) * 100));
      
      setProgress(pct);

      if (elapsed < durationMs) {
        animationFrameId = requestAnimationFrame(tick);
      } else {
        if (!completedRef.current) {
          completedRef.current = true;
          setProgress(100);
          setIsFadingOut(true);
          setTimeout(() => {
            cleanup();
            onComplete();
          }, 450); // 450ms smooth fade-out to reveal dashboard
        }
      }
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => {
      cleanup();
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [durationMs, onComplete]);

  // Memoize main background image render to avoid layout thrashing and unnecessary re-renders
  const memoizedImage = useMemo(() => (
    <img
      src={displaySrc}
      alt="AR Group Welcome"
      referrerPolicy="no-referrer"
      onLoad={() => setIsImageLoaded(true)}
      onError={() => {
        if (displaySrc !== DEFAULT_WELCOME_ASSET) {
          setDisplaySrc(DEFAULT_WELCOME_ASSET);
        }
        setIsImageLoaded(true);
      }}
      className={`welcome-splash-img pointer-events-none transition-opacity duration-500 bg-black ${
        isImageLoaded ? 'opacity-100 animate-welcome-zoom-3d' : 'opacity-0'
      }`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center',
        animationDuration: `${durationMs}ms`,
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transformStyle: 'preserve-3d',
        willChange: 'transform'
      }}
    />
  ), [displaySrc, isImageLoaded, durationMs]);

  const splashContent = (
    <div
      className={`welcome-splash-root select-none transition-opacity duration-500 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        backgroundColor: '#000000',
        margin: 0,
        padding: 0,
        willChange: 'transform',
        contain: 'layout size'
      }}
    >
      <style>{STATIC_SPLASH_STYLES}</style>

      {/* 1. Skeleton Loading Placeholder State (visible while image is decoding) */}
      {!isImageLoaded && (
        <div className="absolute inset-0 w-full h-full bg-black flex flex-col items-center justify-center pointer-events-none z-10 transition-opacity duration-300">
          <div className="absolute inset-0 bg-gradient-to-tr from-black via-slate-900 to-black animate-pulse" />
          <div className="relative z-10 flex flex-col items-center space-y-4 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700/50 animate-pulse flex items-center justify-center shadow-xl">
              <div className="w-8 h-8 rounded-full bg-sky-500/20 animate-ping" />
            </div>
            <div className="w-48 h-4 rounded-full bg-slate-800/80 animate-pulse" />
            <div className="w-32 h-2.5 rounded-full bg-slate-800/60 animate-pulse" />
          </div>
        </div>
      )}

      {/* 2. Absolute Full-Screen Background Image (Memoized) */}
      {memoizedImage}

      {/* Subtle Top & Bottom Gradient Overlay for High Contrast Text Readability */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none z-10" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10" />

      {/* Top Sleek Dark Blue Badge */}
      <div className="absolute top-4 sm:top-6 inset-x-0 z-20 flex items-center justify-center px-4 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0d1829]/90 backdrop-blur-md border border-blue-500/30 shadow-2xl">
          <Globe className="w-3.5 h-3.5 text-sky-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] text-white">
            AR GROUP OFFICIAL PORTAL
          </span>
        </div>
      </div>

      {/* Bottom Slim Progress Bar & Subtitle Text */}
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
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-sky-400 to-cyan-300 transition-all duration-75 ease-out shadow-[0_0_10px_rgba(56,189,248,0.9)]"
              style={{ width: `${progress}%`, willChange: 'width' }}
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

  return typeof document !== 'undefined' ? createPortal(splashContent, document.body) : splashContent;
};





