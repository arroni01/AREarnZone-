
import React, { useState } from 'react';
import { ICONS } from '../constants';

interface AdminOtpProps {
  onVerify: () => void;
  notify: (msg: string) => void;
}

const AdminOtp: React.FC<AdminOtpProps> = ({ onVerify, notify }) => {
  const [otp, setOtp] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp === '60624971') {
      onVerify();
      notify("Admin Access Granted.");
    } else {
      setIsError(true);
      notify("Invalid OTP. Access Denied.");
      setTimeout(() => setIsError(false), 500);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className={`bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-10 shadow-2xl border ${isError ? 'border-red-500 animate-shake' : 'border-slate-100 dark:border-white/5'} transition-all duration-300`}>
        <div className="text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto border-2 border-emerald-500/20 shadow-xl">
            <ICONS.Shield size={40} />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Admin Verification</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enter Secure OTP to Access Control Center</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="relative group">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                <ICONS.Lock size={20} />
              </div>
              <input 
                type="password" 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="ENTER 8-DIGIT OTP"
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 py-5 pl-16 pr-6 rounded-2xl outline-none focus:border-emerald-500 dark:text-white font-black text-center tracking-[0.5em] text-lg transition-all"
                maxLength={8}
                required
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-emerald-500 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-500/20 uppercase text-xs tracking-[0.2em] active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <ICONS.Check size={20} /> VERIFY ACCESS
            </button>
          </form>

          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest pt-4 italic">Security Protocol: 2FA Required for Admin Nodes</p>
        </div>
      </div>
    </div>
  );
};

export default AdminOtp;
