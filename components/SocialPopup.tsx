
import React from 'react';
import { SocialLink } from '../types';
import { ICONS } from '../constants';

interface SocialPopupProps {
  links: SocialLink[];
  onClose: () => void;
}

const SocialPopup: React.FC<SocialPopupProps> = ({ links, onClose }) => {
  const activeLinks = links.filter(l => l.isActive);
  if (activeLinks.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-10 shadow-2xl relative border-4 border-emerald-500/30 text-center space-y-8 animate-in zoom-in duration-300 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none"></div>

        <div className="relative z-10">
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-[1.8rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-emerald-500/20">
            <ICONS.Referral size={40} className="animate-pulse" />
          </div>

          <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none mb-2">Join Our Community</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">Stay updated with the latest alerts</p>

          <div className="space-y-3 mt-8">
            {activeLinks.map(link => (
              <button
                key={link.id}
                onClick={() => window.open(link.url, '_blank')}
                className={`w-full flex items-center justify-between p-5 rounded-2xl text-white font-black uppercase text-[10px] tracking-widest shadow-lg transition-all active:scale-95 group ${
                  link.type === 'Telegram' ? 'bg-blue-500 shadow-blue-500/20' : 
                  link.type === 'Facebook' ? 'bg-blue-700 shadow-blue-700/20' : 
                  'bg-emerald-500 shadow-emerald-500/20'
                }`}
              >
                <div className="flex items-center gap-3">
                   {link.type === 'Telegram' ? <ICONS.Telegram size={16} /> : <ICONS.Check size={16} />}
                   <span>Join {link.name}</span>
                </div>
                <ICONS.Link size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            ))}
          </div>

          <button 
            onClick={onClose}
            className="w-full mt-10 py-4 bg-slate-50 dark:bg-slate-800 text-slate-400 font-bold rounded-2xl uppercase tracking-widest text-[9px] hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default SocialPopup;
