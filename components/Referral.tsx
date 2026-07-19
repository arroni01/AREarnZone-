
import React from 'react';
import { User, Transaction, MembershipPlan, ReferralTarget, TargetHistory } from '../types';
import { ICONS } from '../constants';
import { LocalizedReward, convertCurrency } from './localization';
import { ReferralAnalytics } from './ReferralAnalytics';
import { motion, AnimatePresence } from 'motion/react';

interface ReferralProps {
  user: User;
  transactions: Transaction[];
  users?: User[];
  // Added translation helper prop
  t: (key: any) => string;
  selectedCountryCode?: string;
  plans?: MembershipPlan[];
  targets?: ReferralTarget[];
  targetHistories?: TargetHistory[];
  setTargetHistories?: React.Dispatch<React.SetStateAction<TargetHistory[]>>;
  setUsers?: React.Dispatch<React.SetStateAction<User[]>>;
  setTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>;
  onUpdateUser?: (updatedUser: User) => void;
}

const Referral: React.FC<ReferralProps> = ({ 
  user, 
  transactions, 
  users = [], 
  t, 
  selectedCountryCode = 'BD', 
  plans = [],
  targets = [],
  targetHistories = [],
  setTargetHistories,
  setUsers,
  setTransactions,
  onUpdateUser
}) => {
  const [showCelebration, setShowCelebration] = React.useState(false);
  const [celebratedTarget, setCelebratedTarget] = React.useState<ReferralTarget | null>(null);
  const [particles, setParticles] = React.useState<any[]>([]);

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

  const triggerCelebration = (target: ReferralTarget) => {
    setCelebratedTarget(target);
    setParticles(generateConfetti());
    setShowCelebration(true);
  };

  const totalReferralBonus = transactions
    .filter(t => t.userId === user.id && t.type === 'Referral' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const verifiedFriendsCount = transactions
    .filter(t => t.userId === user.id && t.type === 'Referral' && t.status === 'completed')
    .length;

  // Get start of the period and filter registered referrals
  const getReferralsCountInPeriod = (period: 'daily' | 'weekly' | 'monthly') => {
    const referredUsers = users.filter(u => u.referredBy && u.referredBy.toUpperCase() === user.referralCode.toUpperCase());
    const now = new Date();
    let startTime = new Date();

    if (period === 'daily') {
      startTime.setHours(0, 0, 0, 0);
    } else if (period === 'weekly') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startTime = new Date(now.setDate(diff));
      startTime.setHours(0, 0, 0, 0);
    } else if (period === 'monthly') {
      startTime = new Date(now.getFullYear(), now.getMonth(), 1);
      startTime.setHours(0, 0, 0, 0);
    }

    const matches = referredUsers.filter(u => {
      if (!u.createdAt) return false;
      const date = new Date(u.createdAt);
      return date >= startTime;
    });

    return matches.length;
  };

  const getPeriodId = (period: 'daily' | 'weekly' | 'monthly'): string => {
    const d = new Date();
    if (period === 'daily') {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } else if (period === 'weekly') {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(d.setDate(diff));
      return `${startOfWeek.getFullYear()}-W${String(Math.ceil(startOfWeek.getDate() / 7))}`;
    } else {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  };

  const activeUserTargets = React.useMemo(() => {
    if (!targets) return [];
    return targets.filter(target => {
      if (!target.isActive) return false;
      
      const isMonitor = user.isMonitor || user.role === 'admin';
      const targetRole = target.targetRole;
      if (targetRole === 'monitor' && !isMonitor) return false;
      if (targetRole === 'user' && isMonitor) return false;

      if (target.assignedToIds && target.assignedToIds.length > 0) {
        return target.assignedToIds.includes(user.id);
      }
      
      return true;
    });
  }, [targets, user]);

  const handleClaimTarget = (target: ReferralTarget) => {
    const currentCount = getReferralsCountInPeriod(target.periodType);
    if (currentCount < target.referralGoal) {
      alert(selectedCountryCode === 'BD' ? "টার্গেট এখনো সম্পূর্ণ হয়নি!" : "Target is not achieved yet!");
      return;
    }

    const periodId = getPeriodId(target.periodType);
    const alreadyClaimed = targetHistories?.some(h => h.targetId === target.id && h.userId === user.id && h.periodId === periodId);
    if (alreadyClaimed) {
      alert(selectedCountryCode === 'BD' ? "এই মেয়াদের বোনাস ইতিমধ্যেই দাবি করা হয়েছে!" : "Bonus for this period has already been claimed!");
      return;
    }

    const historyId = 'tgh_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
    const txId = 'tx_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);

    const newHistory: TargetHistory = {
      id: historyId,
      targetId: target.id,
      targetTitle: target.title,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      periodType: target.periodType,
      periodId: periodId,
      referralGoal: target.referralGoal,
      referralsAchieved: currentCount,
      bonusReward: target.bonusReward,
      completedAt: new Date().toISOString(),
      status: 'completed'
    };

    const newTx: Transaction = {
      id: txId,
      userId: user.id,
      type: 'Referral',
      amount: target.bonusReward,
      date: new Date().toLocaleString(),
      description: `Referral Target Completed Bonus (${target.title})`,
      status: 'completed'
    };

    const isUpgraded = user.status !== 'Verified';

    let updatedRankHistory = user.rankHistory || [];
    if (isUpgraded) {
      updatedRankHistory = [
        {
          id: 'rk_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36),
          fromStatus: user.status,
          toStatus: 'Verified',
          completedTargetTitle: target.title,
          completedTargetId: target.id,
          date: new Date().toLocaleString()
        },
        ...updatedRankHistory
      ];
    }

    const updatedUser: User = {
      ...user,
      balance: user.balance + target.bonusReward,
      todayIncome: (user.todayIncome || 0) + target.bonusReward,
      status: 'Verified',
      rankHistory: updatedRankHistory
    };

    if (setTargetHistories) {
      setTargetHistories(prev => [newHistory, ...prev]);
    }
    if (setTransactions) {
      setTransactions(prev => [newTx, ...prev]);
    }
    if (setUsers) {
      setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
    }
    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }

    if (isUpgraded && user.email) {
      fetch("/api/email/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          type: "account_verified",
        }),
      }).catch((err) => console.error("Failed to send verification email:", err));
    }

    if (selectedCountryCode === 'BD') {
      if (isUpgraded) {
        triggerCelebration(target);
      } else {
        alert(`অভিনন্দন! আপনি সফলভাবে ৳${target.bonusReward} বোনাস পেয়েছেন!`);
      }
    } else {
      if (isUpgraded) {
        triggerCelebration(target);
      } else {
        alert(`Congratulations! You have successfully claimed ${convertCurrency(target.bonusReward, selectedCountryCode).symbol}${convertCurrency(target.bonusReward, selectedCountryCode).mainVal} bonus!`);
      }
    }
  };

  const referralBonus = React.useMemo(() => {
    if (!plans || plans.length === 0) return 50;
    const proPlan = plans.find(p => p.name === 'Verified Pro' || p.id === 'plan_pro');
    return proPlan ? proPlan.referralBonus : (plans[0]?.referralBonus || 50);
  }, [plans]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-center gap-8 bg-[#10b981] rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden border-4 border-white shadow-2xl">
        <div className="flex-1 relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full border border-white/20">
            <div className="w-2 h-2 rounded-full bg-amber-300 animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest">Active Partner Program</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black leading-tight italic tracking-tighter uppercase">
            Earn <span className="text-amber-300">
              {selectedCountryCode === 'BD' ? `৳${referralBonus.toFixed(2)}` : (
                `${convertCurrency(referralBonus, selectedCountryCode).symbol}${convertCurrency(referralBonus, selectedCountryCode).mainVal.toFixed(0)} (${convertCurrency(referralBonus, selectedCountryCode).symbol === '$' ? '' : '$'}${convertCurrency(referralBonus, selectedCountryCode).usdVal.toFixed(1)})`
              )}
            </span> per Upgrade
          </h2>
          <p className="text-emerald-50 text-base font-medium max-w-md opacity-80">
            রেফারেল কমিশন সরাসরি আপনার ব্যালেন্স এ যুক্ত হবে শুধুমাত্র যখন আপনার আমন্ত্রিত বন্ধু <strong>Verified Pro</strong> মেম্বারশিপ কিনবে।
          </p>
          
          <div className="bg-white/10 border border-white/20 p-6 rounded-[2rem] backdrop-blur-md">
            <p className="text-[10px] font-black uppercase mb-4 text-emerald-100 tracking-[0.2em]">Your Referral ID</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white/90 backdrop-blur-sm p-4 rounded-xl text-slate-800 font-black text-xl tracking-widest text-center shadow-inner">
                {user.referralCode}
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(user.referralCode);
                  alert("Code copied!");
                }}
                className="p-5 bg-amber-300 text-slate-900 rounded-xl font-black hover:scale-110 active:scale-95 transition-all shadow-xl shadow-amber-500/20"
              >
                <ICONS.Link size={24} />
              </button>
            </div>
          </div>
        </div>
        <div className="w-full md:w-1/3 flex justify-center relative z-10">
          <div className="bg-white/10 p-12 rounded-full border-8 border-white/10 animate-bounce duration-[3000ms]">
            <ICONS.Referral size={120} className="text-white" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Invited" value={user.referralCount.toString()} icon={<ICONS.Users size={24} />} color="bg-white dark:bg-slate-800" />
        <StatCard label="Verified Friends" value={verifiedFriendsCount.toString()} icon={<ICONS.Check size={24} />} color="bg-white dark:bg-slate-800" />
        <StatCard 
          label="Total Bonus" 
          value={
            <LocalizedReward 
              bdtAmount={totalReferralBonus} 
              countryCode={selectedCountryCode} 
              className="flex flex-col items-center" 
              textClassName="text-4xl font-black text-white leading-none" 
              usdClassName="text-xs font-bold text-emerald-100 mt-1" 
            />
          } 
          icon={<ICONS.Wallet size={24} />} 
          color="bg-[#10b981]" 
          textWhite 
        />
      </div>

      {/* REFERRAL PERFORMANCE ANALYTICS SECTION */}
      <ReferralAnalytics 
        user={user} 
        transactions={transactions} 
        users={users} 
        selectedCountryCode={selectedCountryCode} 
        t={t} 
        plans={plans}
      />

      {/* REFERRAL TARGETS & FREE RANK UPGRADE PORTAL */}
      {activeUserTargets.length > 0 && (
        <div id="referral-targets" className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center animate-pulse border border-amber-500/20">
              <span className="text-2xl">🎯</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  Rank Up Promotion
                </span>
                <span className="text-[9px] font-black bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-full uppercase tracking-wider animate-bounce">
                  Hot ⚡
                </span>
              </div>
              <h3 className="text-lg font-black dark:text-white uppercase tracking-tight mt-1 leading-tight">
                {selectedCountryCode === 'BD' ? "আমার রেফারাল টার্গেট ও ফ্রি আপগ্রেড" : "Referral Targets & Free Upgrades"}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                {selectedCountryCode === 'BD' 
                  ? "টার্গেট সম্পূর্ণ করে ফ্রিতে অ্যাকাউন্ট 'Verified Pro' ক্যাটাগরিতে আপগ্রেড করুন!" 
                  : "Complete any target to upgrade to 'Verified Pro' Category for FREE!"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeUserTargets.map(target => {
              const currentCount = getReferralsCountInPeriod(target.periodType);
              const progressPercent = Math.min(100, Math.round((currentCount / target.referralGoal) * 100));
              const periodId = getPeriodId(target.periodType);
              const isClaimed = targetHistories?.some(h => h.targetId === target.id && h.userId === user.id && h.periodId === periodId);

              return (
                <div key={target.id} className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800/50 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="inline-block bg-[#10b981]/10 text-[#10b981] text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-1.5">
                        {target.periodType === 'daily' ? 'Daily' : target.periodType === 'weekly' ? 'Weekly' : 'Monthly'}
                      </span>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base leading-tight">
                        {target.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {target.description}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[9px] font-black uppercase text-slate-400 tracking-wider">REWARD</div>
                      <div className="text-lg font-black text-emerald-500">৳{target.bonusReward}</div>
                    </div>
                  </div>

                  {/* Promotion Highlight Info Box */}
                  <div className="bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] p-3 rounded-2xl font-bold space-y-1">
                    <p className="flex items-center gap-1.5">
                      <span>🎁</span>
                      <span>
                        {selectedCountryCode === 'BD'
                          ? `টার্গেট সম্পূর্ণ করলে বোনাস পাবেন ৳${target.bonusReward} টাকা!`
                          : `Completing target awards ৳${target.bonusReward} bonus reward!`}
                      </span>
                    </p>
                    {user.status !== 'Verified' && (
                      <p className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                        <span>⚡</span>
                        <span>
                          {selectedCountryCode === 'BD'
                            ? `অ্যাকাউন্ট সরাসরি 'Verified Pro' ক্যাটাগরিতে অটো-আপগ্রেড হবে!`
                            : `Account will auto-upgrade to 'Verified Pro' rank!`}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-500 dark:text-slate-400">
                        {selectedCountryCode === 'BD' ? 'রেফারেল প্রগ্রেস:' : 'Referral Progress:'}
                      </span>
                      <span className="text-indigo-500 font-black">
                        {currentCount} / {target.referralGoal} ({progressPercent}%)
                      </span>
                    </div>
                    <div className="h-3 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 rounded-full transition-all duration-500 relative"
                        style={{ width: `${progressPercent}%` }}
                      >
                        {progressPercent > 0 && (
                          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Interactive Button */}
                  {isClaimed ? (
                    <button 
                      disabled
                      className="w-full bg-emerald-500/10 text-emerald-500 font-black py-3 rounded-2xl text-[10px] uppercase tracking-wider border border-emerald-500/20 flex items-center justify-center gap-1.5"
                    >
                      <span>✓</span>
                      <span>{selectedCountryCode === 'BD' ? "ইতিমধ্যেই দাবি করা হয়েছে" : "Already Claimed"}</span>
                    </button>
                  ) : progressPercent >= 100 ? (
                    <button 
                      onClick={() => handleClaimTarget(target)}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:from-amber-400 hover:to-orange-400 font-black py-3.5 rounded-2xl text-[10px] uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 animate-pulse"
                    >
                      <span>⚡</span>
                      <span>{selectedCountryCode === 'BD' ? "বোনাস ও ফ্রি আপগ্রেড দাবি করুন!" : "Claim Bonus & Free Upgrade!"}</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(user.referralCode);
                        alert(selectedCountryCode === 'BD' 
                          ? `রেফারাল কোড (${user.referralCode}) কপি হয়েছে! বন্ধুদের জয়েন করিয়ে টার্গেট পূরণ করুন।` 
                          : `Referral Code (${user.referralCode}) copied! Share with friends to complete targets.`
                        );
                      }}
                      className="w-full bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5 font-black py-3 rounded-2xl text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <span>🔗</span>
                      <span>{selectedCountryCode === 'BD' ? "রেফার করুন এবং টার্গেট পূরণ করুন" : "Refer Friends to Complete Target"}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Integrated Rank Upgrade History Log inside Referral Page */}
          {user.rankHistory && user.rankHistory.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
              <h4 className="text-[11px] font-black dark:text-white uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span>👑</span>
                <span>{selectedCountryCode === 'BD' ? "আমার র‍্যাংক অর্জনসমূহ (র‍্যাংক হিস্ট্রি)" : "My Rank Upgrade Achievements"}</span>
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {user.rankHistory.map((rk) => (
                  <div key={rk.id} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all hover:border-amber-500/10">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 line-through">{rk.fromStatus}</span>
                        <span className="text-[10px] text-slate-400">➡️</span>
                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">{rk.toStatus} Pro</span>
                      </div>
                      <p className="text-xs font-bold dark:text-white">
                        {rk.completedTargetTitle}
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end">
                      <p className="text-[9px] text-slate-400 font-mono font-bold">{rk.date}</p>
                      <button 
                        onClick={() => {
                          const associatedTarget = targets?.find(t => t.id === rk.completedTargetId) || {
                            id: rk.completedTargetId || 'unknown',
                            title: rk.completedTargetTitle || 'Target Completed',
                            description: 'Completed successfully',
                            referralGoal: 0,
                            bonusReward: 200,
                            periodType: 'monthly' as const
                          };
                          triggerCelebration(associatedTarget);
                        }}
                        className="text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded mt-1 inline-flex items-center gap-1 transition-all active:scale-95 border border-amber-500/20 cursor-pointer"
                        title="View Celebration Animation"
                      >
                        <span>🎉</span>
                        <span>{selectedCountryCode === 'BD' ? 'উদযাপন দেখুন' : 'View Celebration'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700 shadow-sm">
        <h3 className="text-xl font-black mb-6 dark:text-white uppercase italic tracking-tighter">Advanced Referral Rules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RuleItem text={
            selectedCountryCode === 'BD'
              ? "Referral Bonus শুধুমাত্র বন্ধু মেম্বারশিপ এক্টিভ করার পর পাওয়া যাবে।"
              : "Referral Bonus will be credited only after your friend activates membership."
          } />
          <RuleItem text={
            selectedCountryCode === 'BD'
              ? `প্রতিটি ভেরিফাইড আপগ্রেড এর জন্য আপনি ৳${referralBonus} বোনাস পাবেন।`
              : `You will get ${convertCurrency(referralBonus, selectedCountryCode).symbol}${convertCurrency(referralBonus, selectedCountryCode).mainVal.toFixed(0)} ($${convertCurrency(referralBonus, selectedCountryCode).usdVal.toFixed(1)}) bonus for every verified upgrade.`
          } />
          <RuleItem text={
            selectedCountryCode === 'BD'
              ? "রেফার বোনাস দিয়ে সরাসরি উইথড্র করা সম্ভব।"
              : "Referral bonuses can be withdrawn directly."
          } />
        </div>
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
                    ? `আপনি সফলভাবে '${celebratedTarget?.title || "রেফারাল টার্গেট"}' সম্পন্ন করে অ্যাকাউন্ট সরাসরি 'Verified Pro' ক্যাটাগরিতে অটো-আপগ্রেড করেছেন!`
                    : `You have successfully completed '${celebratedTarget?.title || "referral target"}' and auto-upgraded your status to 'Verified Pro' category!`}
                </p>
              </div>

              {/* Upgrade perks info box */}
              <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5 space-y-3.5 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Upgrade Reward / বোনাস</span>
                  <span className="text-sm font-black text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-md">
                    +৳{celebratedTarget?.bonusReward || 200} BDT
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
                  setCelebratedTarget(null);
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
  );
};

const StatCard: React.FC<{ label: string, value: React.ReactNode, icon: React.ReactNode, color: string, textWhite?: boolean }> = ({ label, value, icon, color, textWhite }) => (
  <div className={`${color} p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 text-center transition-all hover:-translate-y-1`}>
    <div className={`w-14 h-14 ${textWhite ? 'bg-white/20 text-white' : 'bg-emerald-50 text-[#10b981]'} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
      {icon}
    </div>
    <div className={`${textWhite ? 'text-white/70' : 'text-slate-400'} text-[10px] font-black uppercase tracking-widest mb-1`}>{label}</div>
    <div className={`text-4xl font-black ${textWhite ? 'text-white' : 'dark:text-white'}`}>{value}</div>
  </div>
);

const RuleItem: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
    <div className="w-2 h-2 bg-[#10b981] rounded-full"></div>
    <p className="text-sm font-bold text-slate-600 dark:text-slate-400">{text}</p>
  </div>
);

export default Referral;
