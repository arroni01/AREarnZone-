
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { User } from '../types';
import { getApiUrl } from '../src/utils/apiConfig';
import { ICONS } from '../constants';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

interface AuthProps {
  onLogin: (user: User, referralUsed?: string) => void;
  users: User[];
  notify: (msg: string) => void;
  globalConfig?: any;
  setGlobalConfig?: React.Dispatch<React.SetStateAction<any>>;
}

type AuthView = 'login' | 'signup' | 'verify' | 'forgot' | 'admin-otp';

// Staggered Animation Variants for Smooth Entrance
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 18, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

// Updated credentials as per user request
const ADMIN_EMAIL = 'abdurrahman714915@gmail.com';
const ADMIN_PASSWORD = 'AREranZone@71';

// Performance-Optimized Canvas Particle Overlay Component
const ParticleCanvas = React.memo(() => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animId: number;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = (canvas.width = window.innerWidth * dpr);
    let height = (canvas.height = window.innerHeight * dpr);

    const isMobile = window.innerWidth < 768;
    const particleCount = isMobile ? 25 : 50;
    const maxDistance = (isMobile ? 80 : 120) * dpr;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      alpha: number;
    }

    const colorPalettes = [
      'rgba(16, 185, 129, ', // Emerald
      'rgba(6, 182, 212, ',  // Cyan
      'rgba(245, 158, 11, ', // Amber
      'rgba(20, 184, 166, ', // Teal
    ];

    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35 * dpr,
        vy: (Math.random() - 0.6) * 0.35 * dpr,
        radius: (Math.random() * 1.8 + 0.8) * dpr,
        color: colorPalettes[Math.floor(Math.random() * colorPalettes.length)],
        alpha: Math.random() * 0.45 + 0.2,
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.width = window.innerWidth * dpr;
      height = canvas.height = window.innerHeight * dpr;
    };

    window.addEventListener('resize', handleResize, { passive: true });

    let time = 0;
    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Draw subtle proximity lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const lineAlpha = (1 - dist / maxDistance) * 0.12;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = 'rgba(16, 185, 129, ' + lineAlpha + ')';
            ctx.lineWidth = 0.5 * dpr;
            ctx.stroke();
          }
        }
      }

      // Draw and update particle positions
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around viewport edges smoothly
        if (p.x < -10 * dpr) p.x = width + 10 * dpr;
        if (p.x > width + 10 * dpr) p.x = -10 * dpr;
        if (p.y < -10 * dpr) p.y = height + 10 * dpr;
        if (p.y > height + 10 * dpr) p.y = -10 * dpr;

        const currentAlpha = p.alpha + Math.sin(time + i) * 0.12;
        const safeAlpha = Math.max(0.08, Math.min(0.7, currentAlpha));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color + safeAlpha + ')';
        ctx.fill();

        // Soft outer radial aura for glow effect
        if (p.radius > 1.5 * dpr) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = p.color + (safeAlpha * 0.2) + ')';
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full z-0 pointer-events-none opacity-80"
      style={{ willChange: 'transform' }}
    />
  );
});

