
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { User, Task, Transaction, TaskSubmission, ReferralTarget, TargetHistory } from '../types';
import { getApiUrl } from '../src/utils/apiConfig';
import { ICONS } from '../constants';
import { Crown, Trophy, Medal, Sparkles, ArrowUpRight, RefreshCw } from 'lucide-react';
import { LocalizedReward, convertCurrency } from './localization';
import { hapticFeedback } from '../utils/haptics';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const cardItemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 280,
      damping: 22,
    },
  },
};

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
  onUpdateUser
}) => {
  const navigate = useNavigate();
  const isAdmin = user.role === 'admin';
  const isVerified = user.status === 'Verified' || isAdmin;

  const animatedBalance = useCountUp(user.balance, 1200);
  const animatedTodayIncome = useCountUp(user.todayIncome || 0, 1200);

  const safeSubmissions = submissions || [];
  const availableTasksCount = tasks.filter(t => 
    t.isActive && 
    (!isTelegramTask(t) || user.isTelegramVerified) &&
    !safeSubmissions.find(s => s.taskId === t.id && s.userId === user.id && (s.status === 'pending' || s.status === 'approved'))
  ).length;

  const referralIncome = useMemo(() => {
    return transactions
      .filter(t => t.userId === user.id && t.type === 'Referral' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, user.id]);

  const animatedReferralIncome = useCountUp(referralIncome, 1200);

  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyReferralCode = () => {
    hapticFeedback.success();
    navigator.clipboard.writeText(user.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

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

  const handleNav = useCallback((path: string) => {
    hapticFeedback.light();
    navigate(path);
  }, [navigate]);

  const handleManualRefresh = () => {
    hapticFeedback.medium();
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

  const getReferralsCountInPeriod = (targetOrPeriod: ReferralTarget | 'daily' | 'weekly' | 'monthly' | 'custom' | 'oneday') => {
    if (!users) return 0;
    const referredUsers = users.filter(u => u.referredBy && u.referredBy.toUpperCase() === user.referralCode.toUpperCase());
    const now = new Date();
    let startTime = new Date();
    let endTime: Date | null = null;

    const period = typeof targetOrPeriod === 'string' ? targetOrPeriod : targetOrPeriod.periodType;
    const target = typeof targetOrPeriod === 'object' ? targetOrPeriod : null;

    if (period === 'daily' || period === 'oneday') {
      startTime.setHours(0, 0, 0, 0);
      if (target?.startDate) {
        startTime = new Date(target.startDate + 'T00:00:00');
      }
      if (target?.endDate) {
        endTime = new Date(target.endDate + 'T23:59:59');
      }
    } else if (period === 'weekly') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const tempDate = new Date(now);
      startTime = new Date(tempDate.setDate(diff));
      startTime.setHours(0, 0, 0, 0);
    } else if (period === 'monthly') {
      startTime = new Date(now.getFullYear(), now.getMonth(), 1);
      startTime.setHours(0, 0, 0, 0);
    } else if (period === 'custom') {
      if (target?.startDate) {
        startTime = new Date(target.startDate + 'T00:00:00');
      } else if (target?.createdAt) {
        startTime = new Date(target.createdAt);
      } else {
        startTime.setHours(0, 0, 0, 0);
      }
      if (target?.endDate) {
        endTime = new Date(target.endDate + 'T23:59:59');
      }
    }

    const matches = referredUsers.filter(u => {
      if (!u.createdAt) return false;
      const date = new Date(u.createdAt);
      if (date < startTime) return false;
      if (endTime && date > endTime) return false;
      return true;
    });

    return matches.length;
  };

  const getPeriodId = (targetOrPeriod: ReferralTarget | 'daily' | 'weekly' | 'monthly' | 'custom' | 'oneday'): string => {
    const d = new Date();
    const period = typeof targetOrPeriod === 'string' ? targetOrPeriod : targetOrPeriod.periodType;
    const target = typeof targetOrPeriod === 'object' ? targetOrPeriod : null;
    const targetPrefix = target ? `${target.id}_` : '';

    if (period === 'daily' || period === 'oneday') {
      return `${targetPrefix}${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } else if (period === 'weekly') {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const tempDate = new Date(d);
      const startOfWeek = new Date(tempDate.setDate(diff));
      return `${targetPrefix}${startOfWeek.getFullYear()}-W${String(Math.ceil(startOfWeek.getDate() / 7))}`;
    } else if (period === 'monthly') {
      return `${targetPrefix}${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else {
      return `${targetPrefix}custom_${target?.startDate || 'start'}_${target?.endDate || 'end'}`;
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
    const currentCount = getReferralsCountInPeriod(target);
    if (currentCount < target.referralGoal) {
      hapticFeedback.warning();
      alert(selectedCountryCode === 'BD' ? "টার্গেট এখনো সম্পূর্ণ হয়নি!" : "Target is not achieved yet!");
      return;
    }

    const periodId = getPeriodId(target);
    const alreadyClaimed = targetHistories?.some(h => h.targetId === target.id && h.userId === user.id && h.periodId === periodId);
    if (alreadyClaimed) {
      hapticFeedback.warning();
      alert(selectedCountryCode === 'BD' ? "এই মেয়াদের বোনাস ইতিমধ্যেই দাবি করা হয়েছে!" : "Bonus for this period has already been claimed!");
      return;
    }

    hapticFeedback.success();

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
      fetch(getApiUrl("/api/email/notify"), {
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

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Live Refresh Top Indicator Banner */}
      {isRefreshing && (
        <div className="sticky top-0 z-50 w-full bg-[#090f21]/95 border-b border-emerald-500/30 backdrop-blur-xl py-2.5 px-4 shadow-[0_4px_20px_rgba(16,185,129,0.25)] flex items-center justify-between text-xs font-black uppercase tracking-wider text-emerald-400 animate-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-2">
            <RefreshCw size={14} className="animate-spin text-emerald-400" />
            <span>SYNCING LATEST BALANCE & LIVE DATA...</span>
          </div>
          <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-emerald-300 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> SECURE REFRESH
          </span>
        </div>
      )}

      {/* Ambient Live Animated Background Mesh */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-float-slow" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] animate-float-reverse" />
        <div className="absolute -bottom-32 left-1/3 w-[30rem] h-[30rem] bg-indigo-600/10 rounded-full blur-[140px] animate-pulse-glow" />
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.02]" />
      </div>

      {/* Main Dashboard Layout */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 space-y-6 max-w-6xl mx-auto w-full pb-24 px-2 sm:px-4"
      >
        
        {/* Top Greeting Header */}
        <motion.div variants={cardItemVariants} className="px-2 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.25em]">EARNING ZONE PLATFORM</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl sm:text-3xl font-black dark:text-white text-slate-900 tracking-tight italic">
              {t('welcome')}, <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200 bg-clip-text text-transparent">{user.name.split(' ')[0]}</span>
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-emerald-500/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-emerald-500/20 shadow-sm">
                <div className={`w-2 h-2 rounded-full ${isVerified ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`}></div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">{isVerified ? 'Verified Pro' : 'Free Member'}</span>
              </div>
              <button
                id="sync-balance-btn"
                type="button"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="bg-white/5 hover:bg-white/10 dark:bg-slate-900/60 hover:dark:bg-slate-800/80 text-slate-200 border border-white/15 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 active:scale-95 disabled:opacity-50 shadow-lg backdrop-blur-md"
              >
                <RefreshCw size={12} className={`${isRefreshing ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
                <span>{isRefreshing ? 'Syncing...' : 'Sync Balance'}</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Live Status Bar */}
        <motion.div variants={cardItemVariants} className="backdrop-blur-xl bg-gradient-to-r from-emerald-600/80 via-teal-600/80 to-emerald-700/80 rounded-2xl sm:rounded-3xl py-3.5 px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xl shadow-emerald-950/40 border border-emerald-400/30 relative overflow-hidden group">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 animate-shimmer"></div>
          </div>
          <div className="flex items-center gap-2.5 relative z-10">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <p className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">Live Online: {liveUsers.toLocaleString()} Members</p>
          </div>
          <div className="flex items-center gap-2 relative z-10 opacity-95 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
            <ICONS.Check size={12} className="text-emerald-300" />
            <p className="text-[10px] sm:text-[11px] font-extrabold text-white uppercase tracking-wider">৳{lastPayoutAmount} Paid out to {lastPayoutUser}</p>
          </div>
        </motion.div>

        {/* Account Status Banner */}
        {!isVerified && (
          <motion.div variants={cardItemVariants} className="backdrop-blur-xl bg-gradient-to-br from-orange-500/90 via-amber-600/90 to-red-600/90 p-6 sm:p-8 rounded-3xl sm:rounded-[2.5rem] text-white space-y-4 sm:space-y-5 shadow-2xl border border-orange-400/40 relative overflow-hidden group">
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/30 shrink-0 shadow-lg">
                <ICONS.Shield size={24} className="text-white" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-200">ACTION REQUIRED</span>
                <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight">Access Restricted</h3>
              </div>
            </div>
            <p className="text-xs sm:text-sm font-semibold opacity-95 relative z-10 leading-relaxed">
              {t('upgradeNow')}
            </p>
            <button 
              onClick={() => handleNav('/membership')}
              className="w-full bg-white text-orange-600 font-black py-4 rounded-2xl text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-orange-50 active:scale-[0.98] transition-all relative z-10"
            >
              {t('upgradeNow')}
            </button>
          </motion.div>
        )}

        {/* Main Grid Cards */}
        <div className={`space-y-5 transition-all duration-700 ${!isVerified ? 'opacity-30 blur-[4px] pointer-events-none' : ''}`}>
          
          {/* Top Tier Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Total Balance Card */}
            <motion.div 
              variants={cardItemVariants}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleNav('/withdraw')} 
              className="bg-slate-900 border-2 border-emerald-500/40 hover:border-emerald-400 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl shadow-emerald-950/50 relative overflow-hidden group transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[10.5rem] sm:h-48"
            >
              {/* Shimmer Light Beam Pass */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.5rem]">
                <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent -skew-x-12 animate-shimmer"></div>
              </div>
              {/* Background ambient glow orb */}
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none"></div>

              <div className="relative z-10 flex justify-between items-start">
                <div className="p-3 bg-emerald-950/90 rounded-2xl border border-emerald-500/50 shadow-md group-hover:scale-110 transition-transform duration-300">
                  <ICONS.Wallet size={24} className="text-emerald-400" />
                </div>
                <div className="bg-emerald-950/90 px-3.5 py-1.5 rounded-full border border-emerald-500/50 flex items-center gap-1.5 shadow-sm">
                  <ICONS.Trend size={13} className="text-emerald-400" />
                  <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider">+2.5% LIVE</span>
                </div>
              </div>
              <div className="relative z-10 mt-3">
                <p className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">{t('balance')}</p>
                <LocalizedReward 
                  bdtAmount={animatedBalance} 
                  countryCode={selectedCountryCode} 
                  className="flex flex-col items-start" 
                  textClassName="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none drop-shadow-md" 
                  usdClassName="text-[11px] sm:text-xs font-black text-emerald-300 mt-1 uppercase tracking-wider" 
                />
              </div>
            </motion.div>

            {/* Referral Income Card */}
            <motion.div 
              variants={cardItemVariants}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleNav('/referral')} 
              className="bg-slate-900 border-2 border-amber-500/40 hover:border-amber-400 p-6 sm:p-8 rounded-[2.5rem] shadow-2xl shadow-amber-950/50 relative overflow-hidden group transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[10.5rem] sm:h-48"
            >
              {/* Shimmer Light Beam Pass */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.5rem]">
                <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-amber-400/10 to-transparent -skew-x-12 animate-shimmer"></div>
              </div>
              {/* Background ambient glow orb */}
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/20 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none"></div>

              <div className="relative z-10 flex justify-between items-start">
                <div className="p-3 bg-amber-950/90 rounded-2xl border border-amber-500/50 shadow-md group-hover:scale-110 transition-transform duration-300">
                  <ICONS.Referral size={24} className="text-amber-400" />
                </div>
                <div className="bg-amber-950/90 px-3.5 py-1.5 rounded-full border border-amber-500/50 flex items-center gap-1.5 shadow-sm">
                  <ICONS.Trend size={13} className="text-amber-400" />
                  <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider">+5% EARNINGS</span>
                </div>
              </div>
              <div className="relative z-10 mt-3">
                <p className="text-[11px] font-black text-amber-400 uppercase tracking-[0.2em] mb-1">{t('refIncome')}</p>
                <LocalizedReward 
                  bdtAmount={animatedReferralIncome} 
                  countryCode={selectedCountryCode} 
                  className="flex flex-col items-start" 
                  textClassName="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none drop-shadow-md" 
                  usdClassName="text-[11px] sm:text-xs font-black text-amber-300 mt-1 uppercase tracking-wider" 
                />
              </div>
            </motion.div>
          </div>

          {/* Action Quick Grid (4 items on desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Today Earn */}
            <motion.div 
              variants={cardItemVariants}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleNav('/tasks')} 
              className="bg-slate-900 border-2 border-teal-500/40 hover:border-teal-400 p-5 sm:p-6 rounded-[2rem] shadow-xl relative overflow-hidden group transition-all duration-300 cursor-pointer min-h-[9rem] sm:h-44 flex flex-col justify-between"
            >
              <div className="p-2.5 bg-teal-950/90 rounded-xl w-fit border border-teal-500/50 group-hover:scale-110 transition-transform duration-300">
                <ICONS.Trend size={20} className="text-teal-400" />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest">{t('todayEarn')}</p>
                <LocalizedReward 
                  bdtAmount={animatedTodayIncome} 
                  countryCode={selectedCountryCode} 
                  className="flex flex-col items-start" 
                  textClassName="text-xl sm:text-2xl font-black text-white tracking-tight" 
                  usdClassName="text-[10px] font-black text-teal-300 mt-0.5 uppercase tracking-wider" 
                />
              </div>
            </motion.div>
            
            {/* Tasks Ready */}
            <motion.div 
              variants={cardItemVariants}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleNav('/tasks')} 
              className="bg-slate-900 border-2 border-cyan-500/40 hover:border-cyan-400 p-5 sm:p-6 rounded-[2rem] shadow-xl relative overflow-hidden group transition-all duration-300 cursor-pointer min-h-[9rem] sm:h-44 flex flex-col justify-between"
            >
              <div className="p-2.5 bg-cyan-950/90 rounded-xl w-fit border border-cyan-500/50 group-hover:scale-110 transition-transform duration-300">
                <ICONS.Tasks size={20} className="text-cyan-400" />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">{t('tasksReady')}</p>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">{availableTasksCount}</h3>
              </div>
            </motion.div>

            {/* Buy (Shop) */}
            <motion.div 
              variants={cardItemVariants}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleNav('/buy')} 
              className="bg-slate-900 border-2 border-indigo-500/40 hover:border-indigo-400 p-5 sm:p-6 rounded-[2rem] shadow-xl relative overflow-hidden group transition-all duration-300 cursor-pointer min-h-[9rem] sm:h-44 flex flex-col justify-between"
            >
              <div className="p-2.5 bg-indigo-950/90 rounded-xl w-fit border border-indigo-500/50 group-hover:scale-110 transition-transform duration-300">
                <ICONS.Buy size={20} className="text-indigo-400" />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">BUY (SHOP)</p>
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">শপ ও অ্যাকাউন্ট</h3>
              </div>
            </motion.div>

            {/* Telegram Verify / Task */}
            <motion.div 
              variants={cardItemVariants}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleNav('/telegram-verify')} 
              className="bg-slate-900 border-2 border-sky-500/40 hover:border-sky-400 p-5 sm:p-6 rounded-[2rem] shadow-xl relative overflow-hidden group transition-all duration-300 cursor-pointer min-h-[9rem] sm:h-44 flex flex-col justify-between"
            >
              <div className="p-2.5 bg-sky-950/90 rounded-xl w-fit border border-sky-500/50 group-hover:scale-110 transition-transform duration-300">
                <ICONS.Telegram size={20} className="text-sky-400" />
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest truncate">
                  {user.isTelegramVerified ? "Telegram Task" : "Telegram Verify"}
                </p>
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5 truncate">
                  {user.isTelegramVerified ? "টেলিগ্রাম টাস্ক" : "টেলিগ্রাম ভেরিফাই"}
                </h3>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Active Referral Target Goals Card (If targets available) */}
        {activeUserTargets.length > 0 && (
          <motion.div 
            variants={cardItemVariants}
            className="backdrop-blur-xl bg-gradient-to-br from-emerald-950/60 via-slate-900/90 to-teal-950/60 rounded-[2.5rem] p-6 sm:p-8 space-y-5 shadow-2xl border border-emerald-500/30 relative overflow-hidden"
          >
            <div className="flex items-center gap-3 relative z-10">
              <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-400/30 text-emerald-400">
                <Trophy size={22} />
              </div>
              <div>
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">BONUS REWARD TARGETS</span>
                <h4 className="text-lg font-black text-white uppercase tracking-tight">রেফারেল টার্গেট ও রিওয়ার্ড</h4>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              {activeUserTargets.map(target => {
                const currentCount = getReferralsCountInPeriod(target.periodType);
                const periodId = getPeriodId(target.periodType);
                const isClaimed = targetHistories?.some(h => h.targetId === target.id && h.userId === user.id && h.periodId === periodId);
                const isAchieved = currentCount >= target.referralGoal;
                const progressPct = Math.min(100, Math.round((currentCount / target.referralGoal) * 100));

                return (
                  <div key={target.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3.5 backdrop-blur-md">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="font-extrabold text-white text-sm">{target.title}</h5>
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {target.periodType}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-bold text-slate-300">
                        <span>Progress: {currentCount}/{target.referralGoal}</span>
                        <span>{progressPct}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden p-0.5 border border-white/5">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Reward:</span>
                        <LocalizedReward bdtAmount={target.bonusReward} countryCode={selectedCountryCode} textClassName="text-sm font-black text-amber-400" />
                      </div>

                      <button
                        onClick={() => handleClaimTarget(target)}
                        disabled={isClaimed || !isAchieved}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                          isClaimed
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                            : isAchieved
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 active:scale-95'
                            : 'bg-white/10 text-slate-400 cursor-not-allowed border border-white/5'
                        }`}
                      >
                        {isClaimed ? 'Claimed' : isAchieved ? 'Claim Bonus' : 'In Progress'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Invite & Earn Box */}
        <motion.div 
          variants={cardItemVariants}
          className={`bg-slate-900 rounded-[2.5rem] p-6 sm:p-10 space-y-6 shadow-2xl relative overflow-hidden border-2 border-amber-500/40 transition-all duration-500 ${!isVerified ? 'opacity-40 blur-[4px] pointer-events-none' : ''}`}
        >
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 bg-amber-400 rounded-2xl flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/20 shrink-0 font-black">
              <ICONS.Gift size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest leading-none">Partner Program</p>
              <h4 className="text-xl sm:text-2xl font-black text-white uppercase mt-1 tracking-tight">{t('inviteEarn')}</h4>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-100 font-semibold leading-relaxed relative z-10">
            আপনার রেফারেল কোড ব্যবহার করে কেউ জয়েন করে মেম্বারশিপ আপগ্রেড করলে আপনি সাথে সাথে রেফারেল বোনাস পাবেন।
          </p>
          <div className="flex items-center gap-3 relative z-10">
            <div className="flex-1 bg-slate-950 border-2 border-amber-500/30 p-4 sm:p-5 rounded-2xl text-center shadow-inner">
              <span className="text-white font-black tracking-widest text-lg sm:text-xl uppercase">{user.referralCode}</span>
            </div>
            <button 
              onClick={handleCopyReferralCode} 
              className="bg-amber-400 hover:bg-amber-300 p-4 sm:p-5 rounded-2xl shadow-xl shadow-amber-500/20 active:scale-90 transition-all duration-300 text-slate-950 flex items-center justify-center gap-2 font-black"
            >
              <ICONS.Link size={22} />
              <span className="hidden sm:inline text-xs uppercase tracking-wider">{copiedCode ? "COPIED!" : "COPY"}</span>
            </button>
          </div>
        </motion.div>

        {/* UNIQUE & PROFESSIONAL LEADERBOARD */}
        <motion.div 
          variants={cardItemVariants}
          className={`bg-slate-900 rounded-[2.5rem] p-6 lg:p-8 space-y-6 shadow-2xl border-2 border-white/10 transition-all duration-500 ${!isVerified ? 'opacity-30 blur-[4px] pointer-events-none' : ''}`}
        >
          
          {/* Leaderboard Header */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                <p className="text-[10px] font-black text-[#10b981] uppercase tracking-widest leading-none">EarnZone Top Rankings</p>
              </div>
              <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight italic text-white">লিডারবোর্ড</h3>
            </div>

            {/* Timeframe Pill Switch */}
            <div className="bg-white/5 p-1 rounded-full flex items-center border border-white/10 backdrop-blur-md">
              <button
                onClick={() => { hapticFeedback.light(); setLeaderboardTab('weekly'); }}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                  leaderboardTab === 'weekly'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => { hapticFeedback.light(); setLeaderboardTab('allTime'); }}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                  leaderboardTab === 'allTime'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All-Time
              </button>
            </div>
          </div>

          {/* Podium Layout (Ranks 1, 2, 3) */}
          <div className="grid grid-cols-3 gap-3 pt-6 items-end relative">
            
            {/* Rank 2 (Silver) */}
            <motion.div 
              whileHover={{ y: -4, scale: 1.02 }}
              className="flex flex-col items-center bg-white/5 backdrop-blur-md rounded-3xl p-4 border border-white/10 relative transition-transform duration-300"
            >
              <div className="absolute -top-3 flex items-center justify-center bg-slate-700 text-white rounded-full w-6 h-6 border-2 border-slate-900 shadow-md">
                <span className="text-[9px] font-black">2</span>
              </div>
              <div className="relative mt-2 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-slate-400 to-slate-200 flex items-center justify-center text-slate-950 font-black text-sm shadow-md">
                  {activeLeaderboard[1]?.initials}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-0.5 rounded-full border border-slate-900">
                  <ICONS.Check size={8} className="text-white" />
                </div>
              </div>
              <p className="text-[11px] font-black text-white leading-tight truncate w-full text-center">
                {activeLeaderboard[1]?.name.split(' ')[0]}
              </p>
              <div className="mt-2 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                {activeLeaderboard[1] && renderLeaderboardAmount(activeLeaderboard[1].amount, "text-[#10b981]")}
              </div>
            </motion.div>

            {/* Rank 1 (Gold VIP) */}
            <motion.div 
              whileHover={{ y: -6, scale: 1.06 }}
              className="flex flex-col items-center bg-gradient-to-b from-amber-500/20 via-slate-900/90 to-slate-900/90 rounded-[2rem] p-4 border-2 border-amber-400/40 relative shadow-xl shadow-amber-500/10 transition-transform duration-300 transform scale-105 z-10 backdrop-blur-md"
            >
              {/* Crown floating above */}
              <div className="absolute -top-6 animate-bounce">
                <Crown className="w-6 h-6 text-amber-400 fill-amber-400" />
              </div>
              <div className="absolute -top-3 flex items-center justify-center bg-amber-400 text-slate-950 rounded-full w-6 h-6 border-2 border-slate-900 shadow-md">
                <span className="text-[9px] font-black">1</span>
              </div>
              <div className="relative mt-2 mb-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 font-black text-base shadow-md">
                  {activeLeaderboard[0]?.initials}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-0.5 rounded-full border border-slate-900">
                  <ICONS.Check size={8} className="text-white" />
                </div>
              </div>
              <p className="text-xs font-black text-white leading-tight truncate w-full text-center">
                {activeLeaderboard[0]?.name.split(' ')[0]}
              </p>
              <div className="mt-2 bg-amber-400/15 px-2.5 py-1 rounded-lg border border-amber-400/30">
                {activeLeaderboard[0] && renderLeaderboardAmount(activeLeaderboard[0].amount, "text-amber-400")}
              </div>
            </motion.div>

            {/* Rank 3 (Bronze) */}
            <motion.div 
              whileHover={{ y: -4, scale: 1.02 }}
              className="flex flex-col items-center bg-white/5 backdrop-blur-md rounded-3xl p-4 border border-white/10 relative transition-transform duration-300"
            >
              <div className="absolute -top-3 flex items-center justify-center bg-amber-800 text-white rounded-full w-6 h-6 border-2 border-slate-900 shadow-md">
                <span className="text-[9px] font-black">3</span>
              </div>
              <div className="relative mt-2 mb-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-700 to-amber-600 flex items-center justify-center text-white font-black text-sm shadow-md">
                  {activeLeaderboard[2]?.initials}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-0.5 rounded-full border border-slate-900">
                  <ICONS.Check size={8} className="text-white" />
                </div>
              </div>
              <p className="text-[11px] font-black text-white leading-tight truncate w-full text-center">
                {activeLeaderboard[2]?.name.split(' ')[0]}
              </p>
              <div className="mt-2 bg-white/5 px-2 py-1 rounded-lg border border-white/10">
                {activeLeaderboard[2] && renderLeaderboardAmount(activeLeaderboard[2].amount, "text-[#10b981]")}
              </div>
            </motion.div>

          </div>

          {/* Runners-Up List (Ranks 4-7) */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            {runnersUp.map((r, i) => (
              <motion.div 
                key={r.name}
                whileHover={{ x: 4, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                className="flex items-center justify-between p-3.5 bg-white/5 rounded-2xl transition-all duration-300 border border-white/5"
              >
                <div className="flex items-center gap-3">
                  {/* Position Marker */}
                  <span className="font-mono text-xs font-black text-slate-500 w-5">
                    #{i + 4}
                  </span>

                  {/* Avatar with colorful gradients */}
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${r.avatarBg} flex items-center justify-center text-white font-black text-[10px] shadow-sm`}>
                    {r.initials}
                  </div>

                  {/* Name */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{r.name}</span>
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
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={cardItemVariants} className="pt-8 flex justify-center">
          <button 
            onClick={() => { hapticFeedback.heavy(); onLogout(); }}
            className="flex items-center gap-3 px-8 py-3 text-xs font-bold text-slate-400 hover:text-red-400 uppercase tracking-widest transition-all group opacity-70 hover:opacity-100"
          >
            <ICONS.Logout size={16} />
            Logout Account
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
