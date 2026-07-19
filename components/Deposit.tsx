import React, { useState, useRef } from 'react';
import { User, PaymentMethod, DepositRequest } from '../types';
import { ICONS } from '../constants';
import { compressImage } from '../utils/imageCompressor';
import { LocalizedReward, convertCurrency } from './localization';

interface DepositProps {
  user: User;
  onUpdateUser: (user: User) => void;
  notify: (msg: string) => void;
  paymentMethods: PaymentMethod[];
  depositRequests: DepositRequest[];
  setDepositRequests: React.Dispatch<React.SetStateAction<DepositRequest[]>>;
  t: (key: any) => string;
  selectedCountryCode?: string;
}

const Deposit: React.FC<DepositProps> = ({
  user,
  notify,
  paymentMethods,
  depositRequests,
  setDepositRequests,
  t,
  selectedCountryCode = 'BD'
}) => {
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter exactly the payment gateways that are active under "membership" category (as requested!)
  const activeGateways = paymentMethods.filter(m => m.isActive && m.category === 'membership');
  const userPendingRequests = depositRequests.filter(r => r.userId === user.id && r.status === 'pending');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      notify("স্ক্রিনশট প্রসেস করা হচ্ছে...");
      compressImage(file)
        .then(compressedUrl => {
          setScreenshot(compressedUrl);
          notify("স্ক্রিনশট অ্যাটাচ করা হয়েছে!");
        })
        .catch(err => {
          console.error("Deposit screenshot compression failed:", err);
          notify("স্ক্রিনশট প্রসেস করতে ব্যর্থ হয়েছে।");
        });
    }
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const depositAmount = Number(amount);
    
    if (isNaN(depositAmount) || depositAmount <= 0) {
      notify("অনুগ্রহ করে সঠিক পরিমাণ টাকা লিখুন।");
      return;
    }
    if (!selectedMethod) {
      notify("অনুগ্রহ করে একটি পেমেন্ট মেথড সিলেক্ট করুন।");
      return;
    }
    if (!transactionId.trim()) {
      notify("অনুগ্রহ করে ট্রানজেকশন আইডি (TRX ID) দিন।");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const newRequest: DepositRequest = {
        id: 'dep_' + Math.random().toString(36).substr(2, 9),
        userId: user.id,
        userName: user.name,
        amount: depositAmount,
        method: selectedMethod.name,
        transactionId: transactionId.trim(),
        screenshot: screenshot,
        status: 'pending',
        date: new Date().toLocaleDateString(),
      };
      setDepositRequests(prev => [newRequest, ...prev]);
      setIsSubmitting(false);
      setAmount('');
      setSelectedMethod(null);
      setTransactionId('');
      setScreenshot(undefined);
      notify("ডিপোজিট রিকোয়েস্ট জমা হয়েছে! এডমিন দ্রুত ভেরিফাই করে ব্যালেন্স যুক্ত করবেন।");
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-16 relative">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">
          Deposit <span className="text-[#10b981]">Portal</span>
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto font-medium">
          আপনার ওয়ালেট ব্যালেন্স যোগ করতে নিচে উল্লেখিত পেমেন্ট মেথড ব্যবহার করে ডিপোজিট করুন।
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 items-start">
        {/* LEFT COLUMN: Deposit Form */}
        <div className="lg:col-span-7 bg-white/5 border border-white/5 rounded-[3rem] p-8 space-y-8 relative overflow-hidden backdrop-blur-3xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.05] pointer-events-none"></div>
          
          <form onSubmit={handleSubmitRequest} className="space-y-8 relative z-10">
            {/* Step 1: Deposit Amount */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">
                ১. ডিপোজিট পরিমাণ (Deposit Amount)
              </label>
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#10b981] font-black italic text-xl transition-colors">
                  {selectedCountryCode === 'BD' ? '৳' : convertCurrency(1, selectedCountryCode).symbol}
                </div>
                <input 
                  type="number" 
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="কত টাকা ডিপোজিট করতে চান লিখুন..." 
                  className="w-full bg-black/40 border-2 border-transparent focus:border-[#10b981]/30 rounded-2xl py-5 pl-12 pr-6 text-white font-black text-base outline-none transition-all shadow-inner placeholder:text-slate-700"
                />
              </div>

              {/* Quick Select Buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[100, 200, 500, 1000, 2000, 5000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val.toString())}
                    className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl font-bold text-xs hover:border-[#10b981]/50 hover:bg-[#10b981]/10 text-slate-300 transition-all"
                  >
                    {selectedCountryCode === 'BD' ? `+৳${val}` : `+${convertCurrency(val, selectedCountryCode).symbol}${Math.round(convertCurrency(val, selectedCountryCode).mainVal)}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Select Gateway */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">
                ২. পেমেন্ট মেথড সিলেক্ট করুন
              </label>
              <div className="grid grid-cols-2 gap-3">
                {activeGateways.map(m => {
                  const isLimitExceeded = m.isLimitExceeded || m.status === 'Unavailable';
                  return (
                    <button
                      key={m.id}
                      type="button"
                      disabled={isLimitExceeded}
                      onClick={() => setSelectedMethod(m)}
                      className={`p-5 rounded-2xl border-2 text-left transition-all relative group backdrop-blur-md ${
                        isLimitExceeded 
                          ? 'border-red-500/10 bg-red-500/5 opacity-50 cursor-not-allowed' 
                          : selectedMethod?.id === m.id 
                            ? 'border-[#10b981] bg-emerald-500/10 shadow-lg' 
                            : 'border-white/5 bg-white/5 hover:border-white/10'
                      }`}
                    >
                      <p className="font-black text-white text-base leading-none italic uppercase tracking-tight">{m.name}</p>
                      <p className="text-[9px] uppercase font-black mt-1.5 tracking-tighter flex items-center gap-1.5">
                        <span className="text-slate-500">{m.type}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                        <span className={isLimitExceeded ? "text-red-400 font-bold" : "text-[#10b981] font-bold"}>
                          {isLimitExceeded ? "Temporarily Unavailable" : "Gateway Available"}
                        </span>
                      </p>
                      {selectedMethod?.id === m.id && !isLimitExceeded && <div className="absolute top-2 right-2 text-[#10b981]"><ICONS.Check size={16} /></div>}
                    </button>
                  );
                })}
                {activeGateways.length === 0 && <p className="col-span-2 text-center text-red-400 font-bold text-xs py-4">কোনো পেমেন্ট মেথড সচল নেই।</p>}
              </div>
            </div>

            {/* Selected Gateway Payment Info */}
            {selectedMethod && amount && (
              <div className="bg-emerald-500/5 backdrop-blur-xl p-7 rounded-[2rem] border-2 border-[#10b981]/20 space-y-3 animate-in slide-in-from-top-4 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 mb-2">
                  <span className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.2em]">এই নম্বরে পেমেন্ট (Send Money / Cash-in) করুন:</span>
                  <LocalizedReward bdtAmount={Number(amount) || 0} countryCode={selectedCountryCode} className="inline-flex flex-row items-center gap-1 font-black text-white text-xs uppercase" textClassName="" usdClassName="text-[10px] text-[#10b981]/80 font-bold" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-white tracking-widest italic">{selectedMethod.number}</span>
                  <button 
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedMethod.number);
                      notify("নম্বর কপি হয়েছে!");
                    }}
                    className="p-3 bg-[#10b981] text-white rounded-xl shadow-lg active:scale-90 transition-all border border-white/20"
                  >
                    <ICONS.Link size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: TRX ID & Screenshot */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">
                  ৩. ট্রানজেকশন আইডি (TRX ID)
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#10b981] transition-colors">
                    <ICONS.Zap size={20} />
                  </div>
                  <input 
                    type="text" 
                    required
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="পেমেন্ট করার পর প্রাপ্ত TRX ID দিন..." 
                    className="w-full bg-black/40 border-2 border-transparent focus:border-[#10b981]/30 rounded-2xl py-5 pl-12 pr-6 text-white font-black text-sm outline-none transition-all shadow-inner placeholder:text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">
                  ৪. পেমেন্ট স্ক্রিনশট (ঐচ্ছিক)
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all backdrop-blur-md ${
                    screenshot ? 'border-[#10b981] bg-emerald-500/10' : 'border-white/5 bg-white/5 hover:border-white/10'
                  }`}
                >
                  <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={handleFileChange} />
                  {screenshot ? (
                    <div className="text-center space-y-2">
                      <img src={screenshot} className="w-16 h-16 object-cover rounded-lg mx-auto mb-2 border-2 border-[#10b981]" alt="receipt" />
                      <span className="text-xs font-black text-[#10b981] uppercase tracking-widest">স্ক্রিনশট যুক্ত হয়েছে</span>
                    </div>
                  ) : (
                    <>
                      <ICONS.Image size={32} className="text-slate-600" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Attach Proof Screenshot</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button 
              disabled={isSubmitting || !selectedMethod || !transactionId || !amount}
              className={`w-full font-black py-6 rounded-[2rem] shadow-2xl transition-all text-lg uppercase tracking-widest ${
                isSubmitting || !selectedMethod || !transactionId || !amount
                ? 'bg-white/10 text-slate-600 cursor-not-allowed shadow-none'
                : 'bg-[#10b981] text-white shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 border border-white/10'
              }`}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                  রিকোয়েস্ট পাঠানো হচ্ছে...
                </div>
              ) : 'ডিপোজিটের আবেদন পাঠান'}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: User Pending Deposit History */}
        <div className="lg:col-span-5 bg-white/5 border border-white/5 rounded-[3rem] p-8 space-y-6 relative overflow-hidden backdrop-blur-3xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.05] pointer-events-none"></div>
          
          <h3 className="text-xl font-black italic uppercase text-white leading-none tracking-tighter relative z-10">
            Recent Deposits
          </h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">
            ডিপোজিট রিকোয়েস্ট হিস্ট্রি
          </p>

          <div className="space-y-4 relative z-10 max-h-[450px] overflow-y-auto no-scrollbar pt-2">
            {userPendingRequests.map(req => (
              <div key={req.id} className="bg-slate-900/50 p-5 rounded-2xl border border-white/5 flex items-center justify-between">
                <div>
                  <LocalizedReward bdtAmount={req.amount} countryCode={selectedCountryCode} className="flex flex-col items-start mb-1" textClassName="font-extrabold text-[#10b981] text-sm leading-none" usdClassName="text-[8px] text-slate-400 font-bold" />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{req.method} • {req.date}</p>
                  <p className="text-[8px] text-slate-500 font-extrabold mt-1 uppercase leading-none truncate max-w-[150px]">TRX: {req.transactionId}</p>
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest px-3 py-1.5 bg-amber-500/10 text-amber-500 rounded-full animate-pulse leading-none">
                  Pending
                </span>
              </div>
            ))}

            {depositRequests.filter(r => r.userId === user.id && r.status !== 'pending').slice(0, 5).map(req => (
              <div key={req.id} className="bg-slate-900/30 p-5 rounded-2xl border border-white/5 flex items-center justify-between opacity-70">
                <div>
                  <LocalizedReward bdtAmount={req.amount} countryCode={selectedCountryCode} className="flex flex-col items-start mb-1" textClassName="font-extrabold text-slate-200 text-sm leading-none" usdClassName="text-[8px] text-slate-400 font-bold" />
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{req.method} • {req.date}</p>
                </div>
                <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full leading-none ${
                  req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                }`}>
                  {req.status}
                </span>
              </div>
            ))}

            {depositRequests.filter(r => r.userId === user.id).length === 0 && (
              <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl opacity-40">
                <ICONS.Wallet size={24} className="mx-auto text-slate-400 mb-2" />
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No prior deposits recorded</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Deposit;
