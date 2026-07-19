
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, AppNotification, Language } from '../types';
import { ICONS } from '../constants';
import { COUNTRIES } from './localization';

interface NavbarProps {
  user: User;
  isDarkMode: boolean;
  language: Language;
  selectedCountryCode?: string;
  onChangeCountry?: (code: string) => void;
  toggleDarkMode: () => void;
  toggleLanguage: () => void;
  onLogout: () => void;
  notify: (msg: string) => void;
  toggleSidebar: () => void;
  notifications?: AppNotification[];
  onClearNotifications?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ 
  user, isDarkMode, language, selectedCountryCode = 'BD', onChangeCountry, toggleDarkMode, toggleLanguage, onLogout, notify, toggleSidebar,
  notifications = [], onClearNotifications 
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showCountryMenu, setShowCountryMenu] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const currentCountry = COUNTRIES.find(c => c.code === selectedCountryCode);

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-white/10 h-16 md:h-20 flex items-center justify-between px-4 md:px-12 z-[100] transition-all sticky top-0 shadow-sm">
      <div className="flex items-center gap-3">
        {isHome ? (
          <button 
            onClick={toggleSidebar}
            className="md:hidden p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl hover:bg-[#10b981] hover:text-white transition-all active:scale-90 border border-slate-100 dark:border-white/5"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        ) : (
          <button 
            onClick={() => navigate('/')}
            className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl hover:bg-[#10b981] hover:text-white transition-all active:scale-90 flex items-center justify-center border border-slate-100 dark:border-white/5"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
        )}

        <Link to="/" className="hidden md:flex items-center gap-3.5 group">
          <div className="bg-[#10b981] p-2 rounded-xl shadow-lg shadow-emerald-500/10 group-hover:rotate-3 transition-transform">
            <ICONS.Logo size={22} className="text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tighter uppercase italic leading-none flex items-center">
              <span className="text-slate-950 dark:text-white">AR</span>
              <span className="text-[#10b981] drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">EARN</span>
              <span className="text-slate-950 dark:text-white">ZONE</span>
            </h1>
            <span className="text-[6px] font-black text-slate-400 uppercase tracking-[0.4em] mt-0.5 ml-0.5">Verified Ecosystem</span>
          </div>
        </Link>
        
        <div className="md:hidden flex flex-col">
          {isHome ? (
             <h1 className="text-base font-black tracking-tighter uppercase italic leading-none flex items-center">
                <span className="text-slate-950 dark:text-white">AR</span>
                <span className="text-[#10b981]">EARN</span>
                <span className="text-slate-950 dark:text-white">ZONE</span>
             </h1>
          ) : (
            <span className="text-slate-950 dark:text-white font-black uppercase text-[10px] tracking-widest italic">{location.pathname.substring(1).replace('-', ' ')}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-5">
        {/* Country Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowCountryMenu(!showCountryMenu)}
            className="p-3 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all flex items-center gap-2 border border-transparent active:border-[#10b981]"
            title="Select Country"
          >
            <span className="text-base leading-none shrink-0">{currentCountry?.flag || '🌐'}</span>
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{currentCountry?.code || 'Select'}</span>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-[#10b981]"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          {showCountryMenu && (
            <>
              <div className="fixed inset-0 z-[110]" onClick={() => setShowCountryMenu(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 rounded-2xl shadow-2xl z-[120] py-2 animate-in slide-in-from-top-2">
                <div className="px-3 py-1.5 border-b border-slate-50 dark:border-white/5 mb-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Select Country</span>
                </div>
                {COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      onChangeCountry?.(c.code);
                      setShowCountryMenu(false);
                    }}
                    className={`w-full px-3 py-2 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-all ${
                      selectedCountryCode === c.code ? 'bg-emerald-500/10 text-emerald-500 font-bold' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span className="text-lg leading-none">{c.flag}</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-black uppercase tracking-wider">{c.name}</span>
                      <span className="text-[8px] text-slate-400 font-medium">{c.currency} ({c.currencySymbol})</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Multi-language Switcher */}
        <button 
          onClick={toggleLanguage}
          className="p-3 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all flex items-center gap-2 border border-transparent active:border-[#10b981]"
          title="Switch Language"
        >
          <ICONS.Link size={16} className="text-[#10b981]" />
          <span className="text-[10px] font-black uppercase tracking-widest">{language}</span>
        </button>

        {/* Push Notification Center */}
        <div className="relative">
          <button 
            onClick={() => { setShowNotifMenu(!showNotifMenu); onClearNotifications?.(); }}
            className={`p-3 rounded-xl transition-all relative ${showNotifMenu ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            <ICONS.Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowNotifMenu(false)} />
              <div className="absolute right-0 mt-4 w-72 md:w-80 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 rounded-3xl shadow-2xl z-20 animate-in slide-in-from-top-4 overflow-hidden">
                <div className="p-5 border-b border-slate-50 dark:border-white/5 flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Alerts</h4>
                  <span className="text-[9px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 px-2 py-0.5 rounded-full font-bold">Real-time</span>
                </div>
                <div className="max-h-96 overflow-y-auto no-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-10 text-center opacity-30">
                       <ICONS.Bell size={32} className="mx-auto mb-3" />
                       <p className="text-[10px] font-black uppercase tracking-widest">No new alerts</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="p-4 border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-xl shrink-0 ${
                            n.type === 'task' ? 'bg-blue-500/10 text-blue-500' :
                            n.type === 'payment' ? 'bg-emerald-500/10 text-emerald-500' :
                            'bg-amber-500/10 text-amber-500'
                          }`}>
                            {n.type === 'task' ? <ICONS.Zap size={14} /> : n.type === 'payment' ? <ICONS.Wallet size={14} /> : <ICONS.Logo size={14} />}
                          </div>
                          <div className="space-y-1 overflow-hidden">
                            <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase leading-tight truncate">{n.title}</p>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">{n.message}</p>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{n.date}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <button 
                  onClick={() => setShowNotifMenu(false)}
                  className="w-full py-4 text-[9px] font-black uppercase text-slate-400 hover:text-emerald-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                >
                  Close History
                </button>
              </div>
            </>
          )}
        </div>

        <button 
          onClick={toggleDarkMode}
          className="p-3 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
        >
          {isDarkMode ? <ICONS.Sun size={20} /> : <ICONS.Moon size={20} />}
        </button>

        <div className="flex items-center gap-4 pl-3 md:pl-5 border-l border-slate-100 dark:border-white/10">
          <div className="hidden sm:flex flex-col text-right">
             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Authenticated</span>
             <span className="text-xs font-bold text-slate-900 dark:text-white uppercase leading-none">{user.name.split(' ')[0]}</span>
          </div>
          {user.avatar ? (
             <img src={user.avatar} className="w-10 h-10 md:w-11 md:h-11 rounded-xl object-cover shadow-sm border border-emerald-500/20" alt="User" />
          ) : (
            <div className="w-10 h-10 md:w-11 md:h-11 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
