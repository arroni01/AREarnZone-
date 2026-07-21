
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Task, Transaction, TaskSubmission, ReferralTarget, TargetHistory } from '../types';
import { ICONS } from '../constants';
import { Crown, Trophy, Medal, Sparkles, ArrowUpRight, RefreshCw } from 'lucide-react';
import { LocalizedReward, convertCurrency } from './localization';

const isTelegramTask = (task: Task): boolean => {
  if (!task) return false;
  const typeStr = String(task.type || '').toLowerCase();
  if (typeStr === 'telegram') return true;

  const titleStr = String(task.title || '').toLowerCase();
  const descStr = String(task.description || '').toLowerCase();
  const linkStr = String(task.youtubeLink || '').toLowerCase();

  return (
    titleStr.includes('telegram') ||
    titleStr.includes('টেলিগ্রাম') ||
    titleStr.includes('t.me') ||
    descStr.includes('telegram') ||
    descStr.includes('টেলিগ্রাম') ||
    descStr.includes('t.me') ||
    linkStr.includes('telegram') ||
    linkStr.includes('t.me')
  );
};

interface DashboardProps {
  user: User;
  tasks: Task[];
  transactions: Transaction[];
  submissions: TaskSubmission[];
  onLogout: () => void;
  t: (key: any) => string;
  selectedCountryCode?: string;
  onRefreshData?: () => Promise<void>;
  targets?: ReferralTarget[];
  targetHistories?: TargetHistory[];
  users?: User[];
  setTargetHistories?: React.Dispatch<React.SetStateAction<TargetHistory[]>>;
  setUsers?: React.Dispatch<React.SetStateAction<User[]>>;
  setTransactions?: React.Dispatch<React.SetStateAction<Transaction[]>>;
  onUpdateUser?: (updatedUser: User) => void;
  onOpenInstallModal?: () => void;
}