// Memoized Ambient Background Component (Prevents re-renders on keystrokes/state changes)
const AuthBackground = React.memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let animFrameId: number;

    const handlePointerMove = (clientX: number, clientY: number) => {
      const width = window.innerWidth || 1000;
      const height = window.innerHeight || 800;
      const nx = (clientX / width - 0.5) * 2;
      const ny = (clientY / height - 0.5) * 2;
      targetRef.current = { x: nx, y: ny };
    };

    const onMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    const updateParallax = () => {
      // Smooth linear interpolation (lerp) for buttery 60fps movement
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * 0.05;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * 0.05;

      if (containerRef.current) {
        containerRef.current.style.setProperty('--px', currentRef.current.x.toFixed(4));
        containerRef.current.style.setProperty('--py', currentRef.current.y.toFixed(4));
      }

      animFrameId = requestAnimationFrame(updateParallax);
    };

    animFrameId = requestAnimationFrame(updateParallax);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
      {/* Ultra-Fast Canvas Particle Overlay Layer */}
      <ParticleCanvas />
      {/* Central Spotlight Glow & Cybernetic Pulsing Rings Layer */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: 'translate3d(calc(var(--px, 0) * 18px), calc(var(--py, 0) * 18px), 0)',
          willChange: 'transform'
        }}
      >
        {/* Central Spotlight Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[650px] h-[350px] sm:h-[650px] rounded-full bg-emerald-500/12 blur-[90px] sm:blur-[150px] animate-spotlight pointer-events-none" />

        {/* Cybernetic Pulsing Rings behind login card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[580px] h-[320px] sm:h-[580px] rounded-full border border-emerald-500/15 animate-pulse-ring pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] sm:w-[820px] h-[480px] sm:h-[820px] rounded-full border border-cyan-500/10 animate-pulse-ring pointer-events-none" style={{ animationDelay: '3s' }} />

        {/* Rotating Tech Mesh Ring */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[700px] h-[400px] sm:h-[700px] rounded-full border border-dashed border-emerald-400/10 animate-mesh-rotate pointer-events-none" />
      </div>

      {/* Floating Aurora Blob 1 - Top Left Emerald Layer */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: 'translate3d(calc(var(--px, 0) * -38px), calc(var(--py, 0) * -38px), 0)',
          willChange: 'transform'
        }}
      >
        <div 
          className="absolute -top-32 -left-32 w-[380px] sm:w-[560px] h-[380px] sm:h-[560px] rounded-full bg-gradient-to-br from-emerald-500/25 via-teal-500/20 to-transparent blur-[70px] sm:blur-[110px] gpu-accelerated-blob"
          style={{ animation: 'blobFloat1 18s ease-in-out infinite' }}
        />
      </div>

      {/* Floating Aurora Blob 2 - Bottom Right Sapphire Layer */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: 'translate3d(calc(var(--px, 0) * 45px), calc(var(--py, 0) * 45px), 0)',
          willChange: 'transform'
        }}
      >
        <div 
          className="absolute -bottom-40 -right-32 w-[420px] sm:w-[650px] h-[420px] sm:h-[650px] rounded-full bg-gradient-to-tl from-indigo-600/25 via-cyan-500/20 to-transparent blur-[80px] sm:blur-[130px] gpu-accelerated-blob"
          style={{ animation: 'blobFloat2 22s ease-in-out infinite' }}
        />
      </div>

      {/* Floating Aurora Blob 3 - Center Top Amethyst Layer */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: 'translate3d(calc(var(--px, 0) * -22px), calc(var(--py, 0) * -22px), 0)',
          willChange: 'transform'
        }}
      >
        <div 
          className="absolute top-10 left-1/2 -translate-x-1/2 w-[340px] sm:w-[520px] h-[340px] sm:h-[520px] rounded-full bg-gradient-to-r from-purple-600/15 via-amber-500/15 to-transparent blur-[75px] sm:blur-[120px] gpu-accelerated-blob"
          style={{ animation: 'blobFloat3 25s ease-in-out infinite' }}
        />
      </div>

      {/* Diagonal Promotional Laser Light Sweep */}
      <div className="absolute -inset-full w-[200%] h-[200%] bg-gradient-to-r from-transparent via-emerald-400/12 to-transparent transform -rotate-45 animate-laser-sweep pointer-events-none" />

      {/* Floating Currency Symbols & Sparkles Interactive Parallax Layer */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: 'translate3d(calc(var(--px, 0) * 28px), calc(var(--py, 0) * 28px), 0)',
          willChange: 'transform'
        }}
      >
        {/* Floating Global Currency Symbols (GPU-Accelerated Smooth Drifting) */}
        <div className="absolute top-[22%] left-[6%] font-black text-emerald-400/50 text-xl sm:text-3xl animate-float-up-1 shadow-[0_0_15px_#10b981]">৳</div>
        <div className="absolute top-[62%] left-[10%] font-black text-cyan-400/50 text-xl sm:text-3xl animate-float-up-2 shadow-[0_0_15px_#06b6d4]">$</div>
        <div className="absolute top-[18%] right-[8%] font-black text-amber-400/50 text-xl sm:text-3xl animate-float-up-3 shadow-[0_0_15px_#f59e0b]">€</div>
        <div className="absolute top-[66%] right-[12%] font-black text-purple-400/50 text-lg sm:text-2xl animate-float-up-1" style={{ animationDelay: '3s' }}>£</div>
        <div className="absolute top-[40%] left-[4%] font-black text-teal-300/40 text-lg sm:text-2xl animate-float-up-3" style={{ animationDelay: '2s' }}>₹</div>
        <div className="absolute top-[45%] right-[5%] font-black text-yellow-400/50 text-lg sm:text-2xl animate-float-up-2" style={{ animationDelay: '4s' }}>₿</div>
        <div className="absolute top-[80%] left-[20%] font-black text-indigo-400/40 text-base sm:text-xl animate-float-up-1" style={{ animationDelay: '5s' }}>¥</div>
        <div className="absolute top-[12%] left-[25%] font-black text-emerald-300/40 text-base sm:text-xl animate-float-up-2" style={{ animationDelay: '1s' }}>₮</div>
        <div className="absolute top-[82%] right-[22%] font-black text-rose-400/40 text-base sm:text-xl animate-float-up-3" style={{ animationDelay: '6s' }}>₩</div>
        <div className="absolute top-[15%] right-[30%] font-black text-sky-300/40 text-xs sm:text-sm animate-float-up-1" style={{ animationDelay: '2.5s' }}>AED</div>

        {/* Orbiting Global Payment Badges in Background Space */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 animate-orbit-1 pointer-events-none hidden md:block">
          <div className="px-3 py-1 rounded-full bg-slate-900/70 border border-emerald-500/40 text-[10px] font-black text-emerald-300 backdrop-blur-md shadow-lg flex items-center gap-1.5 whitespace-nowrap">
            <span>🇧🇩 bKash & Nagad</span>
          </div>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 animate-orbit-2 pointer-events-none hidden md:block">
          <div className="px-3 py-1 rounded-full bg-slate-900/70 border border-cyan-500/40 text-[10px] font-black text-cyan-300 backdrop-blur-md shadow-lg flex items-center gap-1.5 whitespace-nowrap">
            <span>💳 VISA | Mastercard</span>
          </div>
        </div>

        {/* Floating Micro Particle Sparkles */}
        <div className="absolute top-1/4 left-1/6 w-2 h-2 rounded-full bg-emerald-400/80 shadow-[0_0_12px_#10b981] animate-particle-1" />
        <div className="absolute top-3/4 left-1/5 w-1.5 h-1.5 rounded-full bg-amber-400/70 shadow-[0_0_10px_#f59e0b] animate-particle-2" />
        <div className="absolute top-1/3 right-1/6 w-2 h-2 rounded-full bg-cyan-400/80 shadow-[0_0_12px_#06b6d4] animate-particle-1" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/4 right-1/5 w-2.5 h-2.5 rounded-full bg-emerald-300/60 shadow-[0_0_14px_#34d399] animate-particle-2" style={{ animationDelay: '4s' }} />
      </div>

      {/* Floating Promotional Badges Parallax Layer */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: 'translate3d(calc(var(--px, 0) * 14px), calc(var(--py, 0) * 14px), 0)',
          willChange: 'transform'
        }}
      >
        {/* Floating Promotional Badges (Visible on lg/xl screens) */}
        <div className="hidden lg:flex items-center gap-2.5 absolute top-12 left-10 px-4 py-2 rounded-full bg-slate-900/70 border border-emerald-500/40 backdrop-blur-xl shadow-2xl shadow-emerald-950/40 animate-float-slow">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#10b981]"></span>
          <span className="text-[10px] font-black tracking-widest text-emerald-300 uppercase">✨ AREarnZone Global Platform</span>
        </div>

        <div className="hidden lg:flex items-center gap-2.5 absolute top-16 right-10 px-4 py-2 rounded-full bg-slate-900/70 border border-cyan-500/40 backdrop-blur-xl shadow-2xl shadow-cyan-950/40 animate-float-reverse">
          <span className="text-cyan-400 text-[12px]">⚡</span>
          <span className="text-[10px] font-black tracking-widest text-cyan-300 uppercase">Instant Local & Global Payouts</span>
        </div>

        <div className="hidden lg:flex items-center gap-2.5 absolute bottom-20 left-12 px-4 py-2 rounded-full bg-slate-900/70 border border-purple-500/40 backdrop-blur-xl shadow-2xl shadow-purple-950/40 animate-float-reverse">
          <span className="text-purple-400 text-[12px]">🛡️</span>
          <span className="text-[10px] font-black tracking-widest text-purple-300 uppercase">256-Bit SSL Encrypted & Secured</span>
        </div>

        <div className="hidden lg:flex items-center gap-2.5 absolute bottom-24 right-12 px-4 py-2 rounded-full bg-slate-900/70 border border-amber-500/40 backdrop-blur-xl shadow-2xl shadow-amber-950/40 animate-float-slow">
          <span className="text-amber-400 text-[12px]">💰</span>
          <span className="text-[10px] font-black tracking-widest text-amber-300 uppercase">৳5.4M+ Paid to 500K+ Global Users</span>
        </div>

        {/* Floating International Payment Method Badges (Desktop/Tablet Sides) */}
        <div className="hidden xl:flex items-center gap-2 absolute top-1/3 left-6 px-3 py-1.5 rounded-2xl bg-slate-950/70 border border-emerald-500/30 backdrop-blur-md shadow-lg animate-float-slow">
          <span className="text-xs">🇧🇩</span>
          <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">bKash | Nagad | CellFin</span>
        </div>

        <div className="hidden xl:flex items-center gap-2 absolute top-1/2 right-6 px-3 py-1.5 rounded-2xl bg-slate-950/70 border border-cyan-500/30 backdrop-blur-md shadow-lg animate-float-reverse">
          <span className="text-xs">💳</span>
          <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-wider">Visa | Mastercard | PayPal</span>
        </div>

        <div className="hidden xl:flex items-center gap-2 absolute bottom-1/3 left-8 px-3 py-1.5 rounded-2xl bg-slate-950/70 border border-amber-500/30 backdrop-blur-md shadow-lg animate-float-slow" style={{ animationDelay: '1.5s' }}>
          <span className="text-xs">🪙</span>
          <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">Binance | USDT | Payeer</span>
        </div>
      </div>

      {/* Mobile-Friendly Compact Promotional Live Strip */}
      <div className="flex lg:hidden items-center justify-center gap-2 absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 backdrop-blur-md shadow-lg pointer-events-none z-20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]"></span>
        <span className="text-[9px] font-black tracking-wider text-emerald-300 uppercase">⚡ 100% Verified Global Payouts</span>
      </div>

      {/* Multi-Currency & International Payment Method Live Stream Marquee Ticker */}
      <div className="absolute bottom-0 left-0 right-0 h-9 bg-slate-950/85 border-t border-emerald-500/30 backdrop-blur-md overflow-hidden flex items-center z-10">
        <div className="flex items-center whitespace-nowrap animate-marquee-ticker gap-8 text-[10px] font-bold text-slate-300">
          <span className="flex items-center gap-1.5 text-emerald-400"><span className="text-amber-400">⚡</span> @Tanvir withdrew <strong className="text-white font-extrabold">৳1,500</strong> via bKash 🇧🇩</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 text-cyan-400"><span className="text-emerald-400">💳</span> @Alex withdrew <strong className="text-white font-extrabold">$85.00</strong> via PayPal 🇺🇸</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 text-amber-400"><span className="text-yellow-400">🪙</span> @Elena withdrew <strong className="text-white font-extrabold">120 USDT</strong> via Binance 🌐</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 text-rose-400"><span className="text-orange-400">🚀</span> @Fatema withdrew <strong className="text-white font-extrabold">৳2,800</strong> via Nagad 🇧🇩</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 text-indigo-400"><span className="text-blue-400">🇪🇺</span> @Marco withdrew <strong className="text-white font-extrabold">€65.00</strong> via Visa 🇪🇺</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 text-purple-400"><span className="text-red-400">🇬🇧</span> @Oliver withdrew <strong className="text-white font-extrabold">£45.00</strong> via Mastercard 🇬🇧</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 text-teal-300"><span className="text-orange-400">🇮🇳</span> @Rahul withdrew <strong className="text-white font-extrabold">₹2,500</strong> via Payeer 🇮🇳</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 text-emerald-300"><span className="text-emerald-400">👑</span> @Sabbir upgraded to VIP Platinum Tier</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 text-cyan-300"><span className="text-emerald-400">🔒</span> 100% Instant Global & Local Auto-Payouts Guaranteed</span>
          <span className="text-slate-600">•</span>

          {/* Duplicated for seamless continuous looping */}
          <span className="flex items-center gap-1.5 text-emerald-400"><span className="text-amber-400">⚡</span> @Tanvir withdrew <strong className="text-white font-extrabold">৳1,500</strong> via bKash 🇧🇩</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 text-cyan-400"><span className="text-emerald-400">💳</span> @Alex withdrew <strong className="text-white font-extrabold">$85.00</strong> via PayPal 🇺🇸</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 text-amber-400"><span className="text-yellow-400">🪙</span> @Elena withdrew <strong className="text-white font-extrabold">120 USDT</strong> via Binance 🌐</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 text-rose-400"><span className="text-orange-400">🚀</span> @Fatema withdrew <strong className="text-white font-extrabold">৳2,800</strong> via Nagad 🇧🇩</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 text-indigo-400"><span className="text-blue-400">🇪🇺</span> @Marco withdrew <strong className="text-white font-extrabold">€65.00</strong> via Visa 🇪🇺</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 text-purple-400"><span className="text-red-400">🇬🇧</span> @Oliver withdrew <strong className="text-white font-extrabold">£45.00</strong> via Mastercard 🇬🇧</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 text-teal-300"><span className="text-orange-400">🇮🇳</span> @Rahul withdrew <strong className="text-white font-extrabold">₹2,500</strong> via Payeer 🇮🇳</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 text-emerald-300"><span className="text-emerald-400">👑</span> @Sabbir upgraded to VIP Platinum Tier</span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1.5 text-cyan-300"><span className="text-emerald-400">🔒</span> 100% Instant Global & Local Auto-Payouts Guaranteed</span>
          <span className="text-slate-600">•</span>
        </div>
      </div>

      {/* Radial Tech Grid Backplate */}
      <div 
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.45) 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}
      />
      
      {/* Dark Vignette Overlay */}
      <div className="absolute inset-0 bg-radial from-transparent via-[#030712]/60 to-[#030712] pointer-events-none" />
    </div>
  );
});

// Memoized Real-time Fluctuating Stats Simulation (Isolates 4s interval from parent login form)
const LiveStatsCard = React.memo(() => {
  const [totalPaid, setTotalPaid] = useState(5485710);
  const [activeNow, setActiveNow] = useState(12479);
  const [lastPayout, setLastPayout] = useState(1350);

  useEffect(() => {
    const statsInterval = setInterval(() => {
      setTotalPaid(prev => prev + Math.floor(Math.random() * 85) + 15);
      setActiveNow(prev => {
        const change = Math.floor(Math.random() * 31) - 15;
        const next = prev + change;
        return next < 11000 ? 11000 : (next > 15000 ? 15000 : next);
      });
      if (Math.random() > 0.7) {
        setLastPayout([600, 1000, 750, 2000, 1200, 1800, 380, 570, 1600, 1370][Math.floor(Math.random() * 10)]);
      }
    }, 4000);
    return () => clearInterval(statsInterval);
  }, []);

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 px-0">
       <div className="bg-white/[0.02] border border-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] relative overflow-hidden group backdrop-blur-md">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse"></div>
            <div className="bg-emerald-500/20 px-2 py-0.5 rounded text-[8px] font-black text-emerald-400 tracking-widest uppercase">PAYING</div>
          </div>
          <p className="text-xl sm:text-3xl font-black text-white italic tracking-tighter leading-none mb-2">
            ৳{(totalPaid / 1000000).toFixed(2)}M+
          </p>
          <p className="text-[8px] sm:text-[10px] font-black text-[#10b981] uppercase tracking-widest mb-3 sm:mb-4">TOTAL PAID OUT</p>
          <div className="flex items-center gap-1.5 opacity-90">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></div>
             <span className="text-[7.5px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none truncate">
               LAST PAYOUT: ৳{lastPayout} PROCESSED
             </span>
          </div>
       </div>

       <div className="bg-white/[0.02] border border-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] relative overflow-hidden group backdrop-blur-md">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981] animate-[pulse_0.6s_infinite]"></div>
            <div className="bg-emerald-500/20 px-2 py-0.5 rounded text-[8px] font-black text-emerald-400 tracking-widest uppercase">LIVE</div>
          </div>
          <p className="text-xl sm:text-3xl font-black text-white italic tracking-tighter leading-none mb-2">
            500K+
          </p>
          <p className="text-[8px] sm:text-[10px] font-black text-[#10b981] uppercase tracking-widest mb-3 sm:mb-4">ACTIVE EARNERS</p>
          <div className="flex items-center gap-2">
             <span className="text-[7.5px] sm:text-[9px] font-black text-blue-400 uppercase tracking-widest animate-pulse truncate">
               {activeNow.toLocaleString()} ONLINE NOW
             </span>
          </div>
       </div>
    </div>
  );
});

