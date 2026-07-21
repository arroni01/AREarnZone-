import React, { useState, useEffect } from 'react';
import { ICONS } from '../constants';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallSuccess?: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallSuccess
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'chrome'>('android');
  const [isInstalling, setIsInstalling] = useState(false);

  // Detect platform automatically on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || '';
      if (/iphone|ipad|ipod/i.test(ua)) {
        setActiveTab('ios');
      } else if (/android/i.test(ua)) {
        setActiveTab('android');
      } else {
        setActiveTab('chrome');
      }
    }
  }, []);

  if (!isOpen) return null;

  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );

  const handleDirectInstall = async () => {
    if (!deferredPrompt) return;
    try {
      setIsInstalling(true);
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult && choiceResult.outcome === 'accepted') {
        if (onInstallSuccess) onInstallSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Error triggering PWA install prompt:', err);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText('https://arearnzone-asia-no1-freelance.web.app');
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 rounded-3xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden p-5 sm:p-8 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Top Header Glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-white/5 rounded-full transition-all active:scale-90 z-10"
          title="Close"
        >
          <ICONS.Close size={20} />
        </button>

        {/* App Badge & Title */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl sm:rounded-3xl p-3 shadow-xl shadow-emerald-500/20 flex items-center justify-center ring-4 ring-emerald-500/20 relative group">
            <ICONS.Logo size={42} className="text-white" />
            <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 p-1.5 rounded-full shadow border-2 border-white dark:border-slate-900">
              <ICONS.Download size={14} className="stroke-[3]" />
            </div>
          </div>

          <div>
            <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] sm:text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">
              OFFICIAL AREARNZONE APP
            </span>
            <h3 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight">
              {isStandalone ? 'APP INSTALLED & READY' : 'DOWNLOAD AREARNZONE APP'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-sm mx-auto mt-1 leading-relaxed">
              {isStandalone 
                ? 'You are already enjoying the full AREARNZONE standalone app experience!'
                : 'Install our high-performance PWA to get 1-tap instant access, instant task alerts & smoother navigation.'}
            </p>
          </div>
        </div>

        {/* Direct PWA One-Tap Install Action (If available) */}
        {deferredPrompt && !isStandalone && (
          <div className="mt-5 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl sm:rounded-3xl space-y-3 text-center">
            <div className="flex items-center justify-center gap-2 text-emerald-500 text-xs font-black uppercase tracking-wider">
              <ICONS.Zap size={16} className="animate-bounce" />
              <span>Direct 1-Tap Installation Available</span>
            </div>
            <button
              onClick={handleDirectInstall}
              disabled={isInstalling}
              className="w-full bg-[#10b981] hover:bg-emerald-600 active:scale-98 text-white font-black py-3.5 px-6 rounded-xl sm:rounded-2xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2.5 text-xs uppercase tracking-widest transition-all"
            >
              <ICONS.Download size={18} className="animate-pulse" />
              <span>{isInstalling ? 'Installing App...' : 'INSTALL NOW / ইনস্টল করুন'}</span>
            </button>
          </div>
        )}

        {/* Step-By-Step Fallback Instructions */}
        {!isStandalone && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-2">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Installation Steps
              </span>
              
              {/* Platform Selector Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('android')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    activeTab === 'android' 
                      ? 'bg-[#10b981] text-white shadow' 
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Android
                </button>
                <button
                  onClick={() => setActiveTab('ios')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    activeTab === 'ios' 
                      ? 'bg-[#10b981] text-white shadow' 
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  iPhone (iOS)
                </button>
                <button
                  onClick={() => setActiveTab('chrome')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    activeTab === 'chrome' 
                      ? 'bg-[#10b981] text-white shadow' 
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  PC / Chrome
                </button>
              </div>
            </div>

            {/* Android Instructions */}
            {activeTab === 'android' && (
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-white/5 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-500 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-slate-900 dark:text-white">
                      অ্যানড্রয়েড ব্রাউজারের উপরে ডানদিকের ৩-ডট (⋮) অপশনে চাপ দিন।
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Tap the 3 dots menu (⋮) at the top right of Chrome / Samsung Internet.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-white/5 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-500 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-slate-900 dark:text-white">
                      <span className="text-emerald-500">"Install App"</span> বা <span className="text-emerald-500">"Add to Home screen"</span> অপশনে সিলেক্ট করুন।
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Select "Install app" or "Add to Home Screen" from the menu.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-white/5 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-500 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-slate-900 dark:text-white">
                      <span className="text-emerald-500">"Install" / "Add"</span> বাটনে চাপ দিয়ে নিশ্চিত করুন।
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Tap "Install" to place the AREARNZONE app icon on your home screen.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* iOS Instructions */}
            {activeTab === 'ios' && (
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-white/5 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-500 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-slate-900 dark:text-white">
                      আইফোনের Safari ব্রাউজারের নিচের দিকে <span className="text-blue-400">Share (শেয়ার)</span> আইকনে চাপ দিন।
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Tap the Share button at the bottom toolbar of Safari.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-white/5 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-500 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-slate-900 dark:text-white">
                      নিচে স্ক্রোল করে <span className="text-emerald-500">"Add to Home Screen" (+)</span> অপশনে চাপ দিন।
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Scroll down and tap "Add to Home Screen".
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-white/5 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-500 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-slate-900 dark:text-white">
                      উপরে ডানপাশে <span className="text-emerald-500">"Add"</span> বাটনে ক্লিক করে অ্যাপটি ইনস্টল করুন।
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Tap "Add" in the top right corner.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PC / Chrome Instructions */}
            {activeTab === 'chrome' && (
              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-white/5 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-500 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-slate-900 dark:text-white">
                      পিসির ক্রোম ব্রাউজারের অ্যাড্রেস বারের ডানপাশে <span className="text-emerald-500">Install Icon</span> ক্লিক করুন।
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Click the Install icon in Chrome address bar or top right menu.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-white/5 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-500 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-slate-900 dark:text-white">
                      <span className="text-emerald-500">"Install"</span> নিশ্চিত করে সরাসরি ডেক্সটপ অ্যাপ হিসেবে ব্যবহার করুন।
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Confirm installation to launch AREARNZONE as a standalone Desktop App.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* In-App Browser Helper / Copy Link */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
              <span className="text-[10px] text-slate-400 font-medium">
                in-app ব্রাউজারে থাকলে লিংক কপি করে ক্রোম/সাফারিতে ওপেন করুন:
              </span>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0"
              >
                <ICONS.Link size={12} />
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer Button */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all"
          >
            Got It / ঠিক আছে
          </button>
        </div>

      </div>
    </div>
  );
};
