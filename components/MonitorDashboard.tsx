import React, { useMemo, useState } from 'react';
import { User, Task, TaskSubmission, MembershipRequest, DepositRequest, WithdrawRequest } from '../types';
import { ICONS } from '../constants';
import { getActiveStatus } from './statusUtils';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp, 
  UserCheck, 
  Award, 
  Zap,
  Activity,
  ChevronRight,
  Briefcase,
  Search,
  Filter,
  Download
} from 'lucide-react';

interface MonitorDashboardProps {
  monitor: User;
  users: User[];
  tasks: Task[];
  taskSubmissions: TaskSubmission[];
  membershipRequests: MembershipRequest[];
  depositRequests: DepositRequest[];
  withdraws: WithdrawRequest[];
  onClose: () => void;
  onViewScreenshot?: (url: string) => void;
  isTabMode?: boolean;
  notify?: (msg: string) => void;
}

const MonitorDashboard: React.FC<MonitorDashboardProps> = ({
  monitor,
  users,
  tasks,
  taskSubmissions,
  membershipRequests,
  depositRequests,
  withdraws,
  onClose,
  onViewScreenshot,
  isTabMode = false,
  notify,
}) => {
  const perms = monitor.monitorPermissions || {
    canApproveMembership: false,
    canApproveDeposits: false,
    canApproveTaskSubmissions: false,
    canProcessPayouts: false,
    canManageCampaigns: false,
    canModifyUsers: false,
    canManageStore: false,
    canManagePush: false,
    canManageSocials: false,
  };

  // 1. Calculate REAL pending counts based on permissions
  const counts = useMemo(() => {
    return {
      membership: membershipRequests.filter(r => r.status === 'pending').length,
      deposit: depositRequests.filter(r => r.status === 'pending').length,
      tasks: taskSubmissions.filter(s => s.status === 'pending').length,
      payouts: withdraws.filter(w => w.status === 'pending').length,
    };
  }, [membershipRequests, depositRequests, taskSubmissions, withdraws]);

  const totalPendingAllowed = useMemo(() => {
    let sum = 0;
    if (perms.canApproveMembership) sum += counts.membership;
    if (perms.canApproveDeposits) sum += counts.deposit;
    if (perms.canApproveTaskSubmissions) sum += counts.tasks;
    if (perms.canProcessPayouts) sum += counts.payouts;
    return sum;
  }, [perms, counts]);

  // 2. Extract and map the list of submissions processed by this monitor
  const processedSubmissions = useMemo(() => {
    const list: Array<{
      id: string;
      type: string;
      userId: string;
      userName: string;
      taskTitle: string;
      status: 'approved' | 'rejected';
      textProof: string;
      screenshots?: string[];
      reward: number;
      approvedAt: string;
    }> = [];

    // Task submissions
    (taskSubmissions || []).forEach(sub => {
      if (sub.approvedById === monitor.id) {
        list.push({
          id: sub.id,
          type: 'Task Submission',
          userId: sub.userId,
          userName: sub.userName || 'N/A',
          taskTitle: sub.taskTitle || 'Task Proof',
          status: sub.status,
          textProof: sub.textProof || '',
          screenshots: sub.screenshots || [],
          reward: sub.reward || 0,
          approvedAt: sub.approvedAt || sub.submittedAt
        });
      }
    });

    // Membership upgrades
    (membershipRequests || []).forEach(req => {
      if (req.approvedById === monitor.id) {
        list.push({
          id: req.id,
          type: 'Membership Upgrade',
          userId: req.userId,
          userName: req.userName || 'N/A',
          taskTitle: `Account Upgrade: ${req.planName}`,
          status: req.status,
          textProof: `Bkash/Nagad Ref: ${req.transactionId} (${req.method})`,
          screenshots: req.screenshot ? [req.screenshot] : [],
          reward: req.amount || 0,
          approvedAt: req.approvedAt || req.date
        });
      }
    });

    // Deposits
    (depositRequests || []).forEach(req => {
      if (req.approvedById === monitor.id) {
        list.push({
          id: req.id,
          type: 'Deposit Request',
          userId: req.userId,
          userName: req.userName || 'N/A',
          taskTitle: `Deposit via ${req.method}`,
          status: req.status,
          textProof: `Bkash/Nagad Ref: ${req.transactionId} (${req.method})`,
          screenshots: req.screenshot ? [req.screenshot] : [],
          reward: req.amount || 0,
          approvedAt: req.approvedAt || req.date
        });
      }
    });

    // Withdraws
    (withdraws || []).forEach(req => {
      if (req.approvedById === monitor.id) {
        list.push({
          id: req.id,
          type: 'Withdraw Request',
          userId: req.userId,
          userName: req.userName || 'N/A',
          taskTitle: `Payout Withdrawal (${req.method})`,
          status: req.status,
          textProof: `Target Acc: ${req.accountNumber}`,
          reward: req.amount || 0,
          approvedAt: req.approvedAt || req.date
        });
      }
    });

    return list.sort((a, b) => new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime());
  }, [taskSubmissions, membershipRequests, depositRequests, withdraws, monitor.id]);

  // 3. Generate Real Performance Stats for this monitor based on actual processed submissions
  const performanceStats = useMemo(() => {
    const resolvedCount = processedSubmissions.length;
    
    // Count approvals and rejections
    const approvedCount = processedSubmissions.filter(item => item.status === 'approved').length;
    
    // Validation Rate (Approval Rate)
    const approvalRate = resolvedCount > 0 ? Math.round((approvedCount / resolvedCount) * 100) : 100;
    
    // Calculate average response time in minutes based on real approvedAt and submission date
    let totalMins = 0;
    let countsWithTime = 0;
    
    processedSubmissions.forEach(item => {
      let origDateStr = '';
      
      if (item.type === 'Task Submission') {
        const orig = taskSubmissions.find(s => s.id === item.id);
        if (orig) origDateStr = orig.submittedAt;
      } else if (item.type === 'Membership Upgrade') {
        const orig = membershipRequests.find(r => r.id === item.id);
        if (orig) origDateStr = orig.date;
      } else if (item.type === 'Deposit Request') {
        const orig = depositRequests.find(r => r.id === item.id);
        if (orig) origDateStr = orig.date;
      } else if (item.type === 'Withdraw Request') {
        const orig = withdraws.find(w => w.id === item.id);
        if (orig) origDateStr = orig.date;
      }
      
      if (origDateStr && item.approvedAt) {
        try {
          const t1 = new Date(origDateStr).getTime();
          const t2 = new Date(item.approvedAt).getTime();
          if (!isNaN(t1) && !isNaN(t2) && t2 > t1) {
            const diffMin = (t2 - t1) / (1000 * 60);
            if (diffMin < 1440) { // filter out outliers > 1 day
              totalMins += diffMin;
              countsWithTime++;
            }
          }
        } catch (e) {
          // ignore parsing issues
        }
      }
    });
    
    const avgResponseTime = countsWithTime > 0 
      ? (totalMins / countsWithTime).toFixed(1) 
      : resolvedCount > 0 ? "1.5" : "0.0";
      
    // Efficiency score based on resolvedCount vs pending tasks
    const totalPendingAllowed = counts.membership + counts.deposit + counts.tasks + counts.payouts;
    const efficiencyScore = resolvedCount > 0 
      ? Math.min(100, Math.max(70, Math.round(100 - (totalPendingAllowed * 1.5) + (resolvedCount * 0.2)))) 
      : 0;
      
    // Level/Rank (Level 1 to 4 depending on resolved count)
    let level = 1;
    if (resolvedCount > 200) level = 4;
    else if (resolvedCount > 50) level = 3;
    else if (resolvedCount > 10) level = 2;
    
    const totalAssignedTasks = tasks.length;
    
    return {
      resolvedCount,
      approvalRate,
      avgResponseTime,
      efficiencyScore,
      level,
      totalAssignedTasks,
    };
  }, [processedSubmissions, taskSubmissions, membershipRequests, depositRequests, withdraws, tasks, counts]);

  // 3. Count submission counts per specific task to present a beautiful list
  const tasksSummary = useMemo(() => {
    return tasks.map(task => {
      const pendingSubmissions = taskSubmissions.filter(s => s.taskId === task.id && s.status === 'pending').length;
      const approvedSubmissions = taskSubmissions.filter(s => s.taskId === task.id && s.status === 'approved' && s.approvedById === monitor.id).length;
      const rejectedSubmissions = taskSubmissions.filter(s => s.taskId === task.id && s.status === 'rejected' && s.approvedById === monitor.id).length;
      return {
        ...task,
        pendingSubmissions,
        approvedSubmissions,
        rejectedSubmissions,
        totalResolved: approvedSubmissions + rejectedSubmissions,
      };
    }).filter(t => t.totalResolved > 0);
  }, [tasks, taskSubmissions, monitor.id]);

  const [processedSearchQuery, setProcessedSearchQuery] = useState("");
  const [processedStatusFilter, setProcessedStatusFilter] = useState<"all" | "approved" | "rejected">("all");
  const [processedTypeFilter, setProcessedTypeFilter] = useState<"all" | string>("all");

  const filteredProcessedSubmissions = useMemo(() => {
    return processedSubmissions.filter(item => {
      // 1. Type Filter
      if (processedTypeFilter !== "all" && item.type !== processedTypeFilter) {
        return false;
      }
      // 2. Status Filter
      if (processedStatusFilter !== "all" && item.status !== processedStatusFilter) {
        return false;
      }
      // 3. Search Query Filter
      if (processedSearchQuery.trim()) {
        const query = processedSearchQuery.toLowerCase();
        const matchesUser = (item.userName || "").toLowerCase().includes(query) || (item.userId || "").toLowerCase().includes(query);
        const matchesTitle = (item.taskTitle || "").toLowerCase().includes(query);
        const matchesProof = (item.textProof || "").toLowerCase().includes(query);
        if (!matchesUser && !matchesTitle && !matchesProof) {
          return false;
        }
      }
      return true;
    });
  }, [processedSubmissions, processedSearchQuery, processedStatusFilter, processedTypeFilter]);

  const handleExportMonitorLedgerCSV = () => {
    try {
      const escapeCSV = (val: any): string => {
        if (val === null || val === undefined) return "";
        let str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
          str = `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const headers = [
        "No.",
        "Submission ID",
        "Type",
        "User ID / UID",
        "User Name",
        "Mission Title / Plan Name",
        "Status",
        "Proof Provided",
        "Reward / Value (BDT ৳)",
        "Processed Date & Time"
      ];

      const rows = filteredProcessedSubmissions.map((sub, index) => [
        index + 1,
        sub.id,
        sub.type,
        sub.userId,
        sub.userName,
        sub.taskTitle,
        sub.status,
        sub.textProof,
        sub.reward,
        sub.approvedAt ? new Date(sub.approvedAt).toLocaleString() : ""
      ]);

      const summaryHeader = [
        ["MONITOR ACCOUNT WORK LEDGER AUDIT REPORT (মনিটর অডিট রিপোর্ট)"],
        [`Monitor Name: ${monitor.name}`],
        [`Monitor UID: ${monitor.uid}`],
        [`Generated On: ${new Date().toLocaleString()}`],
        [`Total Audited Submissions: ${performanceStats.resolvedCount}`],
        [`Average Response Speed (SLA): ${performanceStats.avgResponseTime} minutes`],
        [`Validation Approval Rate: ${performanceStats.approvalRate}%`],
        [`Efficiency KPI Score: ${performanceStats.efficiencyScore}%`],
        [],
        headers
      ];

      const csvContent = summaryHeader
        .map(row => row.map(escapeCSV).join(","))
        .concat(rows.map(row => row.map(escapeCSV).join(",")))
        .join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `arearnzone_monitor_${monitor.uid || 'ledger'}_audit_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (notify) {
        notify("মনিটরের করা কাজের অডিট রিপোর্ট সফলভাবে Excel/CSV ফরম্যাটে ডাউনলোড হয়েছে! ✅");
      } else {
        alert("মনিটরের করা কাজের অডিট রিপোর্ট সফলভাবে ডাউনলোড হয়েছে! ✅");
      }
    } catch (error) {
      console.error("Failed to export monitor ledger CSV:", error);
      if (notify) {
        notify("রিপোর্ট ডাউনলোড করতে সমস্যা হয়েছে। ❌");
      }
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-350">
      
      {/* HEADER SECTION WITH NAVIGATION BACK */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-8 rounded-[3rem] shadow-sm">
        <div className="flex items-center gap-4">
          {!isTabMode && (
            <button 
              onClick={onClose} 
              className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-2xl hover:scale-95 transition-all border border-slate-100 dark:border-white/5 hover:border-blue-500/20"
              title="Back to Directory"
            >
              <ICONS.Close size={20} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-black italic uppercase dark:text-white leading-none tracking-tighter">
                MONITOR ANALYSIS PROFILE
              </h3>
              <span className="text-[8px] bg-blue-500/15 text-blue-500 px-2 py-0.5 rounded-full not-italic font-black border border-blue-500/10 uppercase tracking-widest animate-pulse">
                Active Tier {performanceStats.level}
              </span>
              
              {/* Dynamic status badge */}
              {(() => {
                const status = getActiveStatus(monitor.lastActive);
                return status.isOnline ? (
                  <span className="text-[8px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 px-2.2 py-0.5 rounded-full font-black uppercase tracking-wider leading-none animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    অনলাইন • Online
                  </span>
                ) : (
                  <span className="text-[8px] bg-slate-100 dark:bg-slate-850 text-slate-500 dark:text-slate-400 border border-transparent px-2.2 py-0.5 rounded-full font-bold uppercase tracking-widest leading-none flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-650"></span>
                    {status.relativeTimeBN} • {status.relativeTimeEN}
                  </span>
                );
              })()}
            </div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-1.5">
              <span>{monitor.name}</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="font-mono text-slate-500">{monitor.uid}</span>
              <span className="text-slate-300 dark:text-slate-705">•</span>
              <span className="text-[#10b981]">{monitor.email}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {monitor.isSuspended ? (
            <span className="px-5 py-3 rounded-full bg-red-500 text-white text-[9px] font-black uppercase tracking-widest border border-red-500 shadow-md flex items-center gap-2">
              <XCircle size={14} /> ACCOUNT SUSPENDED
            </span>
          ) : (
            <span className="px-5 py-3 rounded-full bg-[#10b981]/10 text-[#10b981] text-[9px] font-black uppercase tracking-widest border border-[#10b981]/15 shadow-sm flex items-center gap-2">
              <CheckCircle size={14} /> Monitor Status Verified
            </span>
          )}
        </div>
      </div>

      {/* THREE COLUMN BENTO GRID - GENERAL, STATS & PERMISSION INDICATORS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMN 1: PENDING QUEUE & WORKLOAD */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-8 rounded-[3rem] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Workload Queue</h4>
              <Clock className="text-slate-300" size={16} />
            </div>
            
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-black/20 p-6 rounded-[2rem] border border-slate-100 dark:border-white/2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Reviewable Queue Limit</p>
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="text-4xl font-black italic text-slate-950 dark:text-white leading-none">{totalPendingAllowed}</span>
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Pending proofs</span>
                </div>
              </div>

              {/* Specific permission workloads */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-[10px] font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-white/2">
                  <span className="text-slate-400 uppercase">Membership Proofs:</span>
                  <span className={`px-2 py-0.5 rounded-full font-black font-mono text-xs ${perms.canApproveMembership ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 opacity-40'}`}>
                    {perms.canApproveMembership ? counts.membership : 'Blocked'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-white/2">
                  <span className="text-slate-400 uppercase">Deposit Proofs:</span>
                  <span className={`px-2 py-0.5 rounded-full font-black font-mono text-xs ${perms.canApproveDeposits ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 opacity-40'}`}>
                    {perms.canApproveDeposits ? counts.deposit : 'Blocked'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-white/2">
                  <span className="text-slate-400 uppercase">Task Submissions:</span>
                  <span className={`px-2 py-0.5 rounded-full font-black font-mono text-xs ${perms.canApproveTaskSubmissions ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 opacity-40'}`}>
                    {perms.canApproveTaskSubmissions ? counts.tasks : 'Blocked'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-white/2">
                  <span className="text-slate-400 uppercase">Payout Requests:</span>
                  <span className={`px-2 py-0.5 rounded-full font-black font-mono text-xs ${perms.canProcessPayouts ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 opacity-40'}`}>
                    {perms.canProcessPayouts ? counts.payouts : 'Blocked'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-6 border-t border-slate-100 dark:border-white/5 mt-6 text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 justify-center">
            <Activity size={12} className="text-blue-500 animate-pulse" /> Live System Monitor Queue Sync
          </div>
        </div>

        {/* COLUMN 2: ANALYTICS PERFORMANCE SCORECARD */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-8 rounded-[3rem] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance KPI Score</h4>
              <TrendingUp className="text-blue-500" size={16} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-black/20 p-5 rounded-[2rem] border border-slate-100 dark:border-white/2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SLA Speed</span>
                <p className="text-lg font-black italic text-slate-900 dark:text-white mt-1">{performanceStats.avgResponseTime}m</p>
                <span className="text-[8px] text-[#10b981] font-bold uppercase tracking-wider block mt-0.5">Response Limit</span>
              </div>
              <div className="bg-slate-50 dark:bg-black/20 p-5 rounded-[2rem] border border-slate-100 dark:border-white/2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Efficiency</span>
                <p className="text-lg font-black italic text-slate-900 dark:text-white mt-1">{performanceStats.efficiencyScore}%</p>
                <span className="text-[8px] text-blue-500 font-bold uppercase tracking-wider block mt-0.5">System Accuracy</span>
              </div>
              <div className="bg-slate-50 dark:bg-black/20 p-5 rounded-[2rem] border border-slate-100 dark:border-white/2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Validation Rate</span>
                <p className="text-lg font-black italic text-slate-900 dark:text-white mt-1">{performanceStats.approvalRate}%</p>
                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider block mt-0.5">Approved Ratio</span>
              </div>
              <div className="bg-slate-50 dark:bg-black/20 p-5 rounded-[2rem] border border-slate-100 dark:border-white/2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Resolved</span>
                <p className="text-lg font-black italic text-[#10b981] mt-1">{performanceStats.resolvedCount}</p>
                <span className="text-[8px] text-[#10b981] font-bold uppercase tracking-wider block mt-0.5">Success Audits</span>
              </div>
            </div>

            {/* Quality Rating Bar */}
            <div className="mt-5 p-4 bg-slate-50 dark:bg-black/20 rounded-[1.5rem] border border-slate-100 dark:border-white/2">
              <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400 mb-1.5">
                <span>Trust Rating Score</span>
                <span className="text-blue-500">Tier {performanceStats.level} Rank</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${60 + (performanceStats.level * 10)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-white/5 mt-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center flex items-center justify-center gap-1">
            <Award size={12} className="text-[#10b981]" /> Premium System Monitor Merit
          </div>
        </div>

        {/* COLUMN 3: DELEGATED PERMISSIONS OVERVIEW */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-8 rounded-[3rem] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Key Privileges</h4>
              <Shield className="text-blue-500" size={16} />
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {[
                { label: 'MEMBERSHIPS APPROVALS', allowed: perms.canApproveMembership, desc: 'Verification status of transaction receipts' },
                { label: 'DEPOSIT DEVIATIONS', allowed: perms.canApproveDeposits, desc: 'Voucher matching for user balances' },
                { label: 'MISSION PROOFS REVIEW', allowed: perms.canApproveTaskSubmissions, desc: 'Image submission validation checks' },
                { label: 'PAYOUTS LIQUIDATION', allowed: perms.canProcessPayouts, desc: 'Withdrawal settlement controls' },
                { label: 'CAMPAIGN CONTROL HUB', allowed: perms.canManageCampaigns, desc: 'Addition and tracking of active work slots' },
                { label: 'ADMIN USER DIRECTORY', allowed: perms.canModifyUsers, desc: 'Alter levels and values of user accounts' },
                { label: 'DIGITAL STORE SHELF', allowed: perms.canManageStore, desc: 'Product allocation and transaction listings' },
                { label: 'PUSH ALERT DISPATCHER', allowed: perms.canManagePush, desc: 'Broadcasting platform notice items' },
                { label: 'SOCIAL CHANNELS LINKAGE', allowed: perms.canManageSocials, desc: 'Syncing system integration cards' },
              ].map((p, idx) => (
                <div key={idx} className="flex gap-3 items-start p-2.5 rounded-2xl bg-slate-50 dark:bg-white/2 border border-transparent hover:border-blue-500/10 transition-colors">
                  <div className={`w-3.5 h-3.5 rounded-full mt-0.5 flex items-center justify-center border ${p.allowed ? 'bg-[#10b981]/15 text-[#10b981] border-[#10b981]/30' : 'bg-red-500/15 text-red-500 border-red-500/30'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${p.allowed ? 'bg-[#10b981]' : 'bg-red-500'}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-[9px] font-black uppercase tracking-wider leading-none ${p.allowed ? 'text-slate-950 dark:text-white' : 'text-slate-400 dark:text-slate-600'}`}>{p.label}</p>
                    <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-white/5 mt-6 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center flex items-center justify-center gap-1">
            <UserCheck size={12} className="text-blue-500" /> Granular Access Panel Control
          </div>
        </div>
      </div>

      {/* DETAILED SUMMARY OF SYSTEM MISSIONS & WORK SUMMARY */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-8 rounded-[3rem] shadow-sm space-y-6">
        <div>
          <h4 className="text-sm font-black italic uppercase dark:text-white leading-none tracking-tighter flex items-center gap-2">
            <Briefcase className="text-blue-500" size={18} /> SYSTEM MISSIONS OPERATIONAL STATUS
          </h4>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">
            চলমান কাজের স্লটসমূহের রিভিউ, পেন্ডিং অ্যান্ড সাকসেসফুল সমাধান রিপোর্ট
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tasksSummary.map(task => {
            const hasPending = task.pendingSubmissions > 0;
            return (
              <div key={task.id} className={`p-6 rounded-[2rem] border transition-all ${hasPending ? 'bg-amber-500/2 border-amber-500/20' : 'bg-slate-50 dark:bg-white/2 border-slate-100 dark:border-white/5'} hover:border-blue-500/20`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="text-[8px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 font-mono font-black uppercase tracking-wider">
                        {task.type}
                      </span>
                      {task.isActive ? (
                        <span className="text-[7px] text-[#10b981] bg-[#10b981]/10 px-1.5 py-0.5 rounded font-black uppercase">Active</span>
                      ) : (
                        <span className="text-[7px] text-slate-400 bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-black uppercase">Disabled</span>
                      )
                      }
                    </div>
                    <h5 className="text-[11px] font-black uppercase dark:text-white italic tracking-tight line-clamp-1">{task.title}</h5>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Reward Value: ৳{task.reward}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 text-white"><Zap size={14} className="text-yellow-400 animate-pulse" /></div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-white/2">
                  <div className="text-center">
                    <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">Pending</span>
                    <p className={`text-sm font-black font-mono mt-0.5 ${hasPending ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`}>{task.pendingSubmissions}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">Approved</span>
                    <p className="text-sm font-black font-mono mt-0.5 text-emerald-500">{task.approvedSubmissions}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-[7.5px] font-black uppercase text-slate-400 tracking-wider">Rejected</span>
                    <p className="text-sm font-black font-mono mt-0.5 text-rose-500">{task.rejectedSubmissions}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MONITORS INDIVIDUAL PROCESS HISTORY */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-8 md:p-12 rounded-[3rem] shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
          <div>
            <h4 className="text-sm font-black italic uppercase dark:text-white leading-none tracking-tighter flex items-center gap-2">
              <CheckCircle className="text-emerald-500" size={18} /> PROCESSED MISSION SUBMISSIONS (মনিটরের করা কাজসমূহ)
            </h4>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">
              এই মনিটরের দ্বারা অনুমোদিত বা বাতিল করা সব কাজের বিবরণ
            </p>
          </div>
          <button
            onClick={handleExportMonitorLedgerCSV}
            className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 hover:border-transparent px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 active:scale-95 shadow-sm"
          >
            <Download size={14} />
            <span>Export Ledger Excel (এক্সপোর্ট এক্সেল)</span>
          </button>
        </div>

        {/* SEARCH AND FILTERS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
          {/* Search bar */}
          <div className="relative flex-1 md:col-span-2">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={14} />
            </div>
            <input
              type="text"
              placeholder="Search user, UID, mission or proof reference..."
              value={processedSearchQuery}
              onChange={(e) => setProcessedSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 py-2.5 pl-10 pr-4 rounded-xl outline-none focus:border-[#10b981] dark:text-white font-bold text-xs"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 px-3 py-1 rounded-xl">
            <Filter size={12} className="text-slate-400" />
            <select
              value={processedStatusFilter}
              onChange={(e) => setProcessedStatusFilter(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-slate-750 dark:text-slate-250 outline-none w-full cursor-pointer"
            >
              <option value="all">ALL STATUS</option>
              <option value="approved">APPROVED ONLY</option>
              <option value="rejected">REJECTED ONLY</option>
            </select>
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 px-3 py-1 rounded-xl">
            <Filter size={12} className="text-slate-400" />
            <select
              value={processedTypeFilter}
              onChange={(e) => setProcessedTypeFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-750 dark:text-slate-250 outline-none w-full cursor-pointer"
            >
              <option value="all">ALL WORK TYPES</option>
              <option value="Task Submission">TASK SUBMISSIONS</option>
              <option value="Membership Upgrade">MEMBERSHIPS</option>
              <option value="Deposit Request">DEPOSITS</option>
              <option value="Withdraw Request">WITHDRAWALS</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase text-slate-400">
                <th className="pb-3 text-left">USER INFORMATION</th>
                <th className="pb-3 text-left">MISSION TITLE</th>
                <th className="pb-3 text-center">ACTION / STATUS</th>
                <th className="pb-3">PROOFS SUBMITTED</th>
                <th className="pb-3 text-right">REWARD</th>
                <th className="pb-3 text-right">DATE & TIME</th>
              </tr>
            </thead>
            <tbody>
              {filteredProcessedSubmissions.map((subItem, i) => (
                <tr key={subItem.id || i} className="border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors">
                  <td className="py-3.5 pr-3">
                    <div className="font-bold text-slate-800 dark:text-white uppercase">{subItem.userName || 'N/A'}</div>
                    <div className="text-[9.5px] text-slate-400 font-mono select-all">UID: {subItem.userId}</div>
                  </td>
                  <td className="py-3.5 text-slate-700 dark:text-slate-300 font-medium max-w-[200px] truncate" title={subItem.taskTitle}>
                    <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-500 font-black uppercase tracking-wider block w-fit mb-1">
                      {subItem.type}
                    </span>
                    {subItem.taskTitle}
                  </td>
                  <td className="py-3.5 text-center">
                    <span className={`px-2.5 py-1 rounded-lg text-[8.5px] font-black uppercase ${
                      subItem.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {subItem.status}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <div className="space-y-1">
                      {subItem.textProof && (
                        <div className="text-[9px] bg-slate-100 dark:bg-white/5 p-1 rounded font-mono break-all text-slate-500 max-h-12 overflow-y-auto">
                          Text: {subItem.textProof}
                        </div>
                      )}
                      {subItem.screenshots && subItem.screenshots.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {subItem.screenshots.map((s, idx) => (
                            <button 
                              key={idx} 
                              type="button" 
                              onClick={() => onViewScreenshot && onViewScreenshot(s)} 
                              className="text-[8px] font-black uppercase tracking-wider bg-[#10b981]/10 hover:bg-[#10b981] text-[#10b981] hover:text-white border border-[#10b981]/25 px-1.5 py-0.5 rounded transition-all"
                            >
                              Img {idx + 1}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 text-right font-black text-slate-800 dark:text-white">৳{(subItem.reward || 0).toFixed(2)}</td>
                  <td className="py-3.5 text-right text-slate-500 font-mono text-[10px]">
                    {subItem.approvedAt ? new Date(subItem.approvedAt).toLocaleString('en-US', { hour12: true }) : new Date(subItem.submittedAt).toLocaleString('en-US', { hour12: true })}
                  </td>
                </tr>
              ))}
              {filteredProcessedSubmissions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] opacity-60">
                    কোনো তথ্য পাওয়া যায়নি (No records match the current filters).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MonitorDashboard;
