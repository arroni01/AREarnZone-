
import React from 'react';
import { NavLink } from 'react-router-dom';
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
  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[140] transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <aside className={`
        fixed inset-y-0 left-0 w-64 lg:w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-white/5 h-screen transition-transform duration-300 z-[150]
        md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
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
          <button onClick={onClose} className="md:hidden text-slate-400 p-1 hover:text-emerald-500 transition-colors">
             <ICONS.Close size={24} />
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
            onClick={() => { onLogout(); onClose(); }}
            className="flex items-center gap-3 w-full px-5 py-4 text-xs font-bold text-slate-500 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all group"
          >
            <ICONS.Logout size={18} />
            Logout Account
          </button>
        </div>
      </aside>
    </>
  );
};

const SidebarLink: React.FC<{ to: string, icon: React.ReactNode, label: string, onClick?: () => void }> = ({ to, icon, label, onClick }) => {
  return (
    <NavLink 
      to={to} 
      onClick={onClick}
      className={({ isActive }) => `
        flex items-center gap-4 px-5 py-3.5 text-sm font-bold rounded-xl transition-all duration-300
        ${isActive 
          ? 'bg-[#10b981] text-white shadow-lg shadow-emerald-500/20' 
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#10b981]'}
      `}
    >
      <span className="shrink-0">{icon}</span>
      <span className="uppercase tracking-widest text-[10px]">{label}</span>
    </NavLink>
  );
};

export default Sidebar;
