
import React, { useState, useRef } from 'react';
import { User, PaymentMethod, MembershipRequest, MembershipPlan } from '../types';
import { ICONS } from '../constants';
import { compressImage } from '../utils/imageCompressor';
import { LocalizedReward, convertCurrency } from './localization';

interface MembershipProps {
  user: User;
  onUpdateUser: (user: User) => void;
  notify: (msg: string) => void;
  paymentMethods: PaymentMethod[];
  plans: MembershipPlan[];
  membershipRequests: MembershipRequest[];
  setMembershipRequests: React.Dispatch<React.SetStateAction<MembershipRequest[]>>;
  // Added translation helper prop
  t: (key: any) => string;
  selectedCountryCode?: string;
}

const Membership: React.FC<MembershipProps> = ({ 
  user, 
  notify, 
  paymentMethods, 
  plans,
  membershipRequests,
  setMembershipRequests,
  t,
  selectedCountryCode = 'BD'
}) => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [transactionId, setTransactionId] = useState('');
  const [screenshot, setScreenshot] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeGateways = paymentMethods.filter(m => m.isActive && m.category === 'membership');
  const pendingRequest = membershipRequests.find(r => r.userId === user.id && r.status === 'pending');

  const handleOpenPayment = (plan: MembershipPlan) => {
    if (user.status === 'Verified') return;
    if (pendingRequest) {
      notify("আপনার একটি রিকোয়েস্ট পেন্ডিং আছে। অনুগ্রহ করে অপেক্ষা করুন।");
      return;
    }
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

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
          console.error("Membership screenshot compression failed:", err);
          notify("স্ক্রিনশট প্রসেস করতে ব্যর্থ হয়েছে।");
        });
    }
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !selectedMethod || !transactionId) {
      notify("সবগুলো তথ্য পূরণ করুন।");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const newRequest: MembershipRequest = {
        id: Math.random().toString(36).substr(2, 9),
        userId: user.id,
        userName: user.name,
        planName: selectedPlan.name,
        amount: selectedPlan.price,
        method: selectedMethod.name,
        transactionId: transactionId,
        screenshot: screenshot,
        status: 'pending',
        date: new Date().toLocaleDateString(),
      };
      setMembershipRequests(prev => [newRequest, ...prev]);
      setIsSubmitting(false);
      setShowPaymentModal(false);
      setSelectedMethod(null);
      setSelectedPlan(null);
      setTransactionId('');
      setScreenshot(undefined);
      notify("রিকোয়েস্ট জমা হয়েছে! এডমিন শীঘ্রই যাচাই করবে।");
    }, 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-16 relative">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter">Membership <span className="text-[#10b981]">Plans</span></h2>
        <p className="text-slate-400 max-w-xl mx-auto font-medium">আপনার মেম্বারশিপ আপগ্রেড করে হাই-পেয়িং টাস্ক এবং প্রফেশনাল উইথড্র মেথডগুলো আনলক করুন।</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
        {plans.map(plan => (
          <div 
            key={plan.id} 
            className={`rounded-[3rem] p-8 flex flex-col relative transition-all duration-500 backdrop-blur-3xl overflow-hidden ${
              plan.isPopular 
                ? 'bg-emerald-500/20 text-white shadow-2xl shadow-emerald-500/20 scale-105 border-4 border-[#10b981]/40' 
                : 'bg-white/5 text-white border border-white/5'
            }`}
          >
            {/* Consistent texture */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.05] pointer-events-none"></div>

            {plan.isPopular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-900 font-black px-4 py-1.5 rounded-full text-[10px] uppercase tracking-[0.15em] shadow-lg z-10">Most Popular</div>
            )}
            
            <div className="relative z-10">
              <h3 className="text-2xl font-black mb-1 italic tracking-tighter uppercase">{plan.name}</h3>
              <div className="mb-8 flex flex-col items-start">
                  <LocalizedReward bdtAmount={plan.price} countryCode={selectedCountryCode} className="inline-flex flex-col items-start" textClassName={`text-5xl font-black leading-none ${plan.isPopular ? 'text-white' : 'text-[#10b981]'}`} usdClassName={`text-xs font-bold mt-1 uppercase ${plan.isPopular ? 'text-amber-200' : 'text-slate-400'}`} />
                  <span className={`text-xs font-medium mt-1 ${plan.isPopular ? 'opacity-80' : 'text-slate-400'}`}>/ {plan.validityDays > 365 ? 'Lifetime' : `${plan.validityDays} Days`}</span>
              </div>
              
              <ul className="space-y-4 mb-10 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-bold">
                    <ICONS.Check size={18} className={`${plan.isPopular ? 'bg-white/20' : 'bg-[#10b981]/20 text-[#10b981]'} p-1 rounded-full`} /> 
                    {feature}
                  </li>
                ))}
                <li className="flex items-center gap-3 text-sm font-bold">
                    <ICONS.Check size={18} className={`${plan.isPopular ? 'bg-white/20' : 'bg-[#10b981]/20 text-[#10b981]'} p-1 rounded-full`} /> 
                    <LocalizedReward bdtAmount={plan.referralBonus} countryCode={selectedCountryCode} className="inline-flex flex-row items-center gap-1 font-bold" textClassName="" usdClassName="text-[10px] font-bold text-slate-400" /> Refer Bonus
                </li>
              </ul>

              <button 
                onClick={() => handleOpenPayment(plan)}
                disabled={user.status === 'Verified' || !!pendingRequest}
                className={`w-full font-black py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 ${
                  plan.isPopular 
                    ? 'bg-white text-emerald-900 hover:scale-[1.02]' 
                    : 'bg-[#10b981] text-white hover:scale-[1.02]'
                } ${user.status === 'Verified' ? 'opacity-50' : ''}`}
              >
                {user.status === 'Verified' ? (
                  <><ICONS.Check size={20} /> Already Active</>
                ) : pendingRequest ? (
                  <><ICONS.Clock size={20} /> Verification Pending</>
                ) : (
                  `Get ${plan.name} Access`
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-300">
          <div className="bg-slate-900/60 backdrop-blur-3xl w-full max-w-lg rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative animate-in zoom-in duration-300 border border-white/10 overflow-y-auto max-h-[90vh] custom-scrollbar">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.05] pointer-events-none"></div>

            <button onClick={() => { setShowPaymentModal(false); setSelectedMethod(null); }} className="absolute top-8 right-8 text-slate-400 hover:text-red-500 transition-colors z-20">
              <ICONS.Close size={24} />
            </button>
            
            <div className="relative z-10">
              <h3 className="text-3xl font-black mb-2 text-white italic uppercase tracking-tighter leading-none">Complete Payment</h3>
              <div className="text-slate-400 text-sm mb-10 font-medium italic flex flex-wrap items-center gap-1.5">
                <span>পেমেন্ট করে আপনার অ্যাকাউন্ট ভেরিফাই করুন:</span>
                <LocalizedReward bdtAmount={selectedPlan.price} countryCode={selectedCountryCode} className="inline-flex flex-row items-center gap-1 font-bold text-white" textClassName="" usdClassName="text-xs text-slate-400 font-normal" />
              </div>
              
              <form onSubmit={handleSubmitRequest} className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">১. পেমেন্ট মেথড সিলেক্ট করুন</label>
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

                {selectedMethod && (
                  <div className="bg-emerald-500/5 backdrop-blur-xl p-7 rounded-[2rem] border-2 border-[#10b981]/20 space-y-3 animate-in slide-in-from-top-4 shadow-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                      <span className="text-[10px] font-black text-[#10b981] uppercase tracking-[0.2em]">এই নম্বরে পেমেন্ট করুন:</span>
                      <LocalizedReward bdtAmount={selectedPlan.price} countryCode={selectedCountryCode} className="inline-flex flex-row items-center gap-1 font-black text-white text-xs uppercase" textClassName="" usdClassName="text-[10px] text-[#10b981]/80 font-bold" />
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
                      ><ICONS.Link size={18} /></button>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">২. ট্রানজেকশন আইডি (TRX ID)</label>
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
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] ml-2">৩. পেমেন্ট স্ক্রিনশট (ঐচ্ছিক)</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all backdrop-blur-md ${
                        screenshot ? 'border-[#10b981] bg-emerald-500/10' : 'border-white/5 bg-white/5 hover:border-white/10'
                      }`}
                    >
                      <input type="file" className="hidden" ref={fileInputRef} accept="image/*" onChange={handleFileChange} />
                      {screenshot ? (
                        <div className="text-center space-y-2">
                          <img src={screenshot} className="w-16 h-16 object-cover rounded-lg mx-auto mb-2 border-2 border-[#10b981]" />
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
                  disabled={isSubmitting || !selectedMethod || !transactionId}
                  className={`w-full font-black py-6 rounded-[2rem] shadow-2xl transition-all text-lg uppercase tracking-widest ${
                    isSubmitting || !selectedMethod || !transactionId
                    ? 'bg-white/10 text-slate-600 cursor-not-allowed shadow-none'
                    : 'bg-[#10b981] text-white shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 border border-white/10'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                      যাচাই করা হচ্ছে...
                    </div>
                  ) : 'রিকোয়েস্ট সাবমিট করুন'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Membership;
