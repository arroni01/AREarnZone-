
import React, { useRef, useState } from 'react';
import { User } from '../types';
import { ICONS } from '../constants';
import { compressImage } from '../utils/imageCompressor';
import { COUNTRIES } from './localization';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileProps {
  user: User;
  onUpdateUser: (user: User) => void;
  notify: (msg: string) => void;
  timezone: string;
  selectedCountryCode?: string;
  onChangeCountry?: (code: string) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser, notify, timezone, selectedCountryCode = 'BD', onChangeCountry }) => {
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebratedTitle, setCelebratedTitle] = useState('Verified Pro Upgrade');
  const [particles, setParticles] = useState<any[]>([]);

  const generateConfetti = () => {
    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6'];
    return Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      x: Math.random() * 360 - 180,
      y: Math.random() * -300 - 100,
      size: Math.random() * 8 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.4,
      rotation: Math.random() * 360,
    }));
  };

  const triggerCelebration = (title: string) => {
    setCelebratedTitle(title);
    setParticles(generateConfetti());
    setShowCelebration(true);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user.name);

  // Password reset/change dynamic states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      notify("প্রোফাইল পিকচার প্রসেস করা হচ্ছে...");
      compressImage(file, 200, 200, 0.7)
        .then(compressedUrl => {
          onUpdateUser({ ...user, avatar: compressedUrl });
          notify("Profile picture updated!");
        })
        .catch(err => {
          console.error("Avatar compression failed:", err);
          notify("ছবি প্রসেস করতে ব্যর্থ হয়েছে।");
        });
    }
  };

  const handleSaveName = () => {
    if (!newName.trim()) {
      notify("Name cannot be empty!");
      return;
    }
    onUpdateUser({ ...user, name: newName.trim() });
    setIsEditingName(false);
    notify("Name updated successfully!");
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();

    if (user.password !== 'google_oauth_authorized' && currentPassword !== user.password) {
      notify("বর্তমান পাসওয়ার্ড সঠিক নয়!");
      return;
    }

    if (newPassword.trim().length < 6) {
      notify("নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে!");
      return;
    }

    if (newPassword !== confirmPassword) {
      notify("পাসওয়ার্ড দুটি মেলেনি!");
      return;
    }

    setIsChangingPassword(true);
    setTimeout(() => {
      onUpdateUser({ ...user, password: newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
      notify("পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!");
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto px-2 pb-24">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 shadow-sm text-center space-y-6">
         <div className="relative w-24 h-24 mx-auto group">
            {user.avatar ? (
               <img src={user.avatar} className="w-24 h-24 rounded-[2rem] object-cover border-4 border-emerald-500/20 group-hover:opacity-80 transition-opacity" alt="Avatar" />
            ) : (
               <div className="w-24 h-24 bg-emerald-600 rounded-[2rem] flex items-center justify-center text-white text-3xl font-bold shadow-lg group-hover:opacity-80 transition-opacity">
                  {user.name.charAt(0).toUpperCase()}
               </div>
            )}
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-xl border-4 border-white dark:border-slate-900 shadow-lg hover:scale-110 active:scale-95 transition-all"
              title="Change Photo"
            >
               <ICONS.Image size={16} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleAvatarChange} 
            />
         </div>
         
         <div className="space-y-1">
            {isEditingName ? (
              <div className="flex items-center justify-center gap-2 max-w-xs mx-auto animate-in fade-in zoom-in duration-300">
                <input 
                  type="text" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-slate-50 dark:bg-white/5 border-2 border-[#10b981]/30 rounded-xl px-4 py-2 text-lg font-bold text-slate-900 dark:text-white outline-none w-full text-center"
                  autoFocus
                />
                <button 
                  onClick={handleSaveName}
                  className="bg-[#10b981] text-white p-2 rounded-xl shadow-lg hover:scale-110 active:scale-90 transition-all"
                >
                  <ICONS.Check size={20} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 group">
                <h2 className="text-2xl font-bold dark:text-white uppercase tracking-tight">{user.name}</h2>
                <button 
                  onClick={() => setIsEditingName(true)}
                  className="text-slate-400 hover:text-[#10b981] p-1 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
              </div>
            )}
            <p className="text-[#10b981] text-[10px] font-black uppercase mt-1 tracking-[0.2em] italic">{user.uid}</p>
            <p className="text-slate-400 text-xs font-semibold uppercase mt-1 tracking-widest">{user.email}</p>
         </div>

         <div className="grid grid-cols-2 gap-3 pt-4">
            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
               <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Status</p>
               <span className={`text-xs font-bold uppercase ${user.status === 'Verified' ? 'text-emerald-500' : 'text-amber-500'}`}>{user.status}</span>
            </div>
            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
               <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Member Since</p>
               <span className="text-xs font-bold dark:text-white">{new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
         </div>
      </div>

      {/* Country & Localization Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
         <div className="flex items-center justify-between">
           <h3 className="text-sm font-bold dark:text-white uppercase tracking-widest opacity-60">Country & Language (দেশ ও ভাষা)</h3>
           <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <span className="text-xs">🌐</span>
              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">LOCALIZED</span>
           </div>
         </div>
         
         <div className="space-y-4">
           <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Select Your Country (আপনার দেশ নির্বাচন করুন)</label>
           <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
             {COUNTRIES.map((c) => (
               <button
                 key={c.code}
                 onClick={() => {
                   onChangeCountry?.(c.code);
                   notify(`Country updated to ${c.name}! Language is set to ${c.languageName}.`);
                 }}
                 className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                   selectedCountryCode === c.code 
                     ? 'bg-[#10b981]/10 border-[#10b981] text-[#10b981] font-bold scale-102 shadow-md shadow-[#10b981]/5' 
                     : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 text-slate-700 dark:text-slate-300'
                 }`}
               >
                 <span className="text-2xl leading-none">{c.flag}</span>
                 <div className="text-center">
                   <p className="text-[10px] font-black uppercase tracking-wider leading-none mb-1">{c.name}</p>
                   <p className="text-[8px] text-slate-400 font-medium leading-none">{c.languageName} • {c.currency}</p>
                 </div>
               </button>
             ))}
           </div>
         </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
         <div className="flex items-center justify-between">
           <h3 className="text-sm font-bold dark:text-white uppercase tracking-widest opacity-60">Security & Protection</h3>
           <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <ICONS.Shield size={10} className="text-emerald-500" />
              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">VPS SECURED</span>
           </div>
         </div>
         <div className="space-y-4">
            <InfoRow label="ACCOUNT UID" value={user.uid} />
            <InfoRow label="Login IP" value={user.ip} />
            <InfoRow label="Device Info" value={user.deviceInfo} />
            <InfoRow label="Referral Code" value={user.referralCode} />
            <InfoRow label="System Timezone" value={timezone} />
            <InfoRow label="SECURITY TOKEN" value={user.securityToken?.substring(0, 10) + '...' || 'NOT SET'} />
         </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
         <div className="flex items-center justify-between">
           <h3 className="text-sm font-bold dark:text-white uppercase tracking-widest opacity-60">Change Password (পাসওয়ার্ড পরিবর্তন)</h3>
           <div className="flex items-center gap-1.5 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
              <ICONS.Lock size={10} className="text-blue-500" />
              <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">AUTHENTICATOR</span>
           </div>
         </div>
         
         <form onSubmit={handlePasswordChange} className="space-y-4">
           {user.password !== 'google_oauth_authorized' && (
             <div className="space-y-1 text-left">
               <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Current Password (বর্তমান পাসওয়ার্ড)</label>
               <input 
                 type="password"
                 placeholder="Enter current password"
                 value={currentPassword}
                 onChange={e => setCurrentPassword(e.target.value)}
                 className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-4 rounded-2xl outline-none focus:border-[#10b981] dark:text-white font-bold text-xs"
                 required
               />
             </div>
           )}

           <div className="space-y-1 text-left">
             <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">New Password (নতুন পাসওয়ার্ড - কমপক্ষে ৬ অক্ষরের)</label>
             <input 
               type="password"
               placeholder="Enter at least 6 characters"
               value={newPassword}
               onChange={e => setNewPassword(e.target.value)}
               className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-4 rounded-2xl outline-none focus:border-[#10b981] dark:text-white font-bold text-xs"
               required
             />
           </div>

           <div className="space-y-1 text-left">
             <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Confirm New Password (পাসওয়ার্ড নিশ্চিত করুন)</label>
             <input 
               type="password"
               placeholder="Confirm new password"
               value={confirmPassword}
               onChange={e => setConfirmPassword(e.target.value)}
               className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-4 rounded-2xl outline-none focus:border-[#10b981] dark:text-white font-bold text-xs"
               required
             />
           </div>

           <button 
             type="submit" 
             disabled={isChangingPassword}
             className="w-full py-4 bg-[#10b981] hover:bg-emerald-600 dark:text-white font-black uppercase text-[10px] tracking-wider rounded-2xl transition-all shadow-lg shadow-emerald-500/10 cursor-pointer active:scale-95 disabled:opacity-50"
           >
             {isChangingPassword ? 'SAVING CHANGES (সংরক্ষণ করা হচ্ছে)...' : 'CONFIRM PASSWORD CHANGE (পাসওয়ার্ড পরিবর্তন করুন)'}
           </button>
         </form>
      </div>

      {/* Rank Upgrade History Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
         <div className="flex items-center justify-between">
           <h3 className="text-sm font-bold dark:text-white uppercase tracking-widest opacity-60">
             {selectedCountryCode === 'BD' ? 'Rank & Category History (র‍্যাংক ও ক্যাটাগরি হিস্ট্রি)' : 'Rank & Category History'}
           </h3>
           <div className="flex items-center gap-1.5 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
              <span className="text-xs">👑</span>
              <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">
                {user.status === 'Verified' ? 'VERIFIED PRO' : 'STANDARD'}
              </span>
           </div>
         </div>

         <div className="space-y-4">
           {!user.rankHistory || user.rankHistory.length === 0 ? (
             <div className="text-center py-8 bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/5">
               <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                 {selectedCountryCode === 'BD' 
                   ? 'কোন অটো-আপগ্রেড হিস্ট্রি পাওয়া যায়নি।' 
                   : 'No auto-upgrade records found yet.'}
               </p>
               <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                 {selectedCountryCode === 'BD'
                   ? 'রেফারাল পেজে গিয়ে টার্গেট পূর্ণ করলে বোনাসের সাথে সাথে অ্যাকাউন্ট স্বয়ংক্রিয়ভাবে আপগ্রেড হবে!'
                   : 'Complete referral targets in the referral page to auto-upgrade your account status and claim rewards!'}
               </p>
             </div>
           ) : (
             <div className="space-y-3">
               {user.rankHistory.map((rk) => (
                 <div key={rk.id} className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all hover:border-amber-500/20">
                   <div className="space-y-1">
                     <div className="flex items-center gap-2">
                       <span className="text-xs font-bold text-slate-400 line-through">{rk.fromStatus}</span>
                       <span className="text-xs text-slate-400">➡️</span>
                       <span className="text-xs font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-wider">{rk.toStatus} Pro</span>
                     </div>
                     <p className="text-sm font-bold dark:text-white">
                       {rk.completedTargetTitle}
                     </p>
                     <p className="text-[9px] font-black text-indigo-400 uppercase tracking-wider">
                       {selectedCountryCode === 'BD' ? 'টার্গেট পূরণ করে বোনাস এবং র‍্যাংক অর্জিত!' : 'Target completed, bonus & rank rewarded!'}
                     </p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] text-slate-400 font-mono font-bold">{rk.date}</p>

                     <button

                       onClick={() => triggerCelebration(rk.completedTargetTitle)}

                       className="text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-xl mt-1.5 inline-flex items-center gap-1 transition-all active:scale-[0.95] border border-amber-500/20 cursor-pointer"

                       title="View Celebration Animation"

                     >

                       <span>🎉</span>

                       <span>{selectedCountryCode === 'BD' ? 'উদযাপন দেখুন' : 'View Celebration'}</span>

                     </button>
                   </div>
                 </div>
               ))}
             </div>
           )}
         </div>
      </div>

      <div className="bg-emerald-500 rounded-3xl p-6 text-white text-center shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95 transition-all" onClick={() => window.open('https://t.me/AREARNZONE_OFFICIAL', '_blank')}>
         <div className="flex items-center justify-center gap-3">
            <ICONS.Telegram size={24} />
            <span className="font-bold uppercase text-xs tracking-widest">Join Official Support</span>
         </div>

      {/* Dynamic Celebration Popup Modal */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden"
          >
            {/* Confetti Particle Burst */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ x: 0, y: 150, scale: 0, rotate: 0, opacity: 1 }}
                  animate={{ 
                    x: p.x * 2.5, 
                    y: p.y * 2.5, 
                    scale: [0, 1.2, 0.8],
                    rotate: p.rotation + 720,
                    opacity: [1, 1, 0]
                  }}
                  transition={{ 
                    duration: 2.2, 
                    delay: p.delay,
                    ease: "easeOut"
                  }}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: p.size,
                    height: p.size,
                    borderRadius: Math.random() > 0.5 ? '50%' : '20%',
                    backgroundColor: p.color,
                  }}
                />
              ))}
            </div>

            {/* Modal Dialog Card */}
            <motion.div
              initial={{ scale: 0.6, y: 50, opacity: 0 }}
              animate={{ 
                scale: 1, 
                y: 0, 
                opacity: 1,
                transition: { type: 'spring', damping: 15, stiffness: 100 }
              }}
              exit={{ scale: 0.8, y: 30, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[3rem] border border-amber-500/30 p-8 max-w-md w-full text-center relative shadow-2xl shadow-amber-500/10 space-y-6 overflow-hidden"
            >
              {/* Radial background glows */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

              {/* Glowing animated crown container */}
              <div className="relative inline-block">
                <motion.div
                  animate={{ 
                    scale: [1, 1.15, 1],
                    rotate: [0, -5, 5, 0]
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="w-20 h-20 bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 rounded-[2rem] flex items-center justify-center text-4xl shadow-xl shadow-amber-500/20"
                >
                  👑
                </motion.div>
                <motion.div 
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider"
                >
                  PRO
                </motion.div>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <span className="text-[10px] font-black bg-amber-500/10 text-amber-500 dark:text-amber-400 px-3 py-1 rounded-full uppercase tracking-widest border border-amber-500/25">
                  CONGRATULATIONS / অভিনন্দন! 🎉
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {selectedCountryCode === 'BD' 
                    ? 'ভেরিফাইড প্রো র‍্যাংক আনলকড!' 
                    : 'Verified Pro Rank Unlocked!'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold px-2 leading-relaxed">
                  {selectedCountryCode === 'BD'
                    ? "আপনি সফলভাবে '" + (celebratedTitle || "রেফারাল টার্গেট") + "' সম্পন্ন করে অ্যাকাউন্ট সরাসরি 'Verified Pro' ক্যাটাগরিতে অটো-আপগ্রেড করেছেন!"
                    : "You have successfully completed '" + (celebratedTitle || "referral target") + "' and auto-upgraded your status to 'Verified Pro' category!"}
                </p>
              </div>

              {/* Upgrade perks info box */}
              <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5 space-y-3.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Upgrade Reward / বোনাস</span>
                  <span className="text-sm font-black text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-md">
                    +৳200 BDT
                  </span>
                </div>
                <div className="border-t border-slate-200 dark:border-white/5 pt-3 space-y-2">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <span className="text-emerald-500">⚡</span>
                    <span>1-4 Hours Priority Withdrawals</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <span className="text-emerald-500">⭐</span>
                    <span>Higher Daily Income & Task Priority</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    <span className="text-emerald-500">🔥</span>
                    <span>Access to Exclusive Premium Surveys</span>
                  </div>
                </div>
              </div>

              {/* Action Close Button */}
              <button
                onClick={() => {
                  setShowCelebration(false);
                }}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black py-4 rounded-2xl text-[11px] uppercase tracking-wider shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                {selectedCountryCode === 'BD' ? "ধন্যবাদ, আমি প্রস্তুত!" : "Great, I'm Ready!"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      </div>

      </div>
  );
};

const InfoRow = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between items-center py-3 border-b border-slate-50 dark:border-white/5 last:border-0">
     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
     <span className="text-xs font-bold dark:text-white italic">{value}</span>
  </div>
);

export default Profile;