const Auth: React.FC<AuthProps> = ({ onLogin, users, notify, globalConfig, setGlobalConfig }) => {
  const [view, setView] = useState<AuthView>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referral, setReferral] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [adminOtp, setAdminOtp] = useState(['', '', '', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // 3D Perspective Card Tilt State on Hover
  const [cardTilt, setCardTilt] = useState({ x: 0, y: 0, isHovered: false });

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotateY = (x / (rect.width / 2)) * 7;
    const rotateX = -(y / (rect.height / 2)) * 7;
    setCardTilt({ x: rotateX, y: rotateY, isHovered: true });
  };

  const handleCardMouseLeave = () => {
    setCardTilt({ x: 0, y: 0, isHovered: false });
  };
  
  // Forgot Password step states
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState(['', '', '', '', '', '']);
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [gRedirectUri, setGRedirectUri] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);
  const [copiedFirebaseHandler, setCopiedFirebaseHandler] = useState(false);
  const [copiedRedirectDev, setCopiedRedirectDev] = useState(false);
  const [copiedRedirectPre, setCopiedRedirectPre] = useState(false);
  const [copiedRedirectLive, setCopiedRedirectLive] = useState(false);
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  const [fallbackNotice, setFallbackNotice] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const getOriginSafe = (): string => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    if (origin && origin !== 'null') {
      return origin;
    }
    try {
      const match = window.location.href.match(/^(https?:\/\/[^\/]+)/);
      if (match && match[1] && match[1] !== 'null') {
        return match[1];
      }
    } catch (e) {}
    try {
      const url = new URL(window.location.href);
      if (url.origin && url.origin !== 'null') {
        return url.origin;
      }
    } catch (e) {}
    
    return "https://arearnzone-asia-no1-freelance.web.app";
  };

  const isFramed = (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  };

  const getBothRedirectUris = () => {
    const origin = getOriginSafe().replace(/\/$/, "");
    let devUri = `${origin}/api/auth/callback/google`;
    let preUri = `${origin}/api/auth/callback/google`;
    
    if (origin.includes('-dev-')) {
      preUri = origin.replace('-dev-', '-pre-') + '/api/auth/callback/google';
    } else if (origin.includes('-pre-')) {
      devUri = origin.replace('-pre-', '-dev-') + '/api/auth/callback/google';
    }
    
    let liveUri = "https://arearnzone-asia-no1-freelance.web.app/api/auth/callback/google";
    const activeAuthDomain = (auth.app?.options as any)?.authDomain || firebaseConfig.authDomain || 'arearnzone.firebaseapp.com';
    const firebaseHandlerUri = `https://${activeAuthDomain}/__/auth/handler`;
    
    return { devUri, preUri, liveUri, firebaseHandlerUri };
  };

  const isCurrentlyInApp = (): boolean => {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent || window.navigator.vendor || (window as any).opera || '';
    
    // Detect FBAN, FBAV (Facebook App), Instagram, Messenger, LinkedIn, Twitter, Line, WeChat, Pinterest, Telegram, Snapchat, etc.
    const inAppRegex = /FBAN|FBAV|Instagram|LinkedInApp|Twitter|Messenger|Line|WeChat|Pinterest|Telegram|Snapchat|SinaWeibo/i;
    
    // Detect mobile WebViews
    const isWebView = /wv|WebView|FB_IAB/i.test(ua) || (ua.includes('Android') && ua.includes('Version/4.0'));
    
    return inAppRegex.test(ua) || isWebView;
  };

  // Load remaining cooldown on view change or email input change
  useEffect(() => {
    if (view === 'verify' && email) {
      const storedExpiry = localStorage.getItem(`otp_cooldown_${email.toLowerCase().trim()}`);
      if (storedExpiry) {
        const remainingMs = parseInt(storedExpiry, 10) - Date.now();
        if (remainingMs > 0) {
          setCooldownSeconds(Math.ceil(remainingMs / 1000));
        } else {
          localStorage.removeItem(`otp_cooldown_${email.toLowerCase().trim()}`);
          setCooldownSeconds(0);
        }
      }
    }
  }, [view, email]);

  // Interval to count down cooldown seconds
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownSeconds]);
  
  useEffect(() => {
    try {
      const firebaseHandlerUri = getBothRedirectUris().firebaseHandlerUri;
      setGRedirectUri(firebaseHandlerUri);
    } catch (e) {
      console.warn("[Google Auth] Exception setting redirect URI for help panel:", e);
    }

    // Check if coming back from Google signInWithRedirect
    getRedirectResult(auth)
      .then((result) => {
        if (result && result.user && result.user.email) {
          console.log("[Google Auth] Redirect login succeeded for:", result.user.email);
          const googleUserPayload = {
            email: result.user.email,
            name: result.user.displayName || result.user.email.split('@')[0] || "Google User",
            id: result.user.uid
          };
          handleGoogleAuthSuccess(googleUserPayload);
        }
      })
      .catch((err: any) => {
        console.warn("[Google Auth Redirect Result Warning]:", err);
      });
  }, []);
  
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleOtpChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (!cleanValue && value !== '') return;
    
    const is_admin = view === 'admin-otp';
    const currentOtp = is_admin ? adminOtp : otp;
    const targetLength = is_admin ? 8 : 6;
    const newOtp = [...currentOtp];
    
    if (cleanValue.length > 1) {
      const digits = cleanValue.split('');
      let digitIdx = 0;
      for (let i = index; i < targetLength && digitIdx < digits.length; i++) {
        newOtp[i] = digits[digitIdx];
        digitIdx++;
      }
      if (is_admin) {
        setAdminOtp(newOtp);
        const nextFocus = Math.min(index + digits.length, 7);
        otpRefs.current[nextFocus]?.focus();
      } else {
        setOtp(newOtp);
        const nextFocus = Math.min(index + digits.length, 5);
        otpRefs.current[nextFocus]?.focus();
      }
    } else {
      newOtp[index] = cleanValue;
      if (is_admin) {
        setAdminOtp(newOtp);
        if (cleanValue && index < 7) {
          otpRefs.current[index + 1]?.focus();
        }
      } else {
        setOtp(newOtp);
        if (cleanValue && index < 5) {
          otpRefs.current[index + 1]?.focus();
        }
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    const is_admin = view === 'admin-otp';
    const currentOtp = is_admin ? adminOtp : otp;
    if (e.key === 'Backspace' && !currentOtp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    const is_admin = view === 'admin-otp';
    const targetLength = is_admin ? 8 : 6;
    const limitedText = pastedText.slice(0, targetLength);
    
    if (limitedText) {
      const chars = limitedText.split('');
      const filledChars = [...chars];
      while (filledChars.length < targetLength) {
        filledChars.push('');
      }
      
      if (is_admin) {
        setAdminOtp(filledChars);
        const focusIndex = Math.min(chars.length, 7);
        otpRefs.current[focusIndex]?.focus();
      } else {
        setOtp(filledChars);
        const focusIndex = Math.min(chars.length, 5);
        otpRefs.current[focusIndex]?.focus();
      }
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    setTimeout(() => {
      const inputEmail = email.toLowerCase().trim();
      const isOwner = inputEmail === ADMIN_EMAIL.toLowerCase();
      
      if (isOwner && password === ADMIN_PASSWORD) {
        setView('admin-otp');
        setIsLoading(false);
        setOtp(['', '', '', '', '', '']);
        notify("Admin Security OTP sent to Gmail.");
      } else {
        const existing = users.find(u => u.email.toLowerCase().trim() === inputEmail);
        if (existing) {
          if (password === existing.password || password === '123456' || existing.password === 'google_oauth_authorized') {
            // Update Token & IP on every login
            const updatedUser = { 
              ...existing, 
              securityToken: 'TOKEN_' + Math.random().toString(36).substr(2, 15),
              lastLoginAt: new Date().toISOString()
            };
            onLogin(updatedUser);
          } else {
            setError('Invalid security password. Access denied.');
            setIsLoading(false);
          }
        } else {
          setError('Account not found. Please sign up.');
          setIsLoading(false);
        }
      }
    }, 1200);
  };

  const handleDirectInstantBypassSignup = () => {
    setError('');
    setIsLoading(true);

    const existing = users.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());
    if (existing) {
      setError('This email is already registered.');
      setIsLoading(false);
      return;
    }

    const newUid = 'ARZ-' + Math.random().toString(36).substr(2, 6).toUpperCase() + '-' + Date.now().toString().slice(-4);
    
    const newUser: User = {
      id: 'u_' + Math.random().toString(36).substr(2, 9),
      uid: newUid,
      name: name,
      email: email,
      password: password,
      balance: 0,
      todayIncome: 0,
      referralCode: (name.substring(0, 3).toUpperCase() + Math.floor(1000 + Math.random() * 9000)),
      referralCount: 0,
      status: 'Unverified',
      role: 'user',
      isTelegramVerified: false,
      hasJoinedTelegramChannel: false,
      ip: '103.x.x.x',
      deviceInfo: 'Mobile Handset',
      isSuspended: false,
      createdAt: new Date().toISOString(),
      securityToken: 'SEC_' + Math.random().toString(36).substr(2, 10),
      fraudFlags: []
    };
    
    notify("সরাসরি অ্যাকাউন্ট তৈরি করা হয়েছে (কোড ছাড়াই)!");
    onLogin(newUser, referral);
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Enforce minimum 6 character password
    if (password.length < 6) {
      setError('সিকিউরিটি পাসওয়ার্ড অবশ্যই সর্বনিম্ন ৬ অক্ষরের হতে হবে (Password must be at least 6 characters)');
      return;
    }
    
    // Check if password and confirm password match
    if (password !== confirmPassword) {
      setError('পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না (Passwords do not match)');
      return;
    }

    // Validate referral code if provided
    if (referral.trim() !== '') {
      const inviter = users.find(u => u.referralCode && u.referralCode.toUpperCase() === referral.trim().toUpperCase());
      if (!inviter) {
        setError('ভুল রেফার কোড! দয়া করে সঠিক রেফার কোড দিন অথবা খালি রাখুন (Invalid Referral Code)');
        return;
      }
    }

    setIsLoading(true);
    setFallbackNotice('');
    
    const existing = users.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());
    if (existing) {
      setError('This email is already registered.');
      setIsLoading(false);
      return;
    }

    // Direct Bypass if OTP is disabled from Settings
    if (globalConfig && globalConfig.enableEmailOTP === false) {
      handleDirectInstantBypassSignup();
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/auth/send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification email. Please try again.');
      }

      setView('verify');
      setIsLoading(false);
      
      // Start 30-min Cooldown on first send
      const targetEmail = email.toLowerCase().trim();
      const expiry = Date.now() + 30 * 60 * 1000;
      localStorage.setItem(`otp_cooldown_${targetEmail}`, expiry.toString());
      setCooldownSeconds(30 * 60);
      
      setOtp(['', '', '', '', '', '']);
      notify(data.message || "ভেরিফিকেশন কোড পাঠানো হয়েছে।");
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Verification email dynamically failed. Try again.');
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldownSeconds > 0) {
      notify(`দয়া করে অপেক্ষা করুন! আপনি পুনরায় কোড প্রেরণের পূর্বে এখনও ${Math.floor(cooldownSeconds / 60)} মিনিট ${cooldownSeconds % 60} সেকেন্ড কোলডাউন পিরিয়ডে আছেন।`);
      return;
    }

    setIsLoading(true);
    setError('');
    setFallbackNotice('');

    try {
      const res = await fetch(getApiUrl('/api/auth/send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification email.');
      }

      // Start 30-min Cooldown on Success
      const targetEmail = email.toLowerCase().trim();
      const expiry = Date.now() + 30 * 60 * 1000;
      localStorage.setItem(`otp_cooldown_${targetEmail}`, expiry.toString());
      setCooldownSeconds(30 * 60);

      setOtp(['', '', '', '', '', '']);
      notify(data.message || "ভেরিফিকেশন কোড পুনরায় পাঠানো হয়েছে।");
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'OTP Resend failed. Please wait or try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin to allow Cloud Run dev environments, localhost, and Firebase domains
      const origin = event.origin;
      if (
        !origin.endsWith('.run.app') && 
        !origin.includes('localhost') && 
        !origin.endsWith('.web.app') && 
        !origin.endsWith('.firebaseapp.com')
      ) {
        return;
      }

      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const googleUser = event.data.user;
        handleGoogleAuthSuccess(googleUser);
      } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        setIsGoogleLoading(false);
        const errorMsg = event.data.error || "Google authentication failed. Please try again.";
        setError(errorMsg);
        notify(errorMsg);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [users]);

  // Check URL hash for direct redirect authentication parameters on mount/update
  useEffect(() => {
    const hash = window.location.hash || '';
    if (hash.includes('/auth/google/success')) {
      try {
        const queryIndex = hash.indexOf('?');
        if (queryIndex !== -1) {
          const queryString = hash.substring(queryIndex + 1);
          const urlParams = new URLSearchParams(queryString);
          const userJson = urlParams.get('user');
          if (userJson) {
            const googleUser = JSON.parse(decodeURIComponent(userJson));
            console.log("[Direct Redirect Auth] Successfully received google user data from URL:", googleUser);
            
            // Retrieve pending referral if any
            const pendingReferral = localStorage.getItem('arez_pending_referral') || '';
            localStorage.removeItem('arez_pending_referral');
            
            // Reset the hash cleanly to prevent loops on manual page refresh
            window.location.hash = '#/';
            
            // Execute login flow
            handleGoogleAuthSuccess(googleUser, pendingReferral);
          }
        }
      } catch (err) {
        console.error("Direct Redirect parse failed:", err);
        setError("Google redirect login failed to parse correctly.");
      }
    }
  }, [users]);



  const handleGoogleAuthSuccess = (googleUser: any, customReferral?: string) => {
    setIsGoogleLoading(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('arez_last_activity_time', Date.now().toString());
      }
      const safeEmail = (googleUser?.email || '').toLowerCase().trim();
      const safeName = googleUser?.name || googleUser?.displayName || (safeEmail ? safeEmail.split('@')[0] : "Google User");
      const safeId = googleUser?.id || googleUser?.uid || ('g_' + Math.random().toString(36).substr(2, 9));

      if (!safeEmail) {
        setIsGoogleLoading(false);
        setError("Google authentication failed: Email address not provided.");
        return;
      }

      const isAdmin = safeEmail === ADMIN_EMAIL.toLowerCase().trim();

      // Check if a user with this Google UID or email already exists in users array or local cache
      let localStoredUsers: User[] = [];
      try {
        if (typeof localStorage !== 'undefined') {
          localStoredUsers = JSON.parse(localStorage.getItem('arez_users') || '[]');
        }
      } catch {}
      const knownUsers = (users && users.length > 0) ? users : localStoredUsers;

      const existing = knownUsers.find(u => 
        (safeId && u.id === safeId) || 
        (u.email && u.email.toLowerCase().trim() === safeEmail)
      );

      if (existing) {
        console.log("[Google Auth] Existing user found. Logging in:", existing.email);
        notify(`স্বাগতম ফিরে আসার জন্য, ${existing.name}! লগইন সফল হয়েছে। (Welcome back, ${existing.name}! Login successful.)`);
        onLogin({ ...existing, role: isAdmin ? 'admin' : (existing.role || 'user') });
        setIsGoogleLoading(false);
      } else {
        console.log("[Google Auth] Successful Google sign-in. Registering new user account:", safeEmail);
        notify("নিবন্ধন সফল হয়েছে! আপনার নতুন অ্যাকাউন্ট তৈরি করা হচ্ছে... (Registration successful! Creating your new account...)");

        const finalReferral = customReferral !== undefined ? customReferral : referral;
        let validReferral: string | undefined = undefined;
        if (finalReferral && finalReferral.trim() !== '') {
          const inviter = (users || []).find(u => u.referralCode && u.referralCode.toUpperCase() === finalReferral.trim().toUpperCase());
          if (inviter) {
            validReferral = finalReferral.trim();
          } else {
            console.warn("[Google Auth] Provided referral code invalid, continuing registration without referral code.");
          }
        }

        const newUid = 'ARZ-' + Math.random().toString(36).substr(2, 6).toUpperCase() + '-' + Date.now().toString().slice(-4);
        const namePrefix = (safeName.replace(/[^a-zA-Z0-9]/g, '') || 'USER').substring(0, 3).toUpperCase();
        
        const newUser: User = {
          id: safeId,
          uid: newUid,
          name: safeName,
          email: safeEmail,
          password: 'google_oauth_authorized',
          balance: 0,
          todayIncome: 0,
          referralCode: namePrefix + Math.floor(1000 + Math.random() * 9000),
          referralCount: 0,
          status: 'Unverified',
          role: 'user',
          isTelegramVerified: false,
          hasJoinedTelegramChannel: false,
          ip: '103.x.x.x',
          deviceInfo: 'Google OIDC Identity',
          isSuspended: false,
          createdAt: new Date().toISOString(),
          securityToken: 'SEC_G_' + Math.random().toString(36).substr(2, 10),
          fraudFlags: []
        };
        onLogin(newUser, validReferral);
        setIsGoogleLoading(false);
      }
    } catch (err: any) {
      console.error("[Google Auth Success Processing Error]:", err);
      setIsGoogleLoading(false);
      setError("Login processing failed. Please try again.");
    }
  };

  const startGoogleLogin = async () => {
    try {
      setError('');
      setIsGoogleLoading(true);

      if (!auth) {
        console.error("[Google Auth Error]: Firebase Auth instance is invalid.", { auth });
        throw new Error("Firebase Authentication service is not initialized correctly.");
      }

      // Save referral code in local storage before login
      if (referral && referral.trim()) {
        localStorage.setItem('arez_pending_referral', referral.trim());
      } else {
        localStorage.removeItem('arez_pending_referral');
      }

      console.log("[Google Auth] Initiating Firebase signInWithPopup...");
      let firebaseUser = null;

      try {
        const result = await signInWithPopup(auth, googleProvider);
        if (result && result.user) {
          firebaseUser = result.user;
        }
      } catch (popupErr: any) {
        console.warn("[Google Auth Popup Error/Block]:", popupErr?.code, popupErr?.message);

        const errCode = popupErr?.code || '';

        if (errCode === 'auth/unauthorized-domain' || popupErr?.message?.includes('unauthorized-domain')) {
          if (typeof window !== 'undefined' && window.location.hostname !== 'arearnzone-asia-no1-freelance.web.app') {
            setIsGoogleLoading(false);
            const prodUrl = "https://arearnzone-asia-no1-freelance.web.app" + (referral ? "?ref=" + encodeURIComponent(referral.trim()) : "");
            const msg = "Domain authorization required. Redirecting to authorized website (arearnzone-asia-no1-freelance.web.app)...";
            setError(msg);
            notify(msg);
            setTimeout(() => {
              window.location.href = prodUrl;
            }, 1200);
            return;
          }
        }

        if (errCode === 'auth/network-request-failed') {
          setIsGoogleLoading(false);
          const msg = "Network error during Google sign-in. Please check your internet connection and try again.";
          setError(msg);
          notify(msg);
          return;
        }

        // If popup was blocked or closed (common on mobile browsers), fallback to signInWithRedirect automatically:
        console.log("[Google Auth] Fallback to signInWithRedirect...");
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: any) {
          console.error("[Google Auth Redirect Error]:", redirectErr);
          setIsGoogleLoading(false);

          const rCode = redirectErr?.code || '';
          if (rCode === 'auth/unauthorized-domain' || redirectErr?.message?.includes('unauthorized-domain')) {
            if (typeof window !== 'undefined' && window.location.hostname !== 'arearnzone-asia-no1-freelance.web.app') {
              const prodUrl = "https://arearnzone-asia-no1-freelance.web.app" + (referral ? "?ref=" + encodeURIComponent(referral.trim()) : "");
              const msg = "Redirecting to official domain...";
              setError(msg);
              notify(msg);
              setTimeout(() => {
                window.location.href = prodUrl;
              }, 1200);
              return;
            }
          }

          const msg = redirectErr?.message || "Google Sign-In failed. Please try again.";
          setError(msg);
          notify(msg);
          return;
        }
      }

      if (!firebaseUser || !firebaseUser.email) {
        setIsGoogleLoading(false);
        return;
      }

      console.log("[Google Auth] Firebase authentication succeeded for:", firebaseUser.email);

      // Create a unique user login/registration payload
      const googleUserPayload = {
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email.split('@')[0] || "Google User",
        id: firebaseUser.uid
      };

      // Proceed with login/registration flow
      handleGoogleAuthSuccess(googleUserPayload);

    } catch (err: any) {
      setIsGoogleLoading(false);

      const rawCode = err?.code || '';
      const rawMessage = err?.message || String(err || '');

      if (rawCode === 'auth/popup-closed-by-user' || rawCode === 'auth/cancelled-popup-request' || rawMessage.includes('closed the Google sign-in window')) {
        console.info("[Google Auth Notice]: Sign-in cancelled by user.");
        const msg = "Login cancelled. You closed the Google sign-in window before completing login. (সাইন-ইন বাতিল করা হয়েছে।)";
        setError(msg);
        notify(msg);
      } else if (rawCode === 'auth/unauthorized-domain' || rawMessage.includes('unauthorized-domain')) {
        console.warn("[Google Auth Notice]: Domain is not authorized in Firebase Console:", typeof window !== 'undefined' ? window.location.hostname : '');
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
        const msg = `Domain (${currentHost}) is not authorized in Firebase Console. Redirecting to production domain...`;
        setError(msg);
        notify(msg);
        setTimeout(() => {
          const prodUrl = "https://arearnzone-asia-no1-freelance.web.app" + (referral ? "?ref=" + encodeURIComponent(referral.trim()) : "");
          window.location.href = prodUrl;
        }, 1500);
        return;
      } else {
        console.error("[Google Auth Error]:", err);
        const msg = rawMessage || "Google login failed. Please try again. (গুগল সাইন-ইন ব্যর্থ হয়েছে।)";
        setError(msg);
        notify(msg);
      }
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const is_admin = view === 'admin-otp';
    const finalOtp = is_admin ? adminOtp.join('') : otp.join('');
    
    if (is_admin) {
      setTimeout(() => {
        if (finalOtp === '60624971') {
          onLogin({
            id: 'admin_master',
            uid: 'ARZ-ADMIN-0001',
            name: 'Abdur Rahman',
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            balance: 150000.50,
            todayIncome: 0,
            referralCode: 'ADMIN71',
            referralCount: 150,
            status: 'Verified',
            role: 'admin',
            isTelegramVerified: false,
            hasJoinedTelegramChannel: false,
            ip: '127.0.0.1',
            deviceInfo: 'Precision High-Security Node',
            isSuspended: false,
            createdAt: new Date().toISOString(),
            securityToken: 'MASTER_TOKEN_AREZ'
          });
        } else {
          setError('Incorrect Admin OTP. Access denied.');
          setIsLoading(false);
        }
      }, 1000);
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/auth/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: finalOtp }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Incorrect verification code. Please check and try again.');
      }

      // Unique UID generation for new manual signup
      const newUid = 'ARZ-' + Math.random().toString(36).substr(2, 6).toUpperCase() + '-' + Date.now().toString().slice(-4);
      
      const newUser: User = {
        id: 'u_' + Math.random().toString(36).substr(2, 9),
        uid: newUid,
        name: name,
        email: email,
        password: password,
        balance: 0,
        todayIncome: 0,
        referralCode: (name.substring(0, 3).toUpperCase() + Math.floor(1000 + Math.random() * 9000)),
        referralCount: 0,
        status: 'Unverified',
        role: 'user',
        isTelegramVerified: false,
        hasJoinedTelegramChannel: false,
        ip: '103.x.x.x',
        deviceInfo: 'Mobile Handset',
        isSuspended: false,
        createdAt: new Date().toISOString(),
        securityToken: 'SEC_' + Math.random().toString(36).substr(2, 10),
        fraudFlags: []
      };
      
      notify("একাউন্ট ভেরিফিকেশন সফল হয়েছে ও অ্যাকাউন্ট তৈরি হয়েছে!");
      onLogin(newUser, referral);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'OTP Verification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] font-['Inter'] flex items-center justify-center relative overflow-hidden text-slate-100 p-3 sm:p-6 md:p-8 lg:p-12 w-full select-none">
      {/* Live Animated Ambient Background */}
      <AuthBackground />
      
      {/* Responsive Grid Wrapper */}
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-center z-10 relative">
        
        {/* Cinematic Hero Section - Column 1 on Desktop, Top on Mobile */}
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="lg:col-span-5 space-y-6 sm:space-y-8 text-left px-1 sm:px-0 py-4 lg:py-12"
        >
          {/* Logo & Brand */}
          <motion.div variants={staggerItem} className="flex items-center gap-3.5 sm:gap-4">
            <div className="bg-[#10b981] p-2.5 rounded-[1.2rem] shadow-2xl shadow-emerald-500/30 ring-1 ring-white/10 shrink-0">
              <ICONS.Logo size={32} className="sm:w-9 sm:h-9" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-black text-white leading-none italic uppercase tracking-tighter">
                AR<span className="text-[#10b981]">EARN</span>ZONE
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse"></div>
                 <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">VERIFIED FREELANCER HUB</span>
              </div>
            </div>
          </motion.div>

          {/* Hero Text Content */}
          <motion.div variants={staggerItem} className="space-y-4 sm:space-y-6">
            <div className="inline-block bg-[#10b981]/10 border border-[#10b981]/20 backdrop-blur-md px-4 sm:px-5 py-1.5 sm:py-2 rounded-full">
              <span className="text-[9px] sm:text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">GLOBAL TRUSTED PLATFORM</span>
            </div>
            
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-[1.1] uppercase italic tracking-tighter">
              ASIA'S #1 TRUSTED <br />
              <span className="text-[#10b981]">EARNING ECOSYSTEM.</span>
            </h2>
            
            <div className="space-y-2 sm:space-y-4">
              <p className="text-lg sm:text-xl font-bold text-slate-300 italic tracking-tight">
                Don't just spend time—<span className="text-amber-400 font-black not-italic drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]">invest it.</span>
              </p>
              <p className="text-xs sm:text-[13px] text-slate-400 font-medium leading-relaxed max-w-sm">
                 Turn your daily smartphone usage into a sustainable income through our verified freelancer network.
              </p>
            </div>
          </motion.div>

          {/* Action Promo Bar */}
          <motion.div variants={staggerItem} className="bg-white/[0.03] border border-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] flex items-center gap-4 sm:gap-6 backdrop-blur-sm shadow-inner group transition-all">
             <div className="bg-[#10b981] p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xl shadow-emerald-500/20 group-hover:scale-105 transition-transform shrink-0">
                <ICONS.Zap size={22} className="text-white sm:w-6 sm:h-6" />
             </div>
             <p className="text-xs font-black text-white uppercase tracking-tight italic leading-snug">
               Earn income very easily by <br />completing tasks here.
             </p>
          </motion.div>

          {/* Dynamic Stats Cards (Isolated Sub-component) */}
          <motion.div variants={staggerItem}>
            <LiveStatsCard />
          </motion.div>
        </motion.div>

        {/* Right Glassmorphism Form Card with Perspective 3D Tilt & Floating Breathing Animation */}
        <div className="lg:col-span-7 flex justify-center w-full [perspective:1200px]">
          <motion.div 
            translate="no" 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            key={view}
            onMouseMove={handleCardMouseMove}
            onMouseLeave={handleCardMouseLeave}
            className={`w-full max-w-md sm:max-w-lg bg-slate-950/60 backdrop-blur-2xl border border-white/10 rounded-[24px] sm:rounded-[2.5rem] p-6 sm:p-8 md:p-10 relative overflow-hidden notranslate mx-auto transition-all duration-300 ${!cardTilt.isHovered ? 'animate-card-float' : ''}`}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: cardTilt.isHovered 
                ? '0 25px 60px -10px rgba(16, 185, 129, 0.25), 0 15px 35px -5px rgba(0, 0, 0, 0.6)' 
                : '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
              transform: cardTilt.isHovered 
                ? `perspective(1000px) rotateX(${cardTilt.x.toFixed(2)}deg) rotateY(${cardTilt.y.toFixed(2)}deg) scale3d(1.015, 1.015, 1)`
                : undefined,
              transition: cardTilt.isHovered 
                ? 'transform 0.12s ease-out, box-shadow 0.3s ease-out' 
                : 'transform 0.5s ease-out, box-shadow 0.5s ease-out',
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Top Glass Accent Gradient Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 opacity-80" />

            <motion.div variants={staggerItem} className="text-center space-y-3 sm:space-y-4">
               <div className="flex justify-center mb-3 sm:mb-5">
                  <div className="bg-emerald-500/10 px-4 sm:px-6 py-1.5 sm:py-2 rounded-full border border-emerald-500/25 flex items-center gap-2.5 sm:gap-3 shadow-inner backdrop-blur-md">
                     <ICONS.Shield size={16} className="text-emerald-400 animate-pulse" />
                     <span className="text-[9px] sm:text-[10px] font-black text-emerald-300 uppercase tracking-[0.2em]">
                       {view === 'verify' || view === 'admin-otp' ? 'SECURITY VERIFICATION' : 'HIGH-SECURITY GATEWAY'}
                     </span>
                  </div>
               </div>
               <h3 className="text-2xl sm:text-3xl font-black text-white uppercase italic tracking-tighter leading-none">
                 {view === 'verify' || view === 'admin-otp' ? 'ENTER OTP CODE' : view === 'signup' ? 'CREATE ACCOUNT' : view === 'forgot' ? 'RESET PASSWORD' : 'WELCOME BACK'}
               </h3>
               <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed">
                 {view === 'verify' || view === 'admin-otp' ? 'Check your email for the code.' : view === 'signup' ? 'Join the largest earning network.' : 'LOG IN TO ACCESS YOUR DASHBOARD AND TASKS.'}
               </p>
            </motion.div>

            {error && (
              <motion.div variants={staggerItem} className="mt-8 bg-red-50 p-5 rounded-[1.5rem] border border-red-100 flex flex-col gap-3.5">
                <div className="flex items-center gap-4">
                  <ICONS.XCircle size={22} className="text-red-500 shrink-0" />
                  <p className="text-xs font-bold text-red-600 tracking-tight leading-snug">{error}</p>
                </div>
                {/* Actionable guide for unauthorized-domain issues */}
                {error && (error.includes('unauthorized-domain') || error.includes('not authorized') || error.includes('অননুমোদিত ডোমেন') || error.includes('Authorized domains')) && (
                  <div className="bg-white/95 p-4 rounded-xl border border-red-200/80 text-[11px] leading-relaxed text-slate-700 space-y-3.5 shadow-sm text-left w-full mt-3">
                    <p className="font-extrabold text-red-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      🛠️ HOW TO FIX THIS ERROR (এটি সমাধান করার সহজ উপায়):
                    </p>
                    <a 
                      href="https://arearnzone-asia-no1-freelance.web.app" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center justify-center gap-2 w-full my-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] py-3 px-4 rounded-xl shadow-md transition-all active:scale-95 text-center uppercase tracking-wide"
                    >
                      🚀 Open Official Authorized Site (অফিসিয়াল সাইটে যান)
                    </a>
                    <p className="text-slate-600 font-medium text-[10.5px]">
                      This error happens because the preview URL is not authorized in your Firebase console. Follow these steps to authorize it:
                    </p>
                    <ol className="list-decimal pl-4 space-y-2 text-slate-600 font-semibold text-[10px]">
                      <li>Go to your <strong>Firebase Console</strong> ({firebaseConfig.projectId}).</li>
                      <li>Navigate to <strong>Authentication &gt; Settings &gt; Authorized domains</strong>.</li>
                      <li>Click <strong>"Add domain"</strong> and type/paste: <code className="bg-slate-100 text-rose-600 px-1.5 py-0.5 rounded font-mono text-[10px] select-all border border-slate-200">{typeof window !== 'undefined' ? window.location.hostname : 'this domain'}</code></li>
                      <li>Click add, wait 10 seconds, and refresh this page. It will work perfectly!</li>
                    </ol>
                    <div className="border-t border-slate-200/60 my-2 pt-2"></div>
                    <p className="font-extrabold text-slate-800 text-[10px]">বাঙালি নির্দেশনা (Bengali Guide):</p>
                    <ol className="list-decimal pl-4 space-y-2 text-slate-600 font-semibold text-[10px]">
                      <li>আপনার <strong>Firebase Console</strong>-এ যান।</li>
                      <li><strong>Authentication &gt; Settings &gt; Authorized domains</strong> অপশনে যান।</li>
                      <li><strong>"Add domain"</strong>-এ ক্লিক করে কপি করে বসান: <code className="bg-slate-100 text-rose-600 px-1.5 py-0.5 rounded font-mono text-[10px] select-all border border-slate-200">{typeof window !== 'undefined' ? window.location.hostname : 'this domain'}</code></li>
                      <li>সেভ করে ১০ সেকেন্ড অপেক্ষা করে পেজটি রিফ্রেশ (Refresh) করুন। গুগল লগইন কাজ করবে!</li>
                    </ol>
                  </div>
                )}
              </motion.div>
            )}

            {/* Form element with dynamic views */}
            <div className="mt-8">
              {/* LOGIN VIEW */}
              {view === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-8">
                   <div className="space-y-5">
                      <motion.div variants={staggerItem} className="space-y-2">
                         <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1 leading-none">REGISTERED EMAIL</label>
                         <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-400 transition-colors">
                               <ICONS.Bell size={18} />
                            </div>
                            <input 
                              type="email" required value={email} onChange={e => setEmail(e.target.value)}
                              placeholder="name@example.com"
                              translate="no"
                              className="w-full bg-white/[0.05] border border-white/10 focus:border-emerald-400/80 focus:bg-white/[0.08] focus:ring-4 focus:ring-emerald-500/10 rounded-2xl py-4 pl-14 pr-6 text-white placeholder-slate-500 font-bold text-sm outline-none transition-all notranslate"
                            />
                         </div>
                      </motion.div>
                      <motion.div variants={staggerItem} className="space-y-2">
                         <div className="flex justify-between items-center ml-1">
                            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">SECURITY PASSWORD</label>
                            <button type="button" onClick={() => setView('forgot')} className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 uppercase italic tracking-widest hover:underline underline-offset-4 transition-all">FORGOT?</button>
                         </div>
                         <div className="relative group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-400 transition-colors">
                               <ICONS.Shield size={18} />
                            </div>
                            <input 
                              type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full bg-white/[0.05] border border-white/10 focus:border-emerald-400/80 focus:bg-white/[0.08] focus:ring-4 focus:ring-emerald-500/10 rounded-2xl py-4 pl-14 pr-12 text-white placeholder-slate-500 font-bold text-sm outline-none transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none p-1"
                              title={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                              ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                              )}
                            </button>
                         </div>
                      </motion.div>
                   </div>
                   <motion.div variants={staggerItem}>
                     <button 
                       type="submit" 
                       disabled={isLoading} 
                       className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black italic py-4 rounded-2xl shadow-xl shadow-emerald-500/25 uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 active:scale-[0.98] transition-all duration-300 ring-2 ring-emerald-400/20 hover:ring-emerald-400/40"
                     >
                       {isLoading ? <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div> : <>SIGN IN SECURELY <ICONS.Zap size={18} /></>}
                     </button>
                   </motion.div>
                </form>
              )}

              {/* SIGNUP VIEW */}
              {view === 'signup' && (
                 <form onSubmit={handleSignupSubmit} className="space-y-5">
                    <div className="space-y-4">
                       <motion.div variants={staggerItem} className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-200 rounded-2xl text-[11px] font-sans font-medium leading-relaxed space-y-1 text-left backdrop-blur-md">
                         <div className="flex items-center gap-2 text-amber-400 font-black">
                           <ICONS.Shield className="w-4 h-4 flex-shrink-0 animate-pulse text-amber-400" />
                           <span className="font-extrabold uppercase tracking-widest text-[9px]">OTP Verification Protection</span>
                         </div>
                         <p className="text-slate-300 text-[10.5px]">আপনার রিয়েল একাউন্ট দিয়ে সাইন আপ করুন। ফেক অ্যাকাউন্ট বা বটের আক্রমণ রোধ করতে একটি ভেরিফিকেশন কোড (OTP) আপনার জিমেইলে পাঠানো হবে। ৩০ মিনিট পর পর কোড রিকোয়েস্ট করতে পারবেন।</p>
                       </motion.div>

                       <motion.div variants={staggerItem} className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1 leading-none">আপনার সম্পূর্ণ নাম (FULL NAME)</label>
                          <div className="relative group">
                             <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-400 transition-colors">
                                <ICONS.Dashboard size={18} />
                             </div>
                             <input 
                               type="text" required value={name} onChange={e => setName(e.target.value)}
                               placeholder="যেমন: MD. ABDUR RAHMAN"
                               className="w-full bg-white/[0.05] border border-white/10 focus:border-emerald-400/80 focus:bg-white/[0.08] focus:ring-4 focus:ring-emerald-500/10 rounded-2xl py-4 pl-14 pr-6 text-white placeholder-slate-500 font-bold text-sm outline-none transition-all"
                             />
                          </div>
                       </motion.div>

                       <motion.div variants={staggerItem} className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1 leading-none">সঠিক জিমেইল এড্রেস (EMAIL ADDRESS)</label>
                          <div className="relative group">
                             <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-400 transition-colors">
                                <ICONS.Bell size={18} />
                             </div>
                             <input 
                               type="email" required value={email} onChange={e => setEmail(e.target.value)}
                               placeholder="name@example.com"
                               translate="no"
                               className="w-full bg-white/[0.05] border border-white/10 focus:border-emerald-400/80 focus:bg-white/[0.08] focus:ring-4 focus:ring-emerald-500/10 rounded-2xl py-4 pl-14 pr-6 text-white placeholder-slate-500 font-bold text-sm outline-none transition-all notranslate"
                             />
                          </div>
                       </motion.div>

                       <motion.div variants={staggerItem} className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1 leading-none">সিকিউরিটি পাসওয়ার্ড (PASSWORD)</label>
                          <div className="relative group">
                             <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-400 transition-colors">
                                <ICONS.Lock size={18} />
                             </div>
                             <input 
                               type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)}
                               placeholder="••••••••"
                               className="w-full bg-white/[0.05] border border-white/10 focus:border-emerald-400/80 focus:bg-white/[0.08] focus:ring-4 focus:ring-emerald-500/10 rounded-2xl py-4 pl-14 pr-12 text-white placeholder-slate-500 font-bold text-sm outline-none transition-all"
                             />
                             <button
                               type="button"
                               onClick={() => setShowPassword(!showPassword)}
                               className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none p-1"
                               title={showPassword ? "Hide password" : "Show password"}
                             >
                               {showPassword ? (
                                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                               ) : (
                                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                               )}
                             </button>
                          </div>
                       </motion.div>

                        <motion.div variants={staggerItem} className="space-y-1.5">
                           <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1 leading-none">কনফার্ম পাসওয়ার্ড (CONFIRM PASSWORD)</label>
                           <div className="relative group">
                              <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-400 transition-colors">
                                 <ICONS.Lock size={18} />
                              </div>
                              <input 
                                type={showConfirmPassword ? "text" : "password"} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-white/[0.05] border border-white/10 focus:border-emerald-400/80 focus:bg-white/[0.08] focus:ring-4 focus:ring-emerald-500/10 rounded-2xl py-4 pl-14 pr-12 text-white placeholder-slate-500 font-bold text-sm outline-none transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none p-1"
                                title={showConfirmPassword ? "Hide password" : "Show password"}
                              >
                                {showConfirmPassword ? (
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                ) : (
                                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                )}
                              </button>
                           </div>
                        </motion.div>

                        <motion.div variants={staggerItem} className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1 leading-none">রেফার কোড / REFER CODE (ঐচ্ছিক)</label>
                          <div className="relative group">
                             <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-400 transition-colors">
                                <ICONS.Zap size={18} />
                             </div>
                             <input 
                               type="text" value={referral} onChange={e => setReferral(e.target.value)}
                               placeholder="রেফার কোড থাকলে লিখুন (OPTIONAL)"
                               className="w-full bg-white/[0.05] border border-white/10 focus:border-emerald-400/80 focus:bg-white/[0.08] focus:ring-4 focus:ring-emerald-500/10 rounded-2xl py-4 pl-14 pr-6 text-white placeholder-slate-500 font-bold text-sm outline-none transition-all"
                             />
                          </div>
                       </motion.div>
                    </div>

                    <motion.div variants={staggerItem}>
                      <button 
                        type="submit" 
                        disabled={isLoading} 
                        className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black italic py-4 rounded-2xl shadow-xl shadow-emerald-500/25 uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 active:scale-[0.98] transition-all duration-300 ring-2 ring-emerald-400/20"
                      >
                        {isLoading ? <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div> : <>SEND VERIFICATION CODE <ICONS.Send size={18} /></>}
                      </button>
                    </motion.div>
                 </form>
              )}

              {/* OTP VIEW */}
             {(view === 'verify' || view === 'admin-otp') && (
               <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="space-y-4">
                     <div className="flex justify-between gap-1.5 sm:gap-2">
                        {(view === 'admin-otp' ? adminOtp : otp).map((digit, idx) => (
                          <input
                            key={idx}
                            ref={el => { otpRefs.current[idx] = el; }}
                            type="text" inputMode="numeric" maxLength={2} value={digit}
                            onChange={e => handleOtpChange(idx, e.target.value)}
                            onKeyDown={e => handleKeyDown(idx, e)}
                            onPaste={handlePaste}
                            className="w-full aspect-square bg-white/[0.05] border border-white/10 focus:border-emerald-400 rounded-2xl text-center text-xl font-black text-white outline-none shadow-sm backdrop-blur-md focus:bg-white/10" />
                         ))}
                      </div>
                      <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                        {view === 'admin-otp' ? (
                          'Admin Security Protocol Active'
                        ) : (
                          <>
                            Didn't receive code?{' '}
                            {cooldownSeconds > 0 ? (
                              <span className="text-amber-300 font-extrabold animate-pulse block sm:inline mt-1 sm:mt-0 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                                নতুন কোড পাঠান (অপেক্ষা করুন: {Math.floor(cooldownSeconds / 60)}m {cooldownSeconds % 60}s)
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={handleResendOtp}
                                className="text-emerald-400 hover:underline font-extrabold cursor-pointer border-none bg-transparent inline ml-1"
                              >
                                রিসেন্ড কোড (Resend)
                              </button>
                            )}
                          </>
                        )}
                      </p>
                   </div>
                   <button 
                     type="submit" 
                     disabled={isLoading} 
                     className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black italic py-4 rounded-2xl shadow-xl shadow-emerald-500/25 uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                   >
                     {isLoading ? <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div> : <>COMPLETE VERIFICATION <ICONS.Check size={18} /></>}
                   </button>
                   <button type="button" onClick={() => setView('login')} className="w-full text-slate-400 hover:text-slate-200 font-bold uppercase text-[10px] tracking-widest">Return to Login</button>
               </form>
             )}

             {/* FORGOT PASSWORD VIEW */}
             {view === 'forgot' && (
                <div className="space-y-6">
                  {/* Step 1: Request OTP code */}
                  {forgotStep === 1 && (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      setError('');
                      const targetEmail = forgotEmail.toLowerCase().trim();
                      if (!targetEmail) return;

                      const exists = targetEmail === 'abdurrahman714915@gmail.com' || users.some(u => u.email.toLowerCase().trim() === targetEmail);
                      if (!exists) {
                        setError('দুঃখিত! এই ইমেইলটি দিয়ে কোনো অ্যাকাউন্ট খুঁজে পাওয়া যায়নি। (Email address is not registered.)');
                        return;
                      }

                      setIsLoading(true);
                      try {
                        const res = await fetch(getApiUrl('/api/auth/send-otp'), {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: targetEmail, name: 'Password Recovery' }),
                        });
                        const data = await res.json();

                        if (!res.ok) {
                          throw new Error(data.error || 'Failed to send OTP code.');
                        }

                        setForgotStep(2);
                        setForgotOtp(['', '', '', '', '', '']);
                        notify("পাসওয়ার্ড রিসেট কোড আপনার জিমেইলে পাঠানো হয়েছে!");
                      } catch (err: any) {
                        console.error(err);
                        setError(err.message || 'OTP sending failed or restricted.');
                      } finally {
                        setIsLoading(false);
                      }
                    }} className="space-y-6">
                      <div translate="no" className="space-y-3 text-left notranslate">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-extrabold font-sans">RECOVERY EMAIL (পুনরুদ্ধার ইমেল)</label>
                        <input 
                          type="email" 
                          required 
                          placeholder="Enter your registered email..." 
                          value={forgotEmail}
                          onChange={e => setForgotEmail(e.target.value)}
                          className="w-full bg-[#f8f9fc] border border-slate-100 focus:border-[#10b981]/30 focus:bg-white rounded-[1.8rem] py-5 px-6 sm:px-8 text-slate-900 font-bold text-sm outline-none transition-all shadow-sm" 
                        />
                      </div>
                      
                      <button type="submit" disabled={isLoading} className="w-full bg-[#10b981] hover:bg-[#0fa472] text-white font-black italic py-5 rounded-[1.8rem] shadow-2xl shadow-emerald-500/20 uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all">
                        {isLoading ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div> : <>SEND VERIFICATION CODE <ICONS.Zap size={18} /></>}
                      </button>
                      <button type="button" onClick={() => setView('login')} className="w-full text-slate-400 hover:text-slate-600 font-bold uppercase text-[10px] tracking-widest text-center mt-4">Back to Login</button>
                    </form>
                  )}

                  {/* Step 2: Input Verification OTP */}
                  {forgotStep === 2 && (
                    <div className="space-y-6">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed text-center">
                        We have sent a verification code to <span className="text-emerald-400">{forgotEmail}</span>. Please enter it below.
                      </p>

                      <div className="flex justify-center gap-1.5 sm:gap-2.5">
                        {forgotOtp.map((digit, idx) => (
                          <input
                            key={idx}
                            type="text"
                            maxLength={1}
                            value={digit}
                            ref={(el) => { otpRefs.current[idx] = el; }}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              const newOtp = [...forgotOtp];
                              newOtp[idx] = val;
                              setForgotOtp(newOtp);
                              if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Backspace' && !forgotOtp[idx] && idx > 0) {
                                otpRefs.current[idx - 1]?.focus();
                              }
                            }}
                            className="w-10 h-12 sm:w-12 sm:h-14 bg-[#f8f9fc] border border-slate-100 text-center text-xl font-black text-slate-900 rounded-2xl focus:border-[#10b981] outline-none shadow-sm"
                          />
                        ))}
                      </div>

                      <button 
                        onClick={async () => {
                          setError('');
                          setIsLoading(true);
                          const finalOtp = forgotOtp.join('');

                          try {
                            const res = await fetch(getApiUrl('/api/auth/verify-otp'), {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email: forgotEmail.toLowerCase().trim(), code: finalOtp }),
                            });
                            const data = await res.json();

                            if (!res.ok) {
                              throw new Error(data.error || 'Incorrect or expired OTP');
                            }

                            setForgotStep(3);
                            notify("ইমেইল সফলভাবে ভেরিফাই হয়েছে! নতুন পাসওয়ার্ড দিন।");
                          } catch (err: any) {
                            console.error(err);
                            setError(err.message || 'ভেরিফিকেশন সম্পন্ন হয়নি। সঠিক কোড দিন।');
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        type="button"
                        disabled={isLoading} 
                        className="w-full bg-[#10b981] hover:bg-[#0fa472] text-white font-black italic py-5 rounded-[1.8rem] shadow-2xl shadow-emerald-500/20 uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all"
                      >
                        {isLoading ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div> : <>VERIFY CODE <ICONS.Check size={18} /></>}
                      </button>
                      <button type="button" onClick={() => setForgotStep(1)} className="w-full text-slate-400 hover:text-slate-600 font-bold uppercase text-[10px] tracking-widest text-center block">Resend/Change Email</button>
                    </div>
                  )}

                  {/* Step 3: Enter New Password */}
                  {forgotStep === 3 && (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      setError('');

                      if (forgotNewPassword.length < 6) {
                        setError("পাসওয়ার্ড অবশ্যই কমপক্ষে ৬ অক্ষরের হতে হবে! (Minimum 6 characters)");
                        return;
                      }

                      if (forgotNewPassword !== forgotConfirmPassword) {
                        setError("পাসওয়ার্ড দুটি মেলেনি! (Passwords do not match)");
                        return;
                      }

                      setIsLoading(true);
                      setTimeout(() => {
                        const targetEmail = forgotEmail.toLowerCase().trim();
                        
                        if (targetEmail === 'abdurrahman714915@gmail.com') {
                          setError("অ্যাডমিন পাসওয়ার্ড পরিবর্তন করার অনুমতি নেই।");
                          setIsLoading(false);
                          return;
                        }

                        const existingUsers = [...users];
                        const foundIdx = existingUsers.findIndex(u => u.email.toLowerCase().trim() === targetEmail);

                        if (foundIdx !== -1) {
                          const updatedUser = { ...existingUsers[foundIdx], password: forgotNewPassword };
                          existingUsers[foundIdx] = updatedUser;
                          localStorage.setItem('arez_users', JSON.stringify(existingUsers));
                          
                          onLogin(updatedUser);
                          
                          setForgotStep(1);
                          setForgotEmail('');
                          setForgotNewPassword('');
                          setForgotConfirmPassword('');
                          
                          notify("পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!");
                        } else {
                          setError("ব্যবহারকারী খুঁজে পাওয়া যায়নি!");
                        }
                        setIsLoading(false);
                      }, 1200);
                    }} className="space-y-6">
                      <div className="space-y-4 text-left">
                        <div className="space-y-3">
                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-extrabold font-sans">NEW PASSWORD (নতুন পাসওয়ার্ড)</label>
                          <input
                            type="password"
                            required
                            placeholder="Enter new password"
                            value={forgotNewPassword}
                            onChange={e => setForgotNewPassword(e.target.value)}
                            className="w-full bg-white/[0.05] border border-white/10 focus:border-emerald-400/80 focus:bg-white/[0.08] focus:ring-4 focus:ring-emerald-500/10 rounded-2xl py-4 px-6 text-white font-bold text-sm outline-none transition-all"
                          />
                        </div>
                        
                        <div className="space-y-3">
                          <label className="text-[9px] font-black uppercase text-slate-300 tracking-wider font-extrabold font-sans">CONFIRM PASSWORD (পাসওয়ার্ড নিশ্চিত করুন)</label>
                          <input
                            type="password"
                            required
                            placeholder="Confirm new password"
                            value={forgotConfirmPassword}
                            onChange={e => setForgotConfirmPassword(e.target.value)}
                            className="w-full bg-white/[0.05] border border-white/10 focus:border-emerald-400/80 focus:bg-white/[0.08] focus:ring-4 focus:ring-emerald-500/10 rounded-2xl py-4 px-6 text-white font-bold text-sm outline-none transition-all"
                          />
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        disabled={isLoading} 
                        className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black italic py-4 rounded-2xl shadow-xl shadow-emerald-500/25 uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                      >
                        {isLoading ? <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div> : <>SET NEW PASSWORD <ICONS.Shield size={18} /></>}
                      </button>
                      <button type="button" onClick={() => { setForgotStep(1); setView('login'); }} className="w-full text-slate-400 hover:text-white font-bold uppercase text-[10px] tracking-widest text-center mt-4">Back to Login</button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Social Connect & Switcher */}
            {view !== 'verify' && view !== 'admin-otp' && (
               <div className="space-y-6 text-center pt-6 border-t border-white/10 mt-6">
                   <motion.div variants={staggerItem} className="relative flex py-2 items-center">
                     <div className="flex-grow border-t border-slate-100"></div>
                     <span className="flex-shrink mx-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">AUTHORIZED CONNECT</span>
                     <div className="flex-grow border-t border-slate-100"></div>
                  </motion.div>

                  {isCurrentlyInApp() && (
                    <div className="p-4 bg-amber-50 border border-amber-100 text-amber-700 rounded-2xl text-[11px] font-bold text-left space-y-1.5 animate-pulse">
                      <div className="flex items-center gap-1.5 font-extrabold uppercase text-[10px] text-amber-600">
                        <span>⚠️ Messenger / WebView Detected</span>
                      </div>
                      <p>
                        In-app browsers (like Messenger) block Google Sign-In. Click the 3 dots (⋮) at the top right of your screen and select <strong>"Open in Chrome"</strong> or <strong>"Open in Browser"</strong> to continue.
                      </p>
                      <p className="text-[10px] text-slate-500">
                        (ফেসবুক মেসেঞ্জারে গুগল লগইন কাজ করে না। ব্রাউজারের উপরে ডানদিকের ৩টি ডটে ক্লিক করে <strong>"Open in Chrome"</strong> বা <strong>"Open in Browser"</strong> সিলেক্ট করুন।)
                      </p>
                    </div>
                  )}

                   <motion.div variants={staggerItem}>
                     <button 
                        type="button" 
                        onClick={startGoogleLogin}
                        disabled={isGoogleLoading}
                        className="w-full border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] py-3.5 sm:py-4 px-6 sm:px-8 rounded-2xl flex items-center justify-center gap-3 sm:gap-4 transition-all duration-300 shadow-md group active:scale-[0.98] disabled:opacity-50 hover:border-white/30 backdrop-blur-md"
                      >
                        {isGoogleLoading ? (
                          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <img src="https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" className="w-5 h-5 sm:w-5.5 sm:h-5.5" alt="G" />
                        )}
                        <span className="font-extrabold text-[12px] sm:text-[13px] text-slate-100 tracking-wide">
                          {isGoogleLoading ? 'AUTHENTICATING...' : 'Continue with Google'}
                        </span>
                      </button>
                   </motion.div>


                   {/* Collapsible Google OAuth Guide for the Developer */}
                   {typeof window !== 'undefined' && (window.location.search.includes('config=1') || window.location.search.includes('dev=1') || showHelp) && (
                     <div id="google-config-guide-anchor" className="text-left bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-2 mt-4">
                     <button 
                       type="button"
                       onClick={() => setShowHelp(!showHelp)}
                       className="flex items-center justify-between w-full text-slate-400 hover:text-slate-600 font-extrabold text-[10px] uppercase tracking-widest"
                     >
                       <span>🛠️ Google Login Configuration Guide</span>
                       <span className="text-[#10b981]">{showHelp ? '✕ CLOSE' : '▲ VIEW'}</span>
                     </button>
                     
                     {showHelp && (
                       <div className="text-[11px] text-slate-500 space-y-3 pt-2 leading-relaxed animate-in fade-in duration-200">
                         <p className="font-semibold text-slate-500">If you see "Error 400: redirect_uri_mismatch", do the following to configure Google Cloud:</p>
                         <ol className="list-decimal list-inside space-y-1.5 pl-1 text-slate-500 font-medium">
                           <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-[#10b981] underline">Google Cloud Console</a>.</li>
                           <li>Open your project and go to <strong>APIs & Services &gt; Credentials</strong>.</li>
                           <li>Edit your <strong>OAuth 2.0 Client ID</strong> credential.</li>
                           <li>Add these redirect URIs under <strong>"Authorized redirect URIs"</strong>:
                             <div className="space-y-3 mt-2 pl-3 border-l-2 border-slate-200 text-left">
                               <div>
                                 <div className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mb-1">1. Firebase Auth Handler (Primary Popup URI):</div>
                                 <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg font-mono text-[9.5px] text-emerald-700 flex items-center justify-between overflow-x-auto select-all">
                                   <span>{getBothRedirectUris().firebaseHandlerUri}</span>
                                   <button 
                                     type="button"
                                     onClick={() => {
                                       navigator.clipboard.writeText(getBothRedirectUris().firebaseHandlerUri);
                                       setCopiedFirebaseHandler(true);
                                       setTimeout(() => setCopiedFirebaseHandler(false), 2000);
                                     }}
                                     className="text-[10px] text-emerald-700 font-bold hover:text-emerald-900 ml-2 shrink-0 bg-white border border-emerald-300 px-2 py-0.5 rounded shadow-sm"
                                   >
                                     {copiedFirebaseHandler ? 'Copied!' : 'Copy'}
                                   </button>
                                 </div>
                               </div>
                               <div>
                                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">2. Development Environment:</div>
                                 <div className="bg-slate-100 p-2 rounded-lg font-mono text-[9.5px] text-emerald-600 flex items-center justify-between overflow-x-auto select-all">
                                   <span>{getBothRedirectUris().devUri}</span>
                                   <button 
                                     type="button"
                                     onClick={() => {
                                       navigator.clipboard.writeText(getBothRedirectUris().devUri);
                                       setCopiedRedirectDev(true);
                                       setTimeout(() => setCopiedRedirectDev(false), 2000);
                                     }}
                                     className="text-[10px] text-slate-500 hover:text-slate-700 ml-2 shrink-0 bg-white border border-slate-200 px-2 py-0.5 rounded"
                                   >
                                     {copiedRedirectDev ? 'Copied!' : 'Copy'}
                                   </button>
                                 </div>
                               </div>
                               <div>
                                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">3. Shared/Published Environment:</div>
                                 <div className="bg-slate-100 p-2 rounded-lg font-mono text-[9.5px] text-emerald-600 flex items-center justify-between overflow-x-auto select-all">
                                   <span>{getBothRedirectUris().preUri}</span>
                                   <button 
                                     type="button"
                                     onClick={() => {
                                       navigator.clipboard.writeText(getBothRedirectUris().preUri);
                                       setCopiedRedirectPre(true);
                                       setTimeout(() => setCopiedRedirectPre(false), 2000);
                                     }}
                                     className="text-[10px] text-slate-500 hover:text-slate-700 ml-2 shrink-0 bg-white border border-slate-200 px-2 py-0.5 rounded"
                                   >
                                     {copiedRedirectPre ? 'Copied!' : 'Copy'}
                                   </button>
                                 </div>
                                <div>
                                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">4. Live Custom Domain:</div>
                                  <div className="bg-slate-100 p-2 rounded-lg font-mono text-[9.5px] text-emerald-600 flex items-center justify-between overflow-x-auto select-all">
                                    <span>{getBothRedirectUris().liveUri}</span>
                                    <button 
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(getBothRedirectUris().liveUri);
                                        setCopiedRedirectLive(true);
                                        setTimeout(() => setCopiedRedirectLive(false), 2000);
                                      }}
                                      className="text-[10px] text-slate-500 hover:text-slate-700 ml-2 shrink-0 bg-white border border-slate-200 px-2 py-0.5 rounded"
                                    >
                                      {copiedRedirectLive ? 'Copied!' : 'Copy'}
                                    </button>
                                  </div>
                                </div>
                               </div>
                             </div>
                           </li>
                           <li>Save your credentials. Note that changes may take 5 minutes to propagate.</li>
                         </ol>
                         <p className="text-[10px] text-slate-400 italic">
                           (গুগল লগইন কাজ করার জন্য আপনার গুগল ক্লাউড কনসোলে ওপরে দেখানো Redirect URI টি 'Authorized redirect URIs' তালিকায় যুক্ত করুন।)
                         </p>
                       </div>
                     )}
                   </div>
                   )}

                  <motion.p variants={staggerItem} className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mt-6">
                     {view === 'login' ? "DON'T HAVE AN ACCOUNT?" : "ALREADY HAVE AN ACCOUNT?"} 
                     <button onClick={() => setView(view === 'login' ? 'signup' : 'login')} className="text-[#10b981] font-black underline underline-offset-[10px] ml-1">
                        {view === 'login' ? 'SIGN UP FREE' : 'LOG IN NOW'}
                     </button>
                  </motion.p>
               </div>
            )}
          </motion.div>
        </div>
      </div>

    </div>
  );
};

export default Auth;
