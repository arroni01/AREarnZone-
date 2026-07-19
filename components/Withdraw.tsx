
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, WithdrawOption, PaymentMethod, WithdrawRequest, GlobalConfig } from '../types';
import { ICONS } from '../constants';
import { useNavigate } from 'react-router-dom';
import { LocalizedReward, convertCurrency } from './localization';
import { AlertTriangle } from 'lucide-react';

interface WithdrawProps {
  user: User;
  users?: User[];
  onUpdateUser: (user: User) => void;
  notify: (msg: string) => void;
  options: WithdrawOption[];
  paymentMethods: PaymentMethod[];
  withdraws: WithdrawRequest[];
  setWithdraws: React.Dispatch<React.SetStateAction<WithdrawRequest[]>>;
  // Translation helper prop
  t: (key: any) => string;
  selectedCountryCode?: string;
  globalConfig?: GlobalConfig;
}

const Withdraw: React.FC<WithdrawProps> = ({ 
  user, users, onUpdateUser, notify, options, paymentMethods, withdraws, setWithdraws, t, selectedCountryCode = 'BD', globalConfig
}) => {
  const navigate = useNavigate();
  const activeMethods = paymentMethods.filter(m => m.isActive && m.category === 'withdraw');
  const activeOptions = options.filter(o => o.isActive);

  const [selectedOption, setSelectedOption] = useState<WithdrawOption | null>(activeOptions.length > 0 ? activeOptions[0] : null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(activeMethods.length > 0 ? activeMethods[0] : null);
  const [accountNumber, setAccountNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState<{ id: string; amount: number; method: string; accountNumber: string; fee: number; net: number } | null>(null);

  const isMembershipLocked = user.status !== 'Verified' && user.role !== 'admin';
  
  const referredUsersCount = (users && user.referralCode)
    ? users.filter(u => u.referredBy && u.referredBy.toUpperCase() === user.referralCode.toUpperCase()).length
    : 0;
  const dynamicReferralCount = Math.max(user.referralCount || 0, referredUsersCount);

  const isReferralLocked = !!globalConfig?.requireReferralToWithdraw && dynamicReferralCount < 1 && user.role !== 'admin';

  const calculateFinancials = () => {
    if (!selectedOption || !selectedMethod) return { base: 0, tierFee: 0, methodFee: 0, totalFees: 0, net: 0 };
    let base = selectedOption.amount === 'all' ? user.balance : selectedOption.amount as number;
    let tierFee = selectedOption.feeType === 'flat' ? selectedOption.feeValue : (base * selectedOption.feeValue) / 100;
    let methodFee = selectedMethod.feeType === 'flat' ? selectedMethod.feeValue : (base * selectedMethod.feeValue) / 100;
    const totalFees = tierFee + methodFee;
    const netAmount = Math.max(0, base - totalFees);
    return { base, tierFee, methodFee, totalFees, net: netAmount };
  };

  const { base, totalFees, net } = calculateFinancials();

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (isMembershipLocked) {
      notify("উইথড্রল আনলক করতে মেম্বারশিপ আপগ্রেড করুন।");
      return;
    }
    if (isReferralLocked) {
      notify("উইথড্রল আনলক করতে নূন্যতম ১টি রেফার প্রয়োজন।");
      return;
    }
    if (!selectedOption || !selectedMethod || !accountNumber) {
      notify("সব তথ্য পূরণ করুন।");
      return;
    }
    if (selectedMethod && base < selectedMethod.minWithdraw) {
      notify(`দুঃখিত, ${selectedMethod.name} গেটওয়ের জন্য নূন্যতম উইথড্র পরিমাণ ${selectedMethod.minWithdraw} টাকা।`);
      return;
    }
    if (base > user.balance) {
      notify("ব্যালেন্স পর্যাপ্ত নয়।");
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      const newRequest: WithdrawRequest = {
        id: Math.random().toString(36).substr(2, 9),
        userId: user.id,
        userName: user.name,
        amount: base,
        method: selectedMethod.name,
        accountNumber: accountNumber,
        fee: totalFees,
        status: 'pending',
        date: new Date().toLocaleString()
      };
      setWithdraws(prev => [newRequest, ...prev]);
      onUpdateUser({ ...user, balance: user.balance - base });
      setIsProcessing(false);
      setAccountNumber('');
      setShowSuccessModal({
        id: newRequest.id,
        amount: base,
        method: selectedMethod.name,
        accountNumber: accountNumber,
        fee: totalFees,
        net: net
      });
    }, 2500);
  };

  const userHistory = withdraws.filter(w => w.userId === user.id);

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20 px-4 relative">
      
      {/* PERMANENT LOCK OVERLAYS */}
      {(isMembershipLocked || isReferralLocked) && (
        <div className="fixed inset-0 top-20 bottom-20 z-[60] flex items-center justify-center p-6 backdrop-blur-xl bg-slate-950/40">
          <div className="w-full max-w-sm bg-slate-900/80 backdrop-blur-3xl rounded-[3.5rem] p-10 text-center shadow-[0_0_100px_rgba(16,185,129,0.2)] border-2 border-[#10b981]/30 animate-in zoom-in duration-300">
            <div className="relative z-10">
              <div className="w-24 h-24 bg-emerald-500/10 text-[#10b981] rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner border border-emerald-500/20">
                <ICONS.Shield size={48} className="animate-pulse" />
              </div>
              <h3 className="text-3xl font-black mb-4 text-white uppercase tracking-tighter italic">Permanently Locked</h3>
              
              <div className="space-y-4 mb-10">
                {isMembershipLocked ? (
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[#10b981] text-[11px] font-black uppercase tracking-widest mb-1 italic">Requirement 1</p>
                    <p className="text-white text-xs font-bold leading-relaxed uppercase">Upgrade Membership to Pro</p>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center justify-center gap-2">
                    <ICONS.Check size={14} className="text-emerald-500" />
                    <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest italic">Membership Verified</p>
                  </div>
                )}

                {isReferralLocked ? (
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[#10b981] text-[11px] font-black uppercase tracking-widest mb-1 italic">Requirement 2</p>
                    <p className="text-white text-xs font-bold leading-relaxed uppercase">Invite 1 Friend to Join</p>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center justify-center gap-2">
                    <ICONS.Check size={14} className="text-emerald-500" />
                    <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest italic">1 Referral Completed</p>
                  </div>
                )}
              </div>

              <p className="text-slate-400 text-[10px] font-black mb-8 leading-relaxed px-2 uppercase tracking-widest opacity-60">
                উইথড্রল সিস্টেম পার্মানেন্টলি আনলক করতে এই ধাপগুলো সম্পন্ন করুন।
              </p>

              <div className="space-y-3">
                <button 
                  onClick={() => navigate(isMembershipLocked ? '/membership' : '/referral')} 
                  className="w-full bg-[#10b981] text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-emerald-500/40 text-[11px] uppercase tracking-[0.25em] hover:scale-105 active:scale-95 transition-all"
                >
                  {isMembershipLocked ? 'Upgrade to Pro' : 'Invite a Friend'}
                </button>
                <button 
                  onClick={() => navigate('/')} 
                  className="w-full bg-white/5 text-slate-400 font-black py-4 rounded-[1.8rem] text-[10px] uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all border border-white/5"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`${(isMembershipLocked || isReferralLocked) ? 'opacity-5 blur-3xl pointer-events-none' : ''} transition-all duration-700`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">Withdraw <span className="text-[#10b981]">Assets</span></h2>
            <p className="text-slate-400 font-black text-[10px] tracking-widest uppercase italic opacity-60">Verified Payout System • Permanent Access</p>
          </div>
          <div className="bg-white/5 backdrop-blur-3xl px-8 py-5 rounded-[2.5rem] border border-white/5 shadow-2xl flex items-center gap-6 group hover:border-[#10b981]/30 transition-all">
              <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-1">ব্যালেন্স</span>
                  <LocalizedReward bdtAmount={user.balance} countryCode={selectedCountryCode} className="flex flex-col items-end" textClassName="text-3xl font-black text-[#10b981] leading-none" usdClassName="text-[10px] font-bold text-slate-400 mt-1 uppercase" />
              </div>
              <div className="p-4 bg-emerald-500/10 text-[#10b981] rounded-2xl group-hover:scale-110 transition-transform shadow-inner border border-emerald-500/10">
                  <ICONS.Wallet size={32} />
              </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mt-10">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-slate-900/30 backdrop-blur-3xl rounded-[3rem] p-8 md:p-12 border border-white/5 shadow-2xl space-y-12 relative overflow-hidden">
              <form onSubmit={handleWithdraw} className="space-y-12 relative z-10">
                <div className="space-y-6">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2 italic">১. টায়ার সিলেক্ট করুন</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {activeOptions.map(opt => (
                      <button
                        key={opt.id} type="button" onClick={() => setSelectedOption(opt)}
                        className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center justify-center text-center gap-1 backdrop-blur-md ${
                          selectedOption?.id === opt.id 
                            ? 'bg-[#10b981] border-[#10b981] text-white shadow-2xl shadow-emerald-500/30' 
                            : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        <span className="text-[10px] font-black uppercase opacity-60 leading-none mb-1">{opt.label}</span>
                        <span className="text-xl font-black italic tracking-tighter">
                          {opt.amount === 'all' ? 'FULL' : (
                            selectedCountryCode === 'BD' ? `৳${opt.amount}` : (
                              `${convertCurrency(Number(opt.amount), selectedCountryCode).symbol}${convertCurrency(Number(opt.amount), selectedCountryCode).mainVal.toFixed(0)}`
                            )
                          )}
                        </span>
                        {opt.amount !== 'all' && selectedCountryCode !== 'BD' && (
                          <span className="text-[9px] font-bold opacity-65 leading-none">
                            (${convertCurrency(Number(opt.amount), selectedCountryCode).usdVal.toFixed(1)})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2 italic">২. গেটওয়ে সিলেক্ট করুন</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {activeMethods.map(method => {
                      const isLimitExceeded = method.isLimitExceeded || method.status === 'Unavailable';
                      return (
                        <button
                          key={method.id} 
                          type="button" 
                          disabled={isLimitExceeded}
                          onClick={() => setSelectedMethod(method)}
                          className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center backdrop-blur-md gap-1 ${
                            isLimitExceeded
                              ? 'bg-red-500/5 border-red-500/10 text-red-500/50 opacity-40 cursor-not-allowed'
                              : selectedMethod?.id === method.id 
                                ? 'bg-[#10b981] border-[#10b981] text-white shadow-xl shadow-emerald-500/20' 
                                : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                          }`}
                        >
                          <span className="text-base font-black tracking-tight uppercase italic leading-none mb-1">{method.name}</span>
                          <span className="text-[9px] font-black uppercase opacity-60 leading-none">{method.type}</span>
                          {method.minWithdraw > 0 && (
                            <span className="text-[9px] font-bold opacity-80">
                              Min: ৳{method.minWithdraw}
                            </span>
                          )}
                          <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md ${
                            isLimitExceeded ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {isLimitExceeded ? "Unavailable" : "Available"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2 italic">৩. অ্যাকাউন্ট নম্বর</label>
                  <div className="relative group">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#10b981] transition-colors">
                          <ICONS.Zap size={22} />
                      </div>
                      <input 
                        type="text" required value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="অ্যাকাউন্ট নম্বরটি দিন..."
                        className="w-full bg-black/40 border-2 border-transparent focus:border-[#10b981]/30 rounded-[2.5rem] py-6 pl-16 pr-8 text-white font-black text-lg outline-none transition-all shadow-inner placeholder:text-slate-800"
                      />
                  </div>
                </div>

                <div className="bg-black/40 backdrop-blur-xl p-8 rounded-[3rem] border border-white/5 space-y-6 relative overflow-hidden">
                  <div className="flex justify-between items-end px-2">
                      <div className="space-y-1">
                          <span className="text-sm font-black text-white uppercase italic tracking-tighter">নিট অ্যামাউন্ট</span>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none italic">আপনি পাবেন</p>
                      </div>
                      <LocalizedReward bdtAmount={net} countryCode={selectedCountryCode} className="flex flex-col items-end" textClassName="text-5xl font-black text-[#10b981] tracking-tighter italic leading-none" usdClassName="text-xs font-bold text-slate-400 mt-1 uppercase" />
                  </div>
                </div>

                {selectedMethod && base < selectedMethod.minWithdraw && (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl flex items-center gap-3 text-rose-400 font-bold text-xs uppercase tracking-wide animate-in fade-in slide-in-from-top-2">
                    <AlertTriangle className="text-rose-500 shrink-0" size={18} />
                    <span>
                      দুঃখিত, {selectedMethod.name} গেটওয়ের জন্য নূন্যতম উইথড্র পরিমাণ ৳{selectedMethod.minWithdraw}। অনুগ্রহ করে অন্য গেটওয়ে বা উচ্চতর টায়ার সিলেক্ট করুন।
                    </span>
                  </div>
                )}

                <button 
                  disabled={isProcessing || !selectedOption || !selectedMethod || base > user.balance || (selectedMethod && base < selectedMethod.minWithdraw)}
                  className={`w-full font-black py-7 rounded-[3rem] shadow-2xl transition-all text-2xl uppercase tracking-[0.1em] flex items-center justify-center gap-4 ${
                      isProcessing || !selectedOption || !selectedMethod || base > user.balance || (selectedMethod && base < selectedMethod.minWithdraw)
                      ? 'bg-white/5 text-slate-700 cursor-not-allowed'
                      : 'bg-[#10b981] text-white shadow-emerald-500/40 hover:scale-[1.02] active:scale-95'
                  }`}
                >
                  {isProcessing ? 'প্রসেসিং...' : 'উইথড্র সাবমিট করুন'}
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] p-8 border border-white/5 shadow-2xl h-full flex flex-col min-h-[500px] relative overflow-hidden">
              <div className="flex items-center gap-3 mb-10 px-2 relative z-10">
                  <ICONS.Clock size={24} className="text-[#10b981]" />
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">History</h3>
              </div>
              <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10">
                  {userHistory.length === 0 ? (
                      <p className="text-center opacity-20 font-black uppercase text-[10px] py-10 italic">No payouts recorded</p>
                  ) : (
                      userHistory.map(req => (
                          <div key={req.id} className="p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:border-[#10b981]/40 transition-all backdrop-blur-md space-y-4">
                              <div className="flex justify-between items-center">
                                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                      req.status === 'pending' ? 'bg-amber-500/20 text-amber-500' : 
                                      req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-500' :
                                      'bg-red-500/20 text-red-500'
                                  }`}>{req.status}</span>
                                  <span className="text-[9px] text-slate-500 font-black uppercase italic">{req.date}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 bg-black/30 p-4 rounded-xl text-left border border-white/5">
                                  <div>
                                      <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Amount ({selectedCountryCode === 'BD' ? 'টাকা' : 'Net'})</span>
                                      <LocalizedReward bdtAmount={req.amount - req.fee} countryCode={selectedCountryCode} className="flex flex-col items-start" textClassName="font-black text-white text-base leading-none" usdClassName="text-[8px] font-bold text-slate-400 mt-1 uppercase" />
                                  </div>
                                  <div>
                                      <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Gateway (মাধ্যম)</span>
                                      <p className="font-black text-[#10b981] text-xs uppercase italic">{req.method}</p>
                                  </div>
                                  <div className="col-span-2 border-t border-white/5 pt-2 mt-1">
                                      <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">Sent To (নম্বর)</span>
                                      <p className="font-mono text-slate-300 text-xs font-bold">{req.accountNumber}</p>
                                  </div>
                              </div>
                          </div>
                      ))
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ANIMATED WITHDRAW SUCCESS MODAL */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              className="bg-slate-900 border border-emerald-500/20 w-full max-w-md rounded-[3rem] shadow-[0_0_80px_rgba(16,185,129,0.25)] p-8 text-center relative overflow-hidden text-white"
            >
              {/* Decorative background visual */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Secure Checkmark Ring */}
              <motion.div 
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 150, damping: 10 }}
                className="w-24 h-24 bg-gradient-to-tr from-[#10b981] to-emerald-400 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20 border-4 border-slate-800 relative z-10"
              >
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </motion.div>

              {/* Title & Badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="space-y-2 relative z-10"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  {selectedCountryCode === 'BD' ? "পেমেন্ট প্রসেসিং অন" : "Processing Transaction"}
                </div>
                <h3 className="text-2xl font-black uppercase italic tracking-tighter">
                  {selectedCountryCode === 'BD' ? "উইথড্র রিকোয়েস্ট সফল!" : "PAYOUT REGISTERED!"}
                </h3>
                <p className="text-[11px] text-slate-400 font-bold leading-relaxed max-w-sm mx-auto uppercase">
                  {selectedCountryCode === 'BD' 
                    ? "আপনার উইথড্র রিকোয়েস্টটি আমাদের সার্ভারে সফলভাবে রেকর্ড করা হয়েছে।" 
                    : "Your withdrawal queue has been successfully broadcast to our automated processing gateway."}
                </p>
              </motion.div>

              {/* Digital Transaction Bill Receipt */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 }}
                className="mt-6 bg-slate-950/60 rounded-3xl p-6 border border-white/5 space-y-4 text-left font-sans relative z-10"
              >
                <div className="flex justify-between items-center pb-3.5 border-b border-dashed border-white/5">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Transaction ID</span>
                  <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-md border border-blue-500/10">{showSuccessModal.id}</span>
                </div>

                <div className="flex justify-between items-center pb-3.5 border-b border-dashed border-white/5">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sent To (নম্বর)</span>
                  <span className="text-[11px] font-mono font-bold text-slate-300">{showSuccessModal.accountNumber}</span>
                </div>

                <div className="flex justify-between items-center pb-3.5 border-b border-dashed border-white/5">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Base Amount</span>
                  <LocalizedReward bdtAmount={showSuccessModal.amount} countryCode={selectedCountryCode} className="flex flex-row items-center gap-1.5" textClassName="text-xs font-black text-slate-300" usdClassName="text-[9px] font-bold text-slate-500" />
                </div>

                <div className="flex justify-between items-center pb-3.5 border-b border-dashed border-white/5">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Network / Gateway Fee</span>
                  <LocalizedReward bdtAmount={showSuccessModal.fee} countryCode={selectedCountryCode} className="flex flex-row items-center gap-1.5" textClassName="text-xs font-black text-red-400" usdClassName="text-[9px] font-bold text-slate-500" />
                </div>

                <div className="flex justify-between items-center pb-3.5 border-b border-dashed border-white/5">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Net Payout (টাকা)</span>
                  <LocalizedReward bdtAmount={showSuccessModal.net} countryCode={selectedCountryCode} className="flex flex-row items-center gap-1.5" textClassName="text-base font-black text-emerald-400" usdClassName="text-[9px] font-bold text-slate-400" />
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Est. Release Time</span>
                  <span className="text-[8px] font-black uppercase bg-amber-500/10 border border-amber-500/25 text-amber-400 px-3 py-1 rounded-full animate-pulse">
                    {user.status === 'Verified' || user.role === 'admin' ? "1-4 Hours Priority" : "12-24 Hours"}
                  </span>
                </div>
              </motion.div>

              {/* Action Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="mt-6 relative z-10"
              >
                <button
                  onClick={() => setShowSuccessModal(null)}
                  className="w-full bg-[#10b981] hover:bg-emerald-600 text-white font-black py-4.5 rounded-[1.8rem] shadow-xl shadow-emerald-500/20 uppercase text-[11px] tracking-[0.25em] active:scale-95 transition-all cursor-pointer"
                >
                  {selectedCountryCode === 'BD' ? "বন্ধ করুন" : "Close Receipt"}
                </button>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Withdraw;