// Custom Hook for smooth count-up animation
const useCountUp = (targetValue: number, duration: number = 1200) => {
  const [count, setCount] = useState(targetValue);
  const prevValueRef = useRef(targetValue);

  useEffect(() => {
    const startVal = prevValueRef.current;
    const endVal = targetValue;
    
    if (startVal === endVal) {
      setCount(endVal);
      return;
    }

    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing out cubic: progress = 1 - (1 - x)^3
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * easeProgress;
      
      setCount(current);

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      } else {
        prevValueRef.current = endVal;
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [targetValue, duration]);

  return count;
};

const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  tasks, 
  transactions, 
  submissions, 
  onLogout, 
  t, 
  selectedCountryCode = 'BD',
  onRefreshData,
  targets = [],
  targetHistories = [],
  users = [],
  setTargetHistories,
  setUsers,
  setTransactions,
  onUpdateUser,
  onOpenInstallModal
}) => {
  const navigate = useNavigate();
  const isAdmin = user.role === 'admin';
  const isVerified = user.status === 'Verified' || isAdmin;

  const animatedBalance = useCountUp(user.balance, 1200);

  const [leaderboardTab, setLeaderboardTab] = useState<'weekly' | 'allTime'>('weekly');

  const renderLeaderboardAmount = (amount: number, accentClass: string) => {
    const { mainVal, usdVal, symbol } = convertCurrency(amount, selectedCountryCode);
    if (selectedCountryCode === 'BD') {
      return <p className={`text-[10px] font-black ${accentClass}`}>৳{amount.toLocaleString()}</p>;
    }
    return (
      <div className="flex flex-col items-center">
        <p className={`text-[10px] font-black ${accentClass} leading-none`}>{symbol}{Math.round(mainVal).toLocaleString()}</p>
        <span className="text-[7px] text-slate-400 font-bold leading-none mt-0.5">(${usdVal.toFixed(1)})</span>
      </div>
    );
  };

  const renderRunnerUpAmount = (amount: number) => {
    const { mainVal, usdVal, symbol } = convertCurrency(amount, selectedCountryCode);
    if (selectedCountryCode === 'BD') {
      return <span className="text-xs font-black text-[#10b981]">৳{amount.toLocaleString()}</span>;
    }
    return (
      <div className="flex flex-col items-end">
        <span className="text-xs font-black text-[#10b981] leading-none">{symbol}{Math.round(mainVal).toLocaleString()}</span>
        <span className="text-[8px] text-slate-400 font-bold mt-0.5">(${usdVal.toFixed(1)})</span>
      </div>
    );
  };

  // Helper inside component or local to get daily deterministic seeds
  const getDaySeed = useCallback((str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }, []);

  const MASTER_USER_POOL = useMemo(() => [
    { name: 'Tariqul Islam', initials: 'TI', avatarBg: 'from-amber-500 to-orange-500', baseWeeklyAmount: 8400, baseAllTimeAmount: 48900, verified: true },
    { name: 'Sami Ahmed', initials: 'SA', avatarBg: 'from-blue-500 to-indigo-600', baseWeeklyAmount: 7100, baseAllTimeAmount: 43200, verified: true },
    { name: 'Lamia Akter', initials: 'LA', avatarBg: 'from-pink-500 to-rose-600', baseWeeklyAmount: 6600, baseAllTimeAmount: 38800, verified: true },
    { name: 'Arif Khan', initials: 'AK', avatarBg: 'from-teal-400 to-emerald-600', baseWeeklyAmount: 5800, baseAllTimeAmount: 32000, verified: true },
    { name: 'Sabbir Hossain', initials: 'SH', avatarBg: 'from-violet-400 to-purple-600', baseWeeklyAmount: 5000, baseAllTimeAmount: 28900, verified: false },
    { name: 'Rahat Islam', initials: 'RI', avatarBg: 'from-orange-400 to-red-500', baseWeeklyAmount: 4700, baseAllTimeAmount: 25400, verified: true },
    { name: 'Mim Yousuf', initials: 'MY', avatarBg: 'from-cyan-400 to-blue-600', baseWeeklyAmount: 4100, baseAllTimeAmount: 22100, verified: true },
    { name: 'Nadia Akter', initials: 'NA', avatarBg: 'from-rose-400 to-pink-600', baseWeeklyAmount: 3900, baseAllTimeAmount: 21200, verified: false },
    { name: 'Tanvir Ahammed', initials: 'TA', avatarBg: 'from-teal-500 to-emerald-600', baseWeeklyAmount: 3600, baseAllTimeAmount: 19800, verified: true },
    { name: 'Mehedi Hasan', initials: 'MH', avatarBg: 'from-blue-500 to-cyan-600', baseWeeklyAmount: 5120, baseAllTimeAmount: 24300, verified: true },
    { name: 'Fahad Hossain', initials: 'FH', avatarBg: 'from-emerald-500 to-green-600', baseWeeklyAmount: 4900, baseAllTimeAmount: 18500, verified: true },
    { name: 'Sumaiya Khan', initials: 'SK', avatarBg: 'from-[#10b981] to-teal-500', baseWeeklyAmount: 5300, baseAllTimeAmount: 27100, verified: true }
  ], []);

  // Stable daily key representation
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }, []);

  const [secondsSinceMidnight, setSecondsSinceMidnight] = useState(() => {
    const d = new Date();
    return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  });

  // Keep seconds updating live
  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      setSecondsSinceMidnight(d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeLeaderboard = useMemo(() => {
    const isAllTime = leaderboardTab === 'allTime';
    
    const calculatedProfiles = MASTER_USER_POOL.map(profile => {
      const userSeed = getDaySeed(profile.name + todayStr);
      
      // Determine starting fluctuations for today
      // weekly variation: -৳300 to +৳300 BDT
      const weeklyFluct = (userSeed % 601) - 300;
      // all-time variation: -৳1500 to +৳1500 BDT
      const allTimeFluct = (userSeed % 3001) - 1500;

      const baseWeeklyToday = profile.baseWeeklyAmount + weeklyFluct;
      const baseAllTimeToday = profile.baseAllTimeAmount + allTimeFluct;

      // Rate per second (determined by profile initials / names so it stays beautiful and stable)
      const hourlyRateSeed = getDaySeed(profile.initials) % 100;
      const weeklyRate = 0.012 + (hourlyRateSeed * 0.0002); // ~৳0.012 - ৳0.032 BDT per second
      const allTimeRate = 0.035 + (hourlyRateSeed * 0.0006); // ~৳0.035 - ৳0.095 BDT per second

      const accumulatedAmount = isAllTime
        ? Math.floor(baseAllTimeToday + (secondsSinceMidnight * allTimeRate))
        : Math.floor(baseWeeklyToday + (secondsSinceMidnight * weeklyRate));

      return {
        ...profile,
        amount: accumulatedAmount
      };
    });

    // Sort descending by calculated dynamic amount
    return calculatedProfiles.sort((a, b) => b.amount - a.amount);
  }, [leaderboardTab, secondsSinceMidnight, todayStr, MASTER_USER_POOL, getDaySeed]);

  const runnersUp = useMemo(() => {
    return activeLeaderboard.slice(3, 10); // Keep max 7 runners-up (rank 4 to 10) for maximum sleekness
  }, [activeLeaderboard]);

  const [liveUsers, setLiveUsers] = useState(14200);
  const [lastPayoutUser, setLastPayoutUser] = useState('LAMIA');
  const [lastPayoutAmount, setLastPayoutAmount] = useState(2000);

  const [countdown, setCountdown] = useState(60);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const triggerRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (e) {
      console.error("Dashboard auto-refresh failed:", e);
    } finally {
      setIsRefreshing(false);
      setCountdown(60);
    }
  }, [isRefreshing, onRefreshData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          triggerRefresh();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [triggerRefresh]);

  const handleManualRefresh = () => {
    triggerRefresh();
  };

  const namePool = useMemo(() => [
    'SAMI', 'ARIF', 'LAMIA', 'NADIA', 'TANVIR', 'MIM', 'SABBIR', 'RAHAT', 'JUNAID', 'FAHAD'
  ], []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveUsers(prev => prev + (Math.floor(Math.random() * 21) - 10));
      setLastPayoutUser(namePool[Math.floor(Math.random() * namePool.length)]);
      setLastPayoutAmount([500, 1000, 2000, 1500, 380, 575][Math.floor(Math.random() * 6)]);
    }, 5000);
    return () => clearInterval(interval);
  }, [namePool]);

  const getReferralsCountInPeriod = (period: 'daily' | 'weekly' | 'monthly') => {
    if (!users) return 0;
    const referredUsers = users.filter(u => u.referredBy && u.referredBy.toUpperCase() === user.referralCode.toUpperCase());
    const now = new Date();
    let startTime = new Date();

    if (period === 'daily') {
      startTime.setHours(0, 0, 0, 0);
    } else if (period === 'weekly') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const tempDate = new Date(now);
      startTime = new Date(tempDate.setDate(diff));
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
      const tempDate = new Date(d);
      const startOfWeek = new Date(tempDate.setDate(diff));
      return `${startOfWeek.getFullYear()}-W${String(Math.ceil(startOfWeek.getDate() / 7))}`;
    } else {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  };

  const activeUserTargets = useMemo(() => {
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
      userEmail: user.email || '',
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
        alert(`অভিনন্দন! আপনি সফলভাবে ৳${target.bonusReward} বোনাস পেয়েছেন এবং আপনার অ্যাকাউন্ট সরাসরি 'Verified Pro' ক্যাটাগরিতে অটো-আপগ্রেড হয়েছে!`);
      } else {
        alert(`অভিনন্দন! আপনি সফলভাবে ৳${target.bonusReward} বোনাস পেয়েছেন!`);
      }
    } else {
      if (isUpgraded) {
        alert(`Congratulations! You have successfully claimed ${convertCurrency(target.bonusReward, selectedCountryCode).symbol}${convertCurrency(target.bonusReward, selectedCountryCode).mainVal} bonus and your account has been auto-upgraded to 'Verified Pro' category!`);
      } else {
        alert(`Congratulations! You have successfully claimed ${convertCurrency(target.bonusReward, selectedCountryCode).symbol}${convertCurrency(target.bonusReward, selectedCountryCode).mainVal} bonus!`);
      }
    }
  };

  const safeSubmissions = submissions || [];
  const availableTasksCount = tasks.filter(t => 
    t.isActive && 
    (!isTelegramTask(t) || user.isTelegramVerified) &&
    !safeSubmissions.find(s => s.taskId === t.id && s.userId === user.id && (s.status === 'pending' || s.status === 'approved'))
  ).length;
  const referralIncome = transactions
    .filter(t => t.userId === user.id && t.type === 'Referral' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-6xl mx-auto w-full pb-24 px-2 sm:px-4">
      
      {/* Top Greeting Header */}
      <div className="px-2 space-y-1">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Earning Hub Portal</p>
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold dark:text-white text-slate-900 leading-none">{t('welcome')}, {user.name.split(' ')[0]}</h2>
          <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 shadow-sm">
            <div className={`w-1.5 h-1.5 rounded-full ${isVerified ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
            <span className="text-[9px] font-bold text-slate-500 uppercase">{isVerified ? 'Verified Pro' : 'Free Member'}</span>
          </div>
        </div>
      </div>

      {/* Prominent Download Official App Banner Widget */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-emerald-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden group">
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0 border border-white/10">
              <ICONS.Smartphone size={22} className="text-white sm:w-6 sm:h-6" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider border border-emerald-500/30">
                  OFFICIAL APP
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">PWA Ready</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white uppercase italic tracking-tight">
                DOWNLOAD AREARNZONE APP (অ্যাপ ডাউনলোড)
              </h3>
              <p className="text-[11px] text-slate-300 font-medium leading-tight max-w-md">
                Install on your mobile home screen for instant task alerts, 1-tap fast access & smooth performance.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenInstallModal}
            className="w-full sm:w-auto bg-[#10b981] hover:bg-emerald-600 active:scale-95 text-white font-black px-5 py-3 rounded-xl sm:rounded-2xl shadow-lg shadow-emerald-500/20 text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-white/10 shrink-0 cursor-pointer"
          >
            <ICONS.Download size={16} className="animate-bounce" />
            <span>Install App / ইনস্টল করুন</span>
          </button>
        </div>
      </div>

      {/* Auto Refresh & Balance Sync Widget */}
      <div id="live-sync-widget" className="bg-slate-100/50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5 py-3 px-4 sm:px-5 rounded-2xl sm:rounded-3xl flex items-center justify-between shadow-sm select-none">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] sm:text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest leading-none">
              Live Sync (লাইভ সিঙ্ক)
            </span>
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">
              Auto-refreshing in <span className="text-emerald-500 font-extrabold">{countdown}s</span>
            </span>
          </div>
        </div>
        <button
          id="sync-balance-btn"
          type="button"
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-white/5 px-3 sm:px-4 py-2 rounded-xl sm:rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={11} className={`${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync Balance'}</span>
        </button>
      </div>

      {/* Live Status Bar */}
      <div className="bg-emerald-600 rounded-2xl sm:rounded-3xl py-3.5 px-4 sm:px-6 flex flex-col items-center justify-center shadow-lg shadow-emerald-500/20 border border-white/10 relative overflow-hidden">
        <div className="flex items-center gap-2 relative z-10">
           <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
           <p className="text-xs sm:text-sm font-bold text-white uppercase tracking-wide">Live Online: {liveUsers.toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2 mt-1 relative z-10 opacity-90">
           <ICONS.Check size={12} className="text-white" />
           <p className="text-[10px] sm:text-[11px] font-medium text-white uppercase tracking-wide">৳{lastPayoutAmount} Paid to {lastPayoutUser}</p>
        </div>
      </div>

      {/* Account Status Banner */}
      {!isVerified && (
        <div className="bg-orange-500 p-6 sm:p-8 rounded-3xl sm:rounded-[2.5rem] text-white space-y-4 sm:space-y-5 shadow-2xl relative overflow-hidden group">
           <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-orange-600 opacity-50"></div>
           <div className="flex items-center gap-4 relative z-10">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 shrink-0">
                 <ICONS.Shield size={22} className="sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold uppercase tracking-tight">Access Restricted</h3>
           </div>
           <p className="text-xs sm:text-sm font-medium opacity-90 relative z-10 leading-relaxed">
             {t('upgradeNow')}
           </p>
           <button 
             onClick={() => navigate('/membership')}
             className="w-full bg-white text-orange-600 font-black py-3.5 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all relative z-10"
           >
             {t('upgradeNow')}
           </button>
        </div>
      )}

      {/* Main Grid Cards */}
      <div className={`space-y-4 transition-all duration-700 ${!isVerified ? 'opacity-30 blur-[4px] pointer-events-none' : ''}`}>
        
        {/* Top Tier Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total Balance Card */}
          <div onClick={() => navigate('/withdraw')} className="bg-[#10b981] p-5 sm:p-7 md:p-8 rounded-3xl sm:rounded-[2.5rem] shadow-xl shadow-emerald-500/10 relative overflow-hidden group active:scale-95 transition-all cursor-pointer border-2 border-white/10 flex flex-col justify-between min-h-[9.5rem] sm:h-44">
            <div className="relative z-10 flex justify-between items-start">
               <div className="p-2.5 sm:p-3 bg-white/20 rounded-xl sm:rounded-2xl backdrop-blur-md border border-white/20">
                  <ICONS.Wallet size={22} className="text-white sm:w-6 sm:h-6" />
               </div>
               <div className="bg-white/10 px-3 py-1 rounded-xl border border-white/10 flex items-center gap-2">
                  <ICONS.Trend size={12} className="text-white" />
                  <span className="text-[10px] font-bold text-white uppercase">+2.5%</span>
               </div>
            </div>
            <div className="relative z-10 mt-3">
              <p className="text-[10px] sm:text-[11px] font-bold text-emerald-50 uppercase tracking-widest opacity-80 mb-1">{t('balance')}</p>
              <LocalizedReward bdtAmount={animatedBalance} countryCode={selectedCountryCode} className="flex flex-col items-start" textClassName="text-2xl sm:text-4xl font-bold text-white tracking-tight leading-none" usdClassName="text-[10px] sm:text-xs font-bold text-emerald-100/70 mt-1 uppercase tracking-wider" />
            </div>
          </div>

          {/* Referral Income Card */}
          <div onClick={() => navigate('/referral')} className="bg-orange-500 p-5 sm:p-7 md:p-8 rounded-3xl sm:rounded-[2.5rem] shadow-xl shadow-orange-500/10 relative overflow-hidden group active:scale-95 transition-all cursor-pointer border-2 border-white/10 flex flex-col justify-between min-h-[9.5rem] sm:h-44">
            <div className="relative z-10 flex justify-between items-start">
               <div className="p-2.5 sm:p-3 bg-white/20 rounded-xl sm:rounded-2xl backdrop-blur-md border border-white/20">
                  <ICONS.Referral size={22} className="text-white sm:w-6 sm:h-6" />
               </div>
               <div className="bg-white/10 px-3 py-1 rounded-xl border border-white/10 flex items-center gap-2">
                  <ICONS.Trend size={12} className="text-white" />
                  <span className="text-[10px] font-bold text-white uppercase">+5%</span>
               </div>
            </div>
            <div className="relative z-10 mt-3">
              <p className="text-[10px] sm:text-[11px] font-bold text-orange-50 uppercase tracking-widest opacity-80 mb-1">{t('refIncome')}</p>
              <LocalizedReward bdtAmount={referralIncome} countryCode={selectedCountryCode} className="flex flex-col items-start" textClassName="text-2xl sm:text-4xl font-bold text-white tracking-tight leading-none" usdClassName="text-[10px] sm:text-xs font-bold text-orange-100/70 mt-1 uppercase tracking-wider" />
            </div>
          </div>
        </div>

        {/* Action Quick Grid (4 items on desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div onClick={() => navigate('/tasks')} className="bg-[#14b8a6] p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] shadow-xl relative overflow-hidden group active:scale-95 transition-all cursor-pointer border-2 border-white/10 min-h-[8.5rem] sm:h-40 flex flex-col justify-between">
                <div className="p-2 sm:p-2.5 bg-white/20 rounded-xl w-fit">
                    <ICONS.Trend size={18} className="text-white sm:w-5 sm:h-5" />
                </div>
                <div className="relative z-10">
                    <p className="text-[9px] sm:text-[10px] font-bold text-teal-50 uppercase tracking-widest opacity-80">{t('todayEarn')}</p>
                    <LocalizedReward bdtAmount={user.todayIncome} countryCode={selectedCountryCode} className="flex flex-col items-start" textClassName="text-xl sm:text-2xl font-bold text-white tracking-tight" usdClassName="text-[9px] sm:text-[10px] font-bold text-teal-100/70 mt-0.5 uppercase tracking-wider" />
                </div>
            </div>
            
            <div onClick={() => navigate('/tasks')} className="bg-slate-900 p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] shadow-xl relative overflow-hidden group active:scale-95 transition-all cursor-pointer border-2 border-white/5 min-h-[8.5rem] sm:h-40 flex flex-col justify-between">
                <div className="p-2 sm:p-2.5 bg-white/10 rounded-xl w-fit text-slate-400">
                    <ICONS.Tasks size={18} className="sm:w-5 sm:h-5" />
                </div>
                <div className="relative z-10">
                    <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-80">{t('tasksReady')}</p>
                    <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{availableTasksCount}</h3>
                </div>
            </div>

            <div onClick={() => navigate('/buy')} className="bg-indigo-600 p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] shadow-xl relative overflow-hidden group active:scale-95 transition-all cursor-pointer border-2 border-white/10 min-h-[8.5rem] sm:h-40 flex flex-col justify-between">
                <div className="p-2 sm:p-2.5 bg-white/20 rounded-xl w-fit">
                    <ICONS.Buy size={18} className="text-white sm:w-5 sm:h-5" />
                </div>
                <div className="relative z-10">
                    <p className="text-[9px] sm:text-[10px] font-bold text-indigo-50 uppercase tracking-widest opacity-80">Buy (Shop)</p>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5">শপ ও অ্যাকাউন্ট</h3>
                </div>
            </div>

            <div onClick={() => navigate('/telegram-verify')} className="bg-[#0088cc] p-4 sm:p-6 rounded-2xl sm:rounded-[2.5rem] shadow-xl relative overflow-hidden group active:scale-95 transition-all cursor-pointer border-2 border-white/10 min-h-[8.5rem] sm:h-40 flex flex-col justify-between">
                <div className="p-2 sm:p-2.5 bg-white/20 rounded-xl w-fit">
                    <ICONS.Telegram size={18} className="text-white sm:w-5 sm:h-5" />
                </div>
                <div className="relative z-10">
                    <p className="text-[9px] sm:text-[10px] font-bold text-blue-50 uppercase tracking-widest opacity-80 truncate">
                      {user.isTelegramVerified ? "Telegram Task" : "Telegram Verify"}
                    </p>
                    <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mt-0.5 truncate">
                      {user.isTelegramVerified ? "টেলিগ্রাম টাস্ক" : "টেলিগ্রাম ভেরিফাই"}
                    </h3>
                </div>
            </div>
        </div>
      </div>

      {/* Invite & Earn Box */}
      <div className={`bg-slate-900 rounded-[2.5rem] p-10 space-y-6 shadow-2xl relative overflow-hidden border border-white/5 transition-all duration-500 ${!isVerified ? 'opacity-40 blur-[4px] pointer-events-none' : ''}`}>
         <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center text-slate-950 shadow-xl shadow-amber-400/20">
               <ICONS.Gift size={24} />
            </div>
            <div>
               <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest leading-none">Partner Program</p>
               <h4 className="text-xl font-bold text-white uppercase mt-1 tracking-tight">{t('inviteEarn')}</h4>
            </div>
         </div>
         <p className="text-xs text-slate-400 font-medium leading-relaxed relative z-10">
            আপনার রেফারেল কোড ব্যবহার করে কেউ জয়েন করে মেম্বারশিপ আপগ্রেড করলে আপনি সাথে সাথে বোনাস পাবেন।
         </p>
         <div className="flex items-center gap-3 relative z-10">
            <div className="flex-1 bg-black/50 backdrop-blur-xl border border-white/10 p-5 rounded-2xl text-center">
               <span className="text-white font-black tracking-widest text-lg uppercase">{user.referralCode}</span>
            </div>
            <button 
              onClick={() => { navigator.clipboard.writeText(user.referralCode); alert("Code Copied!"); }} 
              className="bg-amber-400 p-5 rounded-2xl shadow-xl active:scale-90 transition-all text-slate-950"
            >
               <ICONS.Link size={24} />
            </button>
         </div>
      </div>

      {/* UNIQUE & PROFESSIONAL LEADERBOARD */}
      <div className={`bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 lg:p-8 space-y-6 shadow-xl border border-slate-100 dark:border-white/5 transition-all duration-500 ${!isVerified ? 'opacity-30 blur-[4px] pointer-events-none' : ''}`}>
        
        {/* Leaderboard Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <p className="text-[10px] font-black text-[#10b981] uppercase tracking-widest leading-none">EarnZone Top Rankings</p>
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight italic dark:text-white">লিডারবোর্ড</h3>
          </div>

          {/* Timeframe Pill Switch */}
          <div className="bg-slate-100 dark:bg-white/5 p-1 rounded-full flex items-center border border-slate-200/50 dark:border-white/5">
            <button
              onClick={() => setLeaderboardTab('weekly')}
              className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${
                leaderboardTab === 'weekly'
                  ? 'bg-[#10b981] text-white shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setLeaderboardTab('allTime')}
              className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all duration-300 ${
                leaderboardTab === 'allTime'
                  ? 'bg-[#10b981] text-white shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              All-Time
            </button>
          </div>
        </div>

        {/* Podium Layout (Ranks 1, 2, 3) */}
        <div className="grid grid-cols-3 gap-3 pt-6 items-end relative">
          
          {/* Rank 2 (Silver) */}
          <div className="flex flex-col items-center bg-slate-50/50 dark:bg-white/5 rounded-3xl p-4 border border-slate-100 dark:border-white/5 relative hover:-translate-y-1 transition-transform duration-300">
            <div className="absolute -top-3 flex items-center justify-center bg-slate-300 dark:bg-slate-700 text-white rounded-full w-6 h-6 border-2 border-white dark:border-slate-900 shadow-md">
              <span className="text-[9px] font-black">2</span>
            </div>
            <div className="relative mt-2 mb-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-slate-400 to-slate-200 flex items-center justify-center text-white font-black text-sm shadow-md">
                {activeLeaderboard[1]?.initials}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-0.5 rounded-full border border-white dark:border-slate-800">
                <ICONS.Check size={8} className="text-white" />
              </div>
            </div>
            <p className="text-[11px] font-black text-slate-800 dark:text-white leading-tight truncate w-full text-center">
              {activeLeaderboard[1]?.name.split(' ')[0]}
            </p>
            <div className="mt-2 bg-slate-300/15 dark:bg-slate-500/10 px-2 py-1 rounded-lg">
              {activeLeaderboard[1] && renderLeaderboardAmount(activeLeaderboard[1].amount, "text-[#10b981]")}
            </div>
          </div>

          {/* Rank 1 (Gold VIP) */}
          <div className="flex flex-col items-center bg-gradient-to-b from-amber-500/10 via-slate-50/40 to-slate-50/50 dark:from-amber-500/10 dark:via-white/5 dark:to-white/5 rounded-[2rem] p-4 border-2 border-amber-400/30 dark:border-amber-400/20 relative shadow-lg shadow-amber-500/5 hover:-translate-y-1.5 transition-transform duration-300 transform scale-105 z-10">
            {/* Crown floating above */}
            <div className="absolute -top-6 animate-bounce">
              <Crown className="w-6 h-6 text-amber-400 fill-amber-400" />
            </div>
            <div className="absolute -top-3 flex items-center justify-center bg-amber-400 text-slate-950 rounded-full w-6 h-6 border-2 border-white dark:border-slate-900 shadow-md">
              <span className="text-[9px] font-black">1</span>
            </div>
            <div className="relative mt-2 mb-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black text-base shadow-md">
                {activeLeaderboard[0]?.initials}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-0.5 rounded-full border border-white dark:border-slate-800">
                <ICONS.Check size={8} className="text-white" />
              </div>
            </div>
            <p className="text-xs font-black text-slate-950 dark:text-white leading-tight truncate w-full text-center">
              {activeLeaderboard[0]?.name.split(' ')[0]}
            </p>
            <div className="mt-2 bg-amber-400/20 dark:bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/25">
              {activeLeaderboard[0] && renderLeaderboardAmount(activeLeaderboard[0].amount, "text-amber-600 dark:text-amber-400")}
            </div>
          </div>

          {/* Rank 3 (Bronze) */}
          <div className="flex flex-col items-center bg-slate-50/50 dark:bg-white/5 rounded-3xl p-4 border border-slate-100 dark:border-white/5 relative hover:-translate-y-1 transition-transform duration-300">
            <div className="absolute -top-3 flex items-center justify-center bg-amber-700/80 text-white rounded-full w-6 h-6 border-2 border-white dark:border-slate-900 shadow-md">
              <span className="text-[9px] font-black">3</span>
            </div>
            <div className="relative mt-2 mb-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-700 to-amber-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                {activeLeaderboard[2]?.initials}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-0.5 rounded-full border border-white dark:border-slate-800">
                <ICONS.Check size={8} className="text-white" />
              </div>
            </div>
            <p className="text-[11px] font-black text-slate-800 dark:text-white leading-tight truncate w-full text-center">
              {activeLeaderboard[2]?.name.split(' ')[0]}
            </p>
            <div className="mt-2 bg-slate-300/15 dark:bg-slate-500/10 px-2 py-1 rounded-lg">
              {activeLeaderboard[2] && renderLeaderboardAmount(activeLeaderboard[2].amount, "text-[#10b981]")}
            </div>
          </div>

        </div>

        {/* Runners-Up List (Ranks 4-7) */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
          {runnersUp.map((r, i) => (
            <div 
              key={r.name}
              className="flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-2xl transition-all duration-300 border border-slate-100/50 dark:border-transparent"
            >
              <div className="flex items-center gap-3">
                {/* Position Marker */}
                <span className="font-mono text-xs font-black text-slate-400 dark:text-slate-500 w-5">
                  #{i + 4}
                </span>

                {/* Avatar with colorful gradients */}
                <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${r.avatarBg} flex items-center justify-center text-white font-black text-[10px] shadow-sm`}>
                  {r.initials}
                </div>

                {/* Name */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-white">{r.name}</span>
                  {r.verified && (
                    <div className="bg-emerald-500 p-0.5 rounded-full">
                      <ICONS.Check size={7} className="text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Earnings Badge */}
              <div className="flex items-center gap-1 text-right">
                {renderRunnerUpAmount(r.amount)}
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-8 flex justify-center">
         <button 
           onClick={onLogout}
           className="flex items-center gap-3 px-8 py-3 text-xs font-bold text-slate-500 hover:text-red-500 uppercase tracking-widest transition-all group opacity-60 hover:opacity-100"
         >
           <ICONS.Logout size={16} />
           Logout Account
         </button>
      </div>
    </div>
  );
};

export default Dashboard;
