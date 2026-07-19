import React, { useState, useMemo } from 'react';
import { User, Transaction, MembershipPlan } from '../types';
import { LocalizedReward, convertCurrency } from './localization';
import { ICONS } from '../constants';
import { motion } from 'motion/react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell,
  Legend
} from 'recharts';

const CANDIDATE_NAMES = [
  "Abir Hasan", "Tanvir Ahmed", "Mim Sultana", "MD Rashed", "Sajid Khan", 
  "Tasnim Rahman", "Rifat Islam", "Sabbir Hossain", "Jannatul Nayem", "Naimur Rahman", 
  "Farhana Yasmin", "Sujon Ahmed", "Anik Chowdhury", "Kazi Hasan", "Fahim Shahriar", 
  "Mahi Al Hasan", "Sumaiya Islam", "Ayan Rahman", "Ruhul Amin", "Kamrul Islam",
  "Sadia Afrin", "Nahid Hasan", "Asif Iqbal", "Arifur Rahman", "Mehedi Hasan",
  "Nusrat Jahan", "Shafiqul Islam", "Tariqul Islam", "Rokeya Begum", "Jamil Ahmed"
];

const getDailySeed = () => {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};

const getDaysSinceBase = () => {
  const baseDate = new Date('2026-06-01').getTime();
  const currentDate = new Date().getTime();
  const diffTime = Math.max(0, currentDate - baseDate);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

interface ReferralAnalyticsProps {
  user: User;
  transactions: Transaction[];
  users: User[];
  selectedCountryCode?: string;
  t: (key: any) => string;
  plans?: MembershipPlan[];
}

export const ReferralAnalytics: React.FC<ReferralAnalyticsProps> = ({ 
  user, 
  transactions, 
  users = [], 
  selectedCountryCode = 'BD',
  t,
  plans = []
}) => {
  const [activeTab, setActiveTab] = useState<'personal' | 'leaderboard'>('personal');

  const referralBonus = useMemo(() => {
    if (!plans || plans.length === 0) return 50;
    const proPlan = plans.find(p => p.name === 'Verified Pro' || p.id === 'plan_pro');
    return proPlan ? proPlan.referralBonus : (plans[0]?.referralBonus || 50);
  }, [plans]);

  // Find completed referrals for this user
  const personalReferrals = useMemo(() => {
    return transactions.filter(
      tr => tr.userId === user.id && tr.type === 'Referral' && tr.status === 'completed'
    );
  }, [transactions, user.id]);

  // Total referral commissions earned
  const totalCommission = useMemo(() => {
    return personalReferrals.reduce((sum, tr) => sum + tr.amount, 0);
  }, [personalReferrals]);

  // Conversion rate computation (Verified partners / Total invited)
  const conversionRate = useMemo(() => {
    if (user.referralCount === 0) return 0;
    return Math.round((personalReferrals.length / user.referralCount) * 100);
  }, [personalReferrals.length, user.referralCount]);

  // Aggregate personal referral commission history over the last 7 days
  const personalTrendData = useMemo(() => {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    let cumulativeSum = 0;
    
    // Sort transactions chronologically
    const sortedRefs = [...personalReferrals].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Map to cumulative sums over past 7 days
    const chartPoints = dates.map(dateStr => {
      // Find referrals up to this date
      const upToDateRefs = sortedRefs.filter(tr => {
        const trDate = tr.date.split('T')[0];
        return trDate <= dateStr;
      });
      const amount = upToDateRefs.reduce((sum, tr) => sum + tr.amount, 0);
      
      // Format simple label (e.g., Jul 09)
      const dateObj = new Date(dateStr);
      const label = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      return {
        date: label,
        Commission: amount,
        rawDate: dateStr
      };
    });

    // Fallback logic: If the user doesn't have any referrals yet, generate a preview tutorial trend so the chart looks stunning instead of empty
    const hasData = personalReferrals.length > 0;
    if (!hasData) {
      return dates.map((dateStr, index) => {
        const dateObj = new Date(dateStr);
        const label = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        // Simulating progressive performance preview
        const dummyAmount = (index + 1) * referralBonus; 
        return {
          date: label,
          Commission: dummyAmount,
          isPreview: true,
          rawDate: dateStr
        };
      });
    }

    return chartPoints;
  }, [personalReferrals]);

  // Fetch top referrers from the users pool to build comparative growth charts - custom date-seeded daily promoters with auto-increasing values
  const topReferrers = useMemo(() => {
    const seed = getDailySeed();
    const daysSinceBase = getDaysSinceBase();

    // Simple LCG (Linear Congruential Generator) pseudo-random number generator
    let currentSeed = seed;
    const rand = () => {
      currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296;
      return currentSeed / 4294967296;
    };

    // Pick 5 unique names from CANDIDATE_NAMES based on our seeded rand()
    const selectedPromoters: { name: string, 'Total Referrals': number, 'Est. Earnings (BDT)': number, isCurrentUser: boolean }[] = [];
    const tempCandidates = [...CANDIDATE_NAMES];
    
    // We want the referral counts to be e.g. 245, 230, 150 etc. growing daily!
    // Let's use 245, 230, 150, 110, 95 as the base values.
    // And add a daily growth factor of e.g. 3.5, 2.8, 2.2, 1.8, 1.5 per day.
    const baseCounts = [245, 230, 150, 110, 95];
    const dailyGrowth = [3.5, 2.8, 2.2, 1.8, 1.5];

    for (let i = 0; i < 5; i++) {
      const idx = Math.floor(rand() * tempCandidates.length);
      const name = tempCandidates[idx];
      tempCandidates.splice(idx, 1);

      const totalReferrals = Math.floor(baseCounts[i] + daysSinceBase * dailyGrowth[i]);

      selectedPromoters.push({
        name,
        'Total Referrals': totalReferrals,
        'Est. Earnings (BDT)': totalReferrals * referralBonus,
        isCurrentUser: false
      });
    }

    return selectedPromoters;
  }, [referralBonus]);

  // Standard localization formatting for labels
  const currencySymbol = useMemo(() => {
    return convertCurrency(1, selectedCountryCode).symbol;
  }, [selectedCountryCode]);

  // Customized tooltip component for beautiful dark UI charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      const converted = convertCurrency(val, selectedCountryCode);
      const isPreview = payload[0].payload.isPreview;

      return (
        <div className="bg-slate-950/95 border border-emerald-500/30 p-4 rounded-2xl shadow-xl backdrop-blur-md">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-sm font-black text-emerald-400">
            {converted.symbol}{converted.mainVal.toFixed(2)}
            <span className="text-[9px] text-slate-400 font-bold ml-1">
              ({converted.symbol === '$' ? '' : '$'}{converted.usdVal.toFixed(2)})
            </span>
          </p>
          {isPreview && (
            <p className="text-[8px] font-black text-amber-500 uppercase tracking-wider mt-1.5 animate-pulse">
              ⚠️ Preview Mode Demo
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 border border-slate-100 dark:border-slate-800 shadow-xl space-y-8">
      {/* Header & Interactive Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-6">
        <div className="space-y-1.5 text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-full border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest">
            <ICONS.Dashboard size={10} />
            Analytics Core
          </div>
          <h3 className="text-2xl font-black uppercase italic tracking-tighter text-slate-950 dark:text-white">
            Referral Analytics
          </h3>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
            Data-driven performance tracking & growth trends
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-[1.5rem] border border-slate-200/40 dark:border-white/5 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-5 py-2.5 rounded-[1.1rem] text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              activeTab === 'personal'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105'
                : 'text-slate-500 dark:text-slate-400 hover:text-emerald-500'
            }`}
          >
            My Performance
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-5 py-2.5 rounded-[1.1rem] text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 scale-105'
                : 'text-slate-500 dark:text-slate-400 hover:text-emerald-500'
            }`}
          >
            Ecosystem Leaders
          </button>
        </div>
      </div>

      {/* Main Panel Content with Slide and Fade Animations */}
      {activeTab === 'personal' ? (
        <div className="space-y-8">
          {/* Quick Metrics Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="bg-slate-50 dark:bg-slate-950/60 rounded-3xl p-5 border border-slate-200/50 dark:border-white/5 space-y-2 text-left">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                Verification Conv. Rate
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {conversionRate}%
                </span>
                <span className="text-[10px] font-bold text-slate-400">of invites</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(conversionRate || 10, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/60 rounded-3xl p-5 border border-slate-200/50 dark:border-white/5 space-y-2 text-left">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                Avg. Commission / Partner
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-500 tracking-tight">
                  {currencySymbol}{referralBonus}
                </span>
                <span className="text-[10px] font-bold text-slate-400">per verified</span>
              </div>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">
                High tier payout structure
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/60 rounded-3xl p-5 border border-slate-200/50 dark:border-white/5 space-y-2 text-left">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                Ecosystem Standing
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-blue-500 dark:text-blue-400 tracking-tight">
                  {user.referralCount > 20 ? 'Elite' : user.referralCount > 5 ? 'Rising' : 'Novice'}
                </span>
              </div>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">
                {user.referralCount} total invites sent
              </p>
            </div>

          </div>

          {/* Cumulative Earnings Chart */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <h4 className="text-xs font-black uppercase text-slate-850 dark:text-slate-300 tracking-wider">
                  Cumulative Referral Earnings
                </h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">
                  Growth path of referral commissions credited to balance
                </p>
              </div>
              {personalReferrals.length === 0 && (
                <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full text-[8px] font-black uppercase tracking-wider animate-pulse">
                  PREVIEW GRAPH
                </div>
              )}
            </div>

            <div className="h-72 w-full bg-slate-50/50 dark:bg-slate-950/30 rounded-[2rem] p-4 border border-slate-100 dark:border-white/5">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={personalTrendData}
                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" className="hidden dark:block" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    fontWeight="bold"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    fontWeight="bold"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="Commission" 
                    stroke="#10b981" 
                    strokeWidth={3.5}
                    fillOpacity={1} 
                    fill="url(#colorCommission)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Ecosystem Leaderboard Section */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            
            {/* Visual Bar Chart Comparison */}
            <div className="lg:col-span-3 space-y-4">
              <div className="text-left">
                <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-300 tracking-wider">
                  System Top Referrers Growth
                </h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">
                  Comparative analysis of total verified referrals across leading partner hubs
                </p>
              </div>

              {topReferrers.length === 0 ? (
                <div className="h-64 flex items-center justify-center bg-slate-50 dark:bg-slate-950/40 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-400 font-black uppercase tracking-wider">No global referrer records found</p>
                </div>
              ) : (
                <div className="h-72 w-full bg-slate-50/50 dark:bg-slate-950/30 rounded-[2rem] p-4 border border-slate-100 dark:border-white/5">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topReferrers}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:hidden" />
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" className="hidden dark:block" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#94a3b8" 
                        fontSize={8} 
                        fontWeight="black"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => value.split(' ')[0]} // Shorten names for clean fit
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={10} 
                        fontWeight="bold"
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#020617', 
                          borderColor: '#1e293b',
                          borderRadius: '16px',
                          color: '#fff',
                          fontWeight: 'bold',
                          fontSize: '11px'
                        }}
                      />
                      <Bar dataKey="Total Referrals" radius={[12, 12, 0, 0]}>
                        {topReferrers.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.isCurrentUser ? '#3b82f6' : '#10b981'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Detailed Leaderboard Ranking */}
            <div className="lg:col-span-2 space-y-4">
              <div className="text-left">
                <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-300 tracking-wider">
                  Partner Rankings
                </h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">
                  Top elite network promoters
                </p>
              </div>

              <div className="space-y-3 max-h-[290px] overflow-y-auto custom-scrollbar pr-1">
                {topReferrers.map((promoter, index) => (
                  <div 
                    key={index}
                    className={`flex items-center justify-between p-4 rounded-2xl border ${
                      promoter.isCurrentUser 
                        ? 'bg-blue-500/10 border-blue-500/30' 
                        : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200/50 dark:border-white/5'
                    } transition-all hover:scale-[1.02]`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank Badge */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        index === 0 
                          ? 'bg-amber-400 text-slate-950' 
                          : index === 1 
                            ? 'bg-slate-300 text-slate-950' 
                            : index === 2 
                              ? 'bg-amber-600 text-white' 
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}>
                        #{index + 1}
                      </div>

                      <div className="min-w-0 text-left">
                        <span className="text-[11px] font-black text-slate-900 dark:text-white block truncate uppercase tracking-tight">
                          {promoter.name}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">
                          {promoter.isCurrentUser ? 'Your Standing' : 'Elite Promoted Hub'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-slate-900 dark:text-white block">
                        {promoter['Total Referrals']} Partners
                      </span>
                      <LocalizedReward 
                        bdtAmount={promoter['Est. Earnings (BDT)']} 
                        countryCode={selectedCountryCode}
                        className="justify-end"
                        textClassName="text-[10px] font-black text-emerald-500 dark:text-emerald-400"
                        usdClassName="text-[8px] font-bold text-slate-400"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Educational Footer Accent */}
      <div className="p-5 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-3xl border border-emerald-500/20 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 text-left">
          <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0">
            <ICONS.Check size={20} />
          </div>
          <div>
            <h5 className="text-[11px] font-black uppercase text-slate-900 dark:text-white">
              Unlock Passive Revenue Streams
            </h5>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-normal max-w-lg uppercase">
              As your invited friends upgrade, your payouts are processed automatically with instant clearance tiers. Build your network to increase rank privileges.
            </p>
          </div>
        </div>
        <div className="text-[8px] font-black uppercase bg-emerald-500/20 text-emerald-500 px-3 py-1 rounded-full shrink-0">
          COMPLIANT NETWORK PROMOTER
        </div>
      </div>
    </div>
  );
};
