
import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';
import { ICONS } from '../constants';

interface SidebarProps {
  user: User;
  isDarkMode: boolean;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, isDarkMode, onLogout, isOpen, onClose }) => {
  const location = useLocation();
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  const [isDesktop, setIsDesktop] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-close sidebar whenever route/location changes
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location.pathname]);

  // Keyboard Escape listener to dismiss side menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when mobile sidebar drawer is open
  useEffect(() => {
    if (isOpen && !isDesktop) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, isDesktop]);

  return (
    <>
      {/* Mobile Dark Backdrop Overlay */}
      <AnimatePresence>
        {isOpen && !isDesktop && (
          <motion.div 
            key="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] md:hidden cursor-pointer"
            onClick={() => onClose()}
            onTouchEnd={() => onClose()}
            aria-label="Close menu backdrop"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <motion.aside 
        ref={sidebarRef}
        initial={false}
        animate={{ 
          x: isDesktop ? '0%' : (isOpen ? '0%' : '-100%') 
        }}
        transition={{ 
          type: 'spring', 
          damping: 26, 
          stiffness: 240,
          mass: 0.8
        }}
        className={`
          cyberpunk-sidebar fixed md:relative inset-y-0 left-0 w-64 lg:w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-white/5 h-screen z-[10000] md:z-auto shadow-2xl md:shadow-none
        `}
      >
        <div className="p-8 lg:p-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5 group">
            <div className="bg-[#10b981] p-2.5 rounded-2xl shadow-xl shadow-emerald-500/20 group-hover:rotate-6 transition-transform duration-500">
              <ICONS.Logo size={28} className="text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tighter uppercase italic leading-none flex items-center">
                <span className="text-slate-950 dark:text-white">AR</span>
                <span className="text-[#10b981] drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">EARN</span>
                <span className="text-slate-950 dark:text-white">ZONE</span>
              </h1>
              <span className="text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mt-1 ml-0.5">Verified Hub</span>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-emerald-500 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/10 active:scale-90 transition-all flex items-center justify-center cursor-pointer"
            aria-label="Close Navigation Menu"
          >
             <ICONS.Close size={22} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-2 overflow-y-auto no-scrollbar max-h-[calc(100vh-250px)]">
          <SidebarLink to="/" icon={<ICONS.Dashboard size={18} />} label="Dashboard" onClick={onClose} />
          <SidebarLink to="/tasks" icon={<ICONS.Tasks size={18} />} label="Daily Tasks" onClick={onClose} />
          <SidebarLink to="/history" icon={<ICONS.Clock size={18} />} label="Wallet History" onClick={onClose} />
          <SidebarLink to="/membership" icon={<ICONS.Gift size={18} />} label="Membership" onClick={onClose} />
          <SidebarLink to="/referral" icon={<ICONS.Referral size={18} />} label="Refer & Earn" onClick={onClose} />
          <SidebarLink to="/deposit" icon={<ICONS.Wallet size={18} />} label="Deposit" onClick={onClose} />
          <SidebarLink to="/withdraw" icon={<ICONS.Withdraw size={18} />} label="Withdraw" onClick={onClose} />
          <SidebarLink to="/buy" icon={<ICONS.Buy size={18} />} label="Buy (Shop)" onClick={onClose} />
          <SidebarLink to="/telegram-verify" icon={<ICONS.Telegram size={18} />} label={user.isTelegramVerified ? "Telegram Task" : "Telegram Verify"} onClick={onClose} />
          <SidebarLink to="/faq" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>} label="FAQ / সাহায্য" onClick={onClose} />
          <SidebarLink to="/profile" icon={<ICONS.Shield size={18} />} label="My Profile" onClick={onClose} />
          
          {(user.role === 'admin' || user.isMonitor) && (
            <div className="pt-4 mt-4 border-t border-slate-50 dark:border-white/5">
              <p className="px-5 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">
                {user.role === 'admin' ? 'Admin Portal' : 'Monitor Hub'}
              </p>
              <SidebarLink to="/admin" icon={<ICONS.Admin size={18} />} label={user.role === 'admin' ? "Control Center" : "Monitor Center"} onClick={onClose} />
            </div>
          )}
        </nav>

        <div className="p-6 lg:p-8">
          <button 
            type="button"
            onClick={() => { 
              onClose(); 
              onLogout(); 
            }}
            className="flex items-center gap-3 w-full px-5 py-4 text-xs font-bold text-slate-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all group active:scale-98 cursor-pointer"
          >
            <ICONS.Logout size={18} />
            Logout Account
          </button>
        </div>
      </motion.aside>
    </>
  );
};

const SidebarLink: React.FC<{ to: string, icon: React.ReactNode, label: string, onClick?: () => void }> = ({ to, icon, label, onClick }) => {
  return (
    <NavLink 
      to={to} 
      onClick={onClick}
      className={({ isActive }) => `
        group flex items-center gap-4 px-5 py-3.5 text-sm font-bold rounded-xl transition-all duration-300 border border-transparent
        ${isActive 
          ? 'bg-[#10b981] text-slate-950 font-black shadow-lg shadow-emerald-500/30 scale-[1.02] neon-glow-emerald' 
          : 'text-slate-400 hover:bg-slate-800/90 hover:text-emerald-300 hover:scale-[1.02] hover:border-emerald-500/30 hover:shadow-[0_0_18px_rgba(16,185,129,0.25)]'}
      `}
    >
      <span className="shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:text-emerald-400">{icon}</span>
      <span className="uppercase tracking-widest text-[10px]">{label}</span>
    </NavLink>
  );
};

export default Sidebar;
