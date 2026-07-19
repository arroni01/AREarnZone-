
import React from 'react';
import { Transaction, User } from '../types';
import { ICONS } from '../constants';
import { LocalizedReward } from './localization';

interface HistoryProps {
  transactions: Transaction[];
  user: User;
  // Added translation helper prop
  t: (key: any) => string;
  selectedCountryCode?: string;
}

const History: React.FC<HistoryProps> = ({ transactions, user, t, selectedCountryCode = 'BD' }) => {
  const userTransactions = transactions.filter(t => t.userId === user.id);

  return (
    <div className="space-y-6 max-w-2xl mx-auto px-2 pb-24">
      <div className="flex items-center justify-between px-2">
         <h2 className="text-2xl font-bold dark:text-white uppercase tracking-tight">Transaction History</h2>
         <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-white/5">
            <ICONS.Clock size={20} className="text-emerald-500" />
         </div>
      </div>

      <div className="space-y-3">
         {userTransactions.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] py-32 text-center opacity-30">
               <ICONS.Wallet size={48} className="mx-auto mb-4 text-slate-400" />
               <p className="font-bold uppercase text-xs tracking-widest">No activities recorded yet</p>
            </div>
         ) : (
            userTransactions.map(t => (
               <div key={t.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 flex justify-between items-center group transition-all hover:border-emerald-500/20">
                  <div className="flex items-center gap-4">
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        t.type === 'Withdraw' ? 'bg-orange-500/10 text-orange-500' :
                        t.type === 'Referral' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-emerald-500/10 text-emerald-500'
                     }`}>
                        {t.type === 'Withdraw' ? <ICONS.Withdraw size={20} /> :
                         t.type === 'Referral' ? <ICONS.Referral size={20} /> :
                         <ICONS.Zap size={20} />}
                     </div>
                     <div>
                        <h4 className="font-bold text-sm dark:text-white leading-none mb-1">{t.type} Rewards</h4>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{t.date.split(',')[0]}</p>
                     </div>
                  </div>
                  <div className="text-right flex flex-col items-end justify-center">
                     <div className="flex items-center gap-1">
                        <span className={`text-lg font-bold ${t.type === 'Withdraw' ? 'text-red-500' : 'text-emerald-500'}`}>
                           {t.type === 'Withdraw' ? '-' : '+'}
                        </span>
                        <LocalizedReward bdtAmount={t.amount} countryCode={selectedCountryCode} className="inline-flex flex-row items-center gap-1" textClassName={`text-lg font-bold ${t.type === 'Withdraw' ? 'text-red-500' : 'text-emerald-500'}`} usdClassName="text-xs font-bold text-slate-400" />
                     </div>
                     <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t.status}</p>
                  </div>
               </div>
            ))
         )}
      </div>
    </div>
  );
};

export default History;
