import React, { useState, useMemo, useEffect } from "react";
import { saveDocument } from "../firebase";
import { Eye, EyeOff, Plus, Edit, Trash2, Play, Image as ImageIcon, Globe, ArrowUpDown, PlusCircle, CheckCircle2, XCircle, RefreshCw, Download, Activity, TrendingUp, TrendingDown, DollarSign, Calendar, Terminal, AlertTriangle, Search, Folder, ArrowLeft, CheckSquare, Square, ShieldCheck } from "lucide-react";
import {
  Task,
  WithdrawRequest,
  MembershipRequest,
  DepositRequest,
  PaymentMethod,
  User,
  TaskSubmission,
  WithdrawOption,
  Transaction,
  MembershipPlan,
  AppNotification,
  SocialLink,
  GlobalConfig,
  SellCategory,
  SellItem,
  MonitorPermissions,
  StoreOrder,
  TelegramVerificationRequest,
  AdViewLog,
} from "../types";
import { ICONS } from "../constants";
import MonitorDashboard from "./MonitorDashboard";
import { getErrors, clearErrors, trackError } from "../utils/errorTracker";
import type { SystemErrorLog } from "../utils/errorTracker";
import { getActiveStatus } from "./statusUtils";
import { 
  getAIRecoveryConfig, 
  saveAIRecoveryConfig, 
  getAIRecoveryHistory, 
  clearAIRecoveryHistory, 
  calculateDiagnosticMetrics, 
  runAIHealthScanAndRecovery,
  AIRecoveryConfig,
  AIRecoveryReport,
  AIDiagnosticMetrics
} from "../utils/aiRecoveryEngine";

interface AdminPanelProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  taskSubmissions: TaskSubmission[];
  setTaskSubmissions: React.Dispatch<React.SetStateAction<TaskSubmission[]>>;
  withdraws: WithdrawRequest[];
  setWithdraws: React.Dispatch<React.SetStateAction<WithdrawRequest[]>>;
  membershipRequests: MembershipRequest[];
  setMembershipRequests: React.Dispatch<
    React.SetStateAction<MembershipRequest[]>
  >;
  depositRequests: DepositRequest[];
  setDepositRequests: React.Dispatch<React.SetStateAction<DepositRequest[]>>;
  paymentMethods: PaymentMethod[];
  setPaymentMethods: React.Dispatch<React.SetStateAction<PaymentMethod[]>>;
  plans: MembershipPlan[];
  setPlans: React.Dispatch<React.SetStateAction<MembershipPlan[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  withdrawOptions: WithdrawOption[];
  setWithdrawOptions: React.Dispatch<React.SetStateAction<WithdrawOption[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  appNotifications: AppNotification[];
  setAppNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  socialLinks: SocialLink[];
  setSocialLinks: React.Dispatch<React.SetStateAction<SocialLink[]>>;
  globalConfig: GlobalConfig;
  setGlobalConfig: React.Dispatch<React.SetStateAction<GlobalConfig>>;
  sellItems: SellItem[];
  setSellItems: React.Dispatch<React.SetStateAction<SellItem[]>>;
  sellCategories: SellCategory[];
  setSellCategories: React.Dispatch<React.SetStateAction<SellCategory[]>>;
  notify: (msg: string) => void;
  currentUser?: User;
  storeOrders: StoreOrder[];
  setStoreOrders: React.Dispatch<React.SetStateAction<StoreOrder[]>>;
  telegramRequests?: TelegramVerificationRequest[];
  setTelegramRequests?: React.Dispatch<
    React.SetStateAction<TelegramVerificationRequest[]>
  >;
  adViewLogs?: AdViewLog[];
  setAdViewLogs?: React.Dispatch<React.SetStateAction<AdViewLog[]>>;
  targets?: ReferralTarget[];
  setTargets?: React.Dispatch<React.SetStateAction<ReferralTarget[]>>;
  targetHistories?: TargetHistory[];
  setTargetHistories?: React.Dispatch<React.SetStateAction<TargetHistory[]>>;
  gatewayLogs?: GatewayLog[];
  setGatewayLogs?: React.Dispatch<React.SetStateAction<GatewayLog[]>>;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  tasks,
  setTasks,
  taskSubmissions,
  setTaskSubmissions,
  withdraws,
  setWithdraws,
  membershipRequests,
  setMembershipRequests,
  depositRequests,
  setDepositRequests,
  users,
  setUsers,
  plans,
  setPlans,
  paymentMethods,
  setPaymentMethods,
  withdrawOptions,
  setWithdrawOptions,
  transactions,
  setTransactions,
  appNotifications,
  setAppNotifications,
  socialLinks,
  setSocialLinks,
  globalConfig,
  setGlobalConfig,
  sellItems,
  setSellItems,
  sellCategories,
  setSellCategories,
  notify,
  currentUser,
  storeOrders,
  setStoreOrders,
  telegramRequests = [],
  setTelegramRequests,
  adViewLogs = [],
  setAdViewLogs,
  targets = [],
  setTargets,
  targetHistories = [],
  setTargetHistories,
  gatewayLogs = [],
  setGatewayLogs,
}) => {
  const [activeTab, setActiveTab] = useState<
    | "approvals"
    | "settings"
    | "payouts"
    | "tasks"
    | "users"
    | "monitors"
    | "security"
    | "notifications"
    | "social"
    | "system"
    | "store"
    | "performance"
    | "telegram"
    | "ads"
    | "audit_logs"
    | "targets"
  >("settings");
  const [approvalSubTab, setApprovalSubTab] = useState<
    "membership" | "tasks" | "deposit"
  >("membership");

  // Custom reject prompt modal state
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: (reason: string) => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });
  const [rejectReasonInput, setRejectReasonInput] = useState("");

  // NEW: Category states for Advanced Pending Proof Management System
  const [selectedTaskCategory, setSelectedTaskCategory] = useState<string | null>(null);
  const [selectedGatewayCategory, setSelectedGatewayCategory] = useState<string | null>(null);
  const [proofSearchQuery, setProofSearchQuery] = useState("");
  const [proofStatusFilter, setProofStatusFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');

  // Dynamic Category-Based Payout Management states
  const [selectedPayoutCategory, setSelectedPayoutCategory] = useState<string | null>(null);
  const [payoutSearchQuery, setPayoutSearchQuery] = useState("");
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);

  // Stable task numbering helper based on alphabetical sort of active/inactive tasks
  const getTaskNumber = (taskId: string): string => {
    const sortedTasks = [...(tasks || [])].sort((a, b) => a.id.localeCompare(b.id));
    const index = sortedTasks.findIndex((t) => t.id === taskId);
    if (index !== -1) {
      return `Task ${index + 1}`;
    }
    // Stable fallback hash so category assignment remains stable for deleted tasks
    let hash = 0;
    for (let i = 0; i < taskId.length; i++) {
      hash = taskId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const stableNum = Math.abs(hash % 100) + 1;
    return `Task ${stableNum}`;
  };

  const isToday = (dateStr?: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };

  const getGatewayStats = (method: PaymentMethod) => {
    const isTodayAndAfterReset = (dateStr?: string) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      const today = new Date();
      const sameDay = d.getDate() === today.getDate() &&
                       d.getMonth() === today.getMonth() &&
                       d.getFullYear() === today.getFullYear();
      if (!sameDay) return false;
      if (method.manualResetTimestamp) {
        const resetTime = new Date(method.manualResetTimestamp);
        return d.getTime() > resetTime.getTime();
      }
      return true;
    };

    let totalAmount = 0;
    let count = 0;
    
    if (method.category === 'membership') {
      depositRequests.forEach(req => {
        if (req.method === method.name && req.status !== 'rejected' && isTodayAndAfterReset(req.date)) {
          totalAmount += req.amount;
          count += 1;
        }
      });
      membershipRequests.forEach(req => {
        if (req.method === method.name && req.status !== 'rejected' && isTodayAndAfterReset(req.date)) {
          totalAmount += req.amount;
          count += 1;
        }
      });
    } else if (method.category === 'withdraw') {
      withdraws.forEach(req => {
        if (req.method === method.name && req.status !== 'rejected' && isTodayAndAfterReset(req.date)) {
          totalAmount += req.amount;
          count += 1;
        }
      });
    }

    const limitType = method.dailyLimitType || 'unlimited';
    const limitAmount = limitType === 'custom' ? (method.dailyLimitAmount || 0) : 'unlimited';
    const graceLimit = method.graceLimitAmount !== undefined ? method.graceLimitAmount : -1;

    let remaining: number | 'unlimited' = 'unlimited';
    let status: 'Active' | 'Limit Reached' | 'Manual Off' | 'Unlimited' = 'Unlimited';

    if (!method.isActive) {
      status = 'Manual Off';
    } else if (limitType === 'unlimited') {
      status = 'Unlimited';
    } else if (typeof limitAmount === 'number') {
      remaining = Math.max(0, limitAmount - totalAmount);
      
      let isLimitHit = false;
      if (graceLimit === 0) {
        isLimitHit = totalAmount >= limitAmount;
      } else if (graceLimit > 0) {
        isLimitHit = totalAmount >= (limitAmount + graceLimit);
      } else {
        isLimitHit = totalAmount >= limitAmount;
      }
      
      if (isLimitHit) {
        status = 'Limit Reached';
      } else {
        status = 'Active';
      }
    }

    return {
      totalAmount,
      count,
      limitAmount,
      graceLimit,
      remaining,
      status
    };
  };

  // Reset category state on subtab/activeTab changes
  useEffect(() => {
    setSelectedTaskCategory(null);
    setSelectedGatewayCategory(null);
    setProofSearchQuery("");
    setProofStatusFilter("pending");

    setSelectedPayoutCategory(null);
    setPayoutSearchQuery("");
    setPayoutStatusFilter("pending");
    setSelectedRequestIds([]);
  }, [approvalSubTab, activeTab]);

  // Task Categories
  const taskCategories = useMemo(() => {
    const categoriesMap: { [key: string]: { taskId: string; taskNumber: string; taskTitle: string; pending: number; approvedToday: number; rejectedToday: number; oldestSubmission: number } } = {};

    (taskSubmissions || []).forEach((sub) => {
      const taskNumber = getTaskNumber(sub.taskId);
      const taskId = sub.taskId;
      const taskTitle = sub.taskTitle || "Unknown Task";
      
      if (!categoriesMap[taskId]) {
        categoriesMap[taskId] = {
          taskId,
          taskNumber,
          taskTitle,
          pending: 0,
          approvedToday: 0,
          rejectedToday: 0,
          oldestSubmission: Infinity,
        };
      }

      const timestamp = sub.submittedAt ? Date.parse(sub.submittedAt) : Infinity;

      if (sub.status === "pending") {
        categoriesMap[taskId].pending++;
        if (timestamp < categoriesMap[taskId].oldestSubmission) {
          categoriesMap[taskId].oldestSubmission = timestamp;
        }
      } else if (sub.status === "approved" && isToday(sub.approvedAt)) {
        categoriesMap[taskId].approvedToday++;
      } else if (sub.status === "rejected" && isToday(sub.approvedAt)) {
        categoriesMap[taskId].rejectedToday++;
      }
    });

    return Object.values(categoriesMap)
      .filter((cat) => cat.pending > 0)
      .sort((a, b) => a.oldestSubmission - b.oldestSubmission);
  }, [taskSubmissions, tasks]);

  // Gateway list
  const gatewayMethods = useMemo(() => {
    const methods = new Set<string>();
    (paymentMethods || []).forEach(pm => {
      if (pm.name) methods.add(pm.name);
    });
    (depositRequests || []).forEach(req => {
      if (req.method) methods.add(req.method);
    });
    (membershipRequests || []).forEach(req => {
      if (req.method) methods.add(req.method);
    });
    return Array.from(methods);
  }, [paymentMethods, depositRequests, membershipRequests]);

  // Deposit Categories
  const depositCategories = useMemo(() => {
    const categoriesMap: { [key: string]: { gateway: string; pending: number; approvedToday: number; rejectedToday: number; oldestSubmission: number } } = {};

    gatewayMethods.forEach(method => {
      categoriesMap[method] = {
        gateway: method,
        pending: 0,
        approvedToday: 0,
        rejectedToday: 0,
        oldestSubmission: Infinity,
      };
    });

    const otherKey = "Other Gateways";
    categoriesMap[otherKey] = {
      gateway: otherKey,
      pending: 0,
      approvedToday: 0,
      rejectedToday: 0,
      oldestSubmission: Infinity,
    };

    (depositRequests || []).forEach((req) => {
      let key = req.method || otherKey;
      if (!categoriesMap[key]) {
        categoriesMap[key] = {
          gateway: key,
          pending: 0,
          approvedToday: 0,
          rejectedToday: 0,
          oldestSubmission: Infinity,
        };
      }

      const timestamp = req.date ? Date.parse(req.date) : Infinity;

      if (req.status === "pending") {
        categoriesMap[key].pending++;
        if (timestamp < categoriesMap[key].oldestSubmission) {
          categoriesMap[key].oldestSubmission = timestamp;
        }
      } else if (req.status === "approved" && isToday(req.approvedAt)) {
        categoriesMap[key].approvedToday++;
      } else if (req.status === "rejected" && isToday(req.approvedAt)) {
        categoriesMap[key].rejectedToday++;
      }
    });

    return Object.values(categoriesMap)
      .filter(cat => cat.pending > 0 || cat.approvedToday > 0 || cat.rejectedToday > 0)
      .sort((a, b) => a.oldestSubmission - b.oldestSubmission);
  }, [depositRequests, gatewayMethods]);

  // Membership Categories
  const membershipCategories = useMemo(() => {
    const categoriesMap: { [key: string]: { gateway: string; pending: number; approvedToday: number; rejectedToday: number; oldestSubmission: number } } = {};

    gatewayMethods.forEach(method => {
      categoriesMap[method] = {
        gateway: method,
        pending: 0,
        approvedToday: 0,
        rejectedToday: 0,
        oldestSubmission: Infinity,
      };
    });

    const otherKey = "Other Gateways";
    categoriesMap[otherKey] = {
      gateway: otherKey,
      pending: 0,
      approvedToday: 0,
      rejectedToday: 0,
      oldestSubmission: Infinity,
    };

    (membershipRequests || []).forEach((req) => {
      let key = req.method || otherKey;
      if (!categoriesMap[key]) {
        categoriesMap[key] = {
          gateway: key,
          pending: 0,
          approvedToday: 0,
          rejectedToday: 0,
          oldestSubmission: Infinity,
        };
      }

      const timestamp = req.date ? Date.parse(req.date) : Infinity;

      if (req.status === "pending") {
        categoriesMap[key].pending++;
        if (timestamp < categoriesMap[key].oldestSubmission) {
          categoriesMap[key].oldestSubmission = timestamp;
        }
      } else if (req.status === "approved" && isToday(req.approvedAt)) {
        categoriesMap[key].approvedToday++;
      } else if (req.status === "rejected" && isToday(req.approvedAt)) {
        categoriesMap[key].rejectedToday++;
      }
    });

    return Object.values(categoriesMap)
      .filter(cat => cat.pending > 0 || cat.approvedToday > 0 || cat.rejectedToday > 0)
      .sort((a, b) => a.oldestSubmission - b.oldestSubmission);
  }, [membershipRequests, gatewayMethods]);

  // Selected category live counters
  const selectedTaskCategoryStats = useMemo(() => {
    if (!selectedTaskCategory) return { pending: 0, approvedToday: 0, rejectedToday: 0 };
    let pending = 0;
    let approvedToday = 0;
    let rejectedToday = 0;
    (taskSubmissions || []).forEach(sub => {
      if (sub.taskId === selectedTaskCategory) {
        if (sub.status === "pending") {
          pending++;
        } else if (sub.status === "approved" && isToday(sub.approvedAt)) {
          approvedToday++;
        } else if (sub.status === "rejected" && isToday(sub.approvedAt)) {
          rejectedToday++;
        }
      }
    });
    return { pending, approvedToday, rejectedToday };
  }, [taskSubmissions, selectedTaskCategory]);

  const selectedDepositGatewayStats = useMemo(() => {
    if (!selectedGatewayCategory) return { pending: 0, approvedToday: 0, rejectedToday: 0 };
    let pending = 0;
    let approvedToday = 0;
    let rejectedToday = 0;
    (depositRequests || []).forEach(req => {
      const key = req.method || "Other Gateways";
      const match = selectedGatewayCategory === "Other Gateways" 
        ? !gatewayMethods.includes(req.method || "")
        : key === selectedGatewayCategory;
      if (match) {
        if (req.status === "pending") {
          pending++;
        } else if (req.status === "approved" && isToday(req.approvedAt)) {
          approvedToday++;
        } else if (req.status === "rejected" && isToday(req.approvedAt)) {
          rejectedToday++;
        }
      }
    });
    return { pending, approvedToday, rejectedToday };
  }, [depositRequests, selectedGatewayCategory, gatewayMethods]);

  const selectedMembershipGatewayStats = useMemo(() => {
    if (!selectedGatewayCategory) return { pending: 0, approvedToday: 0, rejectedToday: 0 };
    let pending = 0;
    let approvedToday = 0;
    let rejectedToday = 0;
    (membershipRequests || []).forEach(req => {
      const key = req.method || "Other Gateways";
      const match = selectedGatewayCategory === "Other Gateways"
        ? !gatewayMethods.includes(req.method || "")
        : key === selectedGatewayCategory;
      if (match) {
        if (req.status === "pending") {
          pending++;
        } else if (req.status === "approved" && isToday(req.approvedAt)) {
          approvedToday++;
        } else if (req.status === "rejected" && isToday(req.approvedAt)) {
          rejectedToday++;
        }
      }
    });
    return { pending, approvedToday, rejectedToday };
  }, [membershipRequests, selectedGatewayCategory, gatewayMethods]);

  // Compute Category Data dynamically based on current payment methods of category 'withdraw'
  const withdrawGateways = useMemo(() => {
    return (paymentMethods || []).filter((pm) => pm.category === "withdraw");
  }, [paymentMethods]);

  // Map each withdraw request to its dynamic category
  const getRequestCategory = (wd: WithdrawRequest) => {
    const methodLower = (wd.method || "").toLowerCase().trim();
    // Check if it matches any active withdraw gateway
    const match = withdrawGateways.find((pm) => pm.name.toLowerCase().trim() === methodLower);
    if (match) {
      return match.name;
    }
    return "Other Gateways";
  };

  // Compute stats for all categories
  const payoutCategoriesWithStats = useMemo(() => {
    const categoriesList = withdrawGateways.map((pm) => pm.name);
    
    // Check if there are any requests that fall under "Other Gateways"
    const hasOtherGateways = (withdraws || []).some((wd) => {
      const cat = getRequestCategory(wd);
      return cat === "Other Gateways";
    });

    if (hasOtherGateways) {
      categoriesList.push("Other Gateways");
    }

    return categoriesList.map((category) => {
      const catRequests = (withdraws || []).filter((wd) => getRequestCategory(wd) === category);
      
      const pendingCount = catRequests.filter((wd) => wd.status === "pending").length;
      const approvedTodayCount = catRequests.filter((wd) => wd.status === "approved" && isToday(wd.approvedAt || wd.date)).length;
      const rejectedTodayCount = catRequests.filter((wd) => wd.status === "rejected" && isToday(wd.approvedAt || wd.date)).length;
      const totalRequestedAmount = catRequests.reduce((sum, wd) => sum + wd.amount, 0);
      const totalPaidAmount = catRequests.filter((wd) => wd.status === "approved").reduce((sum, wd) => sum + (wd.amount - wd.fee), 0);

      return {
        name: category,
        pendingCount,
        approvedTodayCount,
        rejectedTodayCount,
        totalRequestedAmount,
        totalPaidAmount,
      };
    });
  }, [withdrawGateways, withdraws]);

  // Filtered Payout items within selected Category
  const filteredCategoryPayouts = useMemo(() => {
    if (!selectedPayoutCategory) return [];

    let list = (withdraws || []).filter((wd) => getRequestCategory(wd) === selectedPayoutCategory);

    // Filter by status
    if (payoutStatusFilter !== "all") {
      list = list.filter((wd) => wd.status === payoutStatusFilter);
    }

    // Filter by search query
    if (payoutSearchQuery.trim()) {
      const q = payoutSearchQuery.toLowerCase().trim();
      list = list.filter((wd) => {
        return (
          (wd.userId || "").toLowerCase().includes(q) ||
          (wd.userName || "").toLowerCase().includes(q) ||
          (wd.method || "").toLowerCase().includes(q) ||
          (wd.id || "").toLowerCase().includes(q) ||
          (wd.date || "").toLowerCase().includes(q) ||
          (wd.accountNumber || "").toLowerCase().includes(q)
        );
      });
    }

    // Sort by FIFO for pending, LIFO for others
    list.sort((a, b) => {
      const parseDate = (dStr?: string) => {
        if (!dStr) return 0;
        const parsed = Date.parse(dStr);
        return isNaN(parsed) ? 0 : parsed;
      };
      const timeA = parseDate(a.date || a.approvedAt);
      const timeB = parseDate(b.date || b.approvedAt);
      
      if (payoutStatusFilter === "pending") {
        return timeA - timeB; // FIFO (Oldest first)
      } else {
        return timeB - timeA; // LIFO (Newest first)
      }
    });

    return list;
  }, [withdraws, selectedPayoutCategory, payoutStatusFilter, payoutSearchQuery]);

  // Filtered Task items within selected Category
  const filteredCategoryTasks = useMemo(() => {
    if (!selectedTaskCategory) return [];
    
    let list = (taskSubmissions || []).filter(sub => sub.taskId === selectedTaskCategory);
    list = list.filter(sub => sub.status === proofStatusFilter);
    
    if (proofSearchQuery.trim()) {
      const q = proofSearchQuery.toLowerCase();
      list = list.filter(sub => {
        const userName = (sub.userName || "").toLowerCase();
        const userId = (sub.userId || "").toLowerCase();
        const subDate = sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString().toLowerCase() : "";
        return userName.includes(q) || userId.includes(q) || subDate.includes(q);
      });
    }

    return list.sort((a, b) => {
      const timeA = a.submittedAt ? Date.parse(a.submittedAt) : 0;
      const timeB = b.submittedAt ? Date.parse(b.submittedAt) : 0;
      return timeA - timeB;
    });
  }, [taskSubmissions, selectedTaskCategory, proofStatusFilter, proofSearchQuery]);

  // Filtered Deposit items within selected Category
  const filteredCategoryDeposits = useMemo(() => {
    if (!selectedGatewayCategory) return [];

    let list = (depositRequests || []);
    if (selectedGatewayCategory === "Other Gateways") {
      list = list.filter(req => !gatewayMethods.includes(req.method || ""));
    } else {
      list = list.filter(req => req.method === selectedGatewayCategory);
    }

    list = list.filter(req => req.status === proofStatusFilter);

    if (proofSearchQuery.trim()) {
      const q = proofSearchQuery.toLowerCase();
      list = list.filter(req => {
        const userName = (req.userName || "").toLowerCase();
        const userId = (req.userId || "").toLowerCase();
        const method = (req.method || "").toLowerCase();
        const subDate = req.date ? new Date(req.date).toLocaleDateString().toLowerCase() : "";
        return userName.includes(q) || userId.includes(q) || method.includes(q) || subDate.includes(q);
      });
    }

    return list.sort((a, b) => {
      const timeA = a.date ? Date.parse(a.date) : 0;
      const timeB = b.date ? Date.parse(b.date) : 0;
      return timeA - timeB;
    });
  }, [depositRequests, selectedGatewayCategory, gatewayMethods, proofStatusFilter, proofSearchQuery]);

  // Filtered Membership Upgrade items within selected Category
  const filteredCategoryMemberships = useMemo(() => {
    if (!selectedGatewayCategory) return [];

    let list = (membershipRequests || []);
    if (selectedGatewayCategory === "Other Gateways") {
      list = list.filter(req => !gatewayMethods.includes(req.method || ""));
    } else {
      list = list.filter(req => req.method === selectedGatewayCategory);
    }

    list = list.filter(req => req.status === proofStatusFilter);

    if (proofSearchQuery.trim()) {
      const q = proofSearchQuery.toLowerCase();
      list = list.filter(req => {
        const userName = (req.userName || "").toLowerCase();
        const userId = (req.userId || "").toLowerCase();
        const method = (req.method || "").toLowerCase();
        const plan = (req.planName || "").toLowerCase();
        const subDate = req.date ? new Date(req.date).toLocaleDateString().toLowerCase() : "";
        return userName.includes(q) || userId.includes(q) || method.includes(q) || plan.includes(q) || subDate.includes(q);
      });
    }

    return list.sort((a, b) => {
      const timeA = a.date ? Date.parse(a.date) : 0;
      const timeB = b.date ? Date.parse(b.date) : 0;
      return timeA - timeB;
    });
  }, [membershipRequests, selectedGatewayCategory, gatewayMethods, proofStatusFilter, proofSearchQuery]);

  const [auditLogs, setAuditLogs] = useState<SystemErrorLog[]>([]);

  useEffect(() => {
    setAuditLogs(getErrors());
    const handleNewLog = () => {
      setAuditLogs(getErrors());
    };
    const handleCleared = () => {
      setAuditLogs([]);
    };
    window.addEventListener("arearnzone_new_audit_log" as any, handleNewLog);
    window.addEventListener("arearnzone_audit_logs_cleared" as any, handleCleared);
    return () => {
      window.removeEventListener("arearnzone_new_audit_log" as any, handleNewLog);
      window.removeEventListener("arearnzone_audit_logs_cleared" as any, handleCleared);
    };
  }, []);
  
  // AD MANAGER FORM & EDIT STATES
  const [adFormName, setAdFormName] = useState("");
  const [adFormType, setAdFormType] = useState<"Image" | "Video" | "Web Link">("Video");
  const [adFormUrl, setAdFormUrl] = useState("");
  const [adFormThumbnail, setAdFormThumbnail] = useState("");
  const [adFormIsActive, setAdFormIsActive] = useState(true);
  const [adFormOrderNumber, setAdFormOrderNumber] = useState(1);
  const [adFormLimitType, setAdFormLimitType] = useState<"unlimited" | "custom">("unlimited");
  const [adFormViewLimit, setAdFormViewLimit] = useState<number>(0);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);
  const [deletingAdId, setDeletingAdId] = useState<string | null>(null);

  // AI Health Recovery States
  const [aiConfig, setAiConfig] = useState<AIRecoveryConfig>(getAIRecoveryConfig());
  const [aiHistory, setAiHistory] = useState<AIRecoveryReport[]>(getAIRecoveryHistory());
  const [aiMetrics, setAiMetrics] = useState<AIDiagnosticMetrics>(calculateDiagnosticMetrics());
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const handleConfigChange = () => setAiConfig(getAIRecoveryConfig());
    const handleNewReport = () => setAiHistory(getAIRecoveryHistory());
    const handleHistoryCleared = () => setAiHistory([]);
    const handleScanCompleted = (e: any) => {
      setAiMetrics(e.detail.metrics);
      setAiHistory(getAIRecoveryHistory());
      setAiConfig(getAIRecoveryConfig());
    };

    window.addEventListener('arearnzone_ai_recovery_config_changed', handleConfigChange);
    window.addEventListener('arearnzone_ai_recovery_new_report', handleNewReport);
    window.addEventListener('arearnzone_ai_recovery_history_cleared', handleHistoryCleared);
    window.addEventListener('arearnzone_ai_scan_completed' as any, handleScanCompleted);

    return () => {
      window.removeEventListener('arearnzone_ai_recovery_config_changed', handleConfigChange);
      window.removeEventListener('arearnzone_ai_recovery_new_report', handleNewReport);
      window.removeEventListener('arearnzone_ai_recovery_history_cleared', handleHistoryCleared);
      window.removeEventListener('arearnzone_ai_scan_completed' as any, handleScanCompleted);
    };
  }, []);

  const [searchQuery, setSearchQuery] = useState("");

  const escapeCSV = (val: any): string => {
    if (val === null || val === undefined) return "";
    let str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExportUsersCSV = () => {
    try {
      const headers = [
        "User ID",
        "UID",
        "Name",
        "Email",
        "Balance",
        "Today Income",
        "Referral Code",
        "Referral Count",
        "Referred By",
        "Status",
        "Role",
        "Is Telegram Verified",
        "Telegram Username",
        "Telegram ID",
        "Telegram Phone",
        "IP Address",
        "Device Info",
        "Suspended",
        "Created At",
        "Last Active"
      ];

      const rows = users.map(u => [
        u.id,
        u.uid,
        u.name,
        u.email,
        u.balance,
        u.todayIncome,
        u.referralCode,
        u.referralCount,
        u.referredBy || "",
        u.status,
        u.role,
        u.isTelegramVerified ? "YES" : "NO",
        u.telegramUsername || "",
        u.telegramId || "",
        u.telegramPhone || "",
        u.ip || "",
        u.deviceInfo || "",
        u.isSuspended ? "YES" : "NO",
        u.createdAt,
        u.lastActive || ""
      ]);

      const csvContent = [
        headers.map(escapeCSV).join(","),
        ...rows.map(row => row.map(escapeCSV).join(","))
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `arearnzone_users_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      notify("ইউজার লিস্ট সফলভাবে CSV ফাইল হিসেবে ডাউনলোড হয়েছে! ✅");
    } catch (error) {
      console.error("Failed to export users CSV:", error);
      notify("ইউজার লিস্ট এক্সপোর্ট করতে সমস্যা হয়েছে। ❌");
    }
  };

  const handleExportTransactionsCSV = () => {
    try {
      const headers = [
        "Transaction ID",
        "User ID",
        "User UID",
        "User Name",
        "User Email",
        "Type",
        "Amount",
        "Date",
        "Description",
        "Status"
      ];

      const rows = transactions.map(tx => {
        const associatedUser = users.find(u => u.id === tx.userId);
        return [
          tx.id,
          tx.userId,
          associatedUser?.uid || "N/A",
          associatedUser?.name || "N/A",
          associatedUser?.email || "N/A",
          tx.type,
          tx.amount,
          tx.date,
          tx.description,
          tx.status
        ];
      });

      const csvContent = [
        headers.map(escapeCSV).join(","),
        ...rows.map(row => row.map(escapeCSV).join(","))
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `arearnzone_transactions_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      notify("লেনদেন হিস্ট্রি সফলভাবে CSV ফাইল হিসেবে ডাউনলোড হয়েছে! ✅");
    } catch (error) {
      console.error("Failed to export transactions CSV:", error);
      notify("লেনদেন হিস্ট্রি এক্সপোর্ট করতে সমস্যা হয়েছে। ❌");
    }
  };

  const handleExportAllSubmissionsCSV = () => {
    try {
      const headers = [
        "Submission ID",
        "Task ID",
        "Task Title",
        "Reward (BDT)",
        "User ID / UID",
        "User Name",
        "Status (pending/approved/rejected)",
        "Text Proof",
        "Screenshots",
        "Submitted At",
        "Audited By (ID)",
        "Audited By (Name)",
        "Audited At",
        "Client IP",
        "Telegram ID Used",
        "AI Verified (YES/NO)",
        "AI Audit Log"
      ];

      const rows = taskSubmissions.map(sub => [
        sub.id,
        sub.taskId,
        sub.taskTitle || "N/A",
        sub.reward || 0,
        sub.userId,
        sub.userName || "N/A",
        sub.status,
        sub.textProof || "",
        (sub.screenshots || []).join(" | "),
        sub.submittedAt,
        sub.approvedById || "",
        sub.approvedByName || "",
        sub.approvedAt || "",
        sub.clientIp || "",
        sub.telegramIdUsed || "",
        sub.aiVerified ? "YES" : "NO",
        sub.aiAuditLog || ""
      ]);

      const csvContent = [
        headers.map(escapeCSV).join(","),
        ...rows.map(row => row.map(escapeCSV).join(","))
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `arearnzone_all_submissions_a2z_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      notify("সকল কাজের সাবমিশন অডিট রিপোর্ট (A to Z) সফলভাবে CSV ফাইল হিসেবে ডাউনলোড হয়েছে! ✅");
    } catch (error) {
      console.error("Failed to export all submissions CSV:", error);
      notify("সাবমিশন হিস্ট্রি এক্সপোর্ট করতে সমস্যা হয়েছে। ❌");
    }
  };

  const handleExportAllMonitorsCSV = () => {
    try {
      const headers = [
        "Monitor ID",
        "UID",
        "Name",
        "Email",
        "Status",
        "Online Status",
        "Last Active",
        "Permissions (Memberships)",
        "Permissions (Deposits)",
        "Permissions (Missions)",
        "Permissions (Payouts)",
        "Total Audited Actions",
        "Approved Actions",
        "Rejected Actions",
        "Pending Tasks Assigned"
      ];

      const monitorsList = users.filter(u => u.role === "monitor" || u.isMonitor);

      const rows = monitorsList.map(m => {
        const perms = m.monitorPermissions || {
          canApproveMembership: false,
          canApproveDeposits: false,
          canApproveTaskSubmissions: false,
          canProcessPayouts: false,
        };

        const approvedTasks = taskSubmissions.filter(s => s.status === 'approved' && s.approvedById === m.id).length;
        const rejectedTasks = taskSubmissions.filter(s => s.status === 'rejected' && s.approvedById === m.id).length;
        const approvedMbs = (membershipRequests || []).filter(r => r.status === 'approved' && r.approvedById === m.id).length;
        const rejectedMbs = (membershipRequests || []).filter(r => r.status === 'rejected' && r.approvedById === m.id).length;
        const approvedDeposits = (depositRequests || []).filter(r => r.status === 'approved' && r.approvedById === m.id).length;
        const rejectedDeposits = (depositRequests || []).filter(r => r.status === 'rejected' && r.approvedById === m.id).length;
        const approvedWds = (withdraws || []).filter(r => r.status === 'approved' && r.approvedById === m.id).length;
        const rejectedWds = (withdraws || []).filter(r => r.status === 'rejected' && r.approvedById === m.id).length;

        const totalApproved = approvedTasks + approvedMbs + approvedDeposits + approvedWds;
        const totalRejected = rejectedTasks + rejectedMbs + rejectedDeposits + rejectedWds;
        const totalResolved = totalApproved + totalRejected;

        const activeStatus = getActiveStatus(m.lastActive);

        return [
          m.id,
          m.uid,
          m.name,
          m.email,
          m.isSuspended ? "BANNED" : "VERIFIED",
          activeStatus.isOnline ? "ONLINE" : "OFFLINE",
          m.lastActive || "",
          perms.canApproveMembership ? "YES" : "NO",
          perms.canApproveDeposits ? "YES" : "NO",
          perms.canApproveTaskSubmissions ? "YES" : "NO",
          perms.canProcessPayouts ? "YES" : "NO",
          totalResolved,
          totalApproved,
          totalRejected,
          (taskSubmissions || []).filter(s => s.status === 'pending').length
        ];
      });

      const csvContent = [
        headers.map(escapeCSV).join(","),
        ...rows.map(row => row.map(escapeCSV).join(","))
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `arearnzone_all_monitors_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      notify("মনিটরদের পারফরম্যান্স রিপোর্ট সফলভাবে CSV ফাইল হিসেবে ডাউনলোড হয়েছে! ✅");
    } catch (error) {
      console.error("Failed to export monitors report:", error);
      notify("মনিটরদের রিপোর্ট এক্সপোর্ট করতে সমস্যা হয়েছে। ❌");
    }
  };

  const handleExportAccountingLedgerCSV = () => {
    try {
      const headers = [
        "Ledger Code / Sl",
        "Entry Timestamp (তারিখ ও সময়)",
        "Document/Ref ID (আইডি)",
        "Account Ledger Name (খাত)",
        "Debit (Payment Out/Liability) ৳",
        "Credit (Payment In/Asset) ৳",
        "Value Amount ৳",
        "Particulars / Details (বিবরণ)",
        "Client Target (ইউজার)",
        "Audit Status (অবস্থা)",
        "Processor / Auditor (অডিটর)"
      ];

      const ledgerItems: any[] = [];

      // 1. Map Task Submissions (Pending, Approved, Rejected)
      (taskSubmissions || []).forEach((sub) => {
        ledgerItems.push({
          date: sub.submittedAt,
          id: sub.id,
          category: `Task Mission (${sub.status.toUpperCase()})`,
          debit: sub.reward || 0,
          credit: 0,
          amount: sub.reward || 0,
          description: `Mission Submission: ${sub.taskTitle || "N/A"}${sub.textProof ? ` | Proof: ${sub.textProof}` : ""}`,
          client: `${sub.userName || "N/A"} (${sub.userId})`,
          status: sub.status.toUpperCase(),
          auditor: sub.approvedByName ? `${sub.approvedByName} (${sub.approvedById || "System"})` : "N/A"
        });
      });

      // 2. Map Financial Transactions (Deposit, Withdraw, Refer Bonus, etc.)
      (transactions || []).forEach((tx) => {
        const isDeposit = tx.type?.toLowerCase().includes("deposit") || tx.type?.toLowerCase().includes("in");
        const isWithdraw = tx.type?.toLowerCase().includes("withdraw") || tx.type?.toLowerCase().includes("out") || tx.type?.toLowerCase().includes("payout");
        
        let debit = 0;
        let credit = 0;
        
        if (isWithdraw) {
          debit = tx.amount || 0;
        } else {
          credit = tx.amount || 0;
        }

        const associatedUser = users.find(u => u.id === tx.userId);

        ledgerItems.push({
          date: tx.date || "",
          id: tx.id,
          category: `Wallet ${tx.type ? tx.type.toUpperCase() : "TRANSACTION"}`,
          debit: debit,
          credit: credit,
          amount: tx.amount || 0,
          description: tx.description || "Wallet ledger adjustment",
          client: associatedUser ? `${associatedUser.name} (${associatedUser.uid || tx.userId})` : tx.userId,
          status: (tx.status || "COMPLETED").toUpperCase(),
          auditor: "Admin/System"
        });
      });

      // Sort items chronologically by date descending
      ledgerItems.sort((a, b) => {
        const dateA = new Date(a.date).getTime() || 0;
        const dateB = new Date(b.date).getTime() || 0;
        return dateB - dateA;
      });

      const rows = ledgerItems.map((item, index) => [
        index + 1,
        item.date ? new Date(item.date).toLocaleString() : "N/A",
        item.id || "N/A",
        item.category,
        item.debit,
        item.credit,
        item.amount,
        item.description,
        item.client,
        item.status,
        item.auditor
      ]);

      const csvContent = [
        headers.map(escapeCSV).join(","),
        ...rows.map(row => row.map(escapeCSV).join(","))
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `arearnzone_comprehensive_ledger_accounting_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      notify("কম্প্রিহেনসিভ একাউন্টিং লেজার রিপোর্ট সফলভাবে CSV ফাইল হিসেবে ডাউনলোড হয়েছে! ✅");
    } catch (error) {
      console.error("Failed to export accounting ledger CSV:", error);
      notify("একাউন্টিং লেজার এক্সপোর্ট করতে সমস্যা হয়েছে। ❌");
    }
  };
  const [monitorSearchQuery, setMonitorSearchQuery] = useState("");
  const [viewingMonitorDashboard, setViewingMonitorDashboard] =
    useState<User | null>(null);
  const [monitorHistoryTimeframe, setMonitorHistoryTimeframe] = useState<
    "today" | "weekly" | "monthly" | "custom"
  >("today");
  const [monitorHistoryCustomDate, setMonitorHistoryCustomDate] =
    useState<string>(new Date().toISOString().split("T")[0]);
  const [selectedPerformanceDate, setSelectedPerformanceDate] =
    useState<string>(new Date().toISOString().split("T")[0]);

  // MONITOR ASSIGNMENT WITH APP PASSWORD VERIFICATION STATES
  const [addMonitorUidQuery, setAddMonitorUidQuery] = useState("");
  const [passwordVerificationOpen, setPasswordVerificationOpen] =
    useState(false);
  const [verificationPassword, setVerificationPassword] = useState("");
  const [pendingMonitorAction, setPendingMonitorAction] = useState<{
    type: "add" | "remove";
    targetUser: User;
  } | null>(null);
  const [passwordError, setPasswordError] = useState("");

  const [localPlans, setLocalPlans] = useState<MembershipPlan[]>(plans);

  useEffect(() => {
    setLocalPlans(plans);
  }, [plans]);

  useEffect(() => {
    setViewingMonitorDashboard(null);
    setAddMonitorUidQuery("");
  }, [activeTab]);

  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [historySubTab, setHistorySubTab] = useState<
    | "tasks"
    | "deposits"
    | "upgrades"
    | "withdraws"
    | "transactions"
    | "referrals"
    | "info"
  >("tasks");
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpDiagnosticMsg, setSmtpDiagnosticMsg] = useState<string | null>(
    null,
  );
  const [smtpDiagnosticOk, setSmtpDiagnosticOk] = useState<boolean | null>(
    null,
  );
  const [authGuideTab, setAuthGuideTab] = useState<
    "spf" | "dkim" | "dmarc" | "gmail"
  >("spf");

  // Multi-SMTP states
  const [smtpFormUser, setSmtpFormUser] = useState("");
  const [smtpFormPass, setSmtpFormPass] = useState("");
  const [showSmtpFormPass, setShowSmtpFormPass] = useState(false);
  const [smtpFormLimit, setSmtpFormLimit] = useState(500);
  const [isAddingSmtp, setIsAddingSmtp] = useState(false);

  // Test Users Cleanup Manager States
  const [cleanupSearchQuery, setCleanupSearchQuery] = useState("");
  const [cleanupUserTarget, setCleanupUserTarget] = useState<any | null>(null); // User object or 'all'
  const [cleanupAppPassword, setCleanupAppPassword] = useState("");
  const [isVerifyingCleanupPassword, setIsVerifyingCleanupPassword] = useState(false);
  const [showCleanupModal, setShowCleanupModal] = useState(false);

  const getMonitorDisplayName = (
    approvedById?: string,
    approvedByName?: string,
  ) => {
    if (!approvedById) return approvedByName || "Admin";
    const found = (users || []).find((u) => u.id === approvedById);
    if (found) {
      return `${found.name} (${found.uid})`;
    }
    return approvedByName || "Admin";
  };

  const [tgBotToken, setTgBotToken] = useState("");
  const [tgBotUsername, setTgBotUsername] = useState("@AREarnZone_bot");
  const [tgChannelLink, setTgChannelLink] = useState("https://t.me/arearnzone");
  const [isSavingTgBot, setIsSavingTgBot] = useState(false);
  const [tgBotStatusMsg, setTgBotStatusMsg] = useState<string | null>(null);
  const [tgBotStatusOk, setTgBotStatusOk] = useState<boolean | null>(null);
  const [canForceTgSave, setCanForceTgSave] = useState(false);

  const [telegramFilter, setTelegramFilter] = useState<
    "all" | "pending" | "approved" | "rejected"
  >("pending");
  const [adminViewingTelegramScreenshot, setAdminViewingTelegramScreenshot] =
    useState<string | null>(null);
  const [checkingSubs, setCheckingSubs] = useState<
    Record<string, "loading" | "joined" | "not_joined" | string>
  >({});

  const isMonitor = currentUser?.role !== "admin" && !!currentUser?.isMonitor;
  const permissions: MonitorPermissions = useMemo(() => currentUser?.monitorPermissions || {
    canApproveMembership: false,
    canApproveDeposits: false,
    canApproveTaskSubmissions: false,
    canProcessPayouts: false,
    canManageCampaigns: false,
    canModifyUsers: false,
    canManageStore: false,
    canManagePush: false,
    canManageSocials: false,
  }, [currentUser?.monitorPermissions]);

  const [didInitTab, setDidInitTab] = useState(false);

  useEffect(() => {
    if (isMonitor && !didInitTab) {
      if (
        permissions.canApproveMembership ||
        permissions.canApproveDeposits ||
        permissions.canApproveTaskSubmissions
      ) {
        setActiveTab("approvals");
        if (permissions.canApproveMembership) {
          setApprovalSubTab("membership");
        } else if (permissions.canApproveDeposits) {
          setApprovalSubTab("deposit");
        } else {
          setApprovalSubTab("tasks");
        }
      } else if (permissions.canProcessPayouts) {
        setActiveTab("payouts");
      } else if (permissions.canManageCampaigns) {
        setActiveTab("tasks");
      } else if (permissions.canModifyUsers) {
        setActiveTab("users");
      } else if (permissions.canManageStore) {
        setActiveTab("store");
      } else if (permissions.canManagePush) {
        setActiveTab("notifications");
      } else if (permissions.canManageSocials) {
        setActiveTab("social");
      }
      setDidInitTab(true);
    }
  }, [isMonitor, didInitTab, permissions]);

  // Modals / Edit States
  const [editingTier, setEditingTier] = useState<WithdrawOption | null>(null);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingProof, setViewingProof] = useState<TaskSubmission | null>(null);
  const [viewingMembershipProof, setViewingMembershipProof] =
    useState<MembershipRequest | null>(null);
  const [viewingDepositProof, setViewingDepositProof] =
    useState<DepositRequest | null>(null);
  const [selectedUserForManage, setSelectedUserForManage] =
    useState<User | null>(null);
  const [editingBalanceValue, setEditingBalanceValue] = useState<string>("");
  const [balanceUpdatePassword, setBalanceUpdatePassword] =
    useState<string>("");
  const [editingSocial, setEditingSocial] = useState<SocialLink | null>(null);

  // PERFORMANCE ANALYTICS DETAIL MODAL & CUSTOM MONTH STATES
  const [selectedPerformanceMonth, setSelectedPerformanceMonth] =
    useState<string>(() => {
      const today = new Date();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      return `${today.getFullYear()}-${mm}`; // e.g. "2026-06"
    });

  // PLATFORM HEALTH CARD STATES
  const [platformHealthTimeframe, setPlatformHealthTimeframe] = useState<
    "all" | "today" | "7days" | "30days" | "custom"
  >("all");
  const [platformHealthStartDate, setPlatformHealthStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [platformHealthEndDate, setPlatformHealthEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [perfDetailOpen, setPerfDetailOpen] = useState(false);
  const [perfDetailType, setPerfDetailType] = useState<
    "joins" | "work" | "sector" | "withdraw" | "membership" | "referral" | "ads" | null
  >(null);
  const [perfDetailTimeframe, setPerfDetailTimeframe] = useState<
    "today" | "weekly" | "custom" | "custom-date" | "total"
  >("today");
  const [perfDetailSector, setPerfDetailSector] = useState<string | null>(null); // For sector-specific drilling

  const [viewingActiveScreenshot, setViewingActiveScreenshot] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (
      viewingProof &&
      viewingProof.screenshots &&
      viewingProof.screenshots.length > 0
    ) {
      setViewingActiveScreenshot(viewingProof.screenshots[0]);
    } else {
      setViewingActiveScreenshot(null);
    }
  }, [viewingProof]);

  useEffect(() => {
    if (viewingDepositProof) {
      setViewingActiveScreenshot(viewingDepositProof.screenshot || null);
    } else {
      setViewingActiveScreenshot(null);
    }
  }, [viewingDepositProof]);

  useEffect(() => {
    if (viewingMembershipProof) {
      setViewingActiveScreenshot(viewingMembershipProof.screenshot || null);
    } else {
      setViewingActiveScreenshot(null);
    }
  }, [viewingMembershipProof]);

  useEffect(() => {
    if (!selectedUserForManage) {
      setBalanceUpdatePassword("");
    }
  }, [selectedUserForManage]);

  // Notification States
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifType, setNotifType] = useState<
    "task" | "payment" | "announcement"
  >("announcement");
  const [isBlasting, setIsBlasting] = useState(false);

  // Sell & Store states
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemDetails, setNewItemDetails] = useState("");
  const [newItemLimit, setNewItemLimit] = useState("");
  const [newItemEnableSD, setNewItemEnableSD] = useState(false);
  const [adminLightboxImg, setAdminLightboxImg] = useState<string | null>(null);
  const [storeOrderFilter, setStoreOrderFilter] = useState<
    "pending" | "completed" | "all"
  >("pending");

  // Multi-Account Detection Cache
  const ipCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    users.forEach((u) => {
      if (u.ip) counts[u.ip] = (counts[u.ip] || 0) + 1;
    });
    return counts;
  }, [users]);

  const stats = {
    totalUsers: users.length,
    pendingMembers: (membershipRequests || []).filter(
      (r) => r.status === "pending",
    ).length,
    pendingDeposits: (depositRequests || []).filter(
      (r) => r.status === "pending",
    ).length,
    pendingTasks: (taskSubmissions || []).filter((s) => s.status === "pending")
      .length,
    pendingWithdraws: (withdraws || []).filter((w) => w.status === "pending")
      .length,
    flaggedUsers: users.filter(
      (u) => (u.fraudFlags?.length || 0) > 0 || (u.ip && ipCounts[u.ip] > 1),
    ).length,
  };

  const filteredUsers = useMemo(() => {
    const list = users.filter(
      (u) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.referralCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.telegramUsername &&
          u.telegramUsername
            .toLowerCase()
            .includes(searchQuery.toLowerCase())) ||
        (u.telegramId &&
          u.telegramId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.telegramPhone &&
          u.telegramPhone.toLowerCase().includes(searchQuery.toLowerCase())),
    );

    // Sort: Admins first, then Monitors, then Standard Users
    return [...list].sort((a, b) => {
      const getRoleWeight = (u: User) => {
        if (u.role === "admin") return 0;
        if (u.isMonitor) return 1;
        return 2;
      };

      const weightA = getRoleWeight(a);
      const weightB = getRoleWeight(b);

      if (weightA !== weightB) {
        return weightA - weightB;
      }

      // Secondary sort: alphabetical or by UID
      return a.name.localeCompare(b.name);
    });
  }, [users, searchQuery]);

  const filteredMonitors = useMemo(() => {
    const list = users.filter((u) => u.isMonitor && u.role !== "admin");
    return list.filter(
      (u) =>
        u.name.toLowerCase().includes(monitorSearchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(monitorSearchQuery.toLowerCase()) ||
        u.uid.toLowerCase().includes(monitorSearchQuery.toLowerCase()),
    );
  }, [users, monitorSearchQuery]);

  // MODULE: SYSTEM CONFIG HANDLERS
  const [emailCounters, setEmailCounters] = useState<{
    gmailCount: number;
    date: string;
    smtpStatus?: Array<{ user: string; limit: number; count: number }>;
    activeSmtp?: string | null;
    activeSmtpIndex?: number;
  } | null>(null);

  const fetchEmailCounters = async () => {
    try {
      const res = await fetch("/api/admin/email-counters");
      if (res.ok) {
        const data = await res.json();
        setEmailCounters(data);

        // Ephemeral recovery for Multi-SMTP rotation pool
        const serverSmtps = data.smtpStatus || [];
        const cachedSmtpStr = localStorage.getItem("arez_admin_smtp_list");
        if (cachedSmtpStr) {
          try {
            const cachedSmtps = JSON.parse(cachedSmtpStr);
            if (Array.isArray(cachedSmtps) && cachedSmtps.length > 0) {
              // Check if any cached SMTP is missing from server list
              const isMissing = cachedSmtps.some(
                (cached) =>
                  !serverSmtps.some(
                    (serv) =>
                      serv.user.toLowerCase() === cached.user.toLowerCase(),
                  ),
              );

              if (isMissing) {
                console.log(
                  "[SMTP Cache] Connection/configs lost. Restoring SMTP list in background...",
                );
                // Save the whole list using bulk save API
                await fetch("/api/admin/save-smtp-list", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ smtpList: cachedSmtps }),
                });
                console.log("[SMTP Cache] SMTP configurations successfully restored!");
                // Trigger a refresh after background restoration
                const refreshedRes = await fetch("/api/admin/email-counters");
                if (refreshedRes.ok) {
                  const refreshedData = await refreshedRes.json();
                  setEmailCounters(refreshedData);
                }
              }
            }
          } catch (restoreErr) {
            console.error("[SMTP Cache] Restoration failed:", restoreErr);
          }
        }
      }
    } catch (e: any) {
      if (e?.message === "Failed to fetch") {
        console.warn(
          "Failed to fetch email counters (temporary network/server disconnect).",
        );
      } else {
        console.error("Failed to fetch email counters:", e);
      }
    }
  };

  const handleResetCounters = async () => {
    try {
      const res = await fetch("/api/admin/email-counters/reset", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        notify("Email limits manually reset!");
        fetchEmailCounters();
      } else {
        notify(data.error || "Failed to reset counters.");
      }
    } catch (e) {
      console.error(e);
      notify("Failed to reset email counters.");
    }
  };

  const fetchTelegramConfig = async () => {
    try {
      const res = await fetch("/api/telegram/config");
      if (res.ok) {
        const data = await res.json();
        setTgBotUsername(data.botUsername || "@AREarnZone_bot");
        setTgChannelLink(data.channelLink || "https://t.me/arearnzone");

        // Ephemeral recovery: If the server restarted and has no active token, but this admin has a cached copy, auto-restore it!
        if (!data.isConfigured) {
          // 1. Try restoring from Firestore globalConfig first
          const firestoreToken = globalConfig?.telegramBotToken;
          const firestoreUsername = globalConfig?.telegramBotUsername || "@AREarnZone_bot";
          const firestoreChannel = globalConfig?.telegramChannelLink || "https://t.me/arearnzone";

          if (firestoreToken && firestoreToken.trim()) {
            console.log(
              "[Telegram Bot Cache] Ephemeral connection lost. Restoring bot from globalConfig in background...",
            );
            await fetch("/api/telegram/save-config", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: firestoreToken,
                username: firestoreUsername,
                channel: firestoreChannel,
                forceSave: true,
              }),
            });
            console.log(
              "[Telegram Bot Cache] Connection successfully restored from globalConfig!",
            );
            return;
          }

          // 2. Fallback to localStorage
          const cached = localStorage.getItem("arez_admin_tg_config");
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (parsed && parsed.token && parsed.token.trim()) {
                console.log(
                  "[Telegram Bot Cache] Ephemeral connection lost. Restoring bot in background...",
                );
                await fetch("/api/telegram/save-config", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    token: parsed.token,
                    username: parsed.username || parsed.botUsername,
                    channel: parsed.channel || parsed.channelLink,
                    forceSave: true,
                  }),
                });
                console.log(
                  "[Telegram Bot Cache] Connection successfully restored!",
                );
              }
            } catch (restoreErr) {
              console.error(
                "[Telegram Bot Cache] Restoration failed:",
                restoreErr,
              );
            }
          }
        }
      }
    } catch (e: any) {
      if (e?.message === "Failed to fetch") {
        console.warn(
          "Failed to fetch Telegram config (temporary network/server disconnect).",
        );
      } else {
        console.error("Failed to fetch Telegram config:", e);
      }
    }
  };

  const handleSaveTgBot = async (
    e: React.FormEvent,
    force: boolean = false,
  ) => {
    if (e) e.preventDefault();
    if (!tgBotToken.trim()) {
      notify("টেলিগ্রাম বট টোকেন দিন!");
      return;
    }
    setIsSavingTgBot(true);
    setTgBotStatusMsg(null);
    setTgBotStatusOk(null);
    setCanForceTgSave(false);
    notify(
      force
        ? "বাধ্যতামূলকভাবে বট টোকেন সেভ করা হচ্ছে..."
        : "টেলিগ্রাম বট টোকেন কানেক্ট ও টেস্ট করা হচ্ছে...",
    );
    try {
      const res = await fetch("/api/telegram/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tgBotToken,
          username: tgBotUsername,
          channel: tgChannelLink,
          forceSave: force,
        }),
      });
      const data = await res.json();
      setIsSavingTgBot(false);
      if (res.ok) {
        setTgBotStatusOk(true);
        setTgBotStatusMsg(data.message);
        notify(
          force
            ? "টেলিগ্রাম বট জোরপূর্বক সেভ হয়েছে! ⚠️"
            : "টেলিগ্রাম বট সফলভাবে কানেক্ট ও সেভ হয়েছে! ✅",
        );

        // Cache configuration inside Admin's browser for auto-restoring after server restarts
        localStorage.setItem(
          "arez_admin_tg_config",
          JSON.stringify({
            token: tgBotToken,
            username: tgBotUsername,
            channel: tgChannelLink,
          }),
        );

        // Also persist in the Firestore-based globalConfig state so it auto-restores for ALL sessions
        setGlobalConfig((prev) => ({
          ...prev,
          telegramBotToken: tgBotToken,
          telegramBotUsername: tgBotUsername,
          telegramChannelLink: tgChannelLink,
        }));

        setTgBotToken(""); // Clear token field for security
        setCanForceTgSave(false);
      } else {
        setTgBotStatusOk(false);
        setTgBotStatusMsg(data.error || "টোকেন কানেক্ট করতে ব্যর্থ হয়েছে।");
        if (data.canForce) {
          setCanForceTgSave(true);
        }
        notify("বট কানেকশন ব্যর্থ হয়েছে।");
      }
    } catch (err: any) {
      setIsSavingTgBot(false);
      setTgBotStatusOk(false);
      setTgBotStatusMsg("বট কানেকশন সার্ভার ত্রুটি: " + err.message);
      notify("সার্ভার এরর।");
    }
  };

  useEffect(() => {
    if (activeTab === "system") {
      fetchEmailCounters();
      fetchTelegramConfig();
      const interval = setInterval(fetchEmailCounters, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const handleToggleMaintenance = () => {
    setGlobalConfig((prev) => ({
      ...prev,
      maintenanceMode: !prev.maintenanceMode,
    }));
    notify(
      !globalConfig.maintenanceMode
        ? "Maintenance Mode LIVE."
        : "Maintenance Mode OFF.",
    );
  };

  const handleCdnRefresh = () => {
    notify("Initiating CDN Cache Clear...");
    setTimeout(() => notify("Global Node Refresh Complete."), 2000);
  };

  const handleAddSmtp = async () => {
    if (!smtpFormUser || !smtpFormPass) {
      notify("জিমেইল এড্রেস এবং অ্যাপ পাসওয়ার্ড অবশ্যই দিতে হবে!");
      return;
    }
    setIsAddingSmtp(true);
    try {
      const res = await fetch("/api/admin/add-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: smtpFormUser,
          pass: smtpFormPass,
          limit: smtpFormLimit,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        notify("SMTP সফলভাবে যোগ/আপডেট করা হয়েছে!");

        // Cache SMTP locally
        const cleanPass = smtpFormPass.trim().replace(/\s+/g, "");
        const cachedSmtpStr = localStorage.getItem("arez_admin_smtp_list");
        let cachedList = [];
        if (cachedSmtpStr) {
          try {
            cachedList = JSON.parse(cachedSmtpStr);
          } catch (e) {}
        }
        if (!Array.isArray(cachedList)) cachedList = [];

        const existingIdx = cachedList.findIndex(
          (item: any) => item.user.toLowerCase() === smtpFormUser.toLowerCase()
        );
        if (existingIdx > -1) {
          cachedList[existingIdx].pass = cleanPass;
          cachedList[existingIdx].limit = smtpFormLimit;
        } else {
          cachedList.push({
            user: smtpFormUser.trim(),
            pass: cleanPass,
            limit: smtpFormLimit,
          });
        }
        localStorage.setItem("arez_admin_smtp_list", JSON.stringify(cachedList));

        setSmtpFormUser("");
        setSmtpFormPass("");
        setSmtpFormLimit(500);
        fetchEmailCounters();
      } else {
        notify(data.error || "SMTP যোগ করতে ব্যর্থ হয়েছে।");
      }
    } catch (e) {
      console.error(e);
      notify("নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।");
    } finally {
      setIsAddingSmtp(false);
    }
  };

  const handleDeleteSmtp = async (userEmail: string) => {
    if (!window.confirm(`${userEmail} কনফিগারেশনটি মুছে ফেলতে চান?`)) return;
    try {
      const res = await fetch("/api/admin/delete-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        notify("SMTP সফলভাবে মুছে ফেলা হয়েছে!");

        // Remove SMTP from local cache
        const cachedSmtpStr = localStorage.getItem("arez_admin_smtp_list");
        if (cachedSmtpStr) {
          try {
            let cachedList = JSON.parse(cachedSmtpStr);
            if (Array.isArray(cachedList)) {
              cachedList = cachedList.filter(
                (item: any) => item.user.toLowerCase() !== userEmail.toLowerCase()
              );
              localStorage.setItem("arez_admin_smtp_list", JSON.stringify(cachedList));
            }
          } catch (e) {}
        }

        fetchEmailCounters();
      } else {
        notify(data.error || "SMTP মুছতে ব্যর্থ হয়েছে।");
      }
    } catch (e) {
      console.error(e);
      notify("নেটওয়ার্ক সমস্যা।");
    }
  };

  const handleTestSmtp = async (
    specificUser?: string,
    specificPass?: string,
  ) => {
    setIsTestingSmtp(true);
    setSmtpDiagnosticMsg(null);
    setSmtpDiagnosticOk(null);
    notify(
      specificUser
        ? `Testing SMTP for ${specificUser}...`
        : "Testing active Gmail SMTP credentials...",
    );
    try {
      const res = await fetch("/api/admin/test-smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: typeof specificUser === "string" ? specificUser : undefined,
          pass: typeof specificPass === "string" ? specificPass : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSmtpDiagnosticOk(true);
        setSmtpDiagnosticMsg(data.message);
        notify("SMTP Connection Successful!");
      } else {
        setSmtpDiagnosticOk(false);
        setSmtpDiagnosticMsg(
          data.error || "Failed to establish secure handshake.",
        );
        notify("SMTP connection failed.");
      }
    } catch (e: any) {
      setSmtpDiagnosticOk(false);
      setSmtpDiagnosticMsg(
        e.message || "Network error. Server connection lost.",
      );
      notify("Diagnostic test failed.");
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleCleanNonAdminUsers = () => {
    setCleanupUserTarget("all");
    setCleanupAppPassword("");
    setShowCleanupModal(true);
  };

  const handleVerifyAndExecuteCleanup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cleanupAppPassword.trim()) {
      notify("অ্যাডমিন অ্যাপ লগইন পাসওয়ার্ড প্রদান করুন।");
      return;
    }

    setIsVerifyingCleanupPassword(true);
    try {
      const res = await fetch("/api/admin/verify-app-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appPassword: cleanupAppPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || "পাসওয়ার্ড যাচাইকরণ ব্যর্থ হয়েছে।");
        return;
      }

      // Password verified! Now proceed with deletion.
      const adminEmail = "abdurrahman714915@gmail.com";

      if (cleanupUserTarget === "all") {
        // Clear all non-admins
        const filtered = users.filter(
          (u) => u.email.toLowerCase().trim() === adminEmail || u.role === "admin",
        );
        const removedCount = users.length - filtered.length;
        setUsers(filtered);
        localStorage.setItem("arez_users", JSON.stringify(filtered));

        // Filter task submissions
        const storedSubmissions = localStorage.getItem("arez_submissions");
        if (storedSubmissions) {
          try {
            const subs: any[] = JSON.parse(storedSubmissions);
            const filteredSubs = subs.filter((s) => filtered.some((u) => u.id === s.userId));
            localStorage.setItem("arez_submissions", JSON.stringify(filteredSubs));
            if (setTaskSubmissions) {
              setTaskSubmissions(filteredSubs);
            }
          } catch (err) {}
        }
        notify(`${removedCount}টি সাধারণ টেস্ট আইডি সফলভাবে মুছে ফেলা হয়েছে!`);
      } else if (cleanupUserTarget && typeof cleanupUserTarget === "object") {
        // Clear a specific user
        const targetUser = cleanupUserTarget;
        if (targetUser.email.toLowerCase().trim() === adminEmail || targetUser.role === "admin") {
          notify("অ্যাডমিন আইডি মুছে ফেলা সম্ভব নয়!");
          return;
        }

        const filtered = users.filter((u) => u.id !== targetUser.id);
        setUsers(filtered);
        localStorage.setItem("arez_users", JSON.stringify(filtered));

        // Filter task submissions
        const storedSubmissions = localStorage.getItem("arez_submissions");
        if (storedSubmissions) {
          try {
            const subs: any[] = JSON.parse(storedSubmissions);
            const filteredSubs = subs.filter((s) => s.userId !== targetUser.id);
            localStorage.setItem("arez_submissions", JSON.stringify(filteredSubs));
            if (setTaskSubmissions) {
              setTaskSubmissions(filteredSubs);
            }
          } catch (err) {}
        }
        notify(`ইউজার ${targetUser.name || targetUser.email} সফলভাবে মুছে ফেলা হয়েছে!`);
      }

      // Reset states
      setCleanupAppPassword("");
      setShowCleanupModal(false);
      setCleanupUserTarget(null);
    } catch (err: any) {
      console.error(err);
      notify("সার্ভার ত্রুটি বা নেটওয়ার্ক সমস্যা। আবার চেষ্টা করুন।");
    } finally {
      setIsVerifyingCleanupPassword(false);
    }
  };

  // MODULE: PAYOUTS HANDLERS
  const handleApproveWithdraw = (withdraw: WithdrawRequest) => {
    const updatedWithdraw: WithdrawRequest = {
      ...withdraw,
      status: "approved",
      approvedById: currentUser?.id,
      approvedByName: currentUser?.name
        ? `${currentUser.name} (${currentUser.uid})`
        : currentUser?.telegramUsername || "Admin",
      approvedStatus: "approved",
      approvedAt: new Date().toISOString(),
    };

    setWithdraws((prev) =>
      prev.map((w) => (w.id === withdraw.id ? updatedWithdraw : w)),
    );

    const newTx: Transaction = {
      id: "tx_wd_" + Date.now(),
      userId: withdraw.userId,
      type: "Withdraw",
      amount: withdraw.amount,
      date: new Date().toLocaleString(),
      description: `Withdrawal Approved (${withdraw.method})`,
      status: "completed",
    };

    setTransactions((prev) => [newTx, ...prev]);

    // Direct Firestore Save
    saveDocument("withdraws", updatedWithdraw.id, updatedWithdraw).catch((err) =>
      console.error("Error saving approved withdraw:", err),
    );
    saveDocument("transactions", newTx.id, newTx).catch((err) =>
      console.error("Error saving withdraw transaction:", err),
    );

    // Send withdrawal approved email notification
    const targetUser = (users || []).find((u) => u.id === withdraw.userId);
    if (targetUser && targetUser.email) {
      fetch("/api/email/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetUser.email,
          name: targetUser.name,
          type: "withdrawal_processed",
          amount: withdraw.amount,
          method: withdraw.method,
        }),
      }).catch((err) => console.error("Failed to send withdrawal approval email:", err));
    }

    notify("Payout processed successfully!");
  };

  const handleRejectWithdraw = (withdraw: WithdrawRequest) => {
    setRejectReasonInput("");
    setRejectModal({
      isOpen: true,
      title: "Reject Payout Request",
      description: `Are you sure you want to reject the payout of ৳${withdraw.amount} for ${withdraw.userName}?`,
      onConfirm: (note) => {
        const updatedWithdraw: WithdrawRequest = {
          ...withdraw,
          status: "rejected",
          approvedById: currentUser?.id,
          approvedByName: currentUser?.name
            ? `${currentUser.name} (${currentUser.uid})`
            : currentUser?.telegramUsername || "Admin",
          approvedStatus: "rejected",
          approvedAt: new Date().toISOString(),
          rejectionNote: note.trim() || undefined,
        };

        setWithdraws((prev) =>
          prev.map((w) => (w.id === withdraw.id ? updatedWithdraw : w)),
        );

        // Refund user balance
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id === withdraw.userId) {
              const updatedUser = { ...u, balance: u.balance + withdraw.amount };
              saveDocument("users", updatedUser.id, updatedUser).catch((err) =>
                console.error("Error saving refunded user:", err),
              );
              return updatedUser;
            }
            return u;
          }),
        );

        // Direct Firestore Save
        saveDocument("withdraws", updatedWithdraw.id, updatedWithdraw).catch((err) =>
          console.error("Error saving rejected withdraw:", err),
        );

        notify("Payout rejected & balance refunded.");
      }
    });
  };

  const handleBulkApprove = (selectedRequests: WithdrawRequest[]) => {
    if (selectedRequests.length === 0) return;
    
    const updatedRequests = selectedRequests.map((withdraw, idx) => {
      const updatedWithdraw: WithdrawRequest = {
        ...withdraw,
        status: "approved",
        approvedById: currentUser?.id,
        approvedByName: currentUser?.name
          ? `${currentUser.name} (${currentUser.uid})`
          : currentUser?.telegramUsername || "Admin",
        approvedStatus: "approved",
        approvedAt: new Date().toISOString(),
      };

      const newTx: Transaction = {
        id: "tx_wd_" + (Date.now() + idx) + "_" + Math.random().toString(36).substring(2, 7),
        userId: withdraw.userId,
        type: "Withdraw",
        amount: withdraw.amount,
        date: new Date().toLocaleString(),
        description: `Withdrawal Approved (${withdraw.method})`,
        status: "completed",
      };

      // Direct Firestore Save
      saveDocument("withdraws", updatedWithdraw.id, updatedWithdraw).catch((err) =>
        console.error("Error saving approved withdraw:", err),
      );
      saveDocument("transactions", newTx.id, newTx).catch((err) =>
        console.error("Error saving withdraw transaction:", err),
      );

      // Send withdrawal approved email notification
      const targetUser = (users || []).find((u) => u.id === withdraw.userId);
      if (targetUser && targetUser.email) {
        fetch("/api/email/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: targetUser.email,
            name: targetUser.name,
            type: "withdrawal_processed",
            amount: withdraw.amount,
            method: withdraw.method,
          }),
        }).catch((err) => console.error("Failed to send withdrawal approval email:", err));
      }

      return { updatedWithdraw, newTx };
    });

    setWithdraws((prev) =>
      prev.map((w) => {
        const found = updatedRequests.find((ur) => ur.updatedWithdraw.id === w.id);
        return found ? found.updatedWithdraw : w;
      }),
    );

    setTransactions((prev) => [
      ...updatedRequests.map((ur) => ur.newTx),
      ...prev,
    ]);

    setSelectedRequestIds([]);
    notify(`Bulk approved ${selectedRequests.length} payout requests successfully!`);
  };

  const handleBulkReject = (selectedRequests: WithdrawRequest[]) => {
    if (selectedRequests.length === 0) return;
    setRejectReasonInput("");
    setRejectModal({
      isOpen: true,
      title: "Bulk Reject Payout Requests",
      description: `Are you sure you want to reject ${selectedRequests.length} payout requests?`,
      onConfirm: (note) => {
        const updatedRequests = selectedRequests.map((withdraw) => {
          const updatedWithdraw: WithdrawRequest = {
            ...withdraw,
            status: "rejected",
            approvedById: currentUser?.id,
            approvedByName: currentUser?.name
              ? `${currentUser.name} (${currentUser.uid})`
              : currentUser?.telegramUsername || "Admin",
            approvedStatus: "rejected",
            approvedAt: new Date().toISOString(),
            rejectionNote: note.trim() || undefined,
          };
          
          // Direct Firestore Save
          saveDocument("withdraws", updatedWithdraw.id, updatedWithdraw).catch((err) =>
            console.error("Error saving rejected withdraw:", err),
          );

          return updatedWithdraw;
        });

        // Bulk refund user balances
        const refundsByUser: { [userId: string]: number } = {};
        selectedRequests.forEach((req) => {
          refundsByUser[req.userId] = (refundsByUser[req.userId] || 0) + req.amount;
        });

        setUsers((prev) =>
          prev.map((u) => {
            if (refundsByUser[u.id]) {
              const updatedUser = { ...u, balance: u.balance + refundsByUser[u.id] };
              saveDocument("users", updatedUser.id, updatedUser).catch((err) =>
                console.error("Error saving refunded user:", err),
              );
              return updatedUser;
            }
            return u;
          }),
        );

        setWithdraws((prev) =>
          prev.map((w) => {
            const updated = updatedRequests.find((ur) => ur.id === w.id);
            return updated ? updated : w;
          }),
        );

        setSelectedRequestIds([]);
        notify(`Bulk rejected ${selectedRequests.length} payout requests & refunded balances.`);
      }
    });
  };

  // MODULE: PENDING PROOFS HANDLERS
  const handleApproveMembership = (req: MembershipRequest) => {
    const updatedReq: MembershipRequest = {
      ...req,
      status: "approved",
      approvedById: currentUser?.id,
      approvedByName: currentUser?.name
        ? `${currentUser.name} (${currentUser.uid})`
        : currentUser?.telegramUsername || "Admin",
      approvedStatus: "approved",
      approvedAt: new Date().toISOString(),
    };

    setMembershipRequests((prev) =>
      (prev || []).map((r) => (r.id === req.id ? updatedReq : r)),
    );

    saveDocument("membershipRequests", updatedReq.id, updatedReq).catch((err) =>
      console.error("Error saving approved membership request:", err),
    );

    setUsers((allUsers) => {
      const nextUsers = [...allUsers];
      const targetUserIdx = nextUsers.findIndex((u) => u.id === req.userId);

      if (targetUserIdx !== -1) {
        const targetUser = {
          ...nextUsers[targetUserIdx],
          status: "Verified" as const,
        };
        nextUsers[targetUserIdx] = targetUser;

        // Direct save of target user status
        saveDocument("users", targetUser.id, targetUser).catch((err) =>
          console.error("Error saving verified user:", err),
        );

        // Send account status verification email notification
        if (targetUser.email) {
          fetch("/api/email/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: targetUser.email,
              name: targetUser.name,
              type: "account_verified",
            }),
          }).catch((err) => console.error("Failed to send verification email:", err));
        }

        // Referral Bonus Logic
        if (targetUser.referredBy) {
          const inviterIdx = nextUsers.findIndex(
            (inv) =>
              inv.referralCode &&
              inv.referralCode.toUpperCase() ===
                targetUser.referredBy?.toUpperCase(),
          );
          if (inviterIdx !== -1) {
            const plan = plans.find((p) => p.name === req.planName) || plans[0];
            const bonusAmount = plan.referralBonus;

            const updatedInviter = {
              ...nextUsers[inviterIdx],
              balance: nextUsers[inviterIdx].balance + bonusAmount,
            };
            nextUsers[inviterIdx] = updatedInviter;

            // Direct save of inviter balance
            saveDocument("users", updatedInviter.id, updatedInviter).catch((err) =>
              console.error("Error saving inviter balance:", err),
            );

            const newTx: Transaction = {
              id: "tx_ref_" + Date.now(),
              userId: updatedInviter.id,
              type: "Referral",
              amount: bonusAmount,
              date: new Date().toLocaleString(),
              description: `Referral Bonus: Friend (${targetUser.name}) Upgraded`,
              status: "completed",
            };

            setTimeout(() => {
              setTransactions((tPrev) => [newTx, ...tPrev]);
            }, 0);

            saveDocument("transactions", newTx.id, newTx).catch((err) =>
              console.error("Error saving referral transaction:", err),
            );
          }
        }
      }
      return nextUsers;
    });
    notify("Membership verified!");
  };

  const handleRejectMembership = (reqId: string) => {
    setRejectReasonInput("");
    setRejectModal({
      isOpen: true,
      title: "Reject Membership Request",
      description: "Are you sure you want to reject this membership/upgrade request?",
      onConfirm: (note) => {
        setMembershipRequests((prev) =>
          (prev || []).map((r) => {
            if (r.id === reqId) {
              const updatedReq: MembershipRequest = {
                ...r,
                status: "rejected",
                approvedById: currentUser?.id,
                approvedByName: currentUser?.name
                  ? `${currentUser.name} (${currentUser.uid})`
                  : currentUser?.telegramUsername || "Admin",
                approvedStatus: "rejected",
                approvedAt: new Date().toISOString(),
                rejectionNote: note.trim() || undefined,
              };
              saveDocument("membershipRequests", updatedReq.id, updatedReq).catch((err) =>
                console.error("Error saving rejected membership request:", err),
              );
              return updatedReq;
            }
            return r;
          }),
        );
        notify("Membership request rejected.");
      }
    });
  };

  const handleApproveDeposit = (req: DepositRequest) => {
    const updatedReq: DepositRequest = {
      ...req,
      status: "approved",
      approvedById: currentUser?.id,
      approvedByName: currentUser?.name
        ? `${currentUser.name} (${currentUser.uid})`
        : currentUser?.telegramUsername || "Admin",
      approvedStatus: "approved",
      approvedAt: new Date().toISOString(),
    };

    setDepositRequests((prev) =>
      (prev || []).map((r) => (r.id === req.id ? updatedReq : r)),
    );

    saveDocument("depositRequests", updatedReq.id, updatedReq).catch((err) =>
      console.error("Error saving approved deposit request:", err),
    );

    setUsers((allUsers) => {
      const nextUsers = [...allUsers];
      const targetUserIdx = nextUsers.findIndex((u) => u.id === req.userId);
      if (targetUserIdx !== -1) {
        const updatedUser = {
          ...nextUsers[targetUserIdx],
          balance: nextUsers[targetUserIdx].balance + req.amount,
        };
        nextUsers[targetUserIdx] = updatedUser;
        saveDocument("users", updatedUser.id, updatedUser).catch((err) =>
          console.error("Error saving approved deposit user balance:", err),
        );
      }
      return nextUsers;
    });

    const newTx: Transaction = {
      id: "tx_dep_" + Date.now(),
      userId: req.userId,
      type: "Deposit",
      amount: req.amount,
      date: new Date().toLocaleString(),
      description: `Deposit Approved (${req.method})`,
      status: "completed",
    };

    setTransactions((prev) => [newTx, ...prev]);

    saveDocument("transactions", newTx.id, newTx).catch((err) =>
      console.error("Error saving deposit transaction:", err),
    );

    notify(`৳${req.amount} ব্যালেন্স যুক্ত করা হয়েছে!`);
  };

  const handleRejectDeposit = (reqId: string) => {
    setRejectReasonInput("");
    setRejectModal({
      isOpen: true,
      title: "Reject Deposit Request",
      description: "Are you sure you want to reject this deposit request?",
      onConfirm: (note) => {
        setDepositRequests((prev) =>
          (prev || []).map((r) => {
            if (r.id === reqId) {
              const updatedReq: DepositRequest = {
                ...r,
                status: "rejected",
                approvedById: currentUser?.id,
                approvedByName: currentUser?.name
                  ? `${currentUser.name} (${currentUser.uid})`
                  : currentUser?.telegramUsername || "Admin",
                approvedStatus: "rejected",
                approvedAt: new Date().toISOString(),
                rejectionNote: note.trim() || undefined,
              };
              saveDocument("depositRequests", updatedReq.id, updatedReq).catch((err) =>
                console.error("Error saving rejected deposit request:", err),
              );
              return updatedReq;
            }
            return r;
          }),
        );
        notify("ডিপোজিট আবেদন বাতিল করা হয়েছে।");
      }
    });
  };

  const handleApproveTaskProof = (sub: TaskSubmission) => {
    const updatedSub: TaskSubmission = {
      ...sub,
      status: "approved",
      approvedById: currentUser?.id,
      approvedByName: currentUser?.name
        ? `${currentUser.name} (${currentUser.uid})`
        : currentUser?.telegramUsername || "Admin",
      approvedStatus: "approved",
      approvedAt: new Date().toISOString(),
    };

    setTaskSubmissions((prev) =>
      (prev || []).map((s) => (s.id === sub.id ? updatedSub : s)),
    );

    saveDocument("submissions", updatedSub.id, updatedSub).catch((err) =>
      console.error("Error saving approved task proof:", err),
    );

    setUsers((prevUsers) =>
      prevUsers.map((u) => {
        if (u.id === sub.userId) {
          const updatedUser = {
            ...u,
            balance: u.balance + sub.reward,
            todayIncome: u.todayIncome + sub.reward,
          };
          saveDocument("users", updatedUser.id, updatedUser).catch((err) =>
            console.error("Error saving approved task user balance:", err),
          );
          return updatedUser;
        }
        return u;
      }),
    );

    const newTx: Transaction = {
      id: "tx_task_" + Date.now(),
      userId: sub.userId,
      type: "Task",
      amount: sub.reward,
      date: new Date().toLocaleString(),
      description: `Task Reward: ${sub.taskTitle}`,
      status: "completed",
    };

    setTransactions((prev) => [newTx, ...prev]);

    saveDocument("transactions", newTx.id, newTx).catch((err) =>
      console.error("Error saving task approval transaction:", err),
    );

    setViewingProof(null);
    notify("Reward sent to user!");
  };

  const handleRejectTaskProof = (sub: TaskSubmission) => {
    setRejectReasonInput("");
    setRejectModal({
      isOpen: true,
      title: "Reject Task Proof",
      description: `Are you sure you want to reject the task proof for "${sub.taskTitle}"?`,
      onConfirm: (note) => {
        const updatedSub: TaskSubmission = {
          ...sub,
          status: "rejected",
          approvedById: currentUser?.id,
          approvedByName: currentUser?.name
            ? `${currentUser.name} (${currentUser.uid})`
            : currentUser?.telegramUsername || "Admin",
          approvedStatus: "rejected",
          approvedAt: new Date().toISOString(),
          rejectionNote: note.trim() || undefined,
        };

        setTaskSubmissions((prev) =>
          (prev || []).map((s) => (s.id === sub.id ? updatedSub : s)),
        );

        saveDocument("submissions", updatedSub.id, updatedSub).catch((err) =>
          console.error("Error saving rejected task proof:", err),
        );

        setViewingProof(null);
        notify("Task proof rejected.");
      }
    });
  };

  // MODULE: SETTINGS & GATEWAYS
  const handleSaveGateway = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMethod) return;
    setPaymentMethods((prev) => {
      const exists = prev.find((p) => p.id === editingMethod.id);
      return exists
        ? prev.map((p) =>
            p.id === editingMethod.id ? { ...editingMethod } : p,
          )
        : [...prev, { ...editingMethod }];
    });
    setEditingMethod(null);
    notify("Gateway logic updated.");
  };

  const handleSaveTier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTier) return;
    setWithdrawOptions((prev) => {
      const exists = prev.find((o) => o.id === editingTier.id);
      return exists
        ? prev.map((o) => (o.id === editingTier.id ? { ...editingTier } : o))
        : [...prev, { ...editingTier }];
    });
    setEditingTier(null);
    notify("Withdraw Tiger updated.");
  };

  // MODULE: TASK CONTROL
  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    setTasks((prev) => {
      const exists = prev.find((t) => t.id === editingTask.id);
      return exists
        ? prev.map((t) => (t.id === editingTask.id ? { ...editingTask } : t))
        : [{ ...editingTask }, ...prev];
    });
    setEditingTask(null);
    notify("Task configuration saved.");
  };

  // MODULE: USER DIRECTORY
  const handleUpdateUserBalance = () => {
    if (!selectedUserForManage) return;
    if (balanceUpdatePassword !== "ARB60624971") {
      return notify("ভুল পাসওয়ার্ড! ব্যালেন্স পরিবর্তন করা সম্ভব নয়।");
    }
    const newBalance = parseFloat(editingBalanceValue);
    if (isNaN(newBalance)) return notify("Invalid numeric balance.");
    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedUserForManage.id ? { ...u, balance: newBalance } : u,
      ),
    );
    setTransactions((prev) => [
      {
        id: "tx_adj_" + Date.now(),
        userId: selectedUserForManage.id,
        type: "Adjustment",
        amount: Math.abs(newBalance - selectedUserForManage.balance),
        date: new Date().toLocaleString(),
        description: `Manual balance adjustment by admin`,
        status: "completed",
      },
      ...prev,
    ]);
    setSelectedUserForManage(null);
    notify("User balance synchronized.");
  };

  const toggleUserSuspension = () => {
    if (!selectedUserForManage) return;

    // Feature Check: Cannot block Admin accounts
    if (selectedUserForManage.role === "admin") {
      notify("Security: Admin accounts cannot be suspended.");
      return;
    }

    const nextState = !selectedUserForManage.isSuspended;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedUserForManage.id
          ? { ...u, isSuspended: nextState }
          : u,
      ),
    );

    // Send account suspension status changed email notification
    if (selectedUserForManage.email) {
      fetch("/api/email/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: selectedUserForManage.email,
          name: selectedUserForManage.name,
          type: nextState ? "account_suspended" : "account_unsuspended",
        }),
      }).catch((err) => console.error("Failed to send suspension email:", err));
    }

    setSelectedUserForManage(null);
    notify(nextState ? "User access revoked." : "User access restored.");
  };

  const handleToggleMonitor = () => {
    if (!selectedUserForManage) return;

    if (selectedUserForManage.role === "admin") {
      notify("Security: Admin cannot be demoted to monitor.");
      return;
    }

    const nextIsMonitor = !selectedUserForManage.isMonitor;
    setPendingMonitorAction({
      type: nextIsMonitor ? "add" : "remove",
      targetUser: selectedUserForManage,
    });
    setPasswordVerificationOpen(true);
    setVerificationPassword("");
    setPasswordError("");
  };

  const handleVerifyAndExecuteMonitorAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingMonitorAction) return;

    const trimmedPassword = verificationPassword.trim();
    if (trimmedPassword === "AR@606249monitor") {
      const { type, targetUser } = pendingMonitorAction;
      const nextIsMonitor = type === "add";

      const defaultPermissions: MonitorPermissions = {
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

      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id
            ? {
                ...u,
                isMonitor: nextIsMonitor,
                monitorPermissions: nextIsMonitor
                  ? defaultPermissions
                  : undefined,
              }
            : u,
        ),
      );

      // Update in selected user state as well if they are currently opened
      if (selectedUserForManage && selectedUserForManage.id === targetUser.id) {
        setSelectedUserForManage((prev) =>
          prev
            ? {
                ...prev,
                isMonitor: nextIsMonitor,
                monitorPermissions: nextIsMonitor
                  ? defaultPermissions
                  : undefined,
              }
            : null,
        );
      }

      notify(
        nextIsMonitor
          ? `${targetUser.name}-কে সিস্টেমে মনিটর হিসেবে নিযুক্ত করা হয়েছে!`
          : `${targetUser.name}-কে মনিটর তালিকা থেকে সফলভাবে অপসারণ করা হয়েছে।`,
      );

      // Cleanup
      setPasswordVerificationOpen(false);
      setVerificationPassword("");
      setPendingMonitorAction(null);
      setPasswordError("");
      // Also reset UID search query on success to keep things clean
      if (nextIsMonitor) {
        setAddMonitorUidQuery("");
      }
    } else {
      setPasswordError(
        "ভুল পাসওয়ার্ড! অনুগ্রহ করে সঠিক অ্যাপ পাসওয়ার্ড দিন। (Incorrect App Password)",
      );
      notify("পাসওয়ার্ড মিলেনি! অপশন রিজেক্ট করা হয়েছে।");
    }
  };

  const handleTogglePermission = (field: keyof MonitorPermissions) => {
    if (!selectedUserForManage) return;

    const currentPerms = selectedUserForManage.monitorPermissions || {
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

    const nextPermissions: MonitorPermissions = {
      ...currentPerms,
      [field]: !currentPerms[field],
    };

    setSelectedUserForManage((prev) =>
      prev
        ? {
            ...prev,
            monitorPermissions: nextPermissions,
          }
        : null,
    );

    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedUserForManage.id
          ? {
              ...u,
              monitorPermissions: nextPermissions,
            }
          : u,
      ),
    );
  };

  // MODULE: SECURITY SHIELD
  const runFraudScan = () => {
    notify("Shield: Scanning IP & Transaction patterns...");
    setTimeout(() => {
      setUsers((prev) =>
        prev.map((u) => {
          const flags = [];
          const ipCount = prev.filter((x) => x.ip === u.ip).length;
          if (ipCount > 1 && u.role !== "admin")
            flags.push("Multi-Account Protocol Violation");
          return { ...u, fraudFlags: flags };
        }),
      );
      notify("Scan complete. Flags updated.");
    }, 1500);
  };

  // MODULE: PUSH CENTER
  const handleBroadcastNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle || !notifMessage) return notify("Please fill all fields.");
    setIsBlasting(true);
    setTimeout(() => {
      const newNotif: AppNotification = {
        id: "bc_" + Date.now(),
        title: notifTitle,
        message: notifMessage,
        type: notifType,
        date: new Date().toLocaleTimeString(),
        isRead: false,
      };
      setAppNotifications((prev) => [newNotif, ...prev.slice(0, 19)]);
      setIsBlasting(false);
      setNotifTitle("");
      setNotifMessage("");
      notify("Broadcast pushed to all active users.");
    }, 1200);
  };

  // MODULE: SOCIAL POPUP
  const handleSaveSocial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSocial) return;
    setSocialLinks((prev) => {
      const exists = prev.find((s) => s.id === editingSocial.id);
      return exists
        ? prev.map((s) =>
            s.id === editingSocial.id ? { ...editingSocial } : s,
          )
        : [...prev, { ...editingSocial }];
    });
    setEditingSocial(null);
    notify("Social hub synchronized.");
  };

  // MODULE: STORE CONTROL (Sell feature)
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return notify("Please enter a category name.");

    if (
      sellCategories.some(
        (cat) =>
          cat.name.toLowerCase() === newCategoryName.trim().toLowerCase(),
      )
    ) {
      return notify("ক্যাটাগরি আগে থেকেই আছে!");
    }
    const newCat = {
      id: "cat_" + Date.now(),
      name: newCategoryName.trim(),
    };
    setSellCategories((prev) => [...prev, newCat]);
    setNewCategoryName("");
    notify(`নতুন ক্যাটাগরি "${newCat.name}" যুক্ত হয়েছে!`);
  };

  const handleDeleteCategory = (catId: string) => {
    setSellCategories((prev) => prev.filter((c) => c.id !== catId));
    notify("ক্যাটাগরি মুছে ফেলা হয়েছে।");
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newItemTitle ||
      !newItemCategory ||
      !newItemPrice ||
      !newItemDesc ||
      !newItemDetails
    ) {
      return notify("দয়া করে সবগুলো ঘর পূরণ করুন।");
    }
    const priceNum = parseFloat(newItemPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      return notify("সঠিক মূল্য দিন।");
    }
    const limitNum = newItemLimit ? parseInt(newItemLimit, 10) : undefined;
    if (newItemLimit && (isNaN(limitNum || 0) || (limitNum || 0) < 0)) {
      return notify("সঠিক লিমিট বা শূন্য সংখ্যা প্রদান করুন।");
    }

    const newItem: SellItem = {
      id: "item_" + Date.now(),
      title: newItemTitle,
      category: newItemCategory,
      price: priceNum,
      description: newItemDesc,
      details: newItemDetails,
      status: "available",
      createdAt: new Date().toLocaleDateString(),
      purchaseLimit: limitNum,
      purchasedCount: 0,
      enableSD: newItemEnableSD,
    };
    setSellItems((prev) => [newItem, ...prev]);
    setNewItemTitle("");
    setNewItemPrice("");
    setNewItemDesc("");
    setNewItemDetails("");
    setNewItemLimit("");
    setNewItemEnableSD(false);
    notify("আইটেমটি বিক্রির জন্য সফলভাবে যুক্ত করা হয়েছে!");
  };

  const handleDeleteItem = (itemId: string) => {
    setSellItems((prev) => prev.filter((i) => i.id !== itemId));
    notify("আইটেমটি দোকান থেকে সরিয়ে ফেলা হয়েছে।");
  };

  const handleCompleteStoreOrder = (orderId: string) => {
    setStoreOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: "completed" as const } : o,
      ),
    );
    notify("অর্ডারটি সফলভাবে সম্পন্ন করা হয়েছে এবং ক্রেতাকে শো করানো হয়েছে!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24 px-2">
      {/* HQ NAVIGATION BAR */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
        {isMonitor ? (
          <AdminTab
            active={activeTab === "performance"}
            onClick={() => setActiveTab("performance")}
            label="MY PERFORMANCE"
            icon={<ICONS.Trend size={14} />}
          />
        ) : (
          <AdminTab
            active={activeTab === "performance"}
            onClick={() => setActiveTab("performance")}
            label="PERFORMANCE"
            icon={<ICONS.Trend size={14} />}
          />
        )}
        {!isMonitor && (
          <AdminTab
            active={activeTab === "settings"}
            onClick={() => setActiveTab("settings")}
            label="HQ SETTINGS"
            icon={<ICONS.Settings size={14} />}
          />
        )}
        {!isMonitor && (
          <AdminTab
            active={activeTab === "system"}
            onClick={() => setActiveTab("system")}
            label="SYSTEM SETUP"
            icon={<ICONS.Shield size={14} />}
          />
        )}
        {!isMonitor && (
          <AdminTab
            active={activeTab === "audit_logs"}
            onClick={() => setActiveTab("audit_logs")}
            label="SYSTEM AUDIT"
            icon={<Terminal size={14} />}
          />
        )}
        {!isMonitor && (
          <AdminTab
            active={activeTab === "ai_health"}
            onClick={() => setActiveTab("ai_health")}
            label="AI HEALTH CENTER"
            icon={<Activity className="text-emerald-500 animate-pulse" size={14} />}
            badge={aiMetrics.healthScore < 100 ? "AI" : undefined}
          />
        )}

        {(!isMonitor ||
          permissions.canApproveMembership ||
          permissions.canApproveDeposits ||
          permissions.canApproveTaskSubmissions) && (
          <AdminTab
            active={activeTab === "approvals"}
            onClick={() => setActiveTab("approvals")}
            label="PENDING PROOFS"
            icon={<ICONS.Shield size={14} />}
            badge={
              stats.pendingMembers + stats.pendingTasks + stats.pendingDeposits
            }
          />
        )}

        {(!isMonitor || permissions.canProcessPayouts) && (
          <AdminTab
            active={activeTab === "payouts"}
            onClick={() => setActiveTab("payouts")}
            label="PAYOUTS"
            icon={<ICONS.Withdraw size={14} />}
            badge={stats.pendingWithdraws}
          />
        )}

        {(!isMonitor || permissions.canManageCampaigns) && (
          <AdminTab
            active={activeTab === "tasks"}
            onClick={() => setActiveTab("tasks")}
            label="TASK CONTROL"
            icon={<ICONS.Zap size={14} />}
          />
        )}

        {(!isMonitor || permissions.canModifyUsers) && (
          <AdminTab
            active={activeTab === "users"}
            onClick={() => setActiveTab("users")}
            label="USER DIRECTORY"
            icon={<ICONS.Users size={14} />}
          />
        )}

        {!isMonitor && (
          <AdminTab
            active={activeTab === "monitors"}
            onClick={() => setActiveTab("monitors")}
            label="MONITOR DIRECTORY"
            icon={<ICONS.Shield size={14} />}
          />
        )}

        {(!isMonitor || permissions.canManagePush) && (
          <AdminTab
            active={activeTab === "notifications"}
            onClick={() => setActiveTab("notifications")}
            label="PUSH CENTER"
            icon={<ICONS.Bell size={14} />}
          />
        )}
        {(!isMonitor || permissions.canManageSocials) && (
          <AdminTab
            active={activeTab === "social"}
            onClick={() => setActiveTab("social")}
            label="SOCIAL POPUP"
            icon={<ICONS.Link size={14} />}
          />
        )}
        {!isMonitor && (
          <AdminTab
            active={activeTab === "security"}
            onClick={() => setActiveTab("security")}
            label="SECURITY SHIELD"
            icon={<ICONS.Shield size={14} />}
            badge={stats.flaggedUsers}
          />
        )}
        {(!isMonitor || permissions.canManageStore) && (
          <AdminTab
            active={activeTab === "store"}
            onClick={() => setActiveTab("store")}
            label="STORE CONTROL"
            icon={<ICONS.Buy size={14} />}
          />
        )}
        {(!isMonitor || permissions.canModifyUsers) && (
          <AdminTab
            active={activeTab === "telegram"}
            onClick={() => setActiveTab("telegram")}
            label="TG VERIFICATION"
            icon={<ICONS.Telegram size={14} />}
            badge={
              telegramRequests.filter((req) => req.status === "pending").length
            }
          />
        )}
        {!isMonitor && (
          <AdminTab
            active={activeTab === "ads"}
            onClick={() => setActiveTab("ads")}
            label="AD MANAGER"
            icon={<ICONS.Youtube size={14} />}
          />
        )}
        {!isMonitor && (
          <AdminTab
            active={activeTab === "targets"}
            onClick={() => setActiveTab("targets")}
            label="REFERRAL TARGETS"
            icon={<ICONS.Referral size={14} />}
          />
        )}
      </div>

      {/* AD MANAGER TAB CONTENT */}
      {activeTab === "ads" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
              <div>
                <h3 className="text-xl font-black italic uppercase dark:text-white leading-none tracking-tighter mb-2">
                  AD MANAGER (বিজ্ঞাপন কন্ট্রোল সেন্টার)
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                  ব্যবহারকারীদের জন্য স্বয়ংক্রিয় বিজ্ঞাপন প্রদর্শন ও পুনরাবৃত্তি লুপ সেটিংস
                </p>
              </div>

              {/* Toggle Enable Ad Manager */}
              <button
                onClick={() => {
                  setGlobalConfig((prev) => {
                    const updated = {
                      ...prev,
                      enableAdManager: !prev.enableAdManager,
                    };
                    notify(
                      !prev.enableAdManager
                        ? "স্বয়ংক্রিয় বিজ্ঞাপন প্রদর্শন চালু করা হয়েছে (Ad Manager ENABLED)."
                        : "স্বয়ংক্রিয় বিজ্ঞাপন প্রদর্শন বন্ধ করা হয়েছে (Ad Manager DISABLED)."
                    );
                    return updated;
                  });
                }}
                className={`w-36 h-12 rounded-2xl relative transition-all duration-300 font-black text-[9px] tracking-widest uppercase flex items-center justify-between px-4 ${globalConfig.enableAdManager ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}
              >
                <span>{globalConfig.enableAdManager ? "ACTIVE" : "INACTIVE"}</span>
                <div className={`w-6 h-6 rounded-lg bg-white shadow-md transition-all duration-300 ${globalConfig.enableAdManager ? "translate-x-0" : "translate-x-0"}`}></div>
              </button>
            </div>

            {/* Inputs & Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Ad Display Interval */}
              <div className="space-y-3 bg-slate-50 dark:bg-white/5 p-6 rounded-2xl border border-slate-100 dark:border-white/5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  AD DISPLAY INTERVAL (বিজ্ঞাপনের সময়সীমা)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    value={globalConfig.adIntervalMinutes || 5}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 1;
                      setGlobalConfig((prev) => ({ ...prev, adIntervalMinutes: val }));
                    }}
                    className="w-24 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-center text-sm dark:text-white focus:ring-2 focus:ring-[#10b981] outline-none"
                  />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Minutes (মিনিট পর পর ad দেখাবে)
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                  ইউজারদের কত মিনিট পর পর স্বয়ংক্রিয়ভাবে একটি বিজ্ঞাপন দেখানো হবে তা এখান থেকে সেট করুন।
                </p>
              </div>

              {/* Ad Login Delay Seconds */}
              <div className="space-y-3 bg-slate-50 dark:bg-white/5 p-6 rounded-2xl border border-slate-100 dark:border-white/5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  LOGIN DELAY TIMER (লগইন পর প্রথম বিজ্ঞাপন বিলম্ব)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    value={globalConfig.adLoginDelaySeconds !== undefined ? globalConfig.adLoginDelaySeconds : 30}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      setGlobalConfig((prev) => ({ ...prev, adLoginDelaySeconds: val }));
                    }}
                    className="w-24 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-center text-sm dark:text-white focus:ring-2 focus:ring-[#10b981] outline-none"
                  />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Seconds (সেকেন্ড পর ad দেখাবে)
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                  ইউজার লগইন করার কত সেকেন্ড পর প্রথম ফুল স্ক্রিন বিজ্ঞাপনটি অটোমেটিক লোড হবে।
                </p>
              </div>

              {/* Ad Skip Seconds */}
              <div className="space-y-3 bg-slate-50 dark:bg-white/5 p-6 rounded-2xl border border-slate-100 dark:border-white/5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  SKIP OPTION TIMER (বিজ্ঞাপন স্কিপ অপশন সময়)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    value={globalConfig.adSkipSeconds || 15}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      setGlobalConfig((prev) => ({ ...prev, adSkipSeconds: val }));
                    }}
                    className="w-24 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-center text-sm dark:text-white focus:ring-2 focus:ring-[#10b981] outline-none"
                  />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Seconds (সেকেন্ড পর স্কিপ শো করবে)
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                  কত সেকেন্ড চলার পর ব্যবহারকারীরা বিজ্ঞাপনটি এড়িয়ে যেতে (Skip করতে) পারবে।
                </p>
              </div>
            </div>

            {/* AD CREATOR/EDITOR FORM */}
            <div className="bg-slate-50 dark:bg-white/5 p-6 md:p-8 rounded-[2rem] border border-slate-100 dark:border-white/5 space-y-6">
              <div className="border-b border-slate-200 dark:border-white/5 pb-4">
                <h4 className="text-sm font-black dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <PlusCircle size={16} className="text-[#10b981]" />
                  {editingAdId ? "EDIT EXISTING SPONSOR AD (বিজ্ঞাপন পরিবর্তন করুন)" : "ADD NEW SPONSOR AD (নতুন বিজ্ঞাপন যোগ করুন)"}
                </h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                  সরাসরি ইমেজ, ভিডিও প্লেয়ার অথবা যেকোনো লিংক সমৃদ্ধ ফুল স্ক্রিন বিজ্ঞাপন তৈরি করুন।
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Ad Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Ad Campaign Name (বিজ্ঞাপনের নাম)
                  </label>
                  <input
                    type="text"
                    value={adFormName}
                    onChange={(e) => setAdFormName(e.target.value)}
                    placeholder="যেমন: Bkash Double Points Campaign"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl font-medium text-xs dark:text-white focus:ring-2 focus:ring-[#10b981] outline-none"
                  />
                </div>

                {/* Ad Type */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Ad Media Type (বিজ্ঞাপনের ধরন)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Video", "Image", "Web Link"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAdFormType(t)}
                        className={`py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all border ${adFormType === t ? "bg-emerald-500 text-white border-emerald-500 shadow-md" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ad URL */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Ad Media URL / Youtube / Web Link (বিজ্ঞাপন বা ভিডিওর মূল লিংক)
                  </label>
                  <input
                    type="url"
                    value={adFormUrl}
                    onChange={(e) => setAdFormUrl(e.target.value)}
                    placeholder="https://example.com/ad-image.jpg বা https://youtube.com/embed/..."
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl font-mono text-xs dark:text-white focus:ring-2 focus:ring-[#10b981] outline-none"
                  />
                </div>

                {/* Thumbnail */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Ad Thumbnail Image URL (ঐচ্ছিক থাম্বনেইল ছবি লিংক)
                  </label>
                  <input
                    type="url"
                    value={adFormThumbnail}
                    onChange={(e) => setAdFormThumbnail(e.target.value)}
                    placeholder="https://example.com/thumbnail.png (Optional)"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl font-mono text-xs dark:text-white focus:ring-2 focus:ring-[#10b981] outline-none"
                  />
                </div>

                {/* Order Number */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Rotation Order Number (ধারাবাহিক ক্রম নম্বর - Rotation Sequence)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={adFormOrderNumber}
                    onChange={(e) => setAdFormOrderNumber(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs dark:text-white focus:ring-2 focus:ring-[#10b981] outline-none"
                  />
                </div>

                {/* Views Limit System */}
                <div className="space-y-3 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Views Limit System (বিজ্ঞাপন দেখার সীমা নির্ধারণ)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdFormLimitType("unlimited")}
                      className={`py-2 px-3 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all ${
                        adFormLimitType === "unlimited"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-black"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-100 hover:dark:bg-slate-800"
                      }`}
                    >
                      Unlimited Views (সীমাহীন)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdFormLimitType("custom")}
                      className={`py-2 px-3 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all ${
                        adFormLimitType === "custom"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-black"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-100 hover:dark:bg-slate-800"
                      }`}
                    >
                      Custom Limit (নির্দিষ্ট সীমা)
                    </button>
                  </div>

                  {adFormLimitType === "custom" && (
                    <div className="space-y-1.5 pt-1 animate-in slide-in-from-top-2 duration-200">
                      <label className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                        Enter Maximum Views Limit (সর্বোচ্চ কতবার দেখাবে)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={adFormViewLimit}
                        onChange={(e) => setAdFormViewLimit(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs dark:text-white focus:ring-2 focus:ring-[#10b981] outline-none"
                        placeholder="যেমন: 500"
                      />
                    </div>
                  )}
                </div>

                {/* Active Toggle & Button Bar */}
                <div className="flex items-center justify-between pt-6">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={adFormIsActive}
                      onChange={(e) => setAdFormIsActive(e.target.checked)}
                      className="w-5 h-5 accent-emerald-500 rounded border-slate-300 focus:ring-emerald-400"
                    />
                    <span className="text-xs font-black dark:text-white uppercase tracking-wider">
                      Set Active Immediately
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    {editingAdId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAdId(null);
                          setAdFormName("");
                          setAdFormUrl("");
                          setAdFormThumbnail("");
                          setAdFormIsActive(true);
                          setAdFormOrderNumber(1);
                          setAdFormLimitType("unlimited");
                          setAdFormViewLimit(0);
                        }}
                        className="px-4 py-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 hover:dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-[10px] tracking-widest uppercase rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const name = adFormName.trim();
                        const url = adFormUrl.trim();
                        if (!name || !url) {
                          notify("দয়া করে বিজ্ঞাপন নাম এবং লিঙ্ক দুটিই পূরণ করুন।");
                          return;
                        }

                        if (!url.startsWith("http://") && !url.startsWith("https://")) {
                          notify("সঠিক লিংক দিন (যেমন: https://example.com)");
                          return;
                        }

                        const targetLimit = adFormLimitType === "unlimited" ? undefined : Math.max(1, adFormViewLimit);

                        setGlobalConfig((prev) => {
                          const currentAds = prev.adsList || [];
                          let updatedAds = [...currentAds];

                          if (editingAdId) {
                            // Update existing ad
                            updatedAds = updatedAds.map((ad) =>
                              ad.id === editingAdId
                                ? {
                                    ...ad,
                                    name,
                                    type: adFormType,
                                    url,
                                    thumbnail: adFormThumbnail.trim() || undefined,
                                    isActive: adFormIsActive,
                                    orderNumber: adFormOrderNumber,
                                    viewLimit: targetLimit,
                                  }
                                : ad
                            );
                            notify("বিজ্ঞাপনটি সফলভাবে আপডেট করা হয়েছে!");
                          } else {
                            // Create new ad
                            const newAd = {
                              id: "ad-" + Date.now(),
                              name,
                              type: adFormType,
                              url,
                              thumbnail: adFormThumbnail.trim() || undefined,
                              isActive: adFormIsActive,
                              orderNumber: adFormOrderNumber,
                              viewLimit: targetLimit,
                            };
                            updatedAds.push(newAd);
                            notify("নতুন বিজ্ঞাপন সফলভাবে যোগ করা হয়েছে!");
                          }

                          // Sort by orderNumber
                          updatedAds.sort((a, b) => a.orderNumber - b.orderNumber);

                          // Synchronize legacy adLinks array for active ads
                          const activeLinks = updatedAds
                            .filter((ad) => ad.isActive)
                            .map((ad) => ad.url);

                          // Update state and fields
                          setEditingAdId(null);
                          setAdFormName("");
                          setAdFormUrl("");
                          setAdFormThumbnail("");
                          setAdFormIsActive(true);
                          setAdFormOrderNumber(updatedAds.length + 1);
                          setAdFormLimitType("unlimited");
                          setAdFormViewLimit(0);

                          return {
                            ...prev,
                            adsList: updatedAds,
                            adLinks: activeLinks.length > 0 ? activeLinks : prev.adLinks,
                          };
                        });
                      }}
                      className="px-6 py-3 bg-[#10b981] hover:bg-emerald-600 text-white font-black text-[10px] tracking-widest uppercase rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 border-b-4 border-emerald-700"
                    >
                      {editingAdId ? "UPDATE AD" : "ADD SPONSOR AD"} <ICONS.Check size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* AD CAMPAIGNS LIST TABLE */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-4">
                <div>
                  <h4 className="text-sm font-black dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <ArrowUpDown size={14} className="text-emerald-500" />
                    SPONSOR AD ROTATION GRID (বিজ্ঞাপন তালিকা ও সিকোয়েন্স)
                  </h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                    সক্রিয় সকল বিজ্ঞাপন ক্রম (Order Number) অনুযায়ী একটার পর একটা স্বয়ংক্রিয় রোটেশনে চলতে থাকবে।
                  </p>
                </div>
              </div>

              {!(globalConfig.adsList && globalConfig.adsList.length > 0) ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/5 rounded-3xl">
                  <p className="text-xs text-slate-400 font-extrabold uppercase tracking-widest">
                    No sponsor ads configured (কোনো বিজ্ঞাপন সেট করা নেই)
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {(globalConfig.adsList || []).map((ad, idx) => {
                    return (
                      <div
                        key={ad.id}
                        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border transition-all ${ad.isActive ? "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 hover:border-[#10b981]/30" : "bg-slate-50/50 dark:bg-slate-900/40 border-slate-100/50 dark:border-white/5 opacity-60"}`}
                      >
                        <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                          {/* Order Indicator Badge */}
                          <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex flex-col items-center justify-center font-black shrink-0 border border-slate-300 dark:border-white/10">
                            <span className="text-[8px] text-slate-400 dark:text-slate-500 uppercase leading-none font-bold">SL</span>
                            <span className="text-xs font-black leading-none mt-0.5">{idx + 1}</span>
                          </div>

                          {/* Thumbnail or Visual Type Icon */}
                          <div className="w-14 h-14 rounded-xl bg-slate-950/80 overflow-hidden shrink-0 flex items-center justify-center border border-white/10 shadow-inner relative">
                            {ad.thumbnail ? (
                              <img
                                src={ad.thumbnail}
                                alt="ad"
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : ad.type === "Video" ? (
                              <Play size={20} className="text-amber-400" />
                            ) : ad.type === "Image" ? (
                              <ImageIcon size={20} className="text-emerald-400" />
                            ) : (
                              <Globe size={20} className="text-sky-400" />
                            )}
                          </div>

                          {/* Info Text */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-extrabold text-sm dark:text-white truncate">
                                {idx + 1}. {ad.name}
                              </span>
                              
                              {/* Type Badge */}
                              <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${ad.type === "Video" ? "bg-amber-500/15 border border-amber-500/30 text-amber-500" : ad.type === "Image" ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-500" : "bg-sky-500/15 border border-sky-500/30 text-sky-400"}`}>
                                {ad.type}
                              </span>

                              {/* Status Badge */}
                              <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${ad.isActive ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500"}`}>
                                {ad.isActive ? "ACTIVE" : "INACTIVE"}
                              </span>

                              {/* Views & Limit Badges */}
                              {(() => {
                                const views = adViewLogs.filter((log) => log.adLink === ad.url).length;
                                const hasLimit = typeof ad.viewLimit === "number" && ad.viewLimit > 0;
                                const isReached = hasLimit && views >= (ad.viewLimit || 0);
                                if (isReached) {
                                  return (
                                    <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse">
                                      LIMIT REACHED: {views} / {ad.viewLimit}
                                    </span>
                                  );
                                }
                                if (hasLimit) {
                                  return (
                                    <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/30">
                                      LIMIT: {views} / {ad.viewLimit} VIEWS
                                    </span>
                                  );
                                }
                                return (
                                  <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-sky-500/15 text-sky-400 border border-sky-500/30">
                                    {views} VIEWS (UNLIMITED)
                                  </span>
                                );
                              })()}
                            </div>

                            <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 select-all truncate block">
                              {ad.url}
                            </p>
                          </div>
                        </div>

                        {/* Actions buttons row */}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 border-slate-100 dark:border-white/5 pt-3 sm:pt-0 shrink-0">
                          {/* Toggle Active status */}
                          <button
                            onClick={() => {
                              setGlobalConfig((prev) => {
                                const currentAds = prev.adsList || [];
                                const updatedAds = currentAds.map((item) =>
                                  item.id === ad.id ? { ...item, isActive: !item.isActive } : item
                                );
                                
                                const activeLinks = updatedAds
                                  .filter((item) => item.isActive)
                                  .map((item) => item.url);

                                notify(
                                  !ad.isActive
                                    ? `"${ad.name}" বিজ্ঞাপনটি সক্রিয় করা হয়েছে!`
                                    : `"${ad.name}" বিজ্ঞাপনটি নিষ্ক্রিয় করা হয়েছে!`
                                );

                                return {
                                  ...prev,
                                  adsList: updatedAds,
                                  adLinks: activeLinks.length > 0 ? activeLinks : prev.adLinks,
                                };
                              });
                            }}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${ad.isActive ? "bg-emerald-500/10 hover:bg-emerald-500 hover:text-white border-emerald-500/20 text-emerald-500" : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-300"}`}
                          >
                            {ad.isActive ? "Disable" : "Enable"}
                          </button>

                          {/* Edit button */}
                          <button
                            onClick={() => {
                              setEditingAdId(ad.id);
                              setAdFormName(ad.name);
                              setAdFormType(ad.type);
                              setAdFormUrl(ad.url);
                              setAdFormThumbnail(ad.thumbnail || "");
                              setAdFormIsActive(ad.isActive);
                              setAdFormOrderNumber(ad.orderNumber);
                              setAdFormLimitType(ad.viewLimit ? "custom" : "unlimited");
                              setAdFormViewLimit(ad.viewLimit || 100);
                              notify(`"${ad.name}" এডিট করার জন্য ফর্মে লোড হয়েছে।`);
                            }}
                            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 hover:dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                            title="এডিট করুন"
                          >
                            <Edit size={14} />
                          </button>

                          {/* Delete button with safe inline confirmation */}
                          {deletingAdId === ad.id ? (
                            <div className="flex items-center gap-1 border border-rose-500/20 bg-rose-500/5 px-2 py-1 rounded-xl animate-in fade-in zoom-in-95 duration-150">
                              <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest mr-1">মুছবেন?</span>
                              <button
                                onClick={() => {
                                  setGlobalConfig((prev) => {
                                    const currentAds = prev.adsList || [];
                                    const updatedAds = currentAds.filter((item) => item.id !== ad.id);

                                    const activeLinks = updatedAds
                                      .filter((item) => item.isActive)
                                      .map((item) => item.url);

                                    notify(`"${ad.name}" বিজ্ঞাপনটি মুছে ফেলা হয়েছে।`);

                                    return {
                                      ...prev,
                                      adsList: updatedAds,
                                      adLinks: activeLinks.length > 0 ? activeLinks : [],
                                    };
                                  });
                                  setDeletingAdId(null);
                                }}
                                className="px-2 py-1 bg-rose-600 text-white font-black text-[9px] uppercase tracking-wider rounded-lg hover:bg-rose-700 active:scale-95 transition-all"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeletingAdId(null)}
                                className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-[9px] uppercase tracking-wider rounded-lg hover:bg-slate-300 active:scale-95 transition-all"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingAdId(ad.id)}
                              className="p-2.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 rounded-xl transition-all"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM SETUP TAB (New Global Settings Feature) */}
      {activeTab === "system" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-12">
            <h3 className="text-xl font-black italic uppercase dark:text-white leading-none tracking-tighter">
              GLOBAL CONFIGURATION
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                  Application Instance Name
                </label>
                <input
                  value={globalConfig.appName}
                  onChange={(e) =>
                    setGlobalConfig((prev) => ({
                      ...prev,
                      appName: e.target.value,
                    }))
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl font-black text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                  Default System Language
                </label>
                <div className="flex gap-2">
                  {["EN", "BN"].map((l) => (
                    <button
                      key={l}
                      onClick={() =>
                        setGlobalConfig((prev) => ({
                          ...prev,
                          defaultLanguage: l as any,
                        }))
                      }
                      className={`flex-1 py-4 rounded-xl font-black uppercase text-[10px] transition-all border-2 ${globalConfig.defaultLanguage === l ? "bg-[#10b981] border-[#10b981] text-white" : "bg-slate-50 dark:bg-slate-800 border-transparent text-slate-400"}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-50 dark:border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 dark:bg-white/5 p-8 rounded-[2.5rem] flex items-center justify-between group">
                <div>
                  <h4 className="font-black italic dark:text-white uppercase text-sm leading-none mb-2">
                    Maintenance Mode
                  </h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    Force lock all user accounts
                  </p>
                </div>
                <button
                  onClick={handleToggleMaintenance}
                  className={`w-14 h-8 rounded-full relative transition-all duration-500 ${globalConfig.maintenanceMode ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]" : "bg-slate-200 dark:bg-slate-800"}`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-500 ${globalConfig.maintenanceMode ? "left-7" : "left-1"}`}
                  ></div>
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-white/5 p-8 rounded-[2.5rem] flex items-center justify-between group">
                <div>
                  <h4 className="font-black italic dark:text-white uppercase text-sm leading-none mb-2 text-emerald-500">
                    Email OTP Verification Code
                  </h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    সাইন-আপের জন্য ওটিপি কোড পাঠানো ও ভেরিফিকেশন বাধ্যবাধকতা
                  </p>
                </div>
                <button
                  onClick={() => {
                    setGlobalConfig((prev) => {
                      const updated = {
                        ...prev,
                        enableEmailOTP: !prev.enableEmailOTP,
                      };
                      notify(
                        !prev.enableEmailOTP
                          ? "Email OTP Verification REQUIREMENT ENABLED."
                          : "Email OTP Verification REQUIREMENT DISABLED (Users can sign up directly without code).",
                      );
                      return updated;
                    });
                  }}
                  className={`w-14 h-8 rounded-full relative transition-all duration-300 ${globalConfig.enableEmailOTP ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "bg-slate-200 dark:bg-slate-800"}`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${globalConfig.enableEmailOTP ? "left-7" : "left-1"}`}
                  ></div>
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-white/5 p-8 rounded-[2.5rem] col-span-1 md:col-span-2 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-black italic dark:text-white uppercase text-base leading-none mb-2 text-[#10b981]">
                      Dynamic Multi-SMTP Rotation Routing
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                      স্বয়ংক্রিয় ২-স্তরের মেলিং সিস্টেম রিডিং ও পর্যবেক্ষণ
                    </p>
                  </div>
                  <button
                    onClick={handleResetCounters}
                    className="px-5 py-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-[#fb7185] dark:hover:text-white font-extrabold rounded-2xl text-[10px] uppercase tracking-widest transition-all self-start sm:self-center"
                  >
                    Reset Daily Quotas
                  </button>
                </div>

                <div className="space-y-4 pt-4 border-t border-[#f1f5f9] dark:border-white/5">
                  <div className="flex items-center justify-between col-span-1 md:col-span-2">
                    <h5 className="text-xs font-black dark:text-white uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      কনফিগারড SMTP সার্ভারসমূহ (
                      {emailCounters?.smtpStatus?.length || 0})
                    </h5>
                    {(!emailCounters?.smtpStatus ||
                      emailCounters.smtpStatus.length === 0) && (
                      <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        এনভায়রনমেন্ট ফলব্যাক সক্রিয় (Env Fallback)
                      </span>
                    )}
                  </div>

                  {!emailCounters?.smtpStatus ||
                  emailCounters.smtpStatus.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-center font-sans col-span-1 md:col-span-2">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        কোনো অতিরিক্ত SMTP সার্ভার যুক্ত করা হয়নি।
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        সিস্টেমটি বর্তমানে আপনার .env ফাইলের GMAIL_USER এবং
                        GMAIL_APP_PASSWORD ব্যবহার করছে।
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-1 md:col-span-2">
                      {emailCounters.smtpStatus.map((smtp, idx) => {
                        const isCurrentActive =
                          emailCounters.activeSmtp === smtp.user;
                        const isDepleted = smtp.count >= smtp.limit;
                        const usagePercent = Math.min(
                          100,
                          (smtp.count / smtp.limit) * 100,
                        );

                        return (
                          <div
                            key={smtp.user}
                            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-white/5 space-y-4 hover:border-emerald-500/20 transition-all font-sans"
                          >
                            <div className="flex items-center justify-between">
                              <div className="truncate max-w-[70%]">
                                <p
                                  className="text-xs font-bold dark:text-white truncate"
                                  title={smtp.user}
                                >
                                  {smtp.user}
                                </p>
                                <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                                  SMTP Server {idx + 1}
                                </p>
                              </div>
                              <div>
                                {isCurrentActive ? (
                                  <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                    ● ACTIVE
                                  </span>
                                ) : isDepleted ? (
                                  <span className="text-[8px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    ● DEPLETED
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    ● STANDBY
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1.5 font-sans">
                              <div className="flex justify-between text-[10px] font-mono font-bold dark:text-white">
                                <span className="text-slate-400">
                                  Quota Usage:
                                </span>
                                <span>
                                  {smtp.count} / {smtp.limit} (
                                  {Math.round(usagePercent)}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-2 rounded-full transition-all duration-500 ${isCurrentActive ? "bg-emerald-500" : isDepleted ? "bg-rose-500" : "bg-slate-300 dark:bg-slate-600"}`}
                                  style={{ width: `${usagePercent}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex gap-2 pt-2 border-t border-[#f1f5f9] dark:border-white/5 justify-end">
                              <button
                                onClick={() =>
                                  handleTestSmtp(smtp.user, undefined)
                                }
                                className="px-2.5 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-emerald-500 hover:text-white font-extrabold rounded-lg text-[9px] uppercase tracking-wider transition-all"
                              >
                                Test
                              </button>
                              <button
                                onClick={() => handleDeleteSmtp(smtp.user)}
                                className="px-2.5 py-1.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white font-extrabold rounded-lg text-[9px] uppercase tracking-wider transition-all"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add New SMTP Server Form */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-6 rounded-[2rem] space-y-4 font-sans col-span-1 md:col-span-2">
                    <h5 className="text-xs font-black dark:text-white uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      নতুন SMTP সার্ভার সংযুক্ত করুন (Add SMTP to Rotation Pool)
                    </h5>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          GMAIL Address
                        </label>
                        <input
                          type="email"
                          placeholder="arearnzone@gmail.com"
                          value={smtpFormUser}
                          onChange={(e) => setSmtpFormUser(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-100 dark:bg-white/5 dark:text-white font-semibold rounded-xl text-xs border-0 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            App Password
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const text =
                                    await navigator.clipboard.readText();
                                  if (text) {
                                    setSmtpFormPass(text.trim());
                                    notify(
                                      "পাসওয়ার্ড সফলভাবে পেস্ট করা হয়েছে!",
                                    );
                                  } else {
                                    notify(
                                      "ক্লিপবোর্ড খালি অথবা অ্যাক্সেস ডিনাইড!",
                                    );
                                  }
                                } catch (err) {
                                  const manualText = prompt(
                                    "এখানে আপনার App Password টি পেস্ট (Paste) করুন:",
                                  );
                                  if (manualText !== null) {
                                    setSmtpFormPass(manualText.trim());
                                    notify(
                                      "পাসওয়ার্ড সফলভাবে সেট করা হয়েছে!",
                                    );
                                  }
                                }
                              }}
                              className="text-[9px] text-[#10b981] font-black hover:underline uppercase bg-[#10b981]/10 px-2 py-0.5 rounded cursor-pointer"
                            >
                              Paste (পেস্ট)
                            </button>
                            <a
                              href="https://support.google.com/accounts/answer/185833?hl=en"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[9px] text-slate-400 font-bold hover:underline"
                            >
                              How to get?
                            </a>
                          </div>
                        </div>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="16-character google app password"
                            value={smtpFormPass}
                            onChange={(e) => setSmtpFormPass(e.target.value)}
                            style={
                              {
                                WebkitTextSecurity: showSmtpFormPass
                                  ? "none"
                                  : "disc",
                              } as React.CSSProperties
                            }
                            className="w-full pl-4 pr-12 py-3 bg-slate-100 dark:bg-white/5 dark:text-white font-semibold rounded-xl text-xs border-0 focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowSmtpFormPass(!showSmtpFormPass)
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-emerald-500 transition-colors cursor-pointer"
                            title={
                              showSmtpFormPass
                                ? "Hide password"
                                : "Show password"
                            }
                          >
                            {showSmtpFormPass ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Daily limit (সীমা)
                        </label>
                        <input
                          type="number"
                          placeholder="500"
                          value={smtpFormLimit}
                          onChange={(e) =>
                            setSmtpFormLimit(parseInt(e.target.value) || 500)
                          }
                          className="w-full px-4 py-3 bg-slate-100 dark:bg-white/5 dark:text-white font-semibold rounded-xl text-xs border-0 focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleAddSmtp}
                        disabled={isAddingSmtp}
                        className={`px-5 py-3 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all ${isAddingSmtp ? "bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed" : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.2)]"}`}
                      >
                        {isAddingSmtp
                          ? "যোগ করা হচ্ছে..."
                          : "নতুন SMTP সংযুক্ত করুন"}
                      </button>
                    </div>
                  </div>


                </div>

                {/* Gmail Connection Real-time Diagnostics */}
                <div className="bg-slate-100/30 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-6 rounded-[2rem] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h5 className="text-xs font-black dark:text-white uppercase tracking-wider mb-1">
                        জিমেইল সংযোগ টেস্ট (Gmail SMTP Connection Diagnostic)
                      </h5>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-normal">
                        আপনার পরিবেশের GMAIL_USER ও GMAIL_APP_PAS কি সঠিক আছে
                        এবং কাজ করছে কিনা তা তাৎক্ষনিক চেক করুন।
                      </p>
                    </div>
                    <button
                      onClick={handleTestSmtp}
                      disabled={isTestingSmtp}
                      className={`px-5 py-3.5 rounded-2xl text-[9px] uppercase font-black tracking-widest transition-all ${isTestingSmtp ? "bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed" : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.2)]"}`}
                    >
                      {isTestingSmtp
                        ? "চেক করা হচ্ছে..."
                        : "কানেকশন টেস্ট করুন (Test SMTP)"}
                    </button>
                  </div>

                  {smtpDiagnosticMsg && (
                    <div
                      className={`p-5 rounded-2xl text-[11px] font-semibold leading-relaxed border ${smtpDiagnosticOk ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/5 border-rose-500/10 text-rose-600 dark:text-rose-400"}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`font-black uppercase text-[8px] tracking-wider px-2 py-1 rounded shrink-0 ${smtpDiagnosticOk ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}
                        >
                          {smtpDiagnosticOk
                            ? "সফল (SUCCESS)"
                            : "ব্যর্থ (ERROR)"}
                        </span>
                        <p className="m-0 select-all font-medium leading-relaxed">
                          {smtpDiagnosticMsg}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Test Accounts Cleanup Panel (টেস্ট আইডি রিসেট ম্যানেজার) */}
                <div className="bg-slate-100/30 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-6 rounded-[2rem] space-y-6 font-sans relative overflow-hidden">
                  <div>
                    <h5 className="text-xs font-black dark:text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                      টেস্ট আইডি রিসেট ম্যানেজার (Test Users Cleanup Manager)
                    </h5>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-normal">
                      প্রকৃত জিমেইল ওটিপি (OTP) পাঠানোর প্রক্রিয়া পরীক্ষা করতে আপনার অ্যাডমিন আইডি ছাড়া বাকি সব রেজিস্টার্ড আইডি এক ক্লিকে মুছে ফেলুন।
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Search & Quick Actions */}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          টেস্ট আইডি খুঁজুন (Search Test User)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="ইউজার আইডি, নাম বা জিমেইল লিখুন..."
                            value={cleanupSearchQuery}
                            onChange={(e) => setCleanupSearchQuery(e.target.value)}
                            className="w-full pl-4 pr-10 py-3.5 bg-slate-100 dark:bg-white/5 dark:text-white font-semibold rounded-xl text-xs border-0 focus:ring-2 focus:ring-rose-500 outline-none"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={handleCleanNonAdminUsers}
                          className="w-full px-5 py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] uppercase font-black tracking-widest transition-all shadow-[0_0_12px_rgba(239,68,68,0.2)] flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          সব টেস্ট আইডি এক ক্লিকে মুছুন (Clear All Test IDs)
                        </button>
                      </div>
                    </div>

                    {/* Right Column: Search Results / Latest Users */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                        {cleanupSearchQuery ? "অনুসন্ধানের ফলাফল (Search Results)" : "সাম্প্রতিক রেজিস্টার্ড টেস্ট আইডি (Latest Registered Test IDs)"}
                      </label>

                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {(() => {
                          const adminEmail = "abdurrahman714915@gmail.com";
                          const testUsersList = (users || []).filter(
                            (u) => u.email.toLowerCase().trim() !== adminEmail && u.role !== "admin"
                          );

                          const filteredList = cleanupSearchQuery
                            ? testUsersList.filter(
                                (u) =>
                                  u.id.toLowerCase().includes(cleanupSearchQuery.toLowerCase()) ||
                                  (u.uid && u.uid.toLowerCase().includes(cleanupSearchQuery.toLowerCase())) ||
                                  u.name.toLowerCase().includes(cleanupSearchQuery.toLowerCase()) ||
                                  u.email.toLowerCase().includes(cleanupSearchQuery.toLowerCase())
                              )
                            : testUsersList.slice(-3).reverse(); // latest 3

                          if (filteredList.length === 0) {
                            return (
                              <div className="p-4 text-center rounded-xl bg-slate-100/50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">কোনো টেস্ট আইডি পাওয়া যায়নি</p>
                              </div>
                            );
                          }

                          return filteredList.map((u) => (
                            <div key={u.id} className="p-3 rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 text-xs">
                              <div className="min-w-0">
                                <div className="font-bold dark:text-white truncate flex items-center gap-1.5 flex-wrap">
                                  {u.name || "Unknown"}
                                  <span className="text-[8px] px-1.5 py-0.5 bg-slate-200 dark:bg-white/10 rounded font-mono text-slate-500 dark:text-slate-400">
                                    {u.uid || u.id.slice(0, 6)}
                                  </span>
                                  {u.isMonitor && (
                                    <span className="text-[8px] px-1.5 py-0.5 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-black tracking-wider uppercase rounded">
                                      Monitor (মনিটর)
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-medium truncate">{u.email}</div>
                              </div>
                              <button
                                onClick={() => {
                                  setCleanupUserTarget(u);
                                  setCleanupAppPassword("");
                                  setShowCleanupModal(true);
                                }}
                                className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-lg text-[9px] uppercase font-black tracking-widest transition-all shrink-0 cursor-pointer"
                              >
                                মুছুন
                              </button>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* App Password Verification Dialog (Modal overlay inside panel) */}
                  {showCleanupModal && (
                    <div className="absolute inset-0 bg-slate-900/95 dark:bg-black/95 backdrop-blur-sm flex items-center justify-center p-6 z-30 animate-in fade-in duration-200">
                      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
                        <div className="text-center space-y-1">
                          <h6 className="text-xs font-black text-rose-500 uppercase tracking-widest">
                            নিরাপত্তা নিশ্চিতকরণ (Security Verification)
                          </h6>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                            {cleanupUserTarget === "all"
                              ? "সকল সাধারণ টেস্ট আইডি ডিলেট করতে আপনার অ্যাডমিন অ্যাপ লগইন পাসওয়ার্ড (Admin App Login Password) প্রদান করুন।"
                              : `ইউজার "${cleanupUserTarget?.name || cleanupUserTarget?.email}" মুছে ফেলতে আপনার অ্যাডমিন অ্যাপ লগইন পাসওয়ার্ড (Admin App Login Password) প্রদান করুন।`}
                          </p>
                        </div>

                        <form onSubmit={handleVerifyAndExecuteCleanup} className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              Admin App Login Password
                            </label>
                            <input
                              type="password"
                              required
                              placeholder="••••••••••••••"
                              value={cleanupAppPassword}
                              onChange={(e) => setCleanupAppPassword(e.target.value)}
                              className="w-full px-4 py-3 bg-slate-100 dark:bg-white/5 dark:text-white font-semibold rounded-xl text-center text-xs border-0 focus:ring-2 focus:ring-rose-500 outline-none"
                            />
                          </div>

                          <div className="flex gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                setShowCleanupModal(false);
                                setCleanupUserTarget(null);
                                setCleanupAppPassword("");
                              }}
                              className="flex-1 py-3 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-[10px] uppercase font-black tracking-widest transition-colors cursor-pointer"
                            >
                              বাতিল (Cancel)
                            </button>
                            <button
                              type="submit"
                              disabled={isVerifyingCleanupPassword}
                              className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white disabled:bg-rose-500/50 rounded-xl text-[10px] uppercase font-black tracking-widest transition-colors flex items-center justify-center gap-1 shadow-[0_0_12px_rgba(239,68,68,0.2)] cursor-pointer"
                            >
                              {isVerifyingCleanupPassword ? "যাচাই হচ্ছে..." : "কনফার্ম করুন"}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>

                {/* Telegram Bot Real-time Setup Card */}
                <form
                  onSubmit={handleSaveTgBot}
                  className="bg-slate-100/30 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-6 rounded-[2rem] space-y-4 font-sans"
                >
                  <div>
                    <h5 className="text-xs font-black dark:text-white uppercase tracking-wider mb-1">
                      টেলিগ্রাম বট কানেকশন ম্যানেজার (Telegram Bot Live
                      Configurator)
                    </h5>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-normal">
                      আপনার টেলিগ্রাম বট টোকেনটি এখানে সাবমিট করুন। এটি
                      তাত্ক্ষণিকভাবে আপনার বটের সাথে সাইটের রিয়েল-টাইম সংযোগ
                      স্থাপন করবে।
                    </p>
                  </div>

                  {/* Ephemeral Restart Notice and Guide */}
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-500">
                      <span className="text-[10px] font-black uppercase tracking-wider">
                        ⚠️ গুরুত্বপূর্ণ নোটিশ ও সমাধান (Bot Status Guide)
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed font-sans">
                      ক্লাউড রান সার্ভার রিস্টার্ট হওয়ার কারণে অনেক সময় বটের
                      সংযোগ সাময়িকভাবে বিচ্ছিন্ন হতে পারে (কারণ ফাইলের ডাটা
                      রিস্টার্টে মুছে যায়)। আমাদের সিস্টেমে একটি{" "}
                      <b>স্বয়ংক্রিয় রিস্টোর ইঞ্জিন</b> রয়েছে যা আপনি বা কোনো
                      গ্রাহক ওয়েবসাইটে প্রবেশ করামাত্র আপনার ব্রাউজার
                      ব্যাকগ্রাউন্ডে পূর্বের সংরক্ষিত টোকেনটি দিয়ে বটের কানেকশন
                      স্বয়ংক্রিয়ভাবে সক্রিয় করে তুলবে।
                    </p>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed font-sans">
                      <b>বট কাজ না করলে করণীয়:</b> যদি কখনও দেখেন বট রেসপন্স
                      করছে না, তাহলে দয়া করে নিচে আপনার সঠিক{" "}
                      <b>টেলিগ্রাম বট টোকেনটি</b> এবং <b>চ্যানেল লিঙ্কটি</b>{" "}
                      পুনরায় সাবমিট করে <b>Save Config</b> বাটনটি চাপুন। এছাড়া
                      স্থায়ী সমাধানের জন্য এআই স্টুডিওর (AI Studio Settings)
                      এনভায়রনমেন্ট ভ্যারিয়েবলে <code>TELEGRAM_BOT_TOKEN</code>{" "}
                      ভ্যালুটি আপডেট করে রাখুন।
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black uppercase dark:text-white">
                          টেলিগ্রাম বট টোকেন (Bot Token)
                        </label>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard.readText();
                              if (text) {
                                setTgBotToken(text.trim());
                                notify(
                                  "বট টোকেন ক্লিপবোর্ড থেকে পেস্ট করা হয়েছে! 📋",
                                );
                              } else {
                                notify("ক্লিপবোর্ডে কোনো লেখা পাওয়া যায়নি।");
                              }
                            } catch (err) {
                              notify(
                                "ক্লিপবোর্ড অ্যাক্সেস ব্লক করা আছে। অনুগ্রহ করে দীর্ঘক্ষণ টিপে ধরে ম্যানুয়ালি পেস্ট (Paste) করুন।",
                              );
                            }
                          }}
                          className="text-[8px] font-black uppercase text-blue-500 hover:underline flex items-center gap-1"
                        >
                          📋 Paste (পেস্ট করুন)
                        </button>
                      </div>
                      <input
                        id="tg-bot-token-input"
                        type="text"
                        required
                        value={tgBotToken}
                        onChange={(e) => setTgBotToken(e.target.value)}
                        placeholder="e.g. 8008225715:AAEcA2q..."
                        className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 focus:border-blue-500/30 rounded-xl py-3 px-4 text-xs font-bold outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase dark:text-white">
                        বট ইউজারনেম (Bot Username)
                      </label>
                      <input
                        type="text"
                        required
                        value={tgBotUsername}
                        onChange={(e) => setTgBotUsername(e.target.value)}
                        placeholder="e.g. @AREarnZone_bot"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 focus:border-blue-500/30 rounded-xl py-3 px-4 text-xs font-bold outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase dark:text-white">
                        চ্যানেল লিঙ্ক (Telegram Channel)
                      </label>
                      <input
                        type="text"
                        required
                        value={tgChannelLink}
                        onChange={(e) => setTgChannelLink(e.target.value)}
                        placeholder="https://t.me/arearnzone"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 focus:border-blue-500/30 rounded-xl py-3 px-4 text-xs font-bold outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3 pt-2">
                    {canForceTgSave && (
                      <button
                        type="button"
                        onClick={() => handleSaveTgBot(null as any, true)}
                        disabled={isSavingTgBot}
                        className="px-5 py-3.5 rounded-2xl text-[9px] uppercase font-black tracking-widest transition-all bg-amber-500 text-slate-950 hover:bg-amber-600 shadow-[0_0_12px_rgba(245,158,11,0.2)] animate-pulse"
                      >
                        {isSavingTgBot
                          ? "সেভ করা হচ্ছে..."
                          : "জোরপূর্বক সেভ করুন (Force Save Anyway ⚠️)"}
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSavingTgBot}
                      className={`px-5 py-3.5 rounded-2xl text-[9px] uppercase font-black tracking-widest transition-all ${isSavingTgBot ? "bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600 shadow-[0_0_12px_rgba(59,130,246,0.2)]"}`}
                    >
                      {isSavingTgBot
                        ? "কানেক্ট করা হচ্ছে..."
                        : "বট সেটআপ করুন (Save & Connect Bot)"}
                    </button>
                  </div>

                  {tgBotStatusMsg && (
                    <div
                      className={`p-5 rounded-2xl text-[11px] font-semibold leading-relaxed border ${tgBotStatusOk ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/5 border-rose-500/10 text-rose-600 dark:text-rose-400"}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`font-black uppercase text-[8px] tracking-wider px-2 py-1 rounded shrink-0 ${tgBotStatusOk ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}
                        >
                          {tgBotStatusOk ? "সফল (SUCCESS)" : "ব্যর্থ (ERROR)"}
                        </span>
                        <p className="m-0 select-all font-medium leading-relaxed">
                          {tgBotStatusMsg}
                        </p>
                      </div>
                    </div>
                  )}
                </form>

                {/* Sender Authentication & Anti-Spam Setup Guide */}
                <div className="bg-slate-100/30 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-6 rounded-[2.2rem] space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[9px] font-black text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        Spam Prevention
                      </span>
                      <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider font-bold">
                        Sender Auth
                      </span>
                    </div>
                    <h5 className="text-sm font-black dark:text-white uppercase tracking-wider mb-1">
                      ইমেইল অথেন্টিকেশন ও স্প্যাম প্রতিরোধ ম্যানেজার (Sender
                      Authentication Specialist)
                    </h5>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed font-sans">
                      আপনার মেইলগুলো যাতে সরাসরি গ্রাহকের ইনবক্সে (Inbox) যায়
                      এবং স্প্যাম ফোল্ডারে (Spam) না আটকা পড়ে তা নিশ্চিত করতে
                      নিচের SPF, DKIM এবং DMARC রেকর্ড DNS-এ কনফিগার করুন।
                    </p>
                  </div>

                  {/* Sub-tabs for DNS Configs */}
                  <div className="grid grid-cols-4 gap-2 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => setAuthGuideTab("spf")}
                      className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${authGuideTab === "spf" ? "bg-[#10b981] text-white shadow-md font-black" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      1. SPF
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthGuideTab("dkim")}
                      className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${authGuideTab === "dkim" ? "bg-[#10b981] text-white shadow-md font-black" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      2. DKIM
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthGuideTab("dmarc")}
                      className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${authGuideTab === "dmarc" ? "bg-[#10b981] text-white shadow-md font-black" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      3. DMARC
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthGuideTab("gmail")}
                      className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${authGuideTab === "gmail" ? "bg-amber-500 text-white shadow-md font-black" : "text-slate-400 hover:text-slate-200"}`}
                    >
                      Gmail Help
                    </button>
                  </div>

                  {/* Sub-tab Content wrapper */}
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-white/5 space-y-4 font-sans font-sans">
                    {authGuideTab === "spf" && (
                      <div className="space-y-3 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <h6 className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">
                            1. Sender Policy Framework (SPF)
                          </h6>
                          <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500">
                            Record Type: TXT
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                          SPF রেকর্ড আপনার ডোমেইনের পক্ষ থেকে ইমেইল পাঠাতে
                          অনুমতিপ্রাপ্ত আইপি এবং সার্ভারগুলো নির্ধারণ করে। এটি
                          ছাড়া Google মেইলকে স্প্যামে পাঠায়।
                        </p>

                        <div className="space-y-2 pt-2">
                          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-white/5 space-y-2">
                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              <span>Host (Name / Alias)</span>
                              <span className="text-emerald-500 font-black">
                                Copy (Host)
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <code className="font-mono text-xs text-slate-700 dark:text-slate-200 font-bold">
                                @
                              </code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText("@");
                                  notify("Host Copied!");
                                }}
                                className="p-1 px-3 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase rounded-lg hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                              >
                                Copy
                              </button>
                            </div>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-white/5 space-y-2">
                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              <span>Value (TXT Value)</span>
                              <span className="text-emerald-500 font-black">
                                Copy Template
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <code className="font-mono text-[11px] text-slate-700 dark:text-slate-200 font-bold break-all select-all text-left">
                                v=spf1 include:_spf.google.com ~all
                              </code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    "v=spf1 include:_spf.google.com ~all",
                                  );
                                  notify("SPF Value Copied!");
                                }}
                                className="p-1 px-3 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase rounded-lg hover:bg-emerald-500 hover:text-white transition-all shrink-0 shadow-sm"
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-450 dark:text-slate-400 leading-normal bg-blue-500/5 p-3 rounded-xl border border-blue-500/10 mt-1 font-semibold">
                          💡 <strong>নোট:</strong> যদি আপনি নিজের ডোমেইন মেইল
                          ছাড়া অন্য কোনো থার্ডপার্টি মেইলিং সিস্টেমও ব্যবহার
                          করেন, তবে সেটিও আপনার এই সিঙ্গেল SPF রেকর্ডে যোগ করতে
                          হবে।
                        </div>
                      </div>
                    )}

                    {authGuideTab === "dkim" && (
                      <div className="space-y-3 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <h6 className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">
                            2. DomainKeys Identified Mail (DKIM)
                          </h6>
                          <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500">
                            Record Type: TXT
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                          DKIM প্রতিটি ইমেইলে একটি ডিজিটাল ক্রিপ্টোগ্রাফিক
                          সিগনেচার যুক্ত করে। এটি ডোমেইনের সঠিক মালিকানা যাচাই
                          করে ইনবক্স গ্যারান্টি বাড়ায়।
                        </p>

                        <div className="space-y-2 pt-2">
                          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-white/5 space-y-2.5">
                            <h5 className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                              কিভাবে চালু করবেন (How to generate)
                            </h5>
                            <ol className="text-[11px] text-slate-400 space-y-1.5 list-decimal pl-4 font-semibold leading-relaxed text-left">
                              <li>
                                আপনার{" "}
                                <strong className="text-slate-200">
                                  Google Workspace (Admin Console)
                                </strong>
                                -এ লগইন করুন।
                              </li>
                              <li>
                                <strong className="text-slate-200">
                                  Apps &gt; Google Workspace &gt; Gmail &gt;
                                  Authenticate Email (DKIM)
                                </strong>{" "}
                                এ যান।
                              </li>
                              <li>
                                সেখান থেকে নতুন রেকর্ড জেনারেট করুন এবং আপনার
                                ক্লাউডফ্লেয়ার বা ডোমেইন ড্যাশবোর্ডে TXT হিসেবে
                                সেভ করুন।
                              </li>
                              <li>
                                DNS আপডেট হওয়া সাপেক্ষে জিমেইলে পুনরায় ঢুকে{" "}
                                <strong className="text-[#10b981]">
                                  Start Authentication
                                </strong>{" "}
                                এ ক্লিক করুন।
                              </li>
                            </ol>
                          </div>
                        </div>
                      </div>
                    )}

                    {authGuideTab === "dmarc" && (
                      <div className="space-y-3 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <h6 className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">
                            3. Domain-based Message Authentication (DMARC)
                          </h6>
                          <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500">
                            Record Type: TXT
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                          DMARC নির্ধারণ করে যদি কোনো মেইল SPF বা DKIM টেস্টে
                          ব্যর্থ হয়, তবে রিসিভার সার্ভার (যেমন জিমেইল) মেইলটির
                          সাথে কি আচরণ করবে।
                        </p>

                        <div className="space-y-2 pt-2">
                          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-white/5 space-y-2">
                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              <span>Host (Name / Alias)</span>
                              <span className="text-emerald-500 font-black">
                                Copy (Name)
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <code className="font-mono text-xs text-slate-700 dark:text-slate-200 font-bold">
                                _dmarc
                              </code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText("_dmarc");
                                  notify("Host Copied!");
                                }}
                                className="p-1 px-3 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase rounded-lg hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                              >
                                Copy
                              </button>
                            </div>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-white/5 space-y-2">
                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              <span>Value (TXT Value)</span>
                              <span className="text-emerald-500 font-black">
                                Copy DMARC
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <code className="font-mono text-[10px] text-slate-700 dark:text-slate-200 font-bold break-all select-all text-left">
                                v=DMARC1; p=none;
                                rua=mailto:dmarc-reports@yourdomain.com
                              </code>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(
                                    "v=DMARC1; p=none;",
                                  );
                                  notify("DMARC Value Copied!");
                                }}
                                className="p-1 px-3 bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase rounded-lg hover:bg-emerald-500 hover:text-white transition-all shrink-0 shadow-sm"
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {authGuideTab === "gmail" && (
                      <div className="space-y-3 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <h6 className="text-[11px] font-black text-amber-500 uppercase tracking-widest">
                            ব্যক্তিগত @gmail.com ইউজারদের জন্য স্প্যাম বাইপাস
                            টিপস
                          </h6>
                          <span className="text-[9px] font-extrabold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded uppercase font-sans">
                            Crucial Advice
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                          যদি আপনার কোনো কাস্টম ডোমেইন না থাকে এবং আপনি পারসোনাল
                          জিমেইল (
                          <code className="text-amber-500 font-mono bg-black/15 px-1 py-0.5 rounded">
                            GMAIL_USER=xxx@gmail.com
                          </code>
                          ) এর সাথে অ্যাপ পাসওয়ার্ড ব্যবহার করেন, তবে এই
                          স্প্যাম ফিল্টারিং এড়াতে নিচের সাধারণ পদক্ষেপ অনুসরণ
                          করতে হবে:
                        </p>

                        <ul className="text-[11px] text-slate-405 space-y-2.5 list-disc pl-4 font-semibold leading-relaxed text-left">
                          <li>
                            <strong className="text-slate-200">
                              গ্রাহকদের বলুন মেইল ইনবক্স চেক করতে:
                            </strong>{" "}
                            মেইল প্রথমবার জিমেইলে গেলে সেটি "Spam Folder" এ
                            ঢুকে। গ্রাহকদের বলুন স্প্যাম ফোল্ডারে গিয়ে মেইলটি
                            ওপেন করে{" "}
                            <strong className="text-emerald-500 font-bold">
                              "Report Not Spam"
                            </strong>{" "}
                            এ ক্লিক করতে।
                          </li>
                          <li>
                            <strong className="text-slate-200">
                              জিমেইল ডেটাবেজ ট্রেনিং:
                            </strong>{" "}
                            যখন অন্তত ১০-১৫ জন ইউজার স্প্যাম থেকে মেইলটিকে
                            ইনবক্সে নিয়ে যাবে, গুগল স্বয়ংক্রিয়ভাবে বুটস্ট্র্যাপ
                            ইমেইল বডিটিকে বিশ্বস্ত ঘোষণা করবে এবং নতুন ওটিপি
                            মেইল সরাসরি শতভাগ ইউজারের ইনবক্সে যাবে।
                          </li>
                          <li>
                            <strong className="text-slate-200">
                              কাস্টম ডোমেইন বা প্রফেশনাল SMTP সার্ভিস:
                            </strong>{" "}
                            ব্যাপক হারে ব্যবসায়িক ব্যবহারের জন্য ব্যক্তিগত
                            জিমেইল অত্যন্ত সংবেদনশীল। ভালো ইনবক্স এবং ডেলিভারি
                            হারের জন্য Google Workspace অথবা{" "}
                            <code className="text-slate-200">
                              Mailgun/Brevo/Resend
                            </code>{" "}
                            জাতীয় প্রফেশনাল ইমেইল প্রোভাইডার হোস্ট দিয়ে জিমেইল
                            কানেকশন ব্যবহার করুন।
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Delivery Verification Checklist */}
                  <div className="bg-[#10b981]/5 border border-[#10b981]/10 rounded-2xl p-5 space-y-2.5 font-sans">
                    <h6 className="text-[11px] font-black text-emerald-500 uppercase tracking-wider">
                      ডেলিভারি স্কোর চেকলিস্ট (Email Health Checklist)
                    </h6>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-[9px] font-black">
                          ✓
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          SPF Record (Added)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-[9px] font-black">
                          ✓
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          DKIM Verified
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-[9px] font-black">
                          ✓
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          DMARC Policy
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-[9px] font-black">
                          ✓
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Test Mail Sent
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Clean & Elegant Instructions Panel */}
                <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 p-5 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-amber-500 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded">
                      INFO
                    </span>
                    <h5 className="text-xs font-bold text-amber-500">
                      লিংক ভেরিফিকেশন অন করার নিয়মাবলী (How to Turn On Auto-Link
                      Mode)
                    </h5>
                  </div>
                  <ul className="text-[11px] text-slate-400 dark:text-slate-300 space-y-1.5 list-disc pl-4 font-medium leading-relaxed">
                    <li>
                      <strong className="text-amber-500">
                        স্বয়ংক্রিয় (Automatic Mode):
                      </strong>{" "}
                      জিমেইল লিমিট (৫০০) বা জিমেইল ক্রেডেনশিয়াল না থাকলে এটি
                      স্বয়ংক্রিয়ভাবে অন হয়ে যাবে।
                    </li>
                    <li>
                      <strong className="text-amber-500">
                        ম্যানুয়ালি ফোর্সড (Always On forced):
                      </strong>{" "}
                      আপনি যদি সম্পূর্ণভাবে জিমেইল বন্ধ করে সরাসরি{" "}
                      <span className="underline decoration-amber-500">
                        লিংক ভেরিফিকেশন (Auto-Link) সবসময় চালু রাখতে চান
                      </span>
                      , তাহলে আপনার পরিবেশ ফাইলে (
                      <code className="font-mono bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-amber-500">
                        .env
                      </code>
                      ){" "}
                      <code className="font-mono bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-[#10b981]">
                        AUTO_LINK_ONLY=true
                      </code>{" "}
                      নির্ধারণ করুন।
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-white/5 p-8 rounded-[2.5rem] flex items-center justify-between group">
                <div>
                  <h4 className="font-black italic dark:text-white uppercase text-sm leading-none mb-2">
                    Fast-Load CDN Sync
                  </h4>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    Trigger Global Asset Refresh
                  </p>
                </div>
                <button
                  onClick={handleCdnRefresh}
                  className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
                >
                  <ICONS.Zap size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM AUDIT LOGS TAB */}
      {activeTab === "audit_logs" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
              <div>
                <h3 className="text-xl font-black italic uppercase dark:text-white leading-none tracking-tighter flex items-center gap-2">
                  <Terminal className="text-[#10b981]" size={20} />
                  SYSTEM DIAGNOSTICS & AUDIT LOGS
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                  রিয়েল-টাইম সিস্টেমের ত্রুটি এবং প্রত্যাখ্যাত এপিআই কলগুলির ইতিহাস
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      throw new Error("Diagnostic Test: System integrity check triggered by admin");
                    } catch (err: any) {
                      trackError(err, "Admin Diagnostic Control", "runtime");
                      notify("টেস্ট ত্রুটি সফলভাবে সিস্টেমে তৈরি করা হয়েছে! 🧪");
                    }
                  }}
                  className="bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white border border-amber-500/20 hover:border-transparent px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2"
                >
                  <Activity size={12} />
                  <span>Test Trigger (টেস্ট ত্রুটি)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (auditLogs.length === 0) {
                      notify("কোনো লগ নেই খালি করার জন্য।");
                      return;
                    }
                    if (confirm("Are you sure you want to clear all system audit logs?")) {
                      clearErrors();
                      notify("সকল সিস্টেম অডিট লগ মুছে ফেলা হয়েছে! 🧹");
                    }
                  }}
                  className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-transparent px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2"
                >
                  <Trash2 size={12} />
                  <span>Clear Logs (লগ মুছুন)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (auditLogs.length === 0) {
                      notify("রপ্তানি করার জন্য কোনো লগ নেই।");
                      return;
                    }
                    try {
                      const jsonStr = JSON.stringify(auditLogs, null, 2);
                      const blob = new Blob([jsonStr], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.setAttribute("download", `arearnzone_diagnostic_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      notify("সিস্টেম অডিট লগ JSON ফাইল হিসেবে রপ্তানি হয়েছে! 📂");
                    } catch (e) {
                      notify("রপ্তানি করতে সমস্যা হয়েছে।");
                    }
                  }}
                  className="bg-[#10b981]/10 hover:bg-[#10b981] text-[#10b981] hover:text-white border border-[#10b981]/20 hover:border-transparent px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2"
                >
                  <Download size={12} />
                  <span>Export Logs (ডাউনলোড JSON)</span>
                </button>
              </div>
            </div>

            {/* LOGS STATS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-slate-50 dark:bg-slate-850 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <Terminal size={20} />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">TOTAL LOGS TRACKED</span>
                  <p className="text-xl font-black font-mono mt-0.5 text-slate-800 dark:text-white">{auditLogs.length}</p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-850 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">RUNTIME CRASHES</span>
                  <p className="text-xl font-black font-mono mt-0.5 text-rose-500">
                    {auditLogs.filter(l => l.type === "runtime").length}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-850 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <RefreshCw size={18} />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">API REJECTIONS</span>
                  <p className="text-xl font-black font-mono mt-0.5 text-amber-500">
                    {auditLogs.filter(l => l.type === "api").length}
                  </p>
                </div>
              </div>
            </div>

            {/* DYNAMIC LIST / TABLE OF LOGS */}
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest leading-none mb-2 flex items-center gap-2">
                <span>AUDIT RECORD LOG ENTRIES</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </h4>

              {auditLogs.length === 0 ? (
                <div className="py-16 text-center border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[2.5rem] bg-slate-50/50 dark:bg-slate-900/30">
                  <CheckCircle2 size={36} className="text-[#10b981] mx-auto mb-3 opacity-60" />
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">All Systems Operational (সবকিছু ঠিকঠাক কাজ করছে)</p>
                  <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">No technical errors or API failures captured in active memory.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {auditLogs.map((log) => {
                    const isApi = log.type === "api";
                    const isRuntime = log.type === "runtime";
                    return (
                      <div
                        key={log.id}
                        className="bg-slate-50 dark:bg-slate-850 p-5 rounded-[1.75rem] border border-slate-100 dark:border-white/5 space-y-3 transition-all hover:shadow-md"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 pb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                              isRuntime
                                ? "bg-red-500/10 text-red-500 border-red-500/20"
                                : isApi
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                            }`}>
                              {log.type.toUpperCase()}
                            </span>
                            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 truncate max-w-xs sm:max-w-md">
                              {log.context}
                            </span>
                          </div>
                          <span className="text-[9px] font-bold font-mono text-slate-400">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-300 font-mono break-all leading-relaxed">
                            {log.message}
                          </p>

                          {log.url && (
                            <div className="text-[9px] font-mono text-slate-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-white/5 break-all">
                              <span className="font-bold text-slate-500 uppercase">ENDPOINT:</span> {log.url}
                              {log.status && <span className="ml-3 font-bold text-rose-500">[{log.status}]</span>}
                            </div>
                          )}

                          {log.stack && (
                            <details className="group">
                              <summary className="text-[9px] font-black text-indigo-500 uppercase tracking-wider cursor-pointer list-none select-none flex items-center gap-1.5 focus:outline-none">
                                <span className="transition-transform group-open:rotate-90">▶</span>
                                <span>View Raw Stack Trace (ট্রেস দেখুন)</span>
                              </summary>
                              <pre className="mt-2 text-[9px] text-slate-400 bg-slate-950 p-4 rounded-xl overflow-x-auto font-mono whitespace-pre border border-white/5 max-h-48 leading-relaxed custom-scrollbar">
                                {log.stack}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI HEALTH CENTER TAB */}
      {activeTab === "ai_health" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          
          {/* Header Card */}
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 dark:border-white/5 pb-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  AI Background Guardian Active
                </div>
                <h3 className="text-2xl font-black italic uppercase dark:text-white leading-none tracking-tighter flex items-center gap-2">
                  <Activity className="text-emerald-500" size={24} />
                  AI APP HEALTH RECOVERY MODULE
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 leading-relaxed">
                  অ্যাপের ব্যাকগ্রাউন্ড মনিটরিং, টেকনিক্যাল সমস্যা শনাক্তকরণ এবং স্বয়ংক্রিয় সেলফ-হিলিং সেন্টার
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  disabled={isScanning}
                  onClick={async () => {
                    setIsScanning(true);
                    notify("AI Health Scanning initialized... 🤖🔍");
                    try {
                      await new Promise(resolve => setTimeout(resolve, 1500));
                      const results = await runAIHealthScanAndRecovery(true);
                      if (results.issuesDetected.length > 0) {
                        notify(`Scan complete: Detected ${results.issuesDetected.length} issues and resolved them. 🛠️`);
                      } else {
                        notify("Scan complete: No technical anomalies found. All systems healthy! 🍏");
                      }
                    } catch (e) {
                      notify("Scan failed to complete.");
                    } finally {
                      setIsScanning(false);
                    }
                  }}
                  className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 border cursor-pointer select-none ${
                    isScanning
                      ? "bg-slate-150 dark:bg-slate-800 text-slate-400 border-transparent animate-pulse"
                      : "bg-emerald-500 text-white border-emerald-400/20 hover:bg-emerald-600 shadow-lg shadow-emerald-500/15"
                  }`}
                >
                  <RefreshCw size={12} className={isScanning ? "animate-spin" : ""} />
                  <span>{isScanning ? "Scanning..." : "Scan Now (স্ক্যান করুন)"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    clearAIRecoveryHistory();
                    notify("AI Recovery History cleared successfully. 🧼");
                  }}
                  className="bg-slate-50 dark:bg-slate-800 hover:bg-red-500/10 hover:text-red-500 border border-slate-200 dark:border-white/5 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Clear History Logs
                </button>
              </div>
            </div>

            {/* Core Diagnostics Grid (Bento Style) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              
              {/* Health Score Ring (Visual Health Status Gauge) */}
              <div className="md:col-span-1 bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 flex flex-col items-center justify-center text-center space-y-4 shadow-inner">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck size={13} className={`${aiMetrics.healthScore >= 90 ? "text-emerald-500 animate-pulse" : aiMetrics.healthScore >= 75 ? "text-amber-500" : "text-rose-500 animate-bounce"}`} />
                  App Health Score
                </span>
                
                <div className="relative w-36 h-36 flex items-center justify-center">
                  {/* Outer subtle rotating dashboard ring */}
                  <div className="absolute inset-0 rounded-full border border-dashed border-slate-200 dark:border-white/5 animate-[spin_180s_linear_infinite]" />
                  
                  {/* Gauge SVG with dynamic linear gradient styling */}
                  <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    <defs>
                      <linearGradient id="gaugeExcellent" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <linearGradient id="gaugeWarning" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                      <linearGradient id="gaugeCritical" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f43f5e" />
                        <stop offset="100%" stopColor="#be123c" />
                      </linearGradient>
                    </defs>

                    {/* Circular Track Background */}
                    <circle
                      cx="60"
                      cy="60"
                      r="48"
                      className="stroke-slate-200 dark:stroke-white/5"
                      strokeWidth="7"
                      fill="transparent"
                    />

                    {/* Circular Progress Arc */}
                    <circle
                      cx="60"
                      cy="60"
                      r="48"
                      stroke={
                        aiMetrics.healthScore >= 90
                          ? "url(#gaugeExcellent)"
                          : aiMetrics.healthScore >= 75
                          ? "url(#gaugeWarning)"
                          : "url(#gaugeCritical)"
                      }
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray="301.6"
                      strokeDashoffset={301.6 - (301.6 * aiMetrics.healthScore) / 100}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />

                    {/* Dashboard Tick Indicators */}
                    {[...Array(12)].map((_, i) => {
                      const angle = (i * 30 * Math.PI) / 180;
                      const x1 = 60 + 40 * Math.cos(angle);
                      const y1 = 60 + 40 * Math.sin(angle);
                      const x2 = 60 + 44 * Math.cos(angle);
                      const y2 = 60 + 44 * Math.sin(angle);
                      return (
                        <line
                          key={i}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          className="stroke-slate-300 dark:stroke-white/10"
                          strokeWidth="1.5"
                        />
                      );
                    })}
                  </svg>

                  {/* Centered Readout Metrics */}
                  <div className="text-center z-10 space-y-1">
                    <span className="text-4xl font-black font-mono tracking-tighter text-slate-800 dark:text-white block animate-pulse">
                      {aiMetrics.healthScore}%
                    </span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                      aiMetrics.healthScore >= 90
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : aiMetrics.healthScore >= 75
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                    }`}>
                      {aiMetrics.healthScore >= 90 ? "Excellent" : aiMetrics.healthScore >= 75 ? "Warning" : "Critical"}
                    </span>
                  </div>
                </div>

                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                  Active diagnostic checkup rating of system integrity
                </p>
              </div>

              {/* Status Indicators Deck */}
              <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
                
                {/* Server Status */}
                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 space-y-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Server Core Status</span>
                    <div className={`w-2 h-2 rounded-full ${
                      aiMetrics.serverStatus === 'healthy' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-amber-500"
                    }`}></div>
                  </div>
                  <div>
                    <h4 className="text-2xl font-black font-mono tracking-tight text-slate-800 dark:text-white uppercase italic">
                      {aiMetrics.serverStatus === 'healthy' ? "Healthy" : aiMetrics.serverStatus === 'warning' ? "Warning" : "Critical"}
                    </h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 leading-relaxed">
                      CDN Nodes, edge distribution, and server latency is fully within normal thresholds (~32ms).
                    </p>
                  </div>
                </div>

                {/* Database Connection */}
                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 space-y-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Database Storage</span>
                    <div className={`w-2 h-2 rounded-full ${
                      aiMetrics.databaseStatus === 'connected' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-amber-500"
                    }`}></div>
                  </div>
                  <div>
                    <h4 className="text-2xl font-black font-mono tracking-tight text-slate-800 dark:text-white uppercase italic">
                      {aiMetrics.databaseStatus === 'connected' ? "Connected" : "Moderate Quota"}
                    </h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 leading-relaxed">
                      Real-time Firestore listeners synced securely with offline persistence safeguard fallback routing.
                    </p>
                  </div>
                </div>

                {/* API Status */}
                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 space-y-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">API Status Center</span>
                    <div className={`w-2 h-2 rounded-full ${
                      aiMetrics.apiStatus === 'online' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-amber-500"
                    }`}></div>
                  </div>
                  <div>
                    <h4 className="text-2xl font-black font-mono tracking-tight text-slate-800 dark:text-white uppercase italic">
                      {aiMetrics.apiStatus === 'online' ? "Online" : "Degraded"}
                    </h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 leading-relaxed">
                      Gateway communication protocols, Telegram bot listeners, and sponsor ad proxies active.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* AI Control Deck Panel */}
            <div className="bg-slate-50 dark:bg-slate-950 p-6 md:p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 space-y-8">
              <div>
                <h4 className="text-xs font-black uppercase italic text-slate-800 dark:text-slate-100 tracking-wider">
                  🤖 AI SCANNER CONFIGURATION & SCHEDULER
                </h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                  এখানে আপনি স্বয়ংক্রিয় ব্যাকগ্রাউন্ড স্ক্যান এবং সেলফ-হিলিং রুলস কন্ট্রোল করতে পারবেন
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Toggle 1: Auto Scan */}
                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-100">Auto background scan</span>
                    <p className="text-[8px] text-slate-400 uppercase font-bold">স্বয়ংক্রিয় ব্যাকগ্রাউন্ড স্ক্যানিং</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...aiConfig, autoScan: !aiConfig.autoScan };
                      setAiConfig(updated);
                      saveAIRecoveryConfig(updated);
                      notify(updated.autoScan ? "Auto scan enabled! 🛰️" : "Auto scan disabled.");
                    }}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none cursor-pointer ${
                      aiConfig.autoScan ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-800"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${
                      aiConfig.autoScan ? "translate-x-6" : "translate-x-0"
                    }`}></div>
                  </button>
                </div>

                {/* Toggle 2: Auto Recovery */}
                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-100">Auto Self-Healing</span>
                    <p className="text-[8px] text-slate-400 uppercase font-bold">স্বয়ংক্রিয় সমস্যা সমাধান রুলস</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...aiConfig, autoRecovery: !aiConfig.autoRecovery };
                      setAiConfig(updated);
                      saveAIRecoveryConfig(updated);
                      notify(updated.autoRecovery ? "Auto recovery enabled! 🛠️" : "Auto recovery disabled.");
                    }}
                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none cursor-pointer ${
                      aiConfig.autoRecovery ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-800"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${
                      aiConfig.autoRecovery ? "translate-x-6" : "translate-x-0"
                    }`}></div>
                  </button>
                </div>

                {/* Schedule Interval Selection */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Scan Interval Schedule</span>
                  <div className="grid grid-cols-5 gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-100 dark:border-white/5">
                    {(['5m', '10m', '30m', '1h', 'custom'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const updated = { ...aiConfig, scanSchedule: opt };
                          setAiConfig(updated);
                          saveAIRecoveryConfig(updated);
                          notify(`Scan interval schedule updated to: ${opt.toUpperCase()} ⏰`);
                        }}
                        className={`py-2 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          aiConfig.scanSchedule === opt
                            ? "bg-slate-900 text-white dark:bg-slate-800"
                            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Custom schedules */}
              {aiConfig.scanSchedule === 'custom' && (
                <div className="flex items-center gap-4 border-t border-slate-100 dark:border-white/5 pt-4 animate-in slide-in-from-top-2">
                  <div className="w-full max-w-xs space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Custom scan minutes</label>
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      value={aiConfig.customMinutes || 15}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 15);
                        const updated = { ...aiConfig, customMinutes: val };
                        setAiConfig(updated);
                        saveAIRecoveryConfig(updated);
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-150 dark:border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-4">
                    Interval updated dynamically on every target minute change.
                  </p>
                </div>
              )}

              {/* Schedule time visual summaries */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-white/5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                <div>
                  LAST SYSTEM SCAN: <span className="font-mono text-slate-600 dark:text-slate-200">{aiConfig.lastScanTime ? new Date(aiConfig.lastScanTime).toLocaleString() : 'NEVER SCANNED'}</span>
                </div>
                <div>
                  NEXT SCHEDULED SCAN: <span className="font-mono text-emerald-500">{aiConfig.nextScanTime ? new Date(aiConfig.nextScanTime).toLocaleString() : 'AUTO-SCAN DISABLED'}</span>
                </div>
              </div>
            </div>

            {/* Critical Security Safeguard Indicator */}
            <div className="bg-amber-500/10 border-2 border-amber-500/10 p-5 rounded-[2rem] flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center shrink-0">
                <ICONS.Shield size={24} />
              </div>
              <div className="space-y-1">
                <h5 className="text-[10px] font-black text-amber-500 uppercase tracking-wider">🔒 SECURITY ENFORCEMENT & SANDBOX SAFETY ENGAGED</h5>
                <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed">
                  এআই অ্যাপ হেলথ রিকভারি শুধুমাত্র টেকনিক্যাল সমস্যা (UI Reload, Broken links, API failed, cache clear) সমাধান করবে। এটি কখনো ব্যবহারকারীর ব্যালেন্স, মেম্বারশিপ, রেফারেল ইনকাম, টাস্ক এপ্রুভাল বা উইথড্রাল স্ট্যাটাস পরিবর্তন করতে পারবে না।
                </p>
              </div>
            </div>

            {/* Active System Error Logs vs Self-Healing Recovery History Tabs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
              
              {/* Technical Issues captured */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2">
                  <h4 className="text-xs font-black uppercase italic text-slate-800 dark:text-white tracking-widest flex items-center gap-2">
                    <Terminal size={14} className="text-indigo-500" />
                    Captured Technical Incidents
                  </h4>
                  <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-full font-black">
                    {auditLogs.length} LOGS
                  </span>
                </div>

                {auditLogs.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-slate-150 dark:border-white/5 rounded-[2rem] bg-slate-50/50 dark:bg-slate-900/30">
                    <CheckCircle2 size={24} className="text-[#10b981] mx-auto mb-2 opacity-60" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Perfect Status: No Errors Captured</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    {auditLogs.slice(0, 15).map((log) => (
                      <div key={log.id} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between text-[8px] font-black uppercase text-slate-400 tracking-widest">
                          <span className={log.type === 'api' ? 'text-amber-500' : 'text-red-500'}>{log.type}</span>
                          <span className="font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-[10px] font-black text-slate-700 dark:text-slate-200 truncate">{log.context}</p>
                        <p className="text-[9px] font-bold font-mono text-slate-400 break-all">{log.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Self-Healing Recovery History */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2">
                  <h4 className="text-xs font-black uppercase italic text-slate-800 dark:text-white tracking-widest flex items-center gap-2">
                    <Activity size={14} className="text-emerald-500" />
                    AI Self-Healing Recovery History
                  </h4>
                  <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-black">
                    {aiHistory.length} RECOVERIES
                  </span>
                </div>

                {aiHistory.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-slate-150 dark:border-white/5 rounded-[2rem] bg-slate-50/50 dark:bg-slate-900/30">
                    <CheckSquare size={24} className="text-slate-300 mx-auto mb-2 opacity-60" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">No Recovery Reports Registered Yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    {aiHistory.map((rep) => (
                      <div key={rep.id} className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-emerald-500/10 space-y-3.5 hover:border-emerald-500/25 transition-all">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 tracking-wider">
                            {rep.issueType}
                          </span>
                          <span className="text-[8px] font-bold font-mono text-slate-400">
                            {new Date(rep.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Incident Description:</p>
                          <p className="text-[10px] font-black text-slate-700 dark:text-slate-100 leading-relaxed">{rep.description}</p>
                        </div>

                        <div className="space-y-1 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Root Cause Analysis:</p>
                          <p className="text-[9px] font-bold font-mono text-slate-300 leading-relaxed italic">{rep.rootCause}</p>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Self-Healing Actions Performed:</p>
                          <ul className="space-y-1 pl-3 text-[9px] font-bold text-slate-400 uppercase tracking-wide list-disc">
                            {rep.actionsTaken.map((act, i) => (
                              <li key={i} className="text-emerald-500/90">{act}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* REFERRAL TARGETS MANAGEMENT TAB */}
      {activeTab === "targets" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
              <div>
                <h3 className="text-xl font-black italic uppercase dark:text-white leading-none tracking-tighter flex items-center gap-2">
                  <span>🎯</span> REFERRAL TARGET MANAGER (রেফারাল টার্গেট কন্ট্রোল)
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                  দৈনিক, সাপ্তাহিক, বা মাসিক রেফারাল গোল এবং বোনাস বোনাস সেট করুন। ইউজার টার্গেট পূরণ করলে বোনাস টাকার সাথে তার অ্যাকাউন্ট ক্যাটাগরি স্বয়ংক্রিয়ভাবে আপগ্রেড হয়ে যাবে।
                </p>
              </div>
            </div>

            {/* Sub Tabs: Manage targets vs Target history */}
            <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-950 rounded-2xl w-fit border border-slate-100 dark:border-white/5">
              <button 
                onClick={() => setApprovalSubTab("membership" as any)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${approvalSubTab === ("membership" as any) ? "bg-[#10b981] text-white shadow-md shadow-emerald-500/10" : "text-slate-400 hover:text-[#10b981]"}`}
              >
                Manage Targets (টার্গেট তৈরি ও পরিচালনা)
              </button>
              <button 
                onClick={() => setApprovalSubTab("tasks" as any)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${approvalSubTab === ("tasks" as any) ? "bg-[#10b981] text-white shadow-md shadow-emerald-500/10" : "text-slate-400 hover:text-[#10b981]"}`}
              >
                Target History (সকল টার্গেট হিস্ট্রি)
              </button>
            </div>

            {approvalSubTab === ("membership" as any) && (
              <div className="space-y-8">
                {/* Form to create a new target */}
                <div className="bg-slate-50 dark:bg-slate-950 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-white/5 space-y-6">
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Create New Target (নতুন রেফারাল টার্গেট যোগ করুন)
                  </h4>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const formData = new FormData(form);
                    
                    const title = formData.get("title") as string;
                    const description = formData.get("description") as string;
                    const periodType = formData.get("periodType") as 'daily' | 'weekly' | 'monthly';
                    const targetRole = formData.get("targetRole") as 'all' | 'user' | 'monitor';
                    const referralGoal = parseInt(formData.get("referralGoal") as string);
                    const bonusReward = parseFloat(formData.get("bonusReward") as string);
                    const assignedToInput = formData.get("assignedToIds") as string;

                    if (!title || !referralGoal || !bonusReward) {
                      notify("দয়া করে প্রয়োজনীয় সকল তথ্য পূরণ করুন!");
                      return;
                    }

                    const assignedToIds = assignedToInput 
                      ? assignedToInput.split(",").map(id => id.trim()).filter(Boolean) 
                      : [];

                    const newTarget: ReferralTarget = {
                      id: "tgt_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36),
                      title,
                      description,
                      periodType,
                      targetRole,
                      referralGoal,
                      bonusReward,
                      assignedToIds,
                      createdAt: new Date().toLocaleDateString(),
                      isActive: true
                    };

                    if (setTargets) {
                      setTargets(prev => [newTarget, ...prev]);
                    }
                    form.reset();
                    notify("নতুন রেফারাল টার্গেট সফলভাবে যোগ করা হয়েছে!");
                  }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Target Title (টার্গেট টাইটেল) *</label>
                      <input required name="title" type="text" placeholder="e.g., Daily 10 Referrals Challenge" className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#10b981] font-bold dark:text-white" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Target Description (টার্গেট বিবরণ)</label>
                      <input name="description" type="text" placeholder="e.g., Refer 10 users today and earn bonus reward instantly" className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#10b981] font-bold dark:text-white" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Period Type (সময়সীমা) *</label>
                      <select name="periodType" className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#10b981] font-bold dark:text-white">
                        <option value="daily">Daily (দৈনিক)</option>
                        <option value="weekly">Weekly (সাপ্তাহিক)</option>
                        <option value="monthly">Monthly (মাসিক)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Target Audience Role (টার্গেট গ্রুপ) *</label>
                      <select name="targetRole" className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#10b981] font-bold dark:text-white">
                        <option value="all">All Users & Monitors (সবাই)</option>
                        <option value="user">General Users Only (শুধুমাত্র সাধারণ ব্যবহারকারী)</option>
                        <option value="monitor">Monitors Only (শুধুমাত্র মনিটরগণ)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Referral Goal Count (রেফারাল সংখ্যা লক্ষ্য) *</label>
                      <input required name="referralGoal" type="number" min="1" placeholder="e.g., 10" className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#10b981] font-bold dark:text-white" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Bonus Reward (৳) *</label>
                      <input required name="bonusReward" type="number" step="0.01" min="0" placeholder="e.g., 150" className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#10b981] font-bold dark:text-white" />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Specific User IDs (নির্দিষ্ট ব্যবহারকারী, কমা দ্বারা আলাদা করুন - Optional)</label>
                      <input name="assignedToIds" type="text" placeholder="e.g., user123, user456" className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#10b981] font-bold dark:text-white font-mono" />
                    </div>

                    <div className="md:col-span-2 pt-2">
                      <button type="submit" className="w-full md:w-auto bg-[#10b981] hover:bg-emerald-600 text-white font-black px-8 py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all">
                        <Plus size={16} /> Add Referral Target
                      </button>
                    </div>
                  </form>
                </div>

                {/* List of active targets */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Existing Referral Targets ({targets.length})
                  </h4>
                  {targets.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-bold bg-slate-50 dark:bg-slate-950 rounded-3xl">
                      No referral targets created yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {targets.map(tgt => (
                        <div key={tgt.id} className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-white/5 space-y-4 relative overflow-hidden shadow-sm">
                          {!tgt.isActive && (
                            <div className="absolute top-3 right-3 bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                              Paused
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-500 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                                {tgt.periodType}
                              </span>
                              <span className="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-500 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                                Role: {tgt.targetRole}
                              </span>
                            </div>
                            <h5 className="font-bold text-slate-800 dark:text-slate-100 text-base">
                              {tgt.title}
                            </h5>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                              {tgt.description}
                            </p>
                          </div>

                          <div className="grid grid-cols-3 gap-2 border-t border-b border-slate-100 dark:border-white/5 py-3 text-center">
                            <div>
                              <div className="text-[8px] font-black text-slate-400 uppercase">Goal</div>
                              <div className="text-sm font-black text-slate-800 dark:text-slate-200">{tgt.referralGoal} Refs</div>
                            </div>
                            <div>
                              <div className="text-[8px] font-black text-slate-400 uppercase">Bonus</div>
                              <div className="text-sm font-black text-[#10b981]">৳{tgt.bonusReward}</div>
                            </div>
                            <div>
                              <div className="text-[8px] font-black text-slate-400 uppercase">Target Users</div>
                              <div className="text-sm font-black text-slate-800 dark:text-slate-200">
                                {tgt.assignedToIds && tgt.assignedToIds.length > 0 ? `${tgt.assignedToIds.length} Spec` : 'Global'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 pt-2">
                            <button 
                              onClick={() => {
                                if (setTargets) {
                                  setTargets(prev => prev.map(t => t.id === tgt.id ? { ...t, isActive: !t.isActive } : t));
                                }
                                notify(tgt.isActive ? "টার্গেট সাময়িকভাবে স্থগিত করা হয়েছে!" : "টার্গেট সক্রিয় করা হয়েছে!");
                              }}
                              className={`flex-1 font-black py-2.5 rounded-xl text-xs transition-all ${tgt.isActive ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-[#10b981] hover:bg-emerald-600 text-white"}`}
                            >
                              {tgt.isActive ? "Pause Target" : "Activate Target"}
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm("আপনি কি এই টার্গেটটি মুছে ফেলতে চান?")) {
                                  if (setTargets) {
                                    setTargets(prev => prev.filter(t => t.id !== tgt.id));
                                  }
                                  notify("টার্গেট সফলভাবে মুছে ফেলা হয়েছে!");
                                }
                              }}
                              className="p-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {approvalSubTab === ("tasks" as any) && (
              <div className="space-y-6 animate-in fade-in">
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  User Referral Target Completions ({targetHistories.length})
                </h4>
                {targetHistories.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-bold bg-slate-50 dark:bg-slate-950 rounded-3xl">
                    No target completions recorded yet.
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-white/5 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase tracking-wider text-slate-400">
                          <tr>
                            <th className="p-4">User Details</th>
                            <th className="p-4">Target Information</th>
                            <th className="p-4">Period</th>
                            <th className="p-4">Achievement</th>
                            <th className="p-4">Bonus Earned</th>
                            <th className="p-4">Claimed Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-bold">
                          {targetHistories.map(history => (
                            <tr key={history.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-300">
                              <td className="p-4 space-y-1">
                                <div className="font-bold dark:text-white">{history.userName}</div>
                                <div className="text-[10px] font-mono text-slate-400">{history.userEmail}</div>
                                <div className="text-[9px] font-mono text-indigo-400">ID: {history.userId}</div>
                              </td>
                              <td className="p-4">
                                <div className="font-bold dark:text-white">{history.targetTitle}</div>
                                <div className="text-[9px] font-mono text-slate-400 uppercase">Type: {history.periodType}</div>
                              </td>
                              <td className="p-4 font-mono">
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-1 rounded">
                                  {history.periodId}
                                </span>
                              </td>
                              <td className="p-4 font-mono text-emerald-500">
                                {history.referralsAchieved} / {history.referralGoal}
                              </td>
                              <td className="p-4 font-black text-emerald-500">
                                ৳{history.bonusReward}
                              </td>
                              <td className="p-4 text-slate-400 font-mono">
                                {new Date(history.completedAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* APPROVALS TAB CONTENT */}
      {activeTab === "approvals" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="flex gap-2 p-1 bg-white dark:bg-slate-900 rounded-2xl w-fit mx-auto shadow-sm border border-slate-100 dark:border-white/5">
            {(!isMonitor || permissions.canApproveMembership) && (
              <button
                type="button"
                onClick={() => setApprovalSubTab("membership")}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${approvalSubTab === "membership" ? "bg-[#10b981] text-white shadow-lg" : "text-slate-400 hover:text-[#10b981]"}`}
              >
                Upgrades ({stats.pendingMembers})
              </button>
            )}
            {(!isMonitor || permissions.canApproveDeposits) && (
              <button
                type="button"
                onClick={() => setApprovalSubTab("deposit")}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${approvalSubTab === "deposit" ? "bg-[#10b981] text-white shadow-lg" : "text-slate-400 hover:text-[#10b981]"}`}
              >
                Deposits ({stats.pendingDeposits})
              </button>
            )}
            {(!isMonitor || permissions.canApproveTaskSubmissions) && (
              <button
                type="button"
                onClick={() => setApprovalSubTab("tasks")}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${approvalSubTab === "tasks" ? "bg-[#10b981] text-white shadow-lg" : "text-slate-400 hover:text-[#10b981]"}`}
              >
                Missions ({stats.pendingTasks})
              </button>
            )}
          </div>

          {/* 1. MISSIONS SUB-TAB */}
          {approvalSubTab === "tasks" &&
          (!isMonitor || permissions.canApproveTaskSubmissions) && (
            <div className="space-y-6">
              {selectedTaskCategory === null ? (
                // Category List Screen
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-white/5 p-6 rounded-3xl">
                    <div>
                      <h3 className="text-base font-black italic uppercase dark:text-white leading-none">
                        Mission Proof Categories
                      </h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                        Select a category to view and review proofs
                      </p>
                    </div>
                    <span className="bg-[#10b981]/10 text-[#10b981] px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider border border-[#10b981]/20">
                      {taskCategories.length} Active categories
                    </span>
                  </div>

                  {taskCategories.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {taskCategories.map((cat) => (
                        <div
                          key={cat.taskId}
                          onClick={() => setSelectedTaskCategory(cat.taskId)}
                          className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm hover:border-[#10b981]/30 transition-all cursor-pointer group flex flex-col justify-between h-48 relative overflow-hidden hover:shadow-md animate-in fade-in"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-4xl text-amber-500 group-hover:scale-110 transition-transform">📂</div>
                              <div className="min-w-0">
                                <h4 className="font-black italic text-base uppercase dark:text-white leading-tight group-hover:text-[#10b981] transition-colors truncate">
                                  {cat.taskNumber}
                                </h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5 truncate max-w-[140px]">
                                  {cat.taskTitle}
                                </p>
                              </div>
                            </div>
                            <span className="bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider shrink-0">
                              {cat.pending} Pending
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-white/5 pt-4">
                            <div className="bg-emerald-500/5 p-2 rounded-2xl border border-emerald-500/10 text-center">
                              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Approved Today</div>
                              <div className="text-xs font-black text-emerald-500 mt-1">{cat.approvedToday}</div>
                            </div>
                            <div className="bg-rose-500/5 p-2 rounded-2xl border border-rose-500/10 text-center">
                              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Rejected Today</div>
                              <div className="text-xs font-black text-rose-500 mt-1">{cat.rejectedToday}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5">
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest italic opacity-50">
                        No pending mission proofs.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Selected Category Details Screen
                <div className="space-y-6">
                  {/* Category Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setSelectedTaskCategory(null)}
                        className="bg-white dark:bg-slate-900 text-slate-500 hover:text-[#10b981] p-3 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm transition-all flex items-center justify-center shrink-0"
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <div>
                        <h3 className="text-lg font-black italic uppercase dark:text-white leading-none">
                          📁 {getTaskNumber(selectedTaskCategory)} Submissions
                        </h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                          {tasks.find((t) => t.id === selectedTaskCategory)?.title || "Unknown Campaign"}
                        </p>
                      </div>
                    </div>

                    {/* Quick Stats summary header */}
                    <div className="grid grid-cols-3 gap-3 w-full lg:w-auto min-w-[280px]">
                      <div className="bg-amber-500/10 text-amber-500 px-4 py-2.5 rounded-2xl text-center border border-amber-500/20">
                        <div className="text-[8px] font-black uppercase tracking-wider opacity-70">Pending</div>
                        <div className="text-sm font-black mt-0.5">{selectedTaskCategoryStats.pending}</div>
                      </div>
                      <div className="bg-emerald-500/10 text-emerald-500 px-4 py-2.5 rounded-2xl text-center border border-emerald-500/20">
                        <div className="text-[8px] font-black uppercase tracking-wider opacity-70">Approved Today</div>
                        <div className="text-sm font-black mt-0.5">{selectedTaskCategoryStats.approvedToday}</div>
                      </div>
                      <div className="bg-rose-500/10 text-rose-500 px-4 py-2.5 rounded-2xl text-center border border-rose-500/20">
                        <div className="text-[8px] font-black uppercase tracking-wider opacity-70">Rejected Today</div>
                        <div className="text-sm font-black mt-0.5">{selectedTaskCategoryStats.rejectedToday}</div>
                      </div>
                    </div>
                  </div>

                  {/* Search, Filter & Bulk Actions Bar */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-white/5 flex flex-col gap-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Search size={16} />
                        </span>
                        <input
                          type="text"
                          placeholder="Search User ID, Name, or Submission Date..."
                          value={proofSearchQuery}
                          onChange={(e) => setProofSearchQuery(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:border-[#10b981] font-bold dark:text-white shadow-sm"
                        />
                      </div>
                      
                      <div className="flex gap-2 shrink-0">
                        {(['pending', 'approved', 'rejected'] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => {
                              setProofStatusFilter(status);
                            }}
                            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                              proofStatusFilter === status
                                ? "bg-[#10b981] text-white shadow-md shadow-emerald-500/10"
                                : "bg-white dark:bg-slate-900 text-slate-400 hover:text-[#10b981] border border-slate-100 dark:border-white/5"
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Proof List (FIFO Order) */}
                  {filteredCategoryTasks.length > 0 ? (
                    <div className="space-y-4">
                      {filteredCategoryTasks.map((sub) => (
                        <div
                          key={sub.id}
                          className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-[#10b981]/30 transition-all cursor-pointer group"
                          onClick={() => setViewingProof(sub)}
                        >
                          <div className="flex items-start md:items-center gap-5">
                            <div className="w-12 h-12 bg-[#10b981] text-white rounded-2xl flex items-center justify-center font-black italic shrink-0">
                              ৳
                            </div>
                            <div>
                              <h4 className="font-black italic text-lg uppercase dark:text-white leading-none mb-1 group-hover:text-[#10b981] transition-colors flex items-center gap-2">
                                {sub.userName}
                                <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-lg normal-case font-mono tracking-tight">
                                  ID: {sub.userId}
                                </span>
                              </h4>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex flex-wrap gap-x-3 gap-y-1">
                                <span>{getTaskNumber(sub.taskId)} • {sub.taskTitle}</span>
                                <span>⏱️ Submitted: {new Date(sub.submittedAt).toLocaleString()}</span>
                              </p>
                              {sub.textProof && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100/50 dark:border-white/5 italic">
                                  "{sub.textProof}"
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:justify-end gap-4">
                            <div className="flex flex-wrap gap-1.5 max-w-[200px] justify-end">
                              {(sub.screenshots || []).map((s, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxImage(s);
                                  }}
                                  className="bg-[#10b981]/10 hover:bg-[#10b981]/25 text-[#10b981] border border-[#10b981]/20 font-black px-2.5 py-1.5 rounded-xl text-[8px] uppercase tracking-wide transition-all flex items-center gap-1 shrink-0"
                                >
                                  <ICONS.Link size={8} />
                                  <span>File {i + 1}</span>
                                </button>
                              ))}
                            </div>

                            {proofStatusFilter === "pending" ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleApproveTaskProof(sub);
                                  }}
                                  className="bg-emerald-500/10 text-emerald-600 p-3 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                  title="Approve"
                                >
                                  <ICONS.Check size={18} />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRejectTaskProof(sub);
                                  }}
                                  className="bg-red-500/10 text-red-500 p-3 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                  title="Reject"
                                >
                                  <ICONS.XCircle size={18} />
                                </button>
                              </div>
                            ) : (
                              <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider ${
                                sub.status === "approved" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                              }`}>
                                {sub.status}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5">
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest italic opacity-50">
                        No submissions found matching criteria.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2. DEPOSITS SUB-TAB */}
          {approvalSubTab === "deposit" &&
          (!isMonitor || permissions.canApproveDeposits) && (
            <div className="space-y-6">
              {selectedGatewayCategory === null ? (
                // Deposit Gateway Categories List
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-white/5 p-6 rounded-3xl">
                    <div>
                      <h3 className="text-base font-black italic uppercase dark:text-white leading-none">
                        Deposit Gateway Categories
                      </h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                        Select a payment gateway category to review deposit proofs
                      </p>
                    </div>
                    <span className="bg-[#10b981]/10 text-[#10b981] px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider border border-[#10b981]/20">
                      {depositCategories.length} Active gateways
                    </span>
                  </div>

                  {depositCategories.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {depositCategories.map((cat) => (
                        <div
                          key={cat.gateway}
                          onClick={() => setSelectedGatewayCategory(cat.gateway)}
                          className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm hover:border-[#10b981]/30 transition-all cursor-pointer group flex flex-col justify-between h-48 relative overflow-hidden hover:shadow-md animate-in fade-in"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-4xl text-emerald-500 group-hover:scale-110 transition-transform">📂</div>
                              <div>
                                <h4 className="font-black italic text-base uppercase dark:text-white leading-tight group-hover:text-emerald-500 transition-colors">
                                  {cat.gateway} Payments
                                </h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                  Deposit Gateway
                                </p>
                              </div>
                            </div>
                            <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider">
                              {cat.pending} Pending
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-white/5 pt-4">
                            <div className="bg-emerald-500/5 p-2 rounded-2xl border border-emerald-500/10 text-center">
                              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Approved Today</div>
                              <div className="text-xs font-black text-emerald-500 mt-1">{cat.approvedToday}</div>
                            </div>
                            <div className="bg-rose-500/5 p-2 rounded-2xl border border-rose-500/10 text-center">
                              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Rejected Today</div>
                              <div className="text-xs font-black text-rose-500 mt-1">{cat.rejectedToday}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5">
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest italic opacity-50">
                        No pending deposits.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Deposit Details Screen
                <div className="space-y-6">
                  {/* Gateway Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setSelectedGatewayCategory(null)}
                        className="bg-white dark:bg-slate-900 text-slate-500 hover:text-[#10b981] p-3 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm transition-all flex items-center justify-center shrink-0"
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <div>
                        <h3 className="text-lg font-black italic uppercase dark:text-white leading-none">
                          📁 {selectedGatewayCategory} Deposits
                        </h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                          Auditing pending deposit requests
                        </p>
                      </div>
                    </div>

                    {/* Quick Stats summary header */}
                    <div className="grid grid-cols-3 gap-3 w-full lg:w-auto min-w-[280px]">
                      <div className="bg-amber-500/10 text-amber-500 px-4 py-2.5 rounded-2xl text-center border border-amber-500/20">
                        <div className="text-[8px] font-black uppercase tracking-wider opacity-70">Pending</div>
                        <div className="text-sm font-black mt-0.5">{selectedDepositGatewayStats.pending}</div>
                      </div>
                      <div className="bg-emerald-500/10 text-emerald-500 px-4 py-2.5 rounded-2xl text-center border border-emerald-500/20">
                        <div className="text-[8px] font-black uppercase tracking-wider opacity-70">Approved Today</div>
                        <div className="text-sm font-black mt-0.5">{selectedDepositGatewayStats.approvedToday}</div>
                      </div>
                      <div className="bg-rose-500/10 text-rose-500 px-4 py-2.5 rounded-2xl text-center border border-rose-500/20">
                        <div className="text-[8px] font-black uppercase tracking-wider opacity-70">Rejected Today</div>
                        <div className="text-sm font-black mt-0.5">{selectedDepositGatewayStats.rejectedToday}</div>
                      </div>
                    </div>
                  </div>

                  {/* Search, Filter & Bulk Actions Bar */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-white/5 flex flex-col gap-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Search size={16} />
                        </span>
                        <input
                          type="text"
                          placeholder="Search User ID, Name, Gateway, or Date..."
                          value={proofSearchQuery}
                          onChange={(e) => setProofSearchQuery(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:border-[#10b981] font-bold dark:text-white shadow-sm"
                        />
                      </div>
                      
                      <div className="flex gap-2 shrink-0">
                        {(['pending', 'approved', 'rejected'] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => {
                              setProofStatusFilter(status);
                            }}
                            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                              proofStatusFilter === status
                                ? "bg-[#10b981] text-white shadow-md shadow-emerald-500/10"
                                : "bg-white dark:bg-slate-900 text-slate-400 hover:text-[#10b981] border border-slate-100 dark:border-white/5"
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Deposits List (FIFO Order) */}
                  {filteredCategoryDeposits.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredCategoryDeposits.map((req) => (
                        <div
                          key={req.id}
                          className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-6 hover:border-[#10b981]/30 transition-all flex flex-col justify-between"
                        >
                          <div className="space-y-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex gap-2.5 items-start">
                                <div>
                                  <h4 className="font-black italic text-lg uppercase dark:text-white leading-none mb-1 flex items-center gap-1.5 flex-wrap">
                                    {req.userName}
                                    <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-lg normal-case font-mono tracking-tight shrink-0">
                                      ID: {req.userId}
                                    </span>
                                  </h4>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">
                                    Deposit via {req.method} • {new Date(req.date).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <span className="text-2xl font-black italic text-[#10b981] shrink-0">
                                ৳{req.amount}
                              </span>
                            </div>

                            {req.screenshot && (
                              <div
                                className="relative group cursor-zoom-in"
                                onClick={() => setViewingDepositProof(req)}
                              >
                                <img
                                  src={req.screenshot}
                                  className="w-full h-40 object-cover rounded-2xl border border-white/10 transition-all group-hover:opacity-80"
                                  referrerPolicy="no-referrer"
                                  alt="Proof"
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="bg-black/60 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    View Full Proof
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                              <p className="text-[10px] font-black text-[#10b981] uppercase tracking-widest leading-none truncate">
                                TRX: {req.transactionId}
                              </p>
                            </div>
                          </div>

                          {proofStatusFilter === "pending" ? (
                            <div className="flex gap-2 mt-4">
                              <button
                                onClick={() => handleApproveDeposit(req)}
                                className="flex-1 bg-[#10b981] text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-emerald-600 transition-all"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectDeposit(req.id)}
                                className="px-6 bg-red-50 text-red-500 py-4 rounded-2xl font-black uppercase text-[10px] hover:bg-red-100 transition-all"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <div className="text-right mt-4">
                              <span className={`inline-block px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider ${
                                req.status === "approved" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                              }`}>
                                {req.status}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5">
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest italic opacity-50">
                        No deposit requests found matching criteria.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. MEMBERSHIP UPGRADES SUB-TAB */}
          {approvalSubTab === "membership" &&
          (!isMonitor || permissions.canApproveMembership) && (
            <div className="space-y-6">
              {selectedGatewayCategory === null ? (
                // Upgrades Gateway Categories List
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-white/5 p-6 rounded-3xl">
                    <div>
                      <h3 className="text-base font-black italic uppercase dark:text-white leading-none">
                        Upgrade Gateway Categories
                      </h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                        Select a payment gateway category to review account upgrades
                      </p>
                    </div>
                    <span className="bg-[#10b981]/10 text-[#10b981] px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider border border-[#10b981]/20">
                      {membershipCategories.length} Active gateways
                    </span>
                  </div>

                  {membershipCategories.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {membershipCategories.map((cat) => (
                        <div
                          key={cat.gateway}
                          onClick={() => setSelectedGatewayCategory(cat.gateway)}
                          className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-white/5 shadow-sm hover:border-blue-500/30 transition-all cursor-pointer group flex flex-col justify-between h-48 relative overflow-hidden hover:shadow-md animate-in fade-in"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="text-4xl text-blue-500 group-hover:scale-110 transition-transform">📂</div>
                              <div>
                                <h4 className="font-black italic text-base uppercase dark:text-white leading-tight group-hover:text-blue-500 transition-colors">
                                  {cat.gateway} Upgrades
                                </h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                  Membership Plan Gateway
                                </p>
                              </div>
                            </div>
                            <span className="bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider">
                              {cat.pending} Pending
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-white/5 pt-4">
                            <div className="bg-emerald-500/5 p-2 rounded-2xl border border-emerald-500/10 text-center">
                              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Approved Today</div>
                              <div className="text-xs font-black text-emerald-500 mt-1">{cat.approvedToday}</div>
                            </div>
                            <div className="bg-rose-500/5 p-2 rounded-2xl border border-rose-500/10 text-center">
                              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Rejected Today</div>
                              <div className="text-xs font-black text-rose-500 mt-1">{cat.rejectedToday}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5">
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest italic opacity-50">
                        No pending account upgrades.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                // Upgrade Details Screen
                <div className="space-y-6">
                  {/* Gateway Header */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setSelectedGatewayCategory(null)}
                        className="bg-white dark:bg-slate-900 text-slate-500 hover:text-[#10b981] p-3 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm transition-all flex items-center justify-center shrink-0"
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <div>
                        <h3 className="text-lg font-black italic uppercase dark:text-white leading-none">
                          📁 {selectedGatewayCategory} Upgrades
                        </h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                          Auditing pending membership upgrades
                        </p>
                      </div>
                    </div>

                    {/* Quick Stats summary header */}
                    <div className="grid grid-cols-3 gap-3 w-full lg:w-auto min-w-[280px]">
                      <div className="bg-amber-500/10 text-amber-500 px-4 py-2.5 rounded-2xl text-center border border-amber-500/20">
                        <div className="text-[8px] font-black uppercase tracking-wider opacity-70">Pending</div>
                        <div className="text-sm font-black mt-0.5">{selectedMembershipGatewayStats.pending}</div>
                      </div>
                      <div className="bg-emerald-500/10 text-emerald-500 px-4 py-2.5 rounded-2xl text-center border border-emerald-500/20">
                        <div className="text-[8px] font-black uppercase tracking-wider opacity-70">Approved Today</div>
                        <div className="text-sm font-black mt-0.5">{selectedMembershipGatewayStats.approvedToday}</div>
                      </div>
                      <div className="bg-rose-500/10 text-rose-500 px-4 py-2.5 rounded-2xl text-center border border-rose-500/20">
                        <div className="text-[8px] font-black uppercase tracking-wider opacity-70">Rejected Today</div>
                        <div className="text-sm font-black mt-0.5">{selectedMembershipGatewayStats.rejectedToday}</div>
                      </div>
                    </div>
                  </div>

                  {/* Search, Filter & Bulk Actions Bar */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-white/5 flex flex-col gap-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Search size={16} />
                        </span>
                        <input
                          type="text"
                          placeholder="Search User ID, Name, Plan, or Date..."
                          value={proofSearchQuery}
                          onChange={(e) => setProofSearchQuery(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-2xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:border-[#10b981] font-bold dark:text-white shadow-sm"
                        />
                      </div>
                      
                      <div className="flex gap-2 shrink-0">
                        {(['pending', 'approved', 'rejected'] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => {
                              setProofStatusFilter(status);
                            }}
                            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                              proofStatusFilter === status
                                ? "bg-[#10b981] text-white shadow-md shadow-emerald-500/10"
                                : "bg-white dark:bg-slate-900 text-slate-400 hover:text-[#10b981] border border-slate-100 dark:border-white/5"
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Membership upgrades list (FIFO Order) */}
                  {filteredCategoryMemberships.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredCategoryMemberships.map((req) => (
                        <div
                          key={req.id}
                          className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-6 hover:border-[#10b981]/30 transition-all flex flex-col justify-between animate-in fade-in"
                        >
                          <div className="space-y-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex gap-2.5 items-start">
                                <div>
                                  <h4 className="font-black italic text-lg uppercase dark:text-white leading-none mb-1 flex items-center gap-1.5 flex-wrap">
                                    {req.userName}
                                    <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-lg normal-case font-mono tracking-tight shrink-0">
                                      ID: {req.userId}
                                    </span>
                                  </h4>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">
                                    {req.planName} • via {req.method} • {new Date(req.date).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <span className="text-2xl font-black italic text-[#10b981] shrink-0">
                                ৳{req.amount}
                              </span>
                            </div>

                            {req.screenshot && (
                              <div
                                className="relative group cursor-zoom-in"
                                onClick={() => setViewingMembershipProof(req)}
                              >
                                <img
                                  src={req.screenshot}
                                  className="w-full h-40 object-cover rounded-2xl border border-white/10 transition-all group-hover:opacity-80"
                                  referrerPolicy="no-referrer"
                                  alt="Proof"
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="bg-black/60 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    View Full Proof
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                              <p className="text-[10px] font-black text-[#10b981] uppercase tracking-widest leading-none truncate">
                                TRX: {req.transactionId}
                              </p>
                            </div>
                          </div>

                          {proofStatusFilter === "pending" ? (
                            <div className="flex gap-2 mt-4">
                              <button
                                onClick={() => handleApproveMembership(req)}
                                className="flex-1 bg-[#10b981] text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-emerald-600 transition-all"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectMembership(req.id)}
                                className="px-6 bg-red-50 text-red-500 py-4 rounded-2xl font-black uppercase text-[10px] hover:bg-red-100 transition-all"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <div className="text-right mt-4">
                              <span className={`inline-block px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider ${
                                req.status === "approved" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                              }`}>
                                {req.status}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-white/5">
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest italic opacity-50">
                        No upgrade requests found matching criteria.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PAYOUTS TAB CONTENT */}
      {activeTab === "payouts" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          {/* PAYOUTS SETTINGS */}
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
            <h3 className="text-[10px] font-black italic uppercase text-slate-400 tracking-[0.2em]">
              PAYOUTS SETTINGS (উইথড্র সেটিংস)
            </h3>
            
            <div className="bg-slate-50 dark:bg-white/5 p-8 rounded-[2.5rem] flex items-center justify-between group">
              <div>
                <h4 className="font-black italic dark:text-white uppercase text-sm leading-none mb-2 text-rose-500">
                  Withdraw Referral Requirement
                </h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-normal">
                  ব্যবহারকারীদের উইথড্র করতে কমপক্ষে ১টি রেফার আবশ্যক করার বাধ্যবাধকতা অন/অফ করুন
                </p>
              </div>
              <button
                onClick={() => {
                  setGlobalConfig((prev) => {
                    const updated = {
                      ...prev,
                      requireReferralToWithdraw: !prev.requireReferralToWithdraw,
                    };
                    saveDocument("config", "global", updated).catch((err) => {
                      console.error("Error saving global config:", err);
                    });
                    notify(
                      !prev.requireReferralToWithdraw
                        ? "উইথড্র করার জন্য ১টি রেফারের বাধ্যবাধকতা চালু করা হয়েছে (Withdraw Referral requirement is now ENABLED)."
                        : "উইথড্র করার জন্য ১টি রেফারের বাধ্যবাধকতা বন্ধ করা হয়েছে (Withdraw Referral requirement is now DISABLED).",
                    );
                    return updated;
                  });
                }}
                className={`w-14 h-8 rounded-full relative transition-all duration-300 shrink-0 ${globalConfig.requireReferralToWithdraw ? "bg-rose-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]" : "bg-slate-200 dark:bg-slate-800"}`}
              >
                <div
                  className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${globalConfig.requireReferralToWithdraw ? "left-7" : "left-1"}`}
                ></div>
              </button>
            </div>
          </div>

          {selectedPayoutCategory === null ? (
            /* CATEGORY DASHBOARD GRID */
            <div className="space-y-8">
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none flex items-center gap-2">
                  <Folder className="text-[#10b981]" size={22} />
                  Payout Module Directory
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  Select a gateway category to manage FIFO queues and bulk-process payout requests.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {payoutCategoriesWithStats.map((cat) => (
                  <div
                    key={cat.name}
                    onClick={() => {
                      setSelectedPayoutCategory(cat.name);
                      setSelectedRequestIds([]);
                      setPayoutStatusFilter("pending");
                      setPayoutSearchQuery("");
                    }}
                    className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-white/5 shadow-sm hover:border-[#10b981]/40 transition-all duration-300 cursor-pointer flex flex-col justify-between group h-72 animate-in zoom-in-95 duration-200"
                  >
                    <div className="flex justify-between items-start">
                      <div className="w-14 h-14 bg-gradient-to-br from-[#10b981]/10 to-emerald-500/5 text-[#10b981] rounded-3xl flex items-center justify-center transition-all group-hover:scale-110">
                        <Folder size={28} className="fill-current" />
                      </div>
                      {cat.pendingCount > 0 && (
                        <span className="bg-amber-500 text-slate-950 font-black uppercase text-[9px] px-3 py-1 rounded-full shadow-lg shadow-amber-500/10">
                          {cat.pendingCount} Pending
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 mt-4">
                      <h4 className="text-xl font-black uppercase italic dark:text-white leading-none">
                        {cat.name} Payouts
                      </h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                        {cat.name === "Other Gateways" ? "Historical/Deleted Gateways" : "Active Gateway Category"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-slate-50 dark:border-white/5 pt-4 mt-2">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          Today's Approved
                        </p>
                        <p className="text-sm font-black text-emerald-500 mt-1">
                          {cat.approvedTodayCount} reqs
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          Total Paid
                        </p>
                        <p className="text-sm font-black text-slate-900 dark:text-white mt-1">
                          ৳{cat.totalPaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {payoutCategoriesWithStats.length === 0 && (
                  <div className="col-span-full bg-white dark:bg-slate-900 rounded-[3rem] p-16 text-center border border-slate-100 dark:border-white/5">
                    <Folder size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                    <h4 className="text-base font-black uppercase italic dark:text-white leading-none mb-2">
                      No Payout Gateways Defined
                    </h4>
                    <p className="text-xs text-slate-400 font-bold max-w-sm mx-auto leading-normal">
                      Please go to HQ Settings to add withdraw payment gateways.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* DETAILED CATEGORY QUEUE */
            <div className="space-y-8 animate-in fade-in duration-200">
              {/* HEADER BUTTONS AND LIVE METRICS */}
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSelectedPayoutCategory(null)}
                      className="bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 p-4 rounded-full text-slate-500 dark:text-slate-300 transition-all active:scale-95"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none flex items-center gap-2">
                        📂 {selectedPayoutCategory} Payouts Queue
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-2">
                        Manage processing lists, search user logs, and perform bulk operations.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedPayoutCategory(null)}
                    className="bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                  >
                    Category List
                  </button>
                </div>

                {/* Live stats grids */}
                {(() => {
                  const stats = payoutCategoriesWithStats.find((c) => c.name === selectedPayoutCategory) || {
                    pendingCount: 0,
                    approvedTodayCount: 0,
                    rejectedTodayCount: 0,
                    totalRequestedAmount: 0,
                    totalPaidAmount: 0,
                  };
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-slate-50 dark:border-white/5">
                      <div className="bg-amber-500/10 text-amber-500 p-5 rounded-2xl border border-amber-500/10">
                        <div className="text-[8px] font-black uppercase tracking-widest">Pending Reqs</div>
                        <div className="text-lg font-black mt-1 leading-none">{stats.pendingCount}</div>
                      </div>
                      <div className="bg-emerald-500/10 text-emerald-500 p-5 rounded-2xl border border-emerald-500/10">
                        <div className="text-[8px] font-black uppercase tracking-widest">Approved Today</div>
                        <div className="text-lg font-black mt-1 leading-none">{stats.approvedTodayCount}</div>
                      </div>
                      <div className="bg-rose-500/10 text-rose-500 p-5 rounded-2xl border border-rose-500/10">
                        <div className="text-[8px] font-black uppercase tracking-widest">Rejected Today</div>
                        <div className="text-lg font-black mt-1 leading-none">{stats.rejectedTodayCount}</div>
                      </div>
                      <div className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-300 p-5 rounded-2xl border border-transparent">
                        <div className="text-[8px] font-black uppercase tracking-widest">Total Requested</div>
                        <div className="text-lg font-black mt-1 leading-none">৳{stats.totalRequestedAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                      </div>
                      <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-[#10b981]/10 to-emerald-500/5 text-[#10b981] p-5 rounded-2xl border border-[#10b981]/10">
                        <div className="text-[8px] font-black uppercase tracking-widest">Total Paid Out</div>
                        <div className="text-lg font-black mt-1 leading-none">৳{stats.totalPaidAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* SEARCH, FILTER & BULK ACTIONS CONTROL PANEL */}
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Search Bar */}
                  <div className="relative flex-1 group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#10b981]">
                      <Search size={16} />
                    </div>
                    <input
                      type="text"
                      placeholder="Search by User Name, User ID, Wallet Account, or Date..."
                      value={payoutSearchQuery}
                      onChange={(e) => setPayoutSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-transparent rounded-2xl pl-12 pr-6 py-4 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#10b981]/30 text-xs font-bold dark:text-white transition-all shadow-inner"
                    />
                  </div>

                  {/* Filter tabs */}
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {(["pending", "approved", "rejected", "all"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setPayoutStatusFilter(status);
                          setSelectedRequestIds([]);
                        }}
                        className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          payoutStatusFilter === status
                            ? "bg-[#10b981] text-white shadow-md shadow-emerald-500/10"
                            : "bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-[#10b981]"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* BULK ACTIONS LINE */}
                {payoutStatusFilter === "pending" && filteredCategoryPayouts.length > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-50 dark:border-white/5 pt-6 animate-in slide-in-from-top-2">
                    {/* Checkbox Select All */}
                    <button
                      type="button"
                      onClick={() => {
                        const allShownPendingIds = filteredCategoryPayouts.map((w) => w.id);
                        const isAllSelected = allShownPendingIds.length > 0 && allShownPendingIds.every((id) => selectedRequestIds.includes(id));
                        if (isAllSelected) {
                          setSelectedRequestIds((prev) => prev.filter((id) => !allShownPendingIds.includes(id)));
                        } else {
                          setSelectedRequestIds((prev) => {
                            const added = allShownPendingIds.filter((id) => !prev.includes(id));
                            return [...prev, ...added];
                          });
                        }
                      }}
                      className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 px-5 py-3 rounded-xl border border-transparent hover:border-slate-100 dark:hover:border-white/5 active:scale-98 transition-all"
                    >
                      {(() => {
                        const allShownPendingIds = filteredCategoryPayouts.map((w) => w.id);
                        const isAllSelected = allShownPendingIds.length > 0 && allShownPendingIds.every((id) => selectedRequestIds.includes(id));
                        return isAllSelected ? (
                          <CheckSquare className="text-[#10b981]" size={16} />
                        ) : (
                          <Square className="text-slate-400" size={16} />
                        );
                      })()}
                      <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider">
                        Select All Shown ({filteredCategoryPayouts.length})
                      </span>
                    </button>

                    {/* Bulk Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={selectedRequestIds.length === 0}
                        onClick={() => {
                          const requestsToApprove = filteredCategoryPayouts.filter((w) => selectedRequestIds.includes(w.id));
                          handleBulkApprove(requestsToApprove);
                        }}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          selectedRequestIds.length > 0
                            ? "bg-[#10b981] hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/15 active:scale-95"
                            : "bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        ⚡ Bulk Approve ({selectedRequestIds.length})
                      </button>
                      <button
                        type="button"
                        disabled={selectedRequestIds.length === 0}
                        onClick={() => {
                          const requestsToReject = filteredCategoryPayouts.filter((w) => selectedRequestIds.includes(w.id));
                          handleBulkReject(requestsToReject);
                        }}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          selectedRequestIds.length > 0
                            ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/15 active:scale-95"
                            : "bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        ❌ Bulk Reject ({selectedRequestIds.length})
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* FIFO LIST RENDERING */}
              <div className="space-y-4">
                {payoutStatusFilter === "pending" && (
                  <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/10 rounded-2xl flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase text-amber-600 tracking-widest flex items-center gap-2 leading-none">
                      ⚠️ FIFO Queue Activated (First Submitted, First Served)
                    </p>
                    <span className="text-[8px] font-bold text-amber-500 uppercase">Oldest requests are on top</span>
                  </div>
                )}

                {filteredCategoryPayouts.map((wd) => {
                  const isSelected = selectedRequestIds.includes(wd.id);
                  const usr = (users || []).find((u) => u.id === wd.userId);
                  const userUid = usr ? usr.uid : "N/A";
                  const displayUserName = usr ? usr.name : wd.userName;

                  return (
                    <div
                      key={wd.id}
                      className={`bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md ${
                        isSelected
                          ? "border-[#10b981] bg-emerald-50/5 dark:bg-emerald-950/5 shadow-md shadow-emerald-500/5"
                          : "border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10"
                      }`}
                    >
                      {/* Left Block with Selection & Basic Info */}
                      <div className="flex items-start gap-4 flex-1">
                        {payoutStatusFilter === "pending" && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRequestIds((prev) =>
                                prev.includes(wd.id) ? prev.filter((id) => id !== wd.id) : [...prev, wd.id]
                              );
                            }}
                            className="mt-1 bg-slate-50 dark:bg-white/5 p-2 rounded-lg hover:bg-slate-100 transition-all text-slate-400 hover:text-[#10b981]"
                          >
                            {isSelected ? (
                              <CheckSquare className="text-[#10b981]" size={16} />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        )}

                        <div className="flex items-center gap-4 flex-1">
                          <div
                            className={`w-14 h-14 rounded-3xl flex items-center justify-center font-black italic shadow-inner text-2xl shrink-0 ${
                              wd.status === "approved"
                                ? "bg-emerald-500/15 text-emerald-500"
                                : wd.status === "rejected"
                                ? "bg-red-500/15 text-red-500"
                                : "bg-amber-500/15 text-amber-500"
                            }`}
                          >
                            ৳
                          </div>
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <h4 className="text-base font-black uppercase italic dark:text-white leading-none flex items-center gap-2 flex-wrap min-w-0">
                              <span className="truncate">{displayUserName}</span>
                              <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-lg normal-case font-mono shrink-0">
                                UID: {userUid}
                              </span>
                            </h4>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                              {wd.method} • <span className="text-slate-600 dark:text-slate-300 font-mono tracking-tight lowercase">{wd.accountNumber}</span>
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold leading-none mt-1 uppercase tracking-wider flex items-center gap-1.5">
                              <span>Req ID: <span className="font-mono lowercase font-normal">{wd.id}</span></span>
                              <span>•</span>
                              <span>{wd.date}</span>
                            </p>

                            {wd.status !== "pending" && (
                              <div className="pt-2 border-t border-slate-50 dark:border-white/5 mt-2 space-y-1">
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                  Processed By: <span className="text-slate-600 dark:text-slate-300">{wd.approvedByName || "Admin"}</span>
                                </p>
                                {wd.approvedAt && (
                                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                    Processed At: <span className="text-slate-600 dark:text-slate-300">{new Date(wd.approvedAt).toLocaleString()}</span>
                                  </p>
                                )}
                                {wd.rejectionNote && (
                                  <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 text-red-500 text-[10px] font-bold leading-relaxed mt-2.5">
                                    <span className="text-[8px] font-black uppercase tracking-widest block mb-0.5 text-red-400">Rejection Reason:</span>
                                    {wd.rejectionNote}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Block with Pricing & Actions */}
                      <div className="flex flex-col md:items-end justify-between gap-4 shrink-0 md:text-right">
                        <div>
                          <span className="text-2xl font-black italic text-[#10b981]">
                            ৳{(wd.amount - wd.fee).toFixed(2)}
                          </span>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic mt-1 leading-none">
                            NET PAYABLE (AMT: ৳{wd.amount} | FEE: ৳{wd.fee})
                          </p>
                        </div>

                        <div className="flex gap-2">
                          {wd.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleApproveWithdraw(wd)}
                                className="bg-[#10b981] hover:bg-emerald-600 text-white px-5 py-3 rounded-xl font-black uppercase text-[10px] shadow-lg shadow-emerald-500/10 active:scale-95 transition-all"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectWithdraw(wd)}
                                className="bg-red-50 hover:bg-red-100 text-red-500 px-5 py-3 rounded-xl font-black uppercase text-[10px] active:scale-95 transition-all"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => {
                              if (usr) {
                                setSearchQuery(usr.uid || usr.name);
                                setActiveTab("users");
                              } else {
                                notify("ইউজার আইডি পাওয়া যায়নি!");
                              }
                            }}
                            className="bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-slate-300 px-5 py-3 rounded-xl font-black uppercase text-[10px] active:scale-95 transition-all"
                          >
                            View User
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredCategoryPayouts.length === 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-20 text-center border border-slate-100 dark:border-white/5">
                    <Search size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                    <h4 className="text-base font-black uppercase italic dark:text-white leading-none mb-2">
                      No Payout Requests Found
                    </h4>
                    <p className="text-xs text-slate-400 font-bold max-w-sm mx-auto leading-normal">
                      No requests matched your category, status filter, or search query.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TASK CONTROL TAB CONTENT */}
      {activeTab === "tasks" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
              Mission Control
            </h3>
            <button
              onClick={() =>
                setEditingTask({
                  id: "task_" + Date.now(),
                  title: "New Task",
                  reward: 10,
                  type: "Link Open",
                  description: "Briefing...",
                  instructions: ["Step 1"],
                  isActive: true,
                })
              }
              className="bg-[#10b981] text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg transition-all active:scale-95"
            >
              + New Mission
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm flex items-center justify-between hover:border-[#10b981]/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl ${task.isActive ? "bg-[#10b981]/10 text-[#10b981]" : "bg-slate-100 text-slate-400"}`}
                  >
                    <ICONS.Zap size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase italic dark:text-white leading-none mb-1">
                      {task.title}
                    </h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">
                      ৳{task.reward} • {task.type}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingTask({ ...task })}
                    className="p-2 text-slate-300 hover:text-emerald-500 transition-colors"
                  >
                    <ICONS.Settings size={18} />
                  </button>
                  <button
                    onClick={() =>
                      setTasks((prev) =>
                        prev.map((t) =>
                          t.id === task.id
                            ? { ...t, isActive: !t.isActive }
                            : t,
                        ),
                      )
                    }
                    className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase ${task.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-100 text-slate-400"}`}
                  >
                    {task.isActive ? "LIVE" : "OFF"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* USER DIRECTORY TAB CONTENT */}
      {activeTab === "users" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="relative w-full group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
              <ICONS.Logo size={18} />
            </div>
            <input
              type="text"
              placeholder="Search by UID, Name, or Email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 py-4 pl-14 pr-6 rounded-[2rem] outline-none focus:border-[#10b981] dark:text-white font-bold text-sm shadow-sm"
            />
          </div>

          {/* OFFLINE REPORTING & AUDIT CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-6 rounded-[2rem] shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-black uppercase italic dark:text-white flex items-center gap-2">
                  <Download size={16} className="text-[#10b981]" />
                  Offline Reporting & Auditing (অফলাইন রিপোর্টিং ও অডিট)
                </h4>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                  Export system ledgers as standard CSV format for offline backups, bookkeeping, or external accounting tools.
                </p>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase font-mono">
                <span className="bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg">
                  Users: <span className="text-[#10b981] font-black">{users.length}</span>
                </span>
                <span className="bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg">
                  Transactions: <span className="text-[#10b981] font-black">{transactions.length}</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
              <button
                type="button"
                onClick={handleExportUsersCSV}
                className="w-full bg-[#10b981]/10 hover:bg-[#10b981] text-[#10b981] hover:text-white p-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 group border border-[#10b981]/20 hover:border-transparent active:scale-[0.98]"
              >
                <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
                <span>Export Users (ইউজার লিস্ট)</span>
              </button>

              <button
                type="button"
                onClick={handleExportTransactionsCSV}
                className="w-full bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white p-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 group border border-blue-500/20 hover:border-transparent active:scale-[0.98]"
              >
                <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
                <span>Export Tx Ledger (লেনদেন হিস্ট্রি)</span>
              </button>

              <button
                type="button"
                onClick={handleExportAllSubmissionsCSV}
                className="w-full bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-white p-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 group border border-amber-500/20 hover:border-transparent active:scale-[0.98]"
              >
                <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
                <span>Submissions A-Z (কাজের লেজার)</span>
              </button>

              <button
                type="button"
                onClick={handleExportAllMonitorsCSV}
                className="w-full bg-purple-500/10 hover:bg-purple-500 text-purple-600 hover:text-white p-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 group border border-purple-500/20 hover:border-transparent active:scale-[0.98]"
              >
                <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
                <span>Monitors Audit (মনিটর পারফরম্যান্স)</span>
              </button>

              <button
                type="button"
                onClick={handleExportAccountingLedgerCSV}
                className="w-full bg-indigo-500/10 hover:bg-indigo-500 text-indigo-600 hover:text-white p-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 group border border-indigo-500/20 hover:border-transparent active:scale-[0.98] sm:col-span-2 lg:col-span-1"
              >
                <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
                <span>Accounting Ledger (হিসাব খাতা)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredUsers.map((u) => {
              const activeInfo = getActiveStatus(u.lastActive);
              return (
                <div
                  key={u.id}
                  className={`bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border ${u.isSuspended ? "border-red-500/30" : "border-slate-100 dark:border-white/5"} shadow-sm flex items-center justify-between hover:border-[#10b981]/30 transition-all group`}
                >
                  <div className="flex items-center gap-4">
                    {u.avatar ? (
                      <img
                        src={u.avatar}
                        alt="Avatar"
                        className="w-12 h-12 rounded-2xl object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white ${u.isSuspended ? "bg-red-500" : "bg-[#10b981]"}`}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-black uppercase italic dark:text-white leading-none mb-1 flex items-center gap-2 flex-wrap animate-in fade-in duration-200">
                        {u.name}
                        {u.isSuspended && (
                          <span className="text-[8px] bg-red-500 text-white px-2 py-0.5 rounded-full not-italic">
                            BANNED
                          </span>
                        )}
                        {u.role === "admin" && (
                          <span className="text-[8px] bg-emerald-500 text-white px-2 py-0.5 rounded-full not-italic">
                            ADMIN
                          </span>
                        )}
                        {u.role !== "admin" && u.isMonitor && (
                          <span className="text-[8px] bg-blue-500 text-white px-2 py-0.5 rounded-full not-italic">
                            MONITOR
                          </span>
                        )}
                      </h4>
                      <p className="text-[8px] font-bold text-[#10b981] uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
                        <span>{u.uid}</span>
                        {u.role === "admin" && (
                          <span className="text-[7px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono font-black uppercase border border-emerald-500/10">
                            admin
                          </span>
                        )}
                        {u.role !== "admin" && u.isMonitor && (
                          <span className="text-[7px] text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded font-mono font-black uppercase border border-blue-500/10">
                            monitor
                          </span>
                        )}
                        {u.role !== "admin" && !u.isMonitor && (
                          <span className="text-[7px] text-slate-400 bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded font-mono font-black uppercase">
                            user
                          </span>
                        )}
                      </p>

                      {/* Active / Inactive Status Indicator */}
                      <div className="mt-2 flex items-center gap-2">
                        {activeInfo.isOnline ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/15 py-0.5 px-2 rounded-md font-black text-[8px] uppercase tracking-wider animate-pulse">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                            অনলাইন • Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-transparent py-0.5 px-2 rounded-md font-extrabold text-[8px] uppercase tracking-widest">
                            <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-650"></span>
                            {activeInfo.relativeTimeBN} •{" "}
                            {activeInfo.relativeTimeEN}
                          </span>
                        )}
                      </div>

                      {/* Telegram Info Section */}
                      {u.isTelegramVerified ? (
                        <div className="mt-3 p-3 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 rounded-2xl space-y-1 font-mono text-[9px] text-left">
                          <p className="text-blue-500 font-black uppercase flex items-center gap-1">
                            <ICONS.Telegram size={10} /> Telegram: @
                            {u.telegramUsername || "No Username"}
                          </p>
                          <p className="text-slate-500 dark:text-slate-400">
                            ID:{" "}
                            <span className="text-slate-700 dark:text-slate-200 font-bold select-all">
                              {u.telegramId}
                            </span>
                          </p>
                          <p className="text-emerald-500 font-extrabold">
                            📞 PHONE:{" "}
                            <span className="font-bold select-all">
                              +{u.telegramPhone || "None"}
                            </span>
                          </p>
                        </div>
                      ) : (
                        <div className="mt-3 px-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl text-[8px] text-slate-400 font-bold uppercase tracking-wide flex items-center gap-1 w-fit">
                          ❌ No Verified Telegram Connected
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">
                          {u.ip}
                        </p>
                        {u.ip && ipCounts[u.ip] > 1 && (
                          <span className="text-[8px] font-black text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full uppercase tracking-tighter animate-pulse">
                            Multi-Account Alert
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedUserForManage(u);
                      setEditingBalanceValue(u.balance.toString());
                    }}
                    className="bg-slate-900 dark:bg-white/5 text-white p-3 rounded-xl hover:bg-[#10b981] transition-all"
                  >
                    <ICONS.Settings size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MONITOR DIRECTORY TAB CONTENT */}
      {activeTab === "monitors" &&
        (viewingMonitorDashboard ? (
          <MonitorDashboard
            monitor={viewingMonitorDashboard}
            users={users}
            tasks={tasks}
            taskSubmissions={taskSubmissions}
            membershipRequests={membershipRequests}
            depositRequests={depositRequests}
            withdraws={withdraws}
            onClose={() => setViewingMonitorDashboard(null)}
            onViewScreenshot={setLightboxImage}
          />
        ) : (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
            {/* HEADER CO-PILOT CARD */}
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="text-xl font-black italic uppercase dark:text-white leading-none tracking-tighter flex items-center gap-2">
                    <ICONS.Shield className="text-blue-500" size={24} /> MONITOR
                    DIRECTORY
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                    সিস্টেম মনিটরদের তথ্য, গ্র্যানুলার পারমিশন এবং অ্যাক্টিভিটি
                    কন্ট্রোল হাব
                  </p>
                </div>

                {/* MAINTENANCE SETTING MOVE HERE */}
                <div className="bg-slate-50 dark:bg-slate-850 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 flex items-center gap-6 shrink-0 justify-between md:justify-start">
                  <div>
                    <h4 className="font-black italic dark:text-white uppercase text-[10px] tracking-wider leading-none">
                      Maintenance Mode Monitors
                    </h4>
                    <p className="text-[9px] font-bold text-[#10b981] uppercase tracking-widest mt-1">
                      মেইনটেন্যান্স চলাকালীন মনিটর কাজ করতে পারবে
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setGlobalConfig((prev) => {
                        const updated = {
                          ...prev,
                          allowMonitorsDuringMaintenance:
                            !prev.allowMonitorsDuringMaintenance,
                        };
                        notify(
                          !prev.allowMonitorsDuringMaintenance
                            ? "Monitors UNBLOCKED during maintenance."
                            : "Monitors BLOCKED during maintenance.",
                        );
                        return updated;
                      });
                    }}
                    className={`w-14 h-8 rounded-full relative transition-all duration-300 shrink-0 ${globalConfig.allowMonitorsDuringMaintenance ? "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "bg-slate-200 dark:bg-slate-800"}`}
                  >
                    <div
                      className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${globalConfig.allowMonitorsDuringMaintenance ? "left-7" : "left-1"}`}
                    ></div>
                  </button>
                </div>
              </div>
            </div>

            {/* NEW APPOINT MONITOR BY UID SEARCH HUB */}
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
              <div>
                <h3 className="text-sm font-black italic uppercase dark:text-white leading-none tracking-tighter flex items-center gap-2">
                  <ICONS.Shield className="text-emerald-500" size={18} />{" "}
                  APPOINT NEW MONITOR BY UID (মনিটর নিয়োগ)
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                  কোনো ইউজারের ইউআইডি (UID) দিয়ে সার্চ করুন। সঠিক ইউআইডি ছাড়া
                  নিচে কোনো ইউজার আইডি বা তথ্য দেখা যাবে না।
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1 group">
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                    <ICONS.Logo size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="Enter user exact UID to search (e.g. ARZ-XXXXXX)..."
                    value={addMonitorUidQuery}
                    onChange={(e) => setAddMonitorUidQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-white/5 py-4 pl-14 pr-6 rounded-[2rem] outline-none focus:border-blue-500 dark:text-white font-black text-sm shadow-sm"
                  />
                </div>
                {addMonitorUidQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => setAddMonitorUidQuery("")}
                    className="px-6 py-4 bg-slate-100 dark:bg-slate-800 dark:text-white text-xs font-black rounded-[2rem] hover:bg-neutral-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest leading-none shrink-0"
                  >
                    Clear Query
                  </button>
                )}
              </div>

              {/* Only show search results if addMonitorUidQuery is filled */}
              {addMonitorUidQuery.trim() !== "" &&
                (() => {
                  const queryStr = addMonitorUidQuery.trim().toLowerCase();
                  const matchedUser = (users || []).find(
                    (u) => u.uid.toLowerCase() === queryStr,
                  );

                  if (!matchedUser) {
                    return (
                      <div className="bg-slate-50 dark:bg-slate-850 p-8 text-center rounded-[2rem] border border-dashed border-red-500/20">
                        <p className="text-xs font-black text-red-500 uppercase tracking-widest leading-none">
                          এই UID এর সাথে কোনো ইউজার পাওয়া যায়নি (No user found
                          with this UID)
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-slate-50 dark:bg-slate-850 p-6 rounded-[2.5rem] border border-emerald-500/20 shadow-sm animate-in zoom-in-95 duration-200">
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-4">
                        অনুসন্ধানকৃত ইউজার প্রোফাইল (TARGET USER REVEALED):
                      </p>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          {matchedUser.avatar ? (
                            <img
                              src={matchedUser.avatar}
                              alt="Avatar"
                              className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-white/5"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-blue-500 text-white flex items-center justify-center font-black text-lg">
                              {matchedUser.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h4 className="text-sm font-black uppercase italic dark:text-white leading-none">
                                {matchedUser.name}
                              </h4>
                              {matchedUser.isMonitor ? (
                                <span className="text-[8px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wider leading-none">
                                  Active Monitor
                                </span>
                              ) : (
                                <span className="text-[8px] bg-slate-350 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-black uppercase tracking-wider leading-none">
                                  General User
                                </span>
                              )}

                              {/* Live Active Status */}
                              {(() => {
                                const matchStatus = getActiveStatus(
                                  matchedUser.lastActive,
                                );
                                return matchStatus.isOnline ? (
                                  <span className="text-[8px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider leading-none flex items-center gap-1 animate-pulse">
                                    <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                                    অনলাইন • Online
                                  </span>
                                ) : (
                                  <span className="text-[8px] bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-400 px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-widest leading-none flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-650"></span>
                                    {matchStatus.relativeTimeBN} •{" "}
                                    {matchStatus.relativeTimeEN}
                                  </span>
                                );
                              })()}
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 mt-1.5 flex gap-2 font-mono flex-wrap">
                              <span>UID: {matchedUser.uid}</span>
                              <span>•</span>
                              <span>Email: {matchedUser.email}</span>
                              <span>•</span>
                              <span>IP: {matchedUser.ip || "N/A"}</span>
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {matchedUser.isMonitor ? (
                            <button
                              onClick={() => {
                                setPendingMonitorAction({
                                  type: "remove",
                                  targetUser: matchedUser,
                                });
                                setPasswordVerificationOpen(true);
                                setVerificationPassword("");
                                setPasswordError("");
                              }}
                              className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/30 px-6 py-3.5 rounded-2xl font-black text-[10px] tracking-wider uppercase transition-all flex items-center gap-2"
                            >
                              <ICONS.Close size={14} /> REMOVE MONITOR ROLE
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setPendingMonitorAction({
                                  type: "add",
                                  targetUser: matchedUser,
                                });
                                setPasswordVerificationOpen(true);
                                setVerificationPassword("");
                                setPasswordError("");
                              }}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black text-[10px] tracking-wider uppercase transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10 animate-pulse"
                            >
                              <ICONS.Check size={14} /> ACCEPT AS SYSTEM MONITOR
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </div>

            {/* SEPARATOR TITLE FOR VERIFIED MONITORS */}
            <div className="pt-2">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ICONS.Check
                  className="text-emerald-500 font-black"
                  size={16}
                />{" "}
                ACCEPTED RUNNING SYSTEM MONITORS (সক্রিয় মনিটর তালিকা)
              </h4>
            </div>

            {/* SEARCH AMONG ACTIVE MONITORS BAR */}
            <div className="relative w-full group">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                <ICONS.Logo size={18} />
              </div>
              <input
                type="text"
                placeholder="Search currently active monitors (by Name, UID or Email)..."
                value={monitorSearchQuery}
                onChange={(e) => setMonitorSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 py-4 pl-14 pr-6 rounded-[2rem] outline-none focus:border-blue-500 dark:text-white font-bold text-sm shadow-sm"
              />
            </div>

            {/* MONITORS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMonitors.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-12 text-center rounded-[2.5rem] border border-slate-100 dark:border-white/5 col-span-1 md:col-span-2">
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none">
                    No active monitors in directory
                  </p>
                </div>
              ) : (
                filteredMonitors.map((u) => {
                  const perms = u.monitorPermissions || {};

                  // Color badges depending on enabled permissions
                  const activePermsList = [
                    {
                      label: "MEMBERSHIP",
                      active: perms.canApproveMembership,
                      color:
                        "bg-emerald-500/10 text-emerald-500 border-emerald-500/15",
                    },
                    {
                      label: "DEPOSITS",
                      active: perms.canApproveDeposits,
                      color:
                        "bg-amber-500/10 text-amber-500 border-amber-500/15",
                    },
                    {
                      label: "MISSIONS",
                      active: perms.canApproveTaskSubmissions,
                      color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/15",
                    },
                    {
                      label: "PAYOUTS",
                      active: perms.canProcessPayouts,
                      color: "bg-rose-500/10 text-rose-500 border-rose-500/15",
                    },
                    {
                      label: "CAMPAIGNS",
                      active: perms.canManageCampaigns,
                      color:
                        "bg-purple-500/10 text-purple-500 border-purple-500/15",
                    },
                    {
                      label: "USERS",
                      active: perms.canModifyUsers,
                      color: "bg-blue-500/10 text-blue-500 border-blue-500/15",
                    },
                    {
                      label: "STORE",
                      active: perms.canManageStore,
                      color:
                        "bg-indigo-500/10 text-indigo-500 border-indigo-500/15",
                    },
                    {
                      label: "PUSH",
                      active: perms.canManagePush,
                      color: "bg-teal-500/10 text-teal-500 border-teal-500/15",
                    },
                    {
                      label: "SOCIALS",
                      active: perms.canManageSocials,
                      color: "bg-pink-500/10 text-pink-500 border-pink-500/15",
                    },
                  ];

                  const activeInfo = getActiveStatus(u.lastActive);

                  return (
                    <div
                      key={u.id}
                      className={`bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border ${u.isSuspended ? "border-red-500/30" : "border-slate-100 dark:border-white/5"} shadow-sm flex flex-col justify-between hover:border-blue-500/30 transition-all group gap-4`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          {u.avatar ? (
                            <img
                              src={u.avatar}
                              alt="Avatar"
                              className="w-12 h-12 rounded-2xl object-cover overflow-hidden"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white ${u.isSuspended ? "bg-red-500" : "bg-blue-500"}`}
                            >
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <h4 className="text-sm font-black uppercase italic dark:text-white leading-none mb-1 flex items-center gap-2 flex-wrap">
                              {u.name}
                              {u.isSuspended && (
                                <span className="text-[8px] bg-red-500 text-white px-2 py-0.5 rounded-full not-italic">
                                  BANNED
                                </span>
                              )}
                              <span className="text-[8px] bg-blue-500 text-white px-2 py-0.5 rounded-full not-italic uppercase font-bold tracking-wider leading-none">
                                Monitor
                              </span>
                            </h4>
                            <p className="text-[8px] font-bold text-blue-500 uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
                              <span>{u.uid}</span>
                            </p>

                            {/* Live Active Status Badge */}
                            <div className="mt-1.5 flex items-center gap-2">
                              {activeInfo.isOnline ? (
                                <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/15 py-0.5 px-2 rounded-md font-black text-[8px] uppercase tracking-wider animate-pulse">
                                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                                  অনলাইন • Online
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-transparent py-0.5 px-2 rounded-md font-extrabold text-[8px] uppercase tracking-widest">
                                  <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600"></span>
                                  {activeInfo.relativeTimeBN} •{" "}
                                  {activeInfo.relativeTimeEN}
                                </span>
                              )}
                            </div>

                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1.5">
                              IP: {u.ip || "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setViewingMonitorDashboard(u)}
                            className="bg-blue-500 text-white p-3 rounded-xl hover:bg-blue-600 transition-all shrink-0 flex items-center gap-1.5 uppercase text-[9px] font-black tracking-wider px-4"
                            title="Analytics Dashboard"
                          >
                            <ICONS.Dashboard size={14} /> View Dashboard
                          </button>

                          {/* DIRECT REMOVE BUTTON REQUIRING APP PASSWORD */}
                          <button
                            onClick={() => {
                              setPendingMonitorAction({
                                type: "remove",
                                targetUser: u,
                              });
                              setPasswordVerificationOpen(true);
                              setVerificationPassword("");
                              setPasswordError("");
                            }}
                            className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white p-3 rounded-xl transition-all shrink-0"
                            title="Remove Monitor (মনিটর রিমুভ)"
                          >
                            <ICONS.Close size={18} />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedUserForManage(u);
                              setEditingBalanceValue(u.balance.toString());
                            }}
                            className="bg-slate-900 dark:bg-white/5 text-white p-3 rounded-xl hover:bg-blue-500 transition-all shrink-0"
                          >
                            <ICONS.Settings size={18} />
                          </button>
                        </div>
                      </div>

                      {/* Permissions list chips */}
                      <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-2">
                          Active Monitor Permissions:
                        </p>
                        <div className="flex flex-wrap gap-1.5 font-sans font-medium">
                          {activePermsList.filter((p) => p.active).length ===
                          0 ? (
                            <span className="text-[7px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg font-black uppercase border border-transparent">
                              NONE
                            </span>
                          ) : (
                            activePermsList
                              .filter((p) => p.active)
                              .map((p, idx) => (
                                <span
                                  key={idx}
                                  className={`text-[7px] px-2 py-1 rounded-lg font-black uppercase border ${p.color}`}
                                >
                                  {p.label}
                                </span>
                              ))
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* TODAYS HISTORY & MONITOR ACTIVITY REPORTING HUB */}
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
                <div>
                  <h3 className="text-sm font-black italic uppercase dark:text-white leading-none tracking-tighter flex items-center gap-2">
                    <ICONS.Trend className="text-blue-500" size={18} /> MONITOR
                    APPROVALS & HISTORY (আজকের হিস্টোরি ও অ্যাক্টিভিটি রিপোর্ট)
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                    আজকে কোন কোন মনিটর কি কি অনুমোদন বা বাতিল করেছে তা প্রুফ সহ
                    দেখুন (প্রতিদিন, সাপ্তাহিক, মাসিক বা কাস্টম তারিখ ফিল্টার
                    করে)
                  </p>
                </div>

                {/* Timeframe selector controls */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {(["today", "weekly", "monthly", "custom"] as const).map(
                    (tf) => (
                      <button
                        key={tf}
                        type="button"
                        onClick={() => setMonitorHistoryTimeframe(tf)}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                          monitorHistoryTimeframe === tf
                            ? "bg-blue-500 text-white shadow-md shadow-blue-500/10"
                            : "bg-slate-50 dark:bg-slate-850 text-slate-400 hover:text-blue-500 border border-slate-100 dark:border-white/5"
                        }`}
                      >
                        {tf === "today"
                          ? "Today (আজকে)"
                          : tf === "weekly"
                            ? "Weekly (সাপ্তাহিক)"
                            : tf === "monthly"
                              ? "Monthly (মাসিক)"
                              : "Custom Date"}
                      </button>
                    ),
                  )}

                  {monitorHistoryTimeframe === "custom" && (
                    <input
                      type="date"
                      value={monitorHistoryCustomDate}
                      onChange={(e) =>
                        setMonitorHistoryCustomDate(e.target.value)
                      }
                      className="bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white border border-slate-100 dark:border-white/5 px-3 py-1.5 rounded-xl text-xs font-bold outline-none focus:border-blue-500"
                    />
                  )}
                </div>
              </div>

              {/* Filtering logic applied */}
              {(() => {
                const allActions: Array<{
                  id: string;
                  type: string;
                  approvedById: string;
                  approvedByName: string;
                  userName: string;
                  userId: string;
                  title: string;
                  status: "approved" | "rejected";
                  textProof: string;
                  screenshots?: string[];
                  reward: number;
                  date: string;
                }> = [];

                // 1. Task submissions
                (taskSubmissions || []).forEach((sub) => {
                  if (sub.approvedById) {
                    allActions.push({
                      id: sub.id,
                      type: "Task Submission",
                      approvedById: sub.approvedById,
                      approvedByName: getMonitorDisplayName(
                        sub.approvedById,
                        sub.approvedByName,
                      ),
                      userName: sub.userName || "N/A",
                      userId: sub.userId,
                      title: sub.taskTitle || "Task Proof",
                      status: sub.status,
                      textProof: sub.textProof || "",
                      screenshots: sub.screenshots || [],
                      reward: sub.reward || 0,
                      date: sub.approvedAt || sub.submittedAt,
                    });
                  }
                });

                // 2. Membership upgrades
                (membershipRequests || []).forEach((req) => {
                  if (req.approvedById) {
                    allActions.push({
                      id: req.id,
                      type: "Membership Upgrade",
                      approvedById: req.approvedById,
                      approvedByName: getMonitorDisplayName(
                        req.approvedById,
                        req.approvedByName,
                      ),
                      userName: req.userName || "N/A",
                      userId: req.userId,
                      title: `Account Upgrade: ${req.planName}`,
                      status: req.status,
                      textProof: `Bkash/Nagad Ref: ${req.transactionId} (${req.method})`,
                      screenshots: req.screenshot ? [req.screenshot] : [],
                      reward: req.amount || 0,
                      date: req.approvedAt || req.date,
                    });
                  }
                });

                // 3. Deposits
                (depositRequests || []).forEach((req) => {
                  if (req.approvedById) {
                    allActions.push({
                      id: req.id,
                      type: "Deposit Request",
                      approvedById: req.approvedById,
                      approvedByName: getMonitorDisplayName(
                        req.approvedById,
                        req.approvedByName,
                      ),
                      userName: req.userName || "N/A",
                      userId: req.userId,
                      title: `Deposit via ${req.method}`,
                      status: req.status,
                      textProof: `Bkash/Nagad Ref: ${req.transactionId} (${req.method})`,
                      screenshots: req.screenshot ? [req.screenshot] : [],
                      reward: req.amount || 0,
                      date: req.approvedAt || req.date,
                    });
                  }
                });

                // 4. Withdraws
                (withdraws || []).forEach((req) => {
                  if (req.approvedById) {
                    allActions.push({
                      id: req.id,
                      type: "Withdraw Request",
                      approvedById: req.approvedById,
                      approvedByName: getMonitorDisplayName(
                        req.approvedById,
                        req.approvedByName,
                      ),
                      userName: req.userName || "N/A",
                      userId: req.userId,
                      title: `Payout Withdrawal (${req.method})`,
                      status: req.status,
                      textProof: `Target Acc: ${req.accountNumber}`,
                      reward: req.amount || 0,
                      date: req.approvedAt || req.date,
                    });
                  }
                });

                const historyList = allActions
                  .filter((sub) => {
                    const approvalDateStr = sub.date;
                    if (!approvalDateStr) return false;

                    const approvalDate = new Date(approvalDateStr);
                    const now = new Date();

                    if (monitorHistoryTimeframe === "today") {
                      const datePart = approvalDate.toISOString().split("T")[0];
                      const todayPart = now.toISOString().split("T")[0];
                      return datePart === todayPart;
                    }
                    if (monitorHistoryTimeframe === "weekly") {
                      const diffTime = Math.abs(
                        now.getTime() - approvalDate.getTime(),
                      );
                      const diffDays = Math.ceil(
                        diffTime / (1000 * 60 * 60 * 24),
                      );
                      return diffDays <= 7;
                    }
                    if (monitorHistoryTimeframe === "monthly") {
                      const diffTime = Math.abs(
                        now.getTime() - approvalDate.getTime(),
                      );
                      const diffDays = Math.ceil(
                        diffTime / (1000 * 60 * 60 * 24),
                      );
                      return diffDays <= 30;
                    }
                    if (monitorHistoryTimeframe === "custom") {
                      const datePart = approvalDate.toISOString().split("T")[0];
                      return datePart === monitorHistoryCustomDate;
                    }
                    return false;
                  })
                  .sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime(),
                  );

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse font-sans">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase text-slate-400">
                          <th className="pb-3 text-left">MONITOR DETAILS</th>
                          <th className="pb-3 text-left">USER INFORMATION</th>
                          <th className="pb-3 text-left">MISSION DETAILS</th>
                          <th className="pb-3 text-center">ACTION TAKEN</th>
                          <th className="pb-3">PROOFS ATTACHED</th>
                          <th className="pb-3 text-right">REWARD</th>
                          <th className="pb-3 text-right">DATE & TIME</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyList.map((subItem, i) => (
                          <tr
                            key={subItem.id || i}
                            className="border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors"
                          >
                            <td className="py-3.5 pr-3">
                              <div className="font-bold text-blue-600 dark:text-blue-400 uppercase text-[11px] flex items-center gap-1">
                                👤 {subItem.approvedByName || "N/A"}
                              </div>
                              <div className="text-[9px] text-slate-400 font-mono">
                                ID: {subItem.approvedById || "N/A"}
                              </div>
                            </td>
                            <td className="py-3.5 pr-3">
                              <div className="font-bold text-slate-800 dark:text-white uppercase">
                                {subItem.userName || "N/A"}
                              </div>
                              <div className="text-[9px] text-slate-400 font-mono">
                                UID: {subItem.userId}
                              </div>
                            </td>
                            <td
                              className="py-3.5 text-slate-700 dark:text-slate-300 font-medium max-w-[180px] truncate"
                              title={subItem.title}
                            >
                              <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-500 font-black uppercase tracking-wider block w-fit mb-1">
                                {subItem.type}
                              </span>
                              {subItem.title}
                            </td>
                            <td className="py-3.5 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-lg text-[8.5px] font-black uppercase ${
                                  subItem.status === "approved"
                                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                    : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                                }`}
                              >
                                {subItem.status}
                              </span>
                            </td>
                            <td className="py-3.5">
                              <div className="space-y-1">
                                {subItem.textProof && (
                                  <div className="text-[9px] bg-slate-100 dark:bg-white/5 p-1 rounded font-mono break-all text-slate-500 max-h-12 overflow-y-auto">
                                    Proof: {subItem.textProof}
                                  </div>
                                )}
                                {subItem.screenshots &&
                                  subItem.screenshots.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {subItem.screenshots.map((s, idx) => (
                                        <button
                                          key={idx}
                                          type="button"
                                          onClick={() => setLightboxImage(s)}
                                          className="text-[8px] font-black uppercase tracking-wider bg-[#10b981]/10 hover:bg-[#10b981] text-[#10b981] hover:text-white border border-[#10b981]/25 px-1.5 py-0.5 rounded transition-all"
                                        >
                                          Img {idx + 1}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                              </div>
                            </td>
                            <td className="py-3.5 text-right font-black text-slate-800 dark:text-white">
                              ৳{(subItem.reward || 0).toFixed(2)}
                            </td>
                            <td className="py-3.5 text-right text-slate-500 font-mono text-[10px]">
                              {new Date(subItem.date).toLocaleString("en-US", {
                                hour12: true,
                              })}
                            </td>
                          </tr>
                        ))}
                        {historyList.length === 0 && (
                          <tr>
                            <td
                              colSpan={7}
                              className="py-16 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] opacity-60"
                            >
                              এই সময়সীমার মধ্যে কোনো অ্যাক্টিভিটি পাওয়া যায়নি
                              (No monitor activity history found in this
                              timeframe).
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* SECURITY ACCESS PASSWORD VERIFICATION MODAL OVERLAY */}
            {passwordVerificationOpen && pendingMonitorAction && (
              <div className="fixed inset-0 z-[999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[3rem] p-10 border border-slate-100 dark:border-white/5 shadow-2xl relative space-y-6">
                  {/* SHIELD LOCK ICON */}
                  <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-[1.5rem] flex items-center justify-center mx-auto border-2 border-blue-500/20 shadow-lg">
                    <ICONS.Shield size={32} className="animate-pulse" />
                  </div>

                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                      {pendingMonitorAction.type === "add"
                        ? "APPOINT MONITOR VERIFICATION"
                        : "REMOVE MONITOR VERIFICATION"}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-normal">
                      {pendingMonitorAction.type === "add"
                        ? "মনিটর নিয়োগ কনফার্ম করতে অ্যাপ পাসওয়ার্ড দিন।"
                        : "মনিটর অপসারণ কনফার্ম করতে অ্যাপ পাসওয়ার্ড দিন।"}
                    </p>
                  </div>

                  {/* TARGET PROFILE DETAIL INSIDE MODAL */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center gap-3 font-sans">
                    {pendingMonitorAction.targetUser.avatar ? (
                      <img
                        src={pendingMonitorAction.targetUser.avatar}
                        alt="Avatar"
                        className="w-10 h-10 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center font-black text-sm">
                        {pendingMonitorAction.targetUser.name
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                    <div className="text-left leading-none">
                      <p className="text-xs font-black uppercase dark:text-white mb-1">
                        {pendingMonitorAction.targetUser.name}
                      </p>
                      <p className="text-[9px] font-semibold text-slate-450 dark:text-slate-500 font-mono">
                        {pendingMonitorAction.targetUser.uid}
                      </p>
                    </div>
                  </div>

                  <form
                    onSubmit={handleVerifyAndExecuteMonitorAction}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5 text-left">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                        ENTER SECURE APP PASSWORD (অ্যাপ পাসওয়ার্ড লিখুন)
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          placeholder="••••••••••••"
                          value={verificationPassword}
                          onChange={(e) => {
                            setVerificationPassword(e.target.value);
                            setPasswordError("");
                          }}
                          className="w-full bg-slate-55 dark:bg-slate-800 border border-slate-100 dark:border-white/5 p-4 rounded-xl outline-none focus:border-blue-500 dark:text-white text-center font-black tracking-wide text-sm"
                          required
                          autoFocus
                        />
                      </div>
                      {passwordError && (
                        <p className="text-[9px] font-black text-red-500 uppercase mt-1 leading-tight text-center">
                          {passwordError}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 font-sans">
                      <button
                        type="button"
                        onClick={() => {
                          setPasswordVerificationOpen(false);
                          setVerificationPassword("");
                          setPendingMonitorAction(null);
                          setPasswordError("");
                        }}
                        className="w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-black uppercase text-[10px] tracking-wider rounded-xl transition-all"
                      >
                        Cancel (বাতিল)
                      </button>
                      <button
                        type="submit"
                        className={`w-full py-4 font-black uppercase text-[10px] tracking-wider rounded-xl transition-all text-white ${pendingMonitorAction.type === "add" ? "bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/10" : "bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/10"}`}
                      >
                        Confirm (নিশ্চিত)
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        ))}

      {/* PUSH CENTER TAB CONTENT */}
      {activeTab === "notifications" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-8">
            <h3 className="text-xl font-black italic uppercase dark:text-white leading-none tracking-tighter">
              Live Alert Broadcaster
            </h3>
            <form onSubmit={handleBroadcastNotification} className="space-y-6">
              <div className="grid grid-cols-3 gap-3">
                {["task", "payment", "announcement"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNotifType(t as any)}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${notifType === t ? "bg-[#10b981]/10 border-[#10b981] text-[#10b981]" : "bg-slate-50 dark:bg-white/5 border-transparent text-slate-400"}`}
                  >
                    {t === "task" ? (
                      <ICONS.Zap size={20} />
                    ) : t === "payment" ? (
                      <ICONS.Wallet size={20} />
                    ) : (
                      <ICONS.Logo size={20} />
                    )}
                    <span className="text-[9px] font-black uppercase">{t}</span>
                  </button>
                ))}
              </div>
              <input
                value={notifTitle}
                onChange={(e) => setNotifTitle(e.target.value)}
                placeholder="Alert Headline"
                className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl font-black text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                required
              />
              <textarea
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                placeholder="Alert description message..."
                className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl font-bold text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white min-h-[100px]"
                required
              />
              <button
                type="submit"
                disabled={isBlasting}
                className="w-full bg-[#10b981] text-white font-black py-6 rounded-3xl shadow-xl uppercase text-xs tracking-widest flex items-center justify-center gap-3"
              >
                {isBlasting ? (
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <ICONS.Send size={20} /> BLAST NOTIFICATION
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SECURITY SHIELD TAB CONTENT */}
      {activeTab === "security" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="bg-slate-900 border border-emerald-500/20 p-12 rounded-[3rem] text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#10b981] animate-pulse"></div>
            <ICONS.Shield
              size={64}
              className="mx-auto text-[#10b981] opacity-80"
            />
            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">
              FRAUD PROTECTION ENGINE
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest max-w-sm mx-auto">
              Analyze IP logs, duplicate device signatures, and submission
              inconsistencies.
            </p>
            <button
              onClick={runFraudScan}
              className="bg-[#10b981] text-white px-12 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
            >
              START DEEP SYSTEM SCAN
            </button>
          </div>
        </div>
      )}

      {/* SOCIAL POPUP TAB CONTENT */}
      {activeTab === "social" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black italic uppercase dark:text-white leading-none tracking-tighter">
                Social Community Hub
              </h3>
              <button
                onClick={() =>
                  setEditingSocial({
                    id: "sl_" + Date.now(),
                    name: "Join Channel",
                    url: "",
                    type: "Other",
                    isActive: true,
                  })
                }
                className="bg-[#10b981] text-white px-5 py-2.5 rounded-xl shadow-lg text-[10px] font-black uppercase tracking-widest transition-all"
              >
                + Add Link
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(socialLinks || []).map((link) => (
                <div
                  key={link.id}
                  className="p-6 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/5 flex items-center justify-between hover:border-[#10b981]/30 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2.5 rounded-xl text-white ${link.type === "Telegram" ? "bg-blue-400" : link.type === "Facebook" ? "bg-blue-700" : "bg-[#10b981]"}`}
                    >
                      {link.type === "Telegram" ? (
                        <ICONS.Telegram size={18} />
                      ) : (
                        <ICONS.Link size={18} />
                      )}
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black uppercase italic dark:text-white leading-none mb-1">
                        {link.name}
                      </h4>
                      <p className="text-[8px] font-bold text-slate-400 truncate max-w-[120px]">
                        {link.url || "No URL Set"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingSocial({ ...link })}
                      className="p-2 text-slate-300 hover:text-[#10b981]"
                    >
                      <ICONS.Settings size={14} />
                    </button>
                    <button
                      onClick={() =>
                        setSocialLinks((prev) =>
                          prev.map((s) =>
                            s.id === link.id
                              ? { ...s, isActive: !s.isActive }
                              : s,
                          ),
                        )
                      }
                      className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase ${link.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-100 text-slate-400"}`}
                    >
                      {link.isActive ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STORE CONTROL TAB CONTENT (ADMIN SELL & STORAGE) */}
      {activeTab === "store" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          {/* Section 0: Pending / Completed Store Orders (complete order queue / SD Option) */}
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black italic uppercase dark:text-white leading-none tracking-tighter">
                  SD Option Orders Queue (অর্ডার সম্পন্ন করুন)
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-1.5">
                  গ্রাহকদের সাবমিট করা প্রোফাইল/আইডি ডিটিইলস, স্ক্রিনশট দেখুন
                  এবং অর্ডার সম্পন্ন করুন।
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 p-1 rounded-xl w-fit">
                {(["pending", "completed", "all"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setStoreOrderFilter(f)}
                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                      storeOrderFilter === f
                        ? "bg-[#10b981] text-white shadow-sm font-black"
                        : "text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    <th className="py-4 pr-3">Product / Price</th>
                    <th className="py-4 pr-3">Buyer Details</th>
                    <th className="py-4 pr-3">
                      Submitted Custom Details / Link
                    </th>
                    <th className="py-4 pr-3">Screenshot Proof</th>
                    <th className="py-4 pr-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {storeOrders
                    .filter(
                      (order) =>
                        storeOrderFilter === "all" ||
                        order.status === storeOrderFilter,
                    )
                    .map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-500/5 transition-all text-xs text-slate-700 dark:text-slate-300"
                      >
                        <td className="py-4 pr-3 font-semibold space-y-1">
                          <p className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1">
                            {order.itemTitle}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Price: ৳{order.itemPrice}
                          </p>
                          <p className="text-[9px] text-slate-500 font-mono">
                            {order.submittedAt}
                          </p>
                        </td>
                        <td className="py-4 pr-3 space-y-0.5">
                          <p className="font-extrabold text-slate-900 dark:text-white">
                            {order.userName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {order.userEmail}
                          </p>
                        </td>
                        <td className="py-4 pr-3 space-y-1.5 max-w-[240px] break-words">
                          <div className="bg-slate-50 dark:bg-black/30 p-2.5 rounded-lg border border-slate-100 dark:border-white/5">
                            <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-0.5">
                              Submitted specifications:
                            </p>
                            <p className="font-mono text-slate-800 dark:text-slate-100 select-all leading-normal">
                              {order.submitDetails}
                            </p>
                          </div>
                          {order.submitLink && (
                            <a
                              href={order.submitLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-505 dark:text-indigo-400 hover:underline font-mono text-[10px] break-all inline-flex items-center gap-1"
                            >
                              Visit Link <ICONS.Link size={10} />
                            </a>
                          )}
                        </td>
                        <td className="py-4 pr-3">
                          {order.screenshot ? (
                            <img
                              src={order.screenshot}
                              alt="Proof"
                              className="w-14 h-14 object-cover rounded-lg cursor-zoom-in hover:opacity-80 transition-opacity border border-slate-100 dark:border-white/5 focus:outline-none"
                              onClick={() =>
                                setAdminLightboxImg(order.screenshot || null)
                              }
                            />
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold italic">
                              No Screenshot
                            </span>
                          )}
                        </td>
                        <td className="py-4 text-right">
                          {order.status === "pending" ? (
                            <button
                              type="button"
                              onClick={() => handleCompleteStoreOrder(order.id)}
                              className="px-4 py-2 bg-[#10b981] hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-505 text-white font-black text-[9px] uppercase tracking-widest rounded-xl shadow-md cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                            >
                              Complete Order
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-emerald-500 tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                              ✓ Completed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  {storeOrders.filter(
                    (order) =>
                      storeOrderFilter === "all" ||
                      order.status === storeOrderFilter,
                  ).length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest italic opacity-50"
                      >
                        কোনো অর্ডার পাওয়া যায়নি।
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Lightbox for screenshot image zoomed view in admin panel */}
          {adminLightboxImg && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200"
              onClick={() => setAdminLightboxImg(null)}
            >
              <button className="absolute top-6 right-6 text-white p-3 rounded-full hover:bg-white/15 transition-colors">
                <ICONS.Close size={24} />
              </button>
              <img
                src={adminLightboxImg}
                alt="Proof Fullscreen"
                className="max-w-full max-h-[90vh] object-contain rounded-lg p-4"
              />
            </div>
          )}
          {/* Row 1: Category Management & Item Creation */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category creation & list */}
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
              <h3 className="text-lg font-black italic uppercase dark:text-white leading-none tracking-tighter">
                Add Category
              </h3>
              <form onSubmit={handleAddCategory} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">
                    Category Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Gmail, YouTube"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#10b981] text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg"
                >
                  Save Category
                </button>
              </form>

              <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                  Existing Categories ({sellCategories.length})
                </p>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto no-scrollbar">
                  {sellCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 pl-4 pr-2 py-1.5 rounded-full border border-slate-100 dark:border-white/5 text-xs font-black dark:text-white"
                    >
                      <span>{cat.name}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="text-red-500 hover:text-red-600 font-extrabold focus:outline-none p-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {sellCategories.length === 0 && (
                    <p className="text-[10px] font-bold text-slate-400 italic">
                      No categories created yet.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Item Creation Form */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
              <h3 className="text-lg font-black italic uppercase dark:text-white leading-none tracking-tighter">
                Create New Listing
              </h3>
              <form
                onSubmit={handleAddItem}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">
                    Listing Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Verified Gmail Account, 2019 Created"
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">
                    Item Category
                  </label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white px-2"
                  >
                    <option value="">Select Category</option>
                    {sellCategories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">
                    Sale Price (৳)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 150"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">
                    Short Description
                  </label>
                  <input
                    type="text"
                    placeholder="Brief summary of item highlights..."
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">
                    Sensitive Coordinates / Details (Delivered to Buyer)
                  </label>
                  <textarea
                    placeholder="Credentials, passwords, links, or redemption key codes. Only the buyer of this item will ever see these details."
                    value={newItemDetails}
                    onChange={(e) => setNewItemDetails(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white resize-none"
                  />
                </div>

                <div className="md:col-span-2 pt-2">
                  <div className="space-y-2 md:col-span-1">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">
                      Product Purchase Limit (ঐচ্ছিক লিমিট)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 10 (খালি রাখলে সীমাহীন বার কেনা যাবে)"
                      value={newItemLimit}
                      onChange={(e) => setNewItemLimit(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-1 flex flex-col justify-end pb-1">
                    <label className="flex items-center gap-2.5 cursor-pointer p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-transparent hover:border-indigo-500 transition-colors">
                      <input
                        type="checkbox"
                        checked={newItemEnableSD}
                        onChange={(e) => setNewItemEnableSD(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-black dark:text-white uppercase tracking-wider select-none">
                        Enable SD Option (Submit Details)
                      </span>
                    </label>
                  </div>

                  <div className="md:col-span-2 pt-2">
                    <button
                      type="submit"
                      className="w-full bg-[#10b981] text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-emerald-600 transition-colors"
                    >
                      Load Listing into Store
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Row 2: Listed Items Grid/Table */}
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
            <h3 className="text-lg font-black italic uppercase dark:text-white leading-none tracking-tighter">
              Current Store Stock
            </h3>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5">
                    <th className="py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      Product Info
                    </th>
                    <th className="py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      Category
                    </th>
                    <th className="py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      Price
                    </th>
                    <th className="py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      Status / Buyer
                    </th>
                    <th className="py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                  {sellItems.map((item) => {
                    const buyerUser = item.soldTo
                      ? users.find((u) => u.id === item.soldTo)
                      : null;
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-500/5 transition-all"
                      >
                        <td className="py-4 pr-4">
                          <p className="font-extrabold text-sm dark:text-white line-clamp-1">
                            {item.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {item.createdAt}
                            </span>
                            {item.purchaseLimit && (
                              <span className="text-[8px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/10">
                                Limit: {item.purchasedCount || 0}/
                                {item.purchaseLimit}
                              </span>
                            )}
                            {item.enableSD && (
                              <span className="text-[8px] font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/10">
                                SD Option ON
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-xs font-black uppercase text-[#10b981]">
                          {item.category}
                        </td>
                        <td className="py-4 pr-4 text-xs font-black dark:text-white">
                          ৳{item.price}
                        </td>
                        <td className="py-4 pr-4">
                          {item.status === "sold" ? (
                            <div className="space-y-1">
                              <span className="px-2.5 py-1 bg-red-500/10 text-red-500 text-[8px] font-black uppercase rounded-full border border-red-500/25">
                                SOLD OUT
                              </span>
                              <p className="text-[9px] font-semibold text-slate-400">
                                Buyer:{" "}
                                {buyerUser ? buyerUser.name : "Unknown user"}
                              </p>
                            </div>
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase rounded-full">
                              AVAILABLE
                            </span>
                          )}
                        </td>
                        <td className="py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-all"
                            title="Delete listing"
                          >
                            <ICONS.XCircle size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {sellItems.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest italic opacity-50"
                      >
                        The store is completely empty.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TELEGRAM VERIFICATION TAB CONTENT (TELEGRAM VERIFICATION SYSTEM - Special) */}
      {activeTab === "telegram" &&
        (() => {
          const filteredReqs = telegramRequests.filter((req) => {
            if (telegramFilter === "all") return true;
            return req.status === telegramFilter;
          });

          const handleApproveTelegram = (req: TelegramVerificationRequest) => {
            // 1:1 Rule duplicate protection: Check if another user ALREADY has this Telegram Username, ID, or verified Phone Number.
            const duplicateUser = users.find(
              (u) =>
                u.id !== req.userId &&
                u.isTelegramVerified &&
                (u.telegramUsername?.trim().toLowerCase() ===
                  req.telegramUsername.trim().toLowerCase() ||
                  u.telegramId?.trim() === req.telegramId.trim() ||
                  (req.telegramPhone &&
                    u.telegramPhone?.trim() === req.telegramPhone.trim())),
            );

            if (duplicateUser) {
              notify(
                `CRITICAL: এই টেলিগ্রাম অ্যাকাউন্টটি ইতিমধ্যে অন্য গ্রাহকের সাথে লিংক করা আছে! User: ${duplicateUser.name}`,
              );
              return;
            }

            // Approve request
            if (setTelegramRequests) {
              setTelegramRequests((prev) =>
                prev.map((r) =>
                  r.id === req.id ? { ...r, status: "approved" } : r,
                ),
              );
            }

            // Update user profile
            setUsers((prev) =>
              prev.map((u) => {
                if (u.id === req.userId) {
                  return {
                    ...u,
                    telegramUsername: req.telegramUsername,
                    telegramId: req.telegramId,
                    telegramPhone: req.telegramPhone,
                    hasJoinedTelegramChannel: true,
                    isTelegramVerified: true,
                  };
                }
                return u;
              }),
            );

            notify(
              `টেলিগ্রাম অ্যাকাউন্ট সংযুক্তির জন্য অনুমোদন করা হয়েছে! username: ${req.telegramUsername}`,
            );
          };

          const handleRejectTelegram = (req: TelegramVerificationRequest) => {
            if (setTelegramRequests) {
              setTelegramRequests((prev) =>
                prev.map((r) =>
                  r.id === req.id ? { ...r, status: "rejected" } : r,
                ),
              );
            }

            // Update user profile to ensure they are not verified
            setUsers((prev) =>
              prev.map((u) => {
                if (u.id === req.userId) {
                  return {
                    ...u,
                    isTelegramVerified: false,
                  };
                }
                return u;
              }),
            );

            notify(`টেলিগ্রাম লিংক রিকোয়েস্ট বাতিল করা হয়েছে।`);
          };

          return (
            <div className="space-y-8 animate-in slide-in-from-bottom-4">
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black italic uppercase dark:text-white leading-none tracking-tighter">
                      Telegram Account Verification Queue
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1.5">
                      গ্রাহকদের প্রেরিত সঠিক টেলিগ্রাম আইডি, ইউজারনেম এবং
                      সিকিউরিটি কোড যাচাই করে এপ্রুভ করুন।
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 p-1 rounded-xl w-fit shrink-0">
                    {(["pending", "approved", "rejected", "all"] as const).map(
                      (f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setTelegramFilter(f)}
                          className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                            telegramFilter === f
                              ? "bg-blue-500 text-white shadow-sm font-black"
                              : "text-slate-400 hover:text-slate-705 dark:hover:text-white font-bold"
                          }`}
                        >
                          {f} (
                          {
                            telegramRequests.filter((req) =>
                              f === "all" ? true : req.status === f,
                            ).length
                          }
                          )
                        </button>
                      ),
                    )}
                  </div>
                </div>

                {/* Desktop/Tablet Table View */}
                <div className="hidden lg:block overflow-x-auto select-none rounded-[2rem] border border-slate-100 dark:border-white/5">
                  <table className="w-full min-w-[1000px] text-left border-collapse font-sans">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5">
                        <th className="py-5 px-6 text-[9px] font-black uppercase tracking-wider text-slate-400">
                          User / Account Details
                        </th>
                        <th className="py-5 px-6 text-[9px] font-black uppercase tracking-wider text-slate-400">
                          Telegram Details
                        </th>
                        <th className="py-5 px-6 text-[9px] font-black uppercase tracking-wider text-slate-400">
                          Verification Code
                        </th>
                        <th className="py-5 px-6 text-[9px] font-black uppercase tracking-wider text-slate-400">
                          Proof Screenshot
                        </th>
                        <th className="py-5 px-6 text-[9px] font-black uppercase tracking-wider text-slate-400">
                          Status
                        </th>
                        <th className="py-5 px-6 text-[9px] font-black uppercase tracking-wider text-slate-400 text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {filteredReqs.map((req) => {
                        const userRecord = users.find(
                          (u) => u.id === req.userId,
                        );
                        return (
                          <tr
                            key={req.id}
                            className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors"
                          >
                            <td className="py-6 px-6 font-medium text-xs">
                              <p className="font-extrabold text-slate-800 dark:text-white">
                                {req.userName}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono italic">
                                {req.userEmail}
                              </p>
                              <div className="flex gap-2.5 mt-2">
                                <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/5 rounded-md text-[8px] font-black uppercase tracking-normal">
                                  UID: {req.userId}
                                </span>
                                {userRecord?.status === "Verified" ? (
                                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-md text-[8px] font-black">
                                    PRO ACTIVE
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-md text-[8px] font-black">
                                    FREE USER
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-6 px-6 text-xs font-mono font-bold">
                              <p className="text-blue-500 font-extrabold">
                                {req.telegramUsername}
                              </p>
                              <p className="text-slate-400 text-[10px]">
                                ID: {req.telegramId}
                              </p>
                              {/* Matched duplicate Telegram owner cross-referencing */}
                              {(() => {
                                const duplicates = users.filter(
                                  (u) =>
                                    u.id !== req.userId &&
                                    ((u.telegramId &&
                                      u.telegramId.trim() ===
                                        req.telegramId.trim()) ||
                                      (u.telegramUsername &&
                                        u.telegramUsername
                                          .trim()
                                          .toLowerCase() ===
                                          req.telegramUsername
                                            .trim()
                                            .toLowerCase()) ||
                                      (u.telegramPhone &&
                                        req.telegramPhone &&
                                        u.telegramPhone.trim() ===
                                          req.telegramPhone.trim())),
                                );
                                if (duplicates.length === 0) return null;
                                return duplicates.map((dup) => (
                                  <div
                                    key={dup.id}
                                    className="mt-2.5 p-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-[8px] font-black uppercase leading-tight"
                                  >
                                    ⚠️ Cross-Ref match: {dup.name} ({dup.uid}) [
                                    {dup.isTelegramVerified
                                      ? "VERIFIED"
                                      : "UNVERIFIED"}
                                    ]
                                  </div>
                                ));
                              })()}

                              {/* Real-time Telegram live channel subscription checker */}
                              <div className="mt-3 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCheckingSubs((prev) => ({
                                      ...prev,
                                      [req.id]: "loading",
                                    }));
                                    fetch(
                                      `/api/telegram/check-join?userId=${req.telegramId}`,
                                    )
                                      .then(async (r) => {
                                        const data = await r.json();
                                        if (!r.ok)
                                          throw new Error(
                                            data.error || "Not joined",
                                          );
                                        return data;
                                      })
                                      .then(() => {
                                        setCheckingSubs((prev) => ({
                                          ...prev,
                                          [req.id]: "joined",
                                        }));
                                        notify(`User is subscribed! ✅`);
                                      })
                                      .catch((err) => {
                                        setCheckingSubs((prev) => ({
                                          ...prev,
                                          [req.id]: "not_joined",
                                        }));
                                        notify(
                                          `Channel Join Check failed: ${err.message || "Not joined"}`,
                                        );
                                      });
                                  }}
                                  disabled={checkingSubs[req.id] === "loading"}
                                  className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all tracking-wider ${
                                    checkingSubs[req.id] === "joined"
                                      ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                                      : checkingSubs[req.id] === "not_joined"
                                        ? "bg-rose-500/20 text-rose-500 border border-rose-500/30 animate-pulse"
                                        : "bg-blue-500 hover:bg-blue-650 text-white shadow-sm hover:scale-[1.02] active:scale-95"
                                  }`}
                                >
                                  {checkingSubs[req.id] === "loading"
                                    ? "Checking..."
                                    : checkingSubs[req.id] === "joined"
                                      ? "Channel Member ✓"
                                      : checkingSubs[req.id] === "not_joined"
                                        ? "Not Joined ✗"
                                        : "Check Join Status 🔍"}
                                </button>
                              </div>
                              {req.telegramPhone && (
                                <p className="text-emerald-500 text-[10px] font-black mt-1">
                                  PHONE: +{req.telegramPhone}
                                </p>
                              )}
                            </td>
                            <td className="py-6 px-6">
                              <span className="px-3 py-1.5 bg-blue-500/15 border border-blue-500/20 text-blue-500 font-mono font-black rounded-lg text-xs tracking-wider uppercase">
                                {req.verificationCode}
                              </span>
                            </td>
                            <td className="py-6 px-6">
                              {req.screenshot ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setAdminViewingTelegramScreenshot(
                                      req.screenshot || null,
                                    )
                                  }
                                  className="relative group block overflow-hidden rounded-xl border border-slate-200 dark:border-white/5 hover:scale-105 active:scale-95 transition-all"
                                >
                                  <img
                                    src={req.screenshot}
                                    className="w-14 h-14 object-cover"
                                    alt="Proof"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[8px] text-white font-black uppercase tracking-widest">
                                    VIEW
                                  </div>
                                </button>
                              ) : (
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic opacity-50">
                                  No screenshot
                                </span>
                              )}
                            </td>
                            <td className="py-6 px-6">
                              <span
                                className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider ${
                                  req.status === "pending"
                                    ? "bg-amber-500/20 text-amber-500"
                                    : req.status === "approved"
                                      ? "bg-emerald-500/20 text-emerald-500"
                                      : "bg-rose-500/20 text-rose-500"
                                }`}
                              >
                                {req.status}
                              </span>
                            </td>
                            <td className="py-6 px-6 text-right">
                              {req.status === "pending" ? (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleRejectTelegram(req)}
                                    className="p-2.5 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 active:scale-90 transition-all shadow-sm"
                                    title="Reject submission"
                                  >
                                    <ICONS.Close size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleApproveTelegram(req)}
                                    className="px-4 py-2.5 bg-emerald-555 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-750 text-white rounded-xl active:scale-90 transition-all font-black uppercase text-[9px] tracking-widest shadow-lg shadow-emerald-500/10 flex items-center gap-1.5"
                                  >
                                    <ICONS.Check size={11} /> Approve
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic opacity-50">
                                  Locked
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredReqs.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-16 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest italic opacity-50"
                          >
                            No telegram verification requests found for this
                            filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile/Tablet Card-Based View */}
                <div className="block lg:hidden space-y-6 mt-6">
                  {filteredReqs.map((req) => {
                    const userRecord = users.find((u) => u.id === req.userId);
                    return (
                      <div
                        key={req.id}
                        className="bg-slate-50 dark:bg-slate-950/40 p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 space-y-5 text-left"
                      >
                        {/* Top Row: Code & Status */}
                        <div className="flex items-center justify-between gap-3">
                          <span className="px-3 py-1.5 bg-blue-500/15 border border-blue-500/20 text-blue-500 font-mono font-black rounded-xl text-xs tracking-wider uppercase">
                            {req.verificationCode}
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider ${
                              req.status === "pending"
                                ? "bg-amber-500/20 text-amber-500"
                                : req.status === "approved"
                                  ? "bg-emerald-500/20 text-emerald-500"
                                  : "bg-rose-500/20 text-rose-500"
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>

                        {/* User Details */}
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                            User Account Details
                          </span>
                          <p className="font-extrabold text-slate-800 dark:text-white text-sm">
                            {req.userName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono italic break-all">
                            {req.userEmail}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-2 py-0.5 bg-slate-200 dark:bg-white/5 rounded-md text-[8px] font-black uppercase tracking-normal">
                              UID: {req.userId}
                            </span>
                            {userRecord?.status === "Verified" ? (
                              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-md text-[8px] font-black">
                                PRO ACTIVE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-md text-[8px] font-black">
                                FREE USER
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Telegram Details */}
                        <div className="space-y-2 pt-4 border-t border-dashed border-slate-200 dark:border-white/5">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                            Telegram Details
                          </span>
                          <p className="text-blue-500 font-extrabold font-mono text-sm">
                            {req.telegramUsername}
                          </p>
                          <p className="text-slate-400 text-[10px] font-mono">
                            ID: {req.telegramId}
                          </p>
                          {req.telegramPhone && (
                            <p className="text-emerald-500 text-[10px] font-black">
                              PHONE: +{req.telegramPhone}
                            </p>
                          )}

                          {/* Duplicates warning */}
                          {(() => {
                            const duplicates = users.filter(
                              (u) =>
                                u.id !== req.userId &&
                                u.telegramId &&
                                u.telegramId.trim() === req.telegramId.trim(),
                            );
                            if (duplicates.length === 0) return null;
                            return duplicates.map((dup) => (
                              <div
                                key={dup.id}
                                className="mt-2.5 p-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-[8px] font-black uppercase leading-tight"
                              >
                                ⚠️ Cross-Ref match: {dup.name} ({dup.uid}) [
                                {dup.isTelegramVerified
                                  ? "VERIFIED"
                                  : "UNVERIFIED"}
                                ]
                              </div>
                            ));
                          })()}

                          {/* Real-time Telegram live channel subscription checker */}
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => {
                                setCheckingSubs((prev) => ({
                                  ...prev,
                                  [req.id]: "loading",
                                }));
                                fetch(
                                  `/api/telegram/check-join?userId=${req.telegramId}`,
                                )
                                  .then(async (r) => {
                                    const data = await r.json();
                                    if (!r.ok)
                                      throw new Error(
                                        data.error || "Not joined",
                                      );
                                    return data;
                                  })
                                  .then(() => {
                                    setCheckingSubs((prev) => ({
                                      ...prev,
                                      [req.id]: "joined",
                                    }));
                                    notify(`User is subscribed! ✅`);
                                  })
                                  .catch((err) => {
                                    setCheckingSubs((prev) => ({
                                      ...prev,
                                      [req.id]: "not_joined",
                                    }));
                                    notify(
                                      `Channel Join Check failed: ${err.message || "Not joined"}`,
                                    );
                                  });
                              }}
                              disabled={checkingSubs[req.id] === "loading"}
                              className={`w-full py-2.5 rounded-xl text-[8px] font-black uppercase transition-all tracking-wider ${
                                checkingSubs[req.id] === "joined"
                                  ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                                  : checkingSubs[req.id] === "not_joined"
                                    ? "bg-rose-500/20 text-rose-500 border border-rose-500/30 animate-pulse"
                                    : "bg-blue-500 hover:bg-blue-650 text-white shadow-sm active:scale-95"
                              }`}
                            >
                              {checkingSubs[req.id] === "loading"
                                ? "Checking..."
                                : checkingSubs[req.id] === "joined"
                                  ? "Channel Member ✓"
                                  : checkingSubs[req.id] === "not_joined"
                                    ? "Not Joined ✗"
                                    : "Check Join Status 🔍"}
                            </button>
                          </div>
                        </div>

                        {/* Proof Screenshot */}
                        <div className="space-y-1.5 pt-4 border-t border-dashed border-slate-200 dark:border-white/5">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                            Proof Screenshot
                          </span>
                          {req.screenshot ? (
                            <button
                              type="button"
                              onClick={() =>
                                setAdminViewingTelegramScreenshot(
                                  req.screenshot || null,
                                )
                              }
                              className="relative group block overflow-hidden rounded-2xl border border-slate-200 dark:border-white/5 active:scale-95 transition-all w-full h-32"
                            >
                              <img
                                src={req.screenshot}
                                className="w-full h-full object-cover"
                                alt="Proof"
                              />
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-[10px] text-white font-black uppercase tracking-widest">
                                TAP TO VIEW SCREENSHOT 🔍
                              </div>
                            </button>
                          ) : (
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic opacity-50 block py-2">
                              No screenshot
                            </span>
                          )}
                        </div>

                        {/* Bottom Actions */}
                        <div className="pt-4 border-t border-slate-200 dark:border-white/5">
                          {req.status === "pending" ? (
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => handleRejectTelegram(req)}
                                className="py-3 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 active:scale-95 transition-all shadow-sm font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-1.5"
                              >
                                <ICONS.Close size={14} /> Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => handleApproveTelegram(req)}
                                className="py-3 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-750 text-white rounded-xl active:scale-95 transition-all font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1.5"
                              >
                                <ICONS.Check size={12} /> Approve
                              </button>
                            </div>
                          ) : (
                            <div className="text-center py-2.5 bg-slate-100 dark:bg-white/5 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest italic opacity-50">
                              Decision Locked ({req.status})
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {filteredReqs.length === 0 && (
                    <div className="py-12 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest italic opacity-50">
                      No telegram verification requests found for this filter.
                    </div>
                  )}
                </div>
              </div>

              {/* Large Image modal */}
              {adminViewingTelegramScreenshot && (
                <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
                  <div className="relative max-w-2xl w-full bg-slate-900 border border-white/10 rounded-[3rem] p-8 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setAdminViewingTelegramScreenshot(null)}
                      className="absolute top-6 right-6 text-slate-400 hover:text-white p-2 rounded-full bg-white/5 active:scale-90 transition-all z-20"
                    >
                      <ICONS.Close size={20} />
                    </button>
                    <div className="flex flex-col items-center">
                      <img
                        src={adminViewingTelegramScreenshot}
                        className="max-h-[70vh] rounded-2xl object-contain border border-white/5"
                        alt="Large view"
                      />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6">
                        Telegram Owner Verification Proof Screenshot
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

      {/* PERFORMANCE ANALYTICS TAB CONTENT */}
      {activeTab === "performance" &&
        (isMonitor ? (
          <MonitorDashboard
            monitor={currentUser!}
            users={users}
            tasks={tasks}
            taskSubmissions={taskSubmissions}
            membershipRequests={membershipRequests}
            depositRequests={depositRequests}
            withdraws={withdraws}
            onClose={() => {}}
            onViewScreenshot={setLightboxImage}
            isTabMode={true}
          />
        ) : (
          (() => {
          // Safe Date Parser
          const parseDateSafe = (dateStr: string): Date => {
            if (!dateStr) return new Date();
            const parsed = Date.parse(dateStr);
            if (!isNaN(parsed)) return new Date(parsed);
            try {
              return new Date(dateStr);
            } catch (e) {
              return new Date();
            }
          };

          const now = new Date().getTime();

          const isInTimeframe = (
            dateStr?: string,
            timeframe?: "today" | "weekly" | "custom" | "custom-date" | "total",
          ): boolean => {
            if (!dateStr) return false;
            const time = parseDateSafe(dateStr).getTime();
            if (timeframe === "today") {
              return now - time <= 24 * 60 * 60 * 1000;
            }
            if (timeframe === "weekly") {
              return now - time <= 7 * 24 * 60 * 60 * 1000;
            }
            if (timeframe === "custom") {
              const d = parseDateSafe(dateStr);
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, "0");
              return `${yyyy}-${mm}` === selectedPerformanceMonth;
            }
            if (timeframe === "custom-date") {
              const d = parseDateSafe(dateStr);
              const datePart = d.toISOString().split("T")[0];
              return datePart === selectedPerformanceDate;
            }
            if (timeframe === "total") {
              return true;
            }
            return false;
          };

          // Dynamically extract and sort all selectable months
          const getSelectableMonths = () => {
            const monthsSet = new Set<string>();
            // Add last 12 months by default
            const today = new Date();
            for (let i = 0; i < 12; i++) {
              const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
              const mm = String(d.getMonth() + 1).padStart(2, "0");
              monthsSet.add(`${d.getFullYear()}-${mm}`);
            }
            // Add any months found in data to make sure list is exhaustive
            const extractMonthStr = (dateStr?: string) => {
              if (!dateStr) return;
              const parsed = parseDateSafe(dateStr);
              const mm = String(parsed.getMonth() + 1).padStart(2, "0");
              monthsSet.add(`${parsed.getFullYear()}-${mm}`);
            };
            (users || []).forEach((u) => extractMonthStr(u.createdAt));
            (taskSubmissions || []).forEach((sub) =>
              extractMonthStr(sub.submittedAt),
            );
            (withdraws || []).forEach((w) => extractMonthStr(w.date));
            (membershipRequests || []).forEach((m) => extractMonthStr(m.date));

            return Array.from(monthsSet).sort().reverse();
          };

          const selectableMonths = getSelectableMonths();

          // 1. User Joins (আজকে, সাপ্তাহিক, কাস্টম মাস, কাস্টম তারিখ, সর্বমোট)
          const joinsToday = (users || []).filter((u) =>
            isInTimeframe(u.createdAt, "today"),
          ).length;
          const joinsWeekly = (users || []).filter((u) =>
            isInTimeframe(u.createdAt, "weekly"),
          ).length;
          const joinsCustom = (users || []).filter((u) =>
            isInTimeframe(u.createdAt, "custom"),
          ).length;
          const joinsCustomDate = (users || []).filter((u) =>
            isInTimeframe(u.createdAt, "custom-date"),
          ).length;
          const joinsTotal = (users || []).filter((u) =>
            isInTimeframe(u.createdAt, "total"),
          ).length;

          // 2. Completed work rewards in BDT (আজকে, साप्ताहिक, কাস্টম মাস, সর্বমোট)
          const getWorkRewardStats = (
            timeFrame: "today" | "weekly" | "custom" | "custom-date" | "total",
          ) => {
            const subs = (taskSubmissions || []).filter(
              (sub) =>
                sub.status === "approved" &&
                isInTimeframe(sub.submittedAt, timeFrame),
            );
            return {
              count: subs.length,
              value: subs.reduce((acc, curr) => acc + (curr.reward || 0), 0),
            };
          };

          const workToday = getWorkRewardStats("today");
          const workWeekly = getWorkRewardStats("weekly");
          const workCustom = getWorkRewardStats("custom");
          const workCustomDate = getWorkRewardStats("custom-date");
          const workTotal = getWorkRewardStats("total");

          // helper for sector lookup
          const getTaskType = (sub: TaskSubmission): string => {
            const task = (tasks || []).find((t) => t.id === sub.taskId);
            return task ? task.type : "General Task";
          };

          // Sectors of tasks
          const sectors = [
            "App Install",
            "Link Open",
            "Watch & Earn",
            "Social",
            "Telegram",
            "1 Device= 1 Task",
            "General Task",
            "Store Control",
          ];

          // 3. Sector breakdown (আজকে কত কাজ, সাপ্তাহিক, কাস্টম মাস, সর্বমোট - pending & approved)
          const getSectorStatsByTimeframe = (
            secName: string,
            timeFrame: "today" | "weekly" | "custom" | "custom-date" | "total",
          ) => {
            if (secName === "Store Control") {
              const ordersInFrame = (storeOrders || []).filter((order) =>
                isInTimeframe(order.submittedAt, timeFrame),
              );
              return {
                pending: ordersInFrame.filter((o) => o.status === "pending")
                  .length,
                approved: ordersInFrame.filter((o) => o.status === "completed")
                  .length,
                amount: ordersInFrame
                  .filter((o) => o.status === "completed")
                  .reduce((acc, curr) => acc + (curr.itemPrice || 0), 0),
              };
            }

            const subsInFrame = (taskSubmissions || []).filter((sub) =>
              isInTimeframe(sub.submittedAt, timeFrame),
            );

            const secSubs = subsInFrame.filter((sub) => {
              const type = getTaskType(sub);
              if (secName === "General Task") {
                return (
                  type !== "App Install" &&
                  type !== "Link Open" &&
                  type !== "Watch & Earn" &&
                  type !== "Social" &&
                  type !== "Telegram" &&
                  type !== "1 Device= 1 Task"
                );
              }
              return type === secName;
            });

            return {
              pending: secSubs.filter((s) => s.status === "pending").length,
              approved: secSubs.filter((s) => s.status === "approved").length,
              amount: secSubs
                .filter((s) => s.status === "approved")
                .reduce((acc, curr) => acc + (curr.reward || 0), 0),
            };
          };

          // 4. Withdraws (আজকে, সাপ্তাহিক, কাস্টম মাস, সর্বমোট)
          const getWithdrawStats = (
            timeFrame: "today" | "weekly" | "custom" | "custom-date" | "total",
          ) => {
            const wds = (withdraws || []).filter((w) =>
              isInTimeframe(w.date, timeFrame),
            );

            const totalRequestedAmount = wds.reduce(
              (acc, curr) => acc + (curr.amount || 0),
              0,
            );
            const totalApprovedAmount = wds
              .filter((w) => w.status === "approved")
              .reduce((acc, curr) => acc + (curr.amount || 0), 0);
            const totalPendingAmount = wds
              .filter((w) => w.status === "pending")
              .reduce((acc, curr) => acc + (curr.amount || 0), 0);

            return {
              requested: totalRequestedAmount,
              approved: totalApprovedAmount,
              pending: totalPendingAmount,
              count: wds.length,
              approvedCount: wds.filter((w) => w.status === "approved").length,
              pendingCount: wds.filter((w) => w.status === "pending").length,
            };
          };

          const wdsToday = getWithdrawStats("today");
          const wdsWeekly = getWithdrawStats("weekly");
          const wdsCustom = getWithdrawStats("custom");
          const wdsCustomDate = getWithdrawStats("custom-date");
          const wdsTotal = getWithdrawStats("total");

          // 5. Membership upgrades (আজকে, সাপ্তাহিক, কাস্টম মাস, সর্বমোট)
          const getMembershipStats = (
            timeFrame: "today" | "weekly" | "custom" | "custom-date" | "total",
          ) => {
            const list = (membershipRequests || []).filter((m) =>
              isInTimeframe(m.date, timeFrame),
            );
            const total = list.length;
            const pending = list.filter((m) => m.status === "pending").length;
            const approved = list.filter((m) => m.status === "approved").length;
            const approvedAmount = list
              .filter((m) => m.status === "approved")
              .reduce((acc, curr) => acc + (curr.amount || 0), 0);
            const pendingAmount = list
              .filter((m) => m.status === "pending")
              .reduce((acc, curr) => acc + (curr.amount || 0), 0);

            return {
              total,
              pending,
              approved,
              approvedAmount,
              pendingAmount,
            };
          };

          const mbsToday = getMembershipStats("today");
          const mbsWeekly = getMembershipStats("weekly");
          const mbsCustom = getMembershipStats("custom");
          const mbsCustomDate = getMembershipStats("custom-date");
          const mbsTotal = getMembershipStats("total");

          // 6. Referral stats calculation (দৈনিক, সাপ্তাহিক, মাসিক, কাস্টম ডেট, সর্বমোট)
          const getReferralStats = (
            timeFrame: "today" | "weekly" | "custom" | "custom-date" | "total",
          ) => {
            const list = (users || []).filter(
              (u) => u.referredBy && isInTimeframe(u.createdAt, timeFrame),
            );

            const referMap = new Map<string, { user: User; count: number }>();
            list.forEach((u) => {
              const referrer = (users || []).find(
                (inv) =>
                  inv.referralCode &&
                  inv.referralCode.toUpperCase() ===
                    u.referredBy?.toUpperCase(),
              );
              if (referrer) {
                const prev = referMap.get(referrer.id);
                if (prev) {
                  prev.count += 1;
                } else {
                  referMap.set(referrer.id, { user: referrer, count: 1 });
                }
              }
            });

            const rankings = Array.from(referMap.values()).sort(
              (a, b) => b.count - a.count,
            );
            const topReferrer = rankings[0] || null;

            return {
              total: list.length,
              rankings,
              topReferrer,
            };
          };

          const refToday = getReferralStats("today");
          const refWeekly = getReferralStats("weekly");
          const refCustom = getReferralStats("custom");
          const refCustomDate = getReferralStats("custom-date");
          const refTotal = getReferralStats("total");

          // 7. Ads shown stats calculation (দৈনিক, সাপ্তাহিক, মাসিক, কাস্টম ডেট, সর্বমোট)
          const getAdStats = (
            timeFrame: "today" | "weekly" | "custom" | "custom-date" | "total",
          ) => {
            const list = (adViewLogs || []).filter((log) =>
              isInTimeframe(log.viewedAt, timeFrame),
            );
            return {
              total: list.length,
              logs: list,
            };
          };

          const adsToday = getAdStats("today");
          const adsWeekly = getAdStats("weekly");
          const adsCustom = getAdStats("custom");
          const adsCustomDate = getAdStats("custom-date");
          const adsTotal = getAdStats("total");

          // Detail clicking handlers
          const openAdsDetail = (
            timeframe: "today" | "weekly" | "custom" | "custom-date" | "total",
          ) => {
            setPerfDetailType("ads");
            setPerfDetailTimeframe(timeframe);
            setPerfDetailOpen(true);
          };

          const openJoinsDetail = (
            timeframe: "today" | "weekly" | "custom" | "custom-date" | "total",
          ) => {
            setPerfDetailType("joins");
            setPerfDetailTimeframe(timeframe);
            setPerfDetailOpen(true);
          };

          const openWorkDetail = (
            timeframe: "today" | "weekly" | "custom" | "custom-date" | "total",
          ) => {
            setPerfDetailType("work");
            setPerfDetailTimeframe(timeframe);
            setPerfDetailOpen(true);
          };

          const openSectorDetail = (
            secName: string,
            timeframe: "today" | "weekly" | "custom" | "custom-date" | "total",
          ) => {
            setPerfDetailType("sector");
            setPerfDetailSector(secName);
            setPerfDetailTimeframe(timeframe);
            setPerfDetailOpen(true);
          };

          const openWithdrawDetail = (
            timeframe: "today" | "weekly" | "custom" | "custom-date" | "total",
          ) => {
            setPerfDetailType("withdraw");
            setPerfDetailTimeframe(timeframe);
            setPerfDetailOpen(true);
          };

          const openMembershipDetail = (
            timeframe: "today" | "weekly" | "custom" | "custom-date" | "total",
          ) => {
            setPerfDetailType("membership");
            setPerfDetailTimeframe(timeframe);
            setPerfDetailOpen(true);
          };

          const openReferralDetail = (
            timeframe: "today" | "weekly" | "custom" | "custom-date" | "total",
          ) => {
            setPerfDetailType("referral");
            setPerfDetailTimeframe(timeframe);
            setPerfDetailOpen(true);
          };

          const parseHealthDate = (dateStr: string): Date => {
            if (!dateStr) return new Date();
            const parsed = Date.parse(dateStr);
            if (!isNaN(parsed)) return new Date(parsed);
            try {
              return new Date(dateStr);
            } catch (e) {
              return new Date();
            }
          };

          const getFilteredFinancials = () => {
            const nowMs = new Date().getTime();

            const isItemInHealthTimeframe = (dateStr?: string): boolean => {
              if (!dateStr) return false;
              const itemDate = parseHealthDate(dateStr);
              const itemMs = itemDate.getTime();

              if (platformHealthTimeframe === "today") {
                return nowMs - itemMs <= 24 * 60 * 60 * 1000;
              }
              if (platformHealthTimeframe === "7days") {
                return nowMs - itemMs <= 7 * 24 * 60 * 60 * 1000;
              }
              if (platformHealthTimeframe === "30days") {
                return nowMs - itemMs <= 30 * 24 * 60 * 60 * 1000;
              }
              if (platformHealthTimeframe === "custom") {
                const startOfDay = new Date(platformHealthStartDate);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(platformHealthEndDate);
                endOfDay.setHours(23, 59, 59, 999);
                return itemMs >= startOfDay.getTime() && itemMs <= endOfDay.getTime();
              }
              return true; // "all"
            };

            const filteredDeposits = (depositRequests || []).filter(
              (d) => d.status === "approved" && isItemInHealthTimeframe(d.approvedAt || d.date)
            );

            const filteredWithdraws = (withdraws || []).filter(
              (w) => w.status === "approved" && isItemInHealthTimeframe(w.approvedAt || w.date)
            );

            const filteredMemberships = (membershipRequests || []).filter(
              (m) => m.status === "approved" && isItemInHealthTimeframe(m.approvedAt || m.date)
            );

            // Compute active number of days
            let diffDays = 1;
            if (platformHealthTimeframe === "today") {
              diffDays = 1;
            } else if (platformHealthTimeframe === "7days") {
              diffDays = 7;
            } else if (platformHealthTimeframe === "30days") {
              diffDays = 30;
            } else if (platformHealthTimeframe === "custom") {
              const start = new Date(platformHealthStartDate);
              const end = new Date(platformHealthEndDate);
              const diffTime = Math.abs(end.getTime() - start.getTime());
              diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
            } else {
              // "all"
              const dates = [
                ...filteredDeposits.map(d => parseHealthDate(d.approvedAt || d.date).getTime()),
                ...filteredWithdraws.map(w => parseHealthDate(w.approvedAt || w.date).getTime()),
                ...filteredMemberships.map(m => parseHealthDate(m.approvedAt || m.date).getTime())
              ];
              const earliestMs = dates.length > 0 ? Math.min(...dates) : nowMs;
              const diffTime = Math.abs(nowMs - earliestMs);
              diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
            }

            const totalDeposits = filteredDeposits.reduce((acc, curr) => acc + (curr.amount || 0), 0);
            const totalMemberships = filteredMemberships.reduce((acc, curr) => acc + (curr.amount || 0), 0);
            const totalWithdrawals = filteredWithdraws.reduce((acc, curr) => acc + (curr.amount || 0), 0);

            const totalInflow = totalDeposits + totalMemberships;
            const netProfit = totalInflow - totalWithdrawals;

            const avgDailyInflow = totalInflow / diffDays;
            const avgDailyWithdrawals = totalWithdrawals / diffDays;
            const avgDailyNetProfit = netProfit / diffDays;

            return {
              totalDeposits,
              totalMemberships,
              totalWithdrawals,
              totalInflow,
              netProfit,
              avgDailyInflow,
              avgDailyWithdrawals,
              avgDailyNetProfit,
              diffDays,
              depositsCount: filteredDeposits.length,
              withdrawsCount: filteredWithdraws.length,
              membershipsCount: filteredMemberships.length
            };
          };

          const healthStats = getFilteredFinancials();

          return (
            <div className="space-y-12 animate-in slide-in-from-bottom-4">
              {/* INTRO TITLE BANNER */}
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5 rounded-[3rem] p-10 md:p-12 border border-emerald-500/15 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div>
                    <span className="text-[10px] font-black italic uppercase text-[#10b981] tracking-[0.2em] mb-2 block">
                      SYSTEM METRICS CENTRE
                    </span>
                    <h2 className="text-3xl font-black italic dark:text-white uppercase tracking-tighter">
                      USER PERFORMANCE ANALYTICS
                    </h2>
                    <p className="text-xs text-slate-400 dark:text-slate-300 font-bold mt-1 uppercase tracking-wide">
                      রিয়েল-টাইম ব্যবহারকারী বৃদ্ধি, কাজের অগ্রগতি এবং পেমেন্ট
                      সংক্রান্ত লাইভ রিপোর্ট
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 px-6 py-4 rounded-2xl border border-slate-200/50 dark:border-white/5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">
                      SYSTEM ONLINE & UPDATING
                    </span>
                  </div>
                </div>
              </div>

              {/* PLATFORM FINANCIAL HEALTH CARD */}
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black">
                      <Activity size={28} className="animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black tracking-widest uppercase text-emerald-500 block mb-0.5">
                        PLATFORM FINANCIAL HEALTH & PLATFORM MONITOR (প্ল্যাটফর্ম আর্থিক স্বাস্থ্য রিপোর্ট)
                      </span>
                      <h3 className="text-2xl font-black italic uppercase tracking-tight text-slate-800 dark:text-white">
                        FINANCIAL PERFORMANCE & HEALTH (আর্থিক পারফরম্যান্স)
                      </h3>
                      <p className="text-xs text-slate-400 dark:text-slate-300 font-bold uppercase mt-0.5">
                        আমানত (Deposits), মেম্বারশিপ (Memberships) এবং উত্তোলন (Withdrawals) এর নিট লাভ বিশ্লেষণ
                      </p>
                    </div>
                  </div>

                  {/* Timeframe selector */}
                  <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-100 dark:border-white/5">
                    {[
                      { id: "all", label: "All Time (সর্বমোট)" },
                      { id: "today", label: "Today (আজ)" },
                      { id: "7days", label: "7 Days (৭ দিন)" },
                      { id: "30days", label: "30 Days (৩০ দিন)" },
                      { id: "custom", label: "Custom Range (কাস্টম)" },
                    ].map((tf) => (
                      <button
                        key={tf.id}
                        type="button"
                        onClick={() => setPlatformHealthTimeframe(tf.id as any)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                          platformHealthTimeframe === tf.id
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                        }`}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Date Picker Inputs when Custom is active */}
                {platformHealthTimeframe === "custom" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 animate-in fade-in duration-200">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-black tracking-widest uppercase text-slate-400">
                        START DATE (শুরুর তারিখ)
                      </label>
                      <div className="relative">
                        <Calendar size={14} className="absolute left-4 top-3.5 text-slate-400" />
                        <input
                          type="date"
                          value={platformHealthStartDate}
                          onChange={(e) => setPlatformHealthStartDate(e.target.value)}
                          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 py-3 font-bold text-xs text-slate-700 dark:text-white outline-none w-full focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-black tracking-widest uppercase text-slate-400">
                        END DATE (শেষের তারিখ)
                      </label>
                      <div className="relative">
                        <Calendar size={14} className="absolute left-4 top-3.5 text-slate-400" />
                        <input
                          type="date"
                          value={platformHealthEndDate}
                          onChange={(e) => setPlatformHealthEndDate(e.target.value)}
                          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 py-3 font-bold text-xs text-slate-700 dark:text-white outline-none w-full focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Main statistics cards layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Total Inflow Card */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] p-6 border border-slate-100 dark:border-white/5 flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">
                        TOTAL INFLOW / REVENUE (মোট আয়)
                      </span>
                      <span className="bg-emerald-500/15 text-emerald-500 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                        Revenue
                      </span>
                    </div>
                    <div>
                      <p className="text-3xl font-black text-slate-800 dark:text-white font-mono tracking-tight">
                        ৳{healthStats.totalInflow.toFixed(2)}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                        Deposits: ৳{healthStats.totalDeposits.toFixed(2)} ({healthStats.depositsCount} txs)
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">
                        Memberships: ৳{healthStats.totalMemberships.toFixed(2)} ({healthStats.membershipsCount} upgrades)
                      </p>
                    </div>
                  </div>

                  {/* Total Outflow Card */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 rounded-[2rem] p-6 border border-slate-100 dark:border-white/5 flex flex-col justify-between space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">
                        TOTAL OUTFLOW / PAYOUTS (মোট খরচ)
                      </span>
                      <span className="bg-rose-500/15 text-rose-500 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                        Payouts
                      </span>
                    </div>
                    <div>
                      <p className="text-3xl font-black text-slate-800 dark:text-white font-mono tracking-tight">
                        ৳{healthStats.totalWithdrawals.toFixed(2)}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                        Approved Withdrawals: {healthStats.withdrawsCount} payouts
                      </p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase invisible">
                        Placeholder text for height alignment
                      </p>
                    </div>
                  </div>

                  {/* Net Platform Profit Card */}
                  <div className={`rounded-[2rem] p-6 border flex flex-col justify-between space-y-4 transition-all ${
                    healthStats.netProfit >= 0
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black tracking-widest uppercase ${
                        healthStats.netProfit >= 0 ? "text-emerald-500" : "text-rose-500"
                      }`}>
                        NET PLATFORM PROFIT (মোট প্ল্যাটফর্ম প্রফিট / লাভ)
                      </span>
                      <div className="flex items-center gap-1">
                        {healthStats.netProfit >= 0 ? (
                          <TrendingUp size={14} className="animate-bounce" />
                        ) : (
                          <TrendingDown size={14} className="animate-bounce" />
                        )}
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          healthStats.netProfit >= 0 ? "bg-emerald-500/20" : "bg-rose-500/20"
                        }`}>
                          {healthStats.netProfit >= 0 ? "PROFIT" : "DEFICIT"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-3xl font-black font-mono tracking-tight">
                        ৳{healthStats.netProfit.toFixed(2)}
                      </p>
                      <p className="text-[9px] font-bold uppercase mt-1 opacity-70">
                        {healthStats.netProfit >= 0 
                          ? "Platform running at positive growth" 
                          : "Payouts exceeded revenue in this period"}
                      </p>
                      <p className="text-[9px] font-bold uppercase opacity-70">
                        Margin: {healthStats.totalInflow > 0 ? ((healthStats.netProfit / healthStats.totalInflow) * 100).toFixed(1) : "0"}% of total inflow
                      </p>
                    </div>
                  </div>
                </div>

                {/* Average Daily Earnings Subsection */}
                <div className="bg-slate-50/50 dark:bg-slate-900/40 p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 space-y-4">
                  <div className="flex items-center gap-2">
                    <DollarSign size={16} className="text-emerald-500" />
                    <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 dark:text-slate-400">
                      AVERAGE DAILY EARNINGS & FLOWS (দৈনিক গড় লাভ ও প্রবাহ বিশ্লেষণ)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-100 dark:border-white/5">
                      <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 block mb-1">
                        Avg Daily Inflow (দৈনিক গড় আয়)
                      </span>
                      <p className="text-xl font-black text-slate-700 dark:text-slate-300 font-mono">
                        ৳{healthStats.avgDailyInflow.toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-100 dark:border-white/5">
                      <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 block mb-1">
                        Avg Daily Payouts (দৈনিক গড় পেমেন্ট)
                      </span>
                      <p className="text-xl font-black text-slate-700 dark:text-slate-300 font-mono">
                        ৳{healthStats.avgDailyWithdrawals.toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-100 dark:border-white/5">
                      <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 block mb-1">
                        Avg Daily Net Profit (দৈনিক গড় নিট লাভ)
                      </span>
                      <p className={`text-xl font-black font-mono ${
                        healthStats.avgDailyNetProfit >= 0 ? "text-emerald-500" : "text-rose-500"
                      }`}>
                        ৳{healthStats.avgDailyNetProfit.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide text-center pt-2">
                    ℹ️ Calculated over <span className="text-emerald-500 font-extrabold font-mono">{healthStats.diffDays}</span> active day(s) in this selected filter ({healthStats.diffDays} দিনের সক্রিয় মেয়াদে হিসাবকৃত)
                  </div>
                </div>
              </div>

              {/* SELECT CUSTOM MONTH & DATE CARD */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* SELECT CUSTOM MONTH CARD */}
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-white/5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#10b981]/15 text-[#10b981] flex items-center justify-center font-black text-lg">
                      📅
                    </div>
                    <div>
                      <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 block mb-0.5">
                        SELECT CUSTOM MONTH (কাস্টম মাস নির্বাচন)
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-black uppercase">
                        সিলেক্ট করা মাসের রিপোর্ট দেখতে পারবেন
                      </p>
                    </div>
                  </div>
                  <select
                    value={selectedPerformanceMonth}
                    onChange={(e) =>
                      setSelectedPerformanceMonth(e.target.value)
                    }
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-3 font-bold text-sm text-slate-800 dark:text-white outline-none cursor-pointer focus:border-[#10b981] min-w-[200px]"
                  >
                    {selectableMonths.map((m) => {
                      const [year, month] = m.split("-");
                      const monthNames = [
                        "January",
                        "February",
                        "March",
                        "April",
                        "May",
                        "June",
                        "July",
                        "August",
                        "September",
                        "October",
                        "November",
                        "December",
                      ];
                      const monthName =
                        monthNames[parseInt(month, 10) - 1] || month;
                      return (
                        <option key={m} value={m}>
                          {monthName} {year}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* SELECT CUSTOM DATE CARD */}
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-white/5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center font-black text-lg">
                      📆
                    </div>
                    <div>
                      <span className="text-[9px] font-black tracking-widest uppercase text-slate-400 block mb-0.5">
                        SELECT CUSTOM DATE (কাস্টম তারিখ নির্বাচন)
                      </span>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-black uppercase">
                        সিলেক্ট করা নির্দিষ্ট তারিখের রিপোর্ট দেখতে পারবেন
                      </p>
                    </div>
                  </div>
                  <input
                    type="date"
                    value={selectedPerformanceDate}
                    onChange={(e) => setSelectedPerformanceDate(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-3 font-bold text-sm text-[#10b981] dark:text-white outline-none cursor-pointer focus:border-indigo-500 min-w-[200px]"
                  />
                </div>
              </div>

              {/* 1. USER JOINS (ব্যবহারকারী বৃদ্ধি) */}
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#10b981]/15 text-[#10b981] flex items-center justify-center font-black italic text-lg">
                      <ICONS.Users size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black italic uppercase dark:text-white leading-tight">
                        NEW USER REGISTRATIONS
                      </h3>
                      <p className="text-[10px] uppercase tracking-widest text-[#10b981] font-black">
                        নতুন ব্যবহারকারী জয়েনিং স্টেটমেন্ট (ক্লিক করলে ডিটেইলস
                        দেখাবে)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                  {/* Today */}
                  <button
                    onClick={() => openJoinsDetail("today")}
                    className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 text-left hover:scale-[1.02] hover:border-[#10b981]/30 transition-all group focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                  >
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                      TODAY (আজকে)
                    </span>
                    <div className="text-4xl font-black italic text-slate-950 dark:text-white mt-1 mb-0.5">
                      {joinsToday}
                    </div>
                    <p className="text-[9px] text-[#10b981] font-black uppercase tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* Weekly */}
                  <button
                    onClick={() => openJoinsDetail("weekly")}
                    className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 text-left hover:scale-[1.02] hover:border-[#10b981]/30 transition-all group focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                  >
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-sans">
                      THIS WEEK (সাপ্তাহিক)
                    </span>
                    <div className="text-4xl font-black italic text-indigo-500 mt-1 mb-0.5">
                      {joinsWeekly}
                    </div>
                    <p className="text-[9px] text-[#10b981] font-black uppercase tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* Custom Month */}
                  <button
                    onClick={() => openJoinsDetail("custom")}
                    className="bg-emerald-500/5 p-6 rounded-[2rem] border border-emerald-500/10 text-left hover:scale-[1.02] hover:border-[#10b981]/30 transition-all group focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                  >
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block font-sans">
                      MONTHLY ({selectedPerformanceMonth})
                    </span>
                    <div className="text-4xl font-black italic text-emerald-600 mt-1 mb-0.5">
                      {joinsCustom}
                    </div>
                    <p className="text-[9px] text-[#10b981] font-black uppercase tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* Custom Date */}
                  <button
                    onClick={() => openJoinsDetail("custom-date")}
                    className="bg-indigo-500/5 p-6 rounded-[2rem] border border-indigo-500/10 text-left hover:scale-[1.02] hover:border-indigo-500/30 transition-all group focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block font-sans">
                      CUSTOM DATE ({selectedPerformanceDate})
                    </span>
                    <div className="text-4xl font-black italic text-indigo-600 mt-1 mb-0.5">
                      {joinsCustomDate}
                    </div>
                    <p className="text-[9px] text-[#10b981] font-black uppercase tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* Total */}
                  <button
                    onClick={() => openJoinsDetail("total")}
                    className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 text-left hover:scale-[1.02] hover:border-[#10b981]/30 transition-all group focus:outline-none focus:ring-1 focus:ring-[#10b981]"
                  >
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-sans">
                      TOTAL (সর্বমোট)
                    </span>
                    <div className="text-4xl font-black italic text-slate-950 dark:text-white mt-1 mb-0.5">
                      {joinsTotal}
                    </div>
                    <p className="text-[9px] text-[#10b981] font-black uppercase tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>
                </div>
              </div>

              {/* 2. WORK COINS & EARNING REPORTS (কাজের পরিসংখ্যান ও মোট পেমেন্ট) */}
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#10b981]/15 text-[#10b981] flex items-center justify-center font-black italic text-lg">
                      ৳
                    </div>
                    <div>
                      <h3 className="text-sm font-black italic uppercase dark:text-white leading-tight">
                        COMPLETED WORK VALUE DETAIL
                      </h3>
                      <p className="text-[10px] uppercase tracking-widest text-[#10b981] font-black">
                        সফল কাজের মাধ্যমে ব্যবহারকারীদের উপার্জিত টাকা (ক্লিক
                        করলে ডিটেইলস দেখাবে)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                  {/* Today */}
                  <button
                    onClick={() => openWorkDetail("today")}
                    className="bg-[#10b981]/5 p-6 rounded-[2rem] border border-[#10b981]/15 text-left hover:scale-[1.02] hover:border-[#10b981]/40 transition-all group focus:outline-none"
                  >
                    <span className="text-[9px] font-black text-[#10b981] uppercase tracking-widest block">
                      TODAY VALUE (আজকে)
                    </span>
                    <div className="text-3xl font-black italic mt-1.5 mb-0.5 text-slate-950 dark:text-white">
                      ৳{workToday.value.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold mb-1 uppercase bg-white/40 dark:bg-white/5 px-2 py-0.5 rounded inline-block">
                      FROM {workToday.count} TASKS
                    </div>
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase tracking-widest block group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* Weekly */}
                  <button
                    onClick={() => openWorkDetail("weekly")}
                    className="bg-[#10b981]/5 p-6 rounded-[2rem] border border-[#10b981]/15 text-left hover:scale-[1.02] hover:border-[#10b981]/40 transition-all group focus:outline-none"
                  >
                    <span className="text-[9px] font-black text-[#10b981] uppercase tracking-widest block font-sans">
                      WEEKLY VALUE (সাপ্তাহিক)
                    </span>
                    <div className="text-3xl font-black italic mt-1.5 mb-0.5 text-slate-950 dark:text-white">
                      ৳{workWeekly.value.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold mb-1 uppercase bg-white/40 dark:bg-white/5 px-2 py-0.5 rounded inline-block">
                      FROM {workWeekly.count} TASKS
                    </div>
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase tracking-widest block group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* Custom Month */}
                  <button
                    onClick={() => openWorkDetail("custom")}
                    className="bg-[#10b981]/10 p-6 rounded-[2rem] border border-[#10b981]/25 text-left hover:scale-[1.02] hover:border-[#10b981]/40 transition-all group focus:outline-none"
                  >
                    <span className="text-[9px] font-black text-[#10b981] uppercase tracking-widest block font-sans">
                      MONTHLY ({selectedPerformanceMonth})
                    </span>
                    <div className="text-3xl font-black italic mt-1.5 mb-0.5 text-[#10b981]">
                      ৳{workCustom.value.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-[#10b981] font-bold mb-1 uppercase bg-white/40 dark:bg-white/5 px-2 py-0.5 rounded inline-block">
                      FROM {workCustom.count} TASKS
                    </div>
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase tracking-widest block group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* Custom Date */}
                  <button
                    onClick={() => openWorkDetail("custom-date")}
                    className="bg-indigo-500/5 p-6 rounded-[2rem] border border-indigo-500/15 text-left hover:scale-[1.02] hover:border-indigo-500/40 transition-all group focus:outline-none"
                  >
                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block font-sans">
                      DATE ({selectedPerformanceDate})
                    </span>
                    <div className="text-3xl font-black italic mt-1.5 mb-0.5 text-indigo-600">
                      ৳{workCustomDate.value.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-indigo-500 font-bold mb-1 uppercase bg-white/40 dark:bg-white/5 px-2 py-0.5 rounded inline-block">
                      FROM {workCustomDate.count} TASKS
                    </div>
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase tracking-widest block group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* Total */}
                  <button
                    onClick={() => openWorkDetail("total")}
                    className="bg-[#10b981]/5 p-6 rounded-[2rem] border border-[#10b981]/15 text-left hover:scale-[1.02] hover:border-[#10b981]/40 transition-all group focus:outline-none"
                  >
                    <span className="text-[9px] font-black text-[#10b981] uppercase tracking-widest block font-sans">
                      TOTAL VALUE (সর্বমোট হিসাব)
                    </span>
                    <div className="text-3xl font-black italic mt-1.5 mb-0.5 text-slate-950 dark:text-white">
                      ৳{workTotal.value.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold mb-1 uppercase bg-white/40 dark:bg-white/5 px-2 py-0.5 rounded inline-block">
                      FROM {workTotal.count} TASKS
                    </div>
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase tracking-widest block group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>
                </div>
              </div>

              {/* 3. SECTOR BREAKDOWN (সেক্টর ভিত্তিক কাজের রিপোর্ট) */}
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-black italic text-lg">
                    <ICONS.Zap size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black italic uppercase dark:text-white leading-tight">
                      SECTOR BASIS DETAILS (সেক্টর ভিত্তিক কাজের হিসাব)
                    </h3>
                    <p className="text-[10px] uppercase tracking-widest text-[#10b981] font-black">
                      কোন কোন সেক্টরে কি পরিমান কাজ পেন্ডিং ও অ্যাপ্রুভড (আলাদা
                      ডিটেইল দেখতে নাম্বারগুলোতে ক্লিক করুন)
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="pb-4">SECTOR (সেক্টর)</th>
                        <th className="pb-4 text-center">TODAY (আজ)</th>
                        <th className="pb-4 text-center">WEEKLY (সাপ্তাহিক)</th>
                        <th className="pb-4 text-center">
                          MONTHLY ({selectedPerformanceMonth})
                        </th>
                        <th className="pb-4 text-center">
                          CUSTOM DATE ({selectedPerformanceDate})
                        </th>
                        <th className="pb-4 text-center">
                          TOTAL OVERALL (সর্বমোট)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectors.map((secName) => {
                        const statsToday = getSectorStatsByTimeframe(
                          secName,
                          "today",
                        );
                        const statsWeekly = getSectorStatsByTimeframe(
                          secName,
                          "weekly",
                        );
                        const statsCustom = getSectorStatsByTimeframe(
                          secName,
                          "custom",
                        );
                        const statsCustomDate = getSectorStatsByTimeframe(
                          secName,
                          "custom-date",
                        );
                        const statsTotal = getSectorStatsByTimeframe(
                          secName,
                          "total",
                        );

                        return (
                          <tr
                            key={secName}
                            className="border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-slate-50/30 dark:hover:bg-white/2 transition-colors"
                          >
                            <td className="py-5 font-black uppercase italic text-sm text-slate-950 dark:text-white">
                              {secName}
                            </td>

                            {/* Today Sector cell */}
                            <td className="py-5 text-center">
                              <div className="flex flex-col items-center gap-1.5">
                                <div className="flex gap-1.5 justify-center">
                                  <button
                                    onClick={() =>
                                      openSectorDetail(secName, "today")
                                    }
                                    title="Click to view pending"
                                    className="px-2 py-0.5 rounded text-[8.5px] font-black bg-amber-500/10 text-amber-500 hover:scale-[1.05] active:scale-[0.95]"
                                  >
                                    {statsToday.pending} pnd
                                  </button>
                                  <button
                                    onClick={() =>
                                      openSectorDetail(secName, "today")
                                    }
                                    title="Click to view approved"
                                    className="px-2 py-0.5 rounded text-[8.5px] font-black bg-emerald-500/10 text-emerald-500 hover:scale-[1.05] active:scale-[0.95]"
                                  >
                                    {statsToday.approved} app
                                  </button>
                                </div>
                                <span className="text-[9px] text-slate-400 font-mono font-bold">
                                  ৳{statsToday.amount.toFixed(1)}
                                </span>
                              </div>
                            </td>

                            {/* Weekly Sector cell */}
                            <td className="py-5 text-center">
                              <div className="flex flex-col items-center gap-1.5">
                                <div className="flex gap-1.5 justify-center">
                                  <button
                                    onClick={() =>
                                      openSectorDetail(secName, "weekly")
                                    }
                                    className="px-2 py-0.5 rounded text-[8.5px] font-black bg-amber-500/10 text-amber-500 hover:scale-[1.05] active:scale-[0.95]"
                                  >
                                    {statsWeekly.pending} pnd
                                  </button>
                                  <button
                                    onClick={() =>
                                      openSectorDetail(secName, "weekly")
                                    }
                                    className="px-2 py-0.5 rounded text-[8.5px] font-black bg-emerald-500/10 text-emerald-500 hover:scale-[1.05] active:scale-[0.95]"
                                  >
                                    {statsWeekly.approved} app
                                  </button>
                                </div>
                                <span className="text-[9px] text-slate-400 font-mono font-bold">
                                  ৳{statsWeekly.amount.toFixed(1)}
                                </span>
                              </div>
                            </td>

                            {/* Custom Month Sector cell */}
                            <td className="py-5 text-center">
                              <div className="flex flex-col items-center gap-1.5">
                                <div className="flex gap-1.5 justify-center">
                                  <button
                                    onClick={() =>
                                      openSectorDetail(secName, "custom")
                                    }
                                    className="px-2 py-0.5 rounded text-[8.5px] font-black bg-amber-500/10 text-amber-500 hover:scale-[1.05] active:scale-[0.95]"
                                  >
                                    {statsCustom.pending} pnd
                                  </button>
                                  <button
                                    onClick={() =>
                                      openSectorDetail(secName, "custom")
                                    }
                                    className="px-2 py-0.5 rounded text-[8.5px] font-black bg-emerald-500/10 text-emerald-500 hover:scale-[1.05] active:scale-[0.95]"
                                  >
                                    {statsCustom.approved} app
                                  </button>
                                </div>
                                <span className="text-[9px] text-slate-400 font-mono font-bold">
                                  ৳{statsCustom.amount.toFixed(1)}
                                </span>
                              </div>
                            </td>

                            {/* Custom Date Sector cell */}
                            <td className="py-5 text-center">
                              <div className="flex flex-col items-center gap-1.5">
                                <div className="flex gap-1.5 justify-center">
                                  <button
                                    onClick={() =>
                                      openSectorDetail(secName, "custom-date")
                                    }
                                    className="px-2 py-0.5 rounded text-[8.5px] font-black bg-amber-500/10 text-amber-500 hover:scale-[1.05] active:scale-[0.95]"
                                  >
                                    {statsCustomDate.pending} pnd
                                  </button>
                                  <button
                                    onClick={() =>
                                      openSectorDetail(secName, "custom-date")
                                    }
                                    className="px-2 py-0.5 rounded text-[8.5px] font-black bg-emerald-500/10 text-emerald-500 hover:scale-[1.05] active:scale-[0.95]"
                                  >
                                    {statsCustomDate.approved} app
                                  </button>
                                </div>
                                <span className="text-[9px] text-slate-400 font-mono font-bold">
                                  ৳{statsCustomDate.amount.toFixed(1)}
                                </span>
                              </div>
                            </td>

                            {/* Total Sector cell */}
                            <td className="py-5 text-center">
                              <div className="flex flex-col items-center gap-1.5">
                                <div className="flex gap-1.5 justify-center animate-pulse">
                                  <button
                                    onClick={() =>
                                      openSectorDetail(secName, "total")
                                    }
                                    className="px-2 py-0.5 rounded text-[8.5px] font-black bg-amber-500/15 text-amber-600 hover:scale-[1.05] active:scale-[0.95]"
                                  >
                                    {statsTotal.pending} pnd
                                  </button>
                                  <button
                                    onClick={() =>
                                      openSectorDetail(secName, "total")
                                    }
                                    className="px-2 py-0.5 rounded text-[8.5px] font-black bg-emerald-500/15 text-emerald-600 hover:scale-[1.05] active:scale-[0.95]"
                                  >
                                    {statsTotal.approved} app
                                  </button>
                                </div>
                                <span className="text-[9.5px] text-indigo-600 dark:text-indigo-400 font-mono font-black">
                                  ৳{statsTotal.amount.toFixed(1)}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. WITHDRAW PERFORMANCE (উইথড্র বা ক্যাশআউট লাইভ হিসেব) */}
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-500 flex items-center justify-center font-black italic text-lg">
                    <ICONS.Withdraw size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black italic uppercase dark:text-white leading-tight">
                      WITHDRAWAL PERFORMANCE DATA
                    </h3>
                    <p className="text-[10px] uppercase tracking-widest text-[#10b981] font-black">
                      উইথড্র ও ক্যাশআউট সংক্রান্ত রিয়েল-টাইম হিসাব (ক্লিক করলে
                      ডিটেইলস দেখাবে)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                  {/* TODAY WITHDRAWS */}
                  <button
                    onClick={() => openWithdrawDetail("today")}
                    className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 text-left hover:scale-[1.02] hover:border-rose-500/30 transition-all group focus:outline-none"
                  >
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block mb-2">
                      TODAY WITHDRAWS (আজকে)
                    </span>
                    <div className="space-y-1.5 text-xs font-bold">
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Pending:</span>
                        <span className="font-black text-amber-500">
                          ৳{wdsToday.pending.toFixed(2)} (
                          {wdsToday.pendingCount} টি)
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Approved:</span>
                        <span className="font-black text-emerald-500">
                          ৳{wdsToday.approved.toFixed(2)} (
                          {wdsToday.approvedCount} টি)
                        </span>
                      </div>
                    </div>
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase mt-3 tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* WEEKLY WITHDRAWS */}
                  <button
                    onClick={() => openWithdrawDetail("weekly")}
                    className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 text-left hover:scale-[1.02] hover:border-rose-500/30 transition-all group focus:outline-none"
                  >
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block mb-2 font-sans">
                      WEEKLY WITHDRAWS (সাপ্তাহিক)
                    </span>
                    <div className="space-y-1.5 text-xs font-bold">
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Pending:</span>
                        <span className="font-black text-amber-500">
                          ৳{wdsWeekly.pending.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Paid Out:</span>
                        <span className="font-black text-emerald-500">
                          ৳{wdsWeekly.approved.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase mt-3 tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* CUSTOM MONTH WITHDRAWS */}
                  <button
                    onClick={() => openWithdrawDetail("custom")}
                    className="bg-rose-500/5 p-6 rounded-[2rem] border border-rose-500/10 text-left hover:scale-[1.02] hover:border-rose-500/30 transition-all group focus:outline-none"
                  >
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block mb-2 font-sans">
                      MONTHLY ({selectedPerformanceMonth})
                    </span>
                    <div className="space-y-1.5 text-xs font-bold">
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Pending:</span>
                        <span className="font-black text-amber-500">
                          ৳{wdsCustom.pending.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Paid Out:</span>
                        <span className="font-black text-emerald-600">
                          ৳{wdsCustom.approved.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase mt-3 tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* CUSTOM DATE WITHDRAWS */}
                  <button
                    onClick={() => openWithdrawDetail("custom-date")}
                    className="bg-indigo-500/5 p-6 rounded-[2rem] border border-indigo-500/10 text-left hover:scale-[1.02] hover:border-indigo-500/30 transition-all group focus:outline-none"
                  >
                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block mb-2 font-sans">
                      DATE ({selectedPerformanceDate})
                    </span>
                    <div className="space-y-1.5 text-xs font-bold">
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Pending:</span>
                        <span className="font-black text-amber-500">
                          ৳{wdsCustomDate.pending.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Paid Out:</span>
                        <span className="font-black text-indigo-600">
                          ৳{wdsCustomDate.approved.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase mt-3 tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* TOTAL WITHDRAWS OVERALL */}
                  <button
                    onClick={() => openWithdrawDetail("total")}
                    className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 text-left hover:scale-[1.02] hover:border-rose-500/30 transition-all group focus:outline-none"
                  >
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block mb-2 font-sans">
                      TOTAL WITHDRAWS (মোট এ টু জেড)
                    </span>
                    <div className="space-y-1.5 text-xs font-bold">
                      <div className="flex justify-between items-center text-slate-500">
                        <span>All Required:</span>
                        <span className="font-black text-[#10b981]">
                          ৳{wdsTotal.requested.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Paid Out:</span>
                        <span className="font-black text-emerald-500">
                          ৳{wdsTotal.approved.toFixed(2)} (
                          {wdsTotal.approvedCount} টি)
                        </span>
                      </div>
                    </div>
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase mt-3 tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>
                </div>
              </div>

              {/* 5. MEMBERSHIP STATS (মেম্বারশিপ হিসাব) */}
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center font-black italic text-lg">
                    💎
                  </div>
                  <div>
                    <h3 className="text-sm font-black italic uppercase dark:text-white leading-tight">
                      MEMBERSHIP UPGRADE STATS
                    </h3>
                    <p className="text-[10px] uppercase tracking-widest text-[#10b981] font-black">
                      নতুন মেম্বারশিপ রিকোয়েস্ট ও পেমেন্ট অ্যাক্টিভেশন হিসেব
                      (ক্লিক করলে ডিটেইলস দেখাবে)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                  {/* TODAY MEMBERSHIPS */}
                  <button
                    onClick={() => openMembershipDetail("today")}
                    className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 text-left hover:scale-[1.02] hover:border-indigo-500/30 transition-all group focus:outline-none"
                  >
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-2">
                      TODAY MEMBERSHIP (আজকে)
                    </span>
                    <div className="space-y-1.5 text-xs font-bold">
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Pending:</span>
                        <span className="font-black text-amber-500">
                          ৳{mbsToday.pendingAmount.toFixed(1)} (
                          {mbsToday.pending} টি)
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Approved:</span>
                        <span className="font-black text-emerald-500">
                          ৳{mbsToday.approvedAmount.toFixed(1)} (
                          {mbsToday.approved} )
                        </span>
                      </div>
                    </div>
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase mt-3 tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* WEEKLY MEMBERSHIPS */}
                  <button
                    onClick={() => openMembershipDetail("weekly")}
                    className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 text-left hover:scale-[1.02] hover:border-indigo-500/30 transition-all group focus:outline-none"
                  >
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-2 font-sans">
                      WEEKLY (সাপ্তাহিক)
                    </span>
                    <div className="space-y-1.5 text-xs font-bold">
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Pending:</span>
                        <span className="font-black text-amber-500">
                          ৳{mbsWeekly.pendingAmount.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Approved:</span>
                        <span className="font-black text-emerald-500">
                          ৳{mbsWeekly.approvedAmount.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase mt-3 tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* CUSTOM MONTH MEMBERSHIPS */}
                  <button
                    onClick={() => openMembershipDetail("custom")}
                    className="bg-indigo-500/5 p-6 rounded-[2rem] border border-indigo-500/10 text-left hover:scale-[1.02] hover:border-indigo-500/30 transition-all group focus:outline-none"
                  >
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-2 font-sans">
                      MONTHLY ({selectedPerformanceMonth})
                    </span>
                    <div className="space-y-1.5 text-xs font-bold">
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Pending:</span>
                        <span className="font-black text-amber-500">
                          ৳{mbsCustom.pendingAmount.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Approved:</span>
                        <span className="font-black text-indigo-600">
                          ৳{mbsCustom.approvedAmount.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase mt-3 tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* CUSTOM DATE MEMBERSHIPS */}
                  <button
                    onClick={() => openMembershipDetail("custom-date")}
                    className="bg-indigo-500/5 p-6 rounded-[2rem] border border-indigo-500/10 text-left hover:scale-[1.02] hover:border-indigo-500/30 transition-all group focus:outline-none"
                  >
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-2 font-sans">
                      DATE ({selectedPerformanceDate})
                    </span>
                    <div className="space-y-1.5 text-xs font-bold">
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Pending:</span>
                        <span className="font-black text-amber-500">
                          ৳{mbsCustomDate.pendingAmount.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Approved:</span>
                        <span className="font-black text-indigo-600">
                          ৳{mbsCustomDate.approvedAmount.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase mt-3 tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* TOTAL MEMBERSHIPS */}
                  <button
                    onClick={() => openMembershipDetail("total")}
                    className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 text-left hover:scale-[1.02] hover:border-indigo-500/30 transition-all group focus:outline-none"
                  >
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-2 font-sans">
                      TOTAL MEMBERSHIPS (সর্বমোট হিসাব)
                    </span>
                    <div className="space-y-1.5 text-xs font-bold">
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Total Count:</span>
                        <span className="font-black text-slate-800 dark:text-white">
                          {mbsTotal.total} requests
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500">
                        <span>Approved Revenue:</span>
                        <span className="font-black text-emerald-500">
                          ৳{mbsTotal.approvedAmount.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase mt-3 tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>
                </div>
              </div>

              {/* 6. REFERRAL PERFORMANCE STATS (রেফারেল হিসাব) */}
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-teal-500/15 text-teal-500 flex items-center justify-center font-black italic text-lg">
                      🔗
                    </div>
                    <div>
                      <h3 className="text-sm font-black italic uppercase dark:text-white leading-tight">
                        REFERRAL PERFORMANCE HUB (রেফারেল হিসাব)
                      </h3>
                      <p className="text-[10px] uppercase tracking-widest text-teal-500 font-black">
                        কে কত রেফার করেছেন এবং শীর্ষ রেফারারদের তালিকা (ক্লিক
                        করলে ডিটেইলস দেখাবে)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                  {/* TODAY REFERRALS */}
                  <button
                    onClick={() => openReferralDetail("today")}
                    className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 text-left hover:scale-[1.02] hover:border-teal-500/30 transition-all group focus:outline-none"
                  >
                    <span className="text-[9px] font-black text-teal-500 uppercase tracking-widest block mb-2">
                      TODAY REFERRALS (আজকে)
                    </span>
                    <div className="text-4xl font-black italic text-slate-950 dark:text-white mt-1 mb-2">
                      {refToday.total}{" "}
                      <span className="text-xs font-normal not-italic text-slate-400">
                        জন
                      </span>
                    </div>
                    {refToday.topReferrer ? (
                      <div className="text-[9px] text-slate-500 font-medium">
                        🏆 Top:{" "}
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {refToday.topReferrer.user.name}
                        </span>{" "}
                        ({refToday.topReferrer.count})
                      </div>
                    ) : (
                      <div className="text-[9px] text-slate-400 italic">
                        No referrals today
                      </div>
                    )}
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase mt-3 tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* WEEKLY REFERRALS */}
                  <button
                    onClick={() => openReferralDetail("weekly")}
                    className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 text-left hover:scale-[1.02] hover:border-teal-500/30 transition-all group focus:outline-none"
                  >
                    <span className="text-[9px] font-black text-teal-500 uppercase tracking-widest block mb-2 font-sans">
                      WEEKLY (সাপ্তাহিক)
                    </span>
                    <div className="text-4xl font-black italic text-slate-950 dark:text-white mt-1 mb-2">
                      {refWeekly.total}{" "}
                      <span className="text-xs font-normal not-italic text-slate-400">
                        জন
                      </span>
                    </div>
                    {refWeekly.topReferrer ? (
                      <div className="text-[9px] text-slate-500 font-medium">
                        🏆 Top:{" "}
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {refWeekly.topReferrer.user.name}
                        </span>{" "}
                        ({refWeekly.topReferrer.count})
                      </div>
                    ) : (
                      <div className="text-[9px] text-slate-400 italic">
                        No referrals this week
                      </div>
                    )}
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase mt-3 tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* MONTHLY REFERRALS */}
                  <button
                    onClick={() => openReferralDetail("custom")}
                    className="bg-teal-500/5 p-6 rounded-[2rem] border border-teal-500/10 text-left hover:scale-[1.02] hover:border-teal-500/30 transition-all group focus:outline-none"
                  >
                    <span className="text-[9px] font-black text-teal-500 uppercase tracking-widest block mb-2 font-sans">
                      MONTHLY ({selectedPerformanceMonth})
                    </span>
                    <div className="text-4xl font-black italic text-slate-950 dark:text-teal-400 mt-1 mb-2">
                      {refCustom.total}{" "}
                      <span className="text-xs font-normal not-italic text-slate-400">
                        জন
                      </span>
                    </div>
                    {refCustom.topReferrer ? (
                      <div className="text-[9px] text-slate-500 font-medium">
                        🏆 Top:{" "}
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {refCustom.topReferrer.user.name}
                        </span>{" "}
                        ({refCustom.topReferrer.count})
                      </div>
                    ) : (
                      <div className="text-[9px] text-slate-400 italic">
                        No referrals in this month
                      </div>
                    )}
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase mt-3 tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* CUSTOM DATE REFERRALS */}
                  <button
                    onClick={() => openReferralDetail("custom-date")}
                    className="bg-indigo-500/5 p-6 rounded-[2rem] border border-indigo-500/10 text-left hover:scale-[1.02] hover:border-indigo-500/30 transition-all group focus:outline-none"
                  >
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-2 font-sans">
                      DATE ({selectedPerformanceDate})
                    </span>
                    <div className="text-4xl font-black italic text-slate-950 dark:text-indigo-400 mt-1 mb-2">
                      {refCustomDate.total}{" "}
                      <span className="text-xs font-normal not-italic text-slate-400">
                        জন
                      </span>
                    </div>
                    {refCustomDate.topReferrer ? (
                      <div className="text-[9px] text-slate-500 font-medium">
                        🏆 Top:{" "}
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {refCustomDate.topReferrer.user.name}
                        </span>{" "}
                        ({refCustomDate.topReferrer.count})
                      </div>
                    ) : (
                      <div className="text-[9px] text-slate-400 italic">
                        No referrals on this date
                      </div>
                    )}
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase mt-3 tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* TOTAL REFERRALS */}
                  <button
                    onClick={() => openReferralDetail("total")}
                    className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 text-left hover:scale-[1.02] hover:border-teal-500/30 transition-all group focus:outline-none"
                  >
                    <span className="text-[9px] font-black text-teal-500 uppercase tracking-widest block mb-2 font-sans">
                      TOTAL REFERRALS (সর্বমোট)
                    </span>
                    <div className="text-4xl font-black italic text-slate-950 dark:text-white mt-1 mb-2">
                      {refTotal.total}{" "}
                      <span className="text-xs font-normal not-italic text-slate-400">
                        জন
                      </span>
                    </div>
                    {refTotal.topReferrer ? (
                      <div className="text-[9px] text-slate-500 font-medium">
                        🏆 Top:{" "}
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {refTotal.topReferrer.user.name}
                        </span>{" "}
                        ({refTotal.topReferrer.count})
                      </div>
                    ) : (
                      <div className="text-[9px] text-slate-400 italic">
                        No referrals found
                      </div>
                    )}
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase mt-3 tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>
                </div>
              </div>

              {/* 7. SPONSOR ADS VIEW STATS (বিজ্ঞাপন প্রদর্শন হিসাব) */}
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-8">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-[1.25rem] bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
                      <ICONS.Youtube size={20} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black italic uppercase dark:text-white leading-tight">
                        SPONSOR ADS DISPLAY HUB (বিজ্ঞাপন প্রদর্শন হিসাব)
                      </h3>
                      <p className="text-[10px] uppercase tracking-widest text-[#10b981] font-black">
                        বিজ্ঞাপন প্রদর্শনের স্বয়ংক্রিয় ট্র্যাকিং ও এনালাইটিক্স (ক্লিক করলে ডিটেইলস দেখাবে)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                  {/* TODAY ADS */}
                  <button
                    onClick={() => openAdsDetail("today")}
                    className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 text-left hover:scale-[1.02] hover:border-rose-500/30 transition-all group focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block mb-2 font-sans">
                      TODAY ADS (আজকে)
                    </span>
                    <div className="text-4xl font-black italic text-slate-950 dark:text-white mt-1 mb-2">
                      {adsToday.total}{" "}
                      <span className="text-xs font-normal not-italic text-slate-400">
                        বার
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-400 italic">
                      Today's unique ad displays
                    </div>
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase mt-3 tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* WEEKLY ADS */}
                  <button
                    onClick={() => openAdsDetail("weekly")}
                    className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 text-left hover:scale-[1.02] hover:border-rose-500/30 transition-all group focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block mb-2 font-sans">
                      THIS WEEK (সাপ্তাহিক)
                    </span>
                    <div className="text-4xl font-black italic text-rose-500 mt-1 mb-2">
                      {adsWeekly.total}{" "}
                      <span className="text-xs font-normal not-italic text-slate-400">
                        বার
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-400 italic">
                      Weekly accumulated displays
                    </div>
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase mt-3 tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* MONTHLY ADS */}
                  <button
                    onClick={() => openAdsDetail("custom")}
                    className="bg-emerald-500/5 p-6 rounded-[2rem] border border-emerald-500/10 text-left hover:scale-[1.02] hover:border-rose-500/30 transition-all group focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest block mb-2 font-sans">
                      MONTHLY ({selectedPerformanceMonth})
                    </span>
                    <div className="text-4xl font-black italic text-rose-600 mt-1 mb-2">
                      {adsCustom.total}{" "}
                      <span className="text-xs font-normal not-italic text-slate-400">
                        বার
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-400 italic">
                      This month's count
                    </div>
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase mt-3 tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* CUSTOM DATE ADS */}
                  <button
                    onClick={() => openAdsDetail("custom-date")}
                    className="bg-indigo-500/5 p-6 rounded-[2rem] border border-indigo-500/10 text-left hover:scale-[1.02] hover:border-indigo-500/30 transition-all group focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block mb-2 font-sans">
                      CUSTOM DATE ({selectedPerformanceDate})
                    </span>
                    <div className="text-4xl font-black italic text-indigo-600 mt-1 mb-2">
                      {adsCustomDate.total}{" "}
                      <span className="text-xs font-normal not-italic text-slate-400">
                        বার
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-400 italic">
                      For selected date
                    </div>
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase mt-3 tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>

                  {/* TOTAL ADS */}
                  <button
                    onClick={() => openAdsDetail("total")}
                    className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 text-left hover:scale-[1.02] hover:border-rose-500/30 transition-all group focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest block mb-2 font-sans">
                      TOTAL ADS (সর্বমোট)
                    </span>
                    <div className="text-4xl font-black italic text-slate-950 dark:text-white mt-1 mb-2">
                      {adsTotal.total}{" "}
                      <span className="text-xs font-normal not-italic text-slate-400">
                        বার
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-400 italic">
                      Grand total ad views
                    </div>
                    <p className="text-[8.5px] text-[#10b981] font-black uppercase mt-3 tracking-wider group-hover:underline">
                      VIEW DETAIL ➔
                    </p>
                  </button>
                </div>
              </div>

              {/* PERFORMANCE ANALYSIS DETAILS LIGHTBOX MODAL */}
              {perfDetailOpen &&
                (() => {
                  let title = "";
                  let sub = "";
                  let content = null;

                  const formatDateString = (dateStr?: string) => {
                    if (!dateStr) return "N/A";
                    try {
                      const d = parseDateSafe(dateStr);
                      return d.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                    } catch (e) {
                      return dateStr;
                    }
                  };

                  const timeframeLabel =
                    perfDetailTimeframe === "today"
                      ? "TODAY (আজ)"
                      : perfDetailTimeframe === "weekly"
                        ? "WEEKLY (সাপ্তাহিক)"
                        : perfDetailTimeframe === "custom"
                          ? `MONTHLY (${selectedPerformanceMonth})`
                          : perfDetailTimeframe === "custom-date"
                            ? `CUSTOM DATE (${selectedPerformanceDate})`
                            : "TOTAL (A to Z)";

                  if (perfDetailType === "joins") {
                    const list = (users || []).filter((u) =>
                      isInTimeframe(u.createdAt, perfDetailTimeframe),
                    );
                    title = `NEW USER JOINS: ${timeframeLabel}`;
                    sub = `নতুন ব্যবহারকারী অ্যাকাউন্ট তৈরি করেছেন: ${list.length} জন`;
                    content = (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse font-sans">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase text-slate-400">
                              <th className="pb-3 pr-2">NAME & USER ID</th>
                              <th className="pb-3 pr-2">EMAIL ADDRESS</th>
                              <th className="pb-3 text-center">
                                REFERRAL CODE
                              </th>
                              <th className="pb-3 text-center">REFS COUNT</th>
                              <th className="pb-3 text-right">
                                WALLET BALANCE
                              </th>
                              <th className="pb-3 text-right">
                                JOIN DATE & TIME
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {list.map((u, i) => (
                              <tr
                                key={u.id || i}
                                className="border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors"
                              >
                                <td className="py-3.5 pr-2">
                                  <div className="font-bold text-slate-800 dark:text-white uppercase text-[12px]">
                                    {u.name || "N/A"}
                                  </div>
                                  <div className="text-[9.5px] text-slate-400 font-mono tracking-tight select-all">
                                    UID: {u.id}
                                  </div>
                                  {u.ip && (
                                    <div className="text-[9px] text-[#10b981] font-mono mt-0.5">
                                      IP: {u.ip}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3.5 pr-2 font-mono text-slate-600 dark:text-slate-300 select-all">
                                  {u.email}
                                </td>
                                <td className="py-3.5 text-center font-mono font-medium text-slate-500 select-all">
                                  {u.referralCode || "None"}
                                </td>
                                <td className="py-3.5 text-center font-black text-indigo-500">
                                  {u.referralCount || 0}
                                </td>
                                <td className="py-3.5 text-right font-black text-emerald-500">
                                  ৳{(u.balance || 0).toFixed(2)}
                                </td>
                                <td className="py-3.5 text-right text-slate-500 font-mono text-[10px]">
                                  {formatDateString(u.createdAt)}
                                </td>
                              </tr>
                            ))}
                            {list.length === 0 && (
                              <tr>
                                <td
                                  colSpan={6}
                                  className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] opacity-60"
                                >
                                  এই সময়সীমার মধ্যে কোনো নতুন ব্যবহারকারী জয়েন
                                  করেনি।
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    );
                  } else if (perfDetailType === "work") {
                    const list = (taskSubmissions || []).filter(
                      (sub) =>
                        sub.status === "approved" &&
                        isInTimeframe(sub.submittedAt, perfDetailTimeframe),
                    );
                    const sum = list.reduce(
                      (acc, curr) => acc + (curr.reward || 0),
                      0,
                    );
                    title = `APPROVED TASK REWARDS VALUE: ${timeframeLabel}`;
                    sub = `মোট কাজ সম্পন্ন হয়েছে: ${list.length} টি | মোট ডিস্ট্রিবিউটেড টাকা: ৳${sum.toFixed(2)}`;
                    content = (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse font-sans">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase text-slate-400">
                              <th className="pb-3">USER NAME & UID</th>
                              <th className="pb-3">TASK TITLE & DETS</th>
                              <th className="pb-3 text-center">TASK SECTOR</th>
                              <th className="pb-3">PROCESS DETAILS & PROOF</th>
                              <th className="pb-3 text-right">
                                REWARD PAYMENT
                              </th>
                              <th className="pb-3 text-right">
                                SUBMIT DATE & TIME
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {list.map((subItem, i) => (
                              <tr
                                key={subItem.id || i}
                                className="border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors"
                              >
                                <td className="py-3.5">
                                  <div className="font-bold text-slate-800 dark:text-white uppercase">
                                    {subItem.userName || "N/A"}
                                  </div>
                                  <div className="text-[9px] text-slate-400 font-mono select-all">
                                    User ID: {subItem.userId}
                                  </div>
                                </td>
                                <td
                                  className="py-3.5 text-slate-700 dark:text-slate-300 font-medium max-w-[200px] truncate"
                                  title={subItem.taskTitle}
                                >
                                  {subItem.taskTitle}
                                </td>
                                <td className="py-3.5 text-center">
                                  <span className="px-2.5 py-0.5 rounded-lg text-[8.5px] font-black uppercase bg-slate-100 dark:bg-white/5 text-slate-500">
                                    {getTaskType(subItem)}
                                  </span>
                                </td>
                                <td className="py-3.5">
                                  <div className="space-y-1 max-w-[250px]">
                                    {subItem.approvedByName ||
                                    subItem.approvedById ? (
                                      <div className="text-[10px] text-blue-600 dark:text-blue-400 font-black flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded w-fit">
                                        👤{" "}
                                        {getMonitorDisplayName(
                                          subItem.approvedById,
                                          subItem.approvedByName,
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-[9px] text-slate-400 italic">
                                        Approved by Admin (Auto)
                                      </div>
                                    )}
                                    {subItem.textProof && (
                                      <div className="text-[9px] bg-slate-100 dark:bg-white/5 p-1 rounded font-mono break-all text-slate-500 max-h-12 overflow-y-auto">
                                        Proof: {subItem.textProof}
                                      </div>
                                    )}
                                    {subItem.screenshots &&
                                      subItem.screenshots.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {subItem.screenshots.map((s, idx) => (
                                            <button
                                              key={idx}
                                              type="button"
                                              onClick={() =>
                                                setLightboxImage(s)
                                              }
                                              className="text-[8px] font-black uppercase tracking-wider bg-[#10b981]/10 hover:bg-[#10b981] text-[#10b981] hover:text-white border border-[#10b981]/25 px-1.5 py-0.5 rounded transition-all"
                                            >
                                              Img {idx + 1}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                  </div>
                                </td>
                                <td className="py-3.5 text-right font-black text-emerald-500">
                                  ৳{(subItem.reward || 0).toFixed(2)}
                                </td>
                                <td className="py-3.5 text-right text-slate-500 font-mono text-[10px]">
                                  {formatDateString(subItem.submittedAt)}
                                </td>
                              </tr>
                            ))}
                            {list.length === 0 && (
                              <tr>
                                <td
                                  colSpan={5}
                                  className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] opacity-60"
                                >
                                  এই সময়সীমার মধ্যে কোনো অনুমোদিত কাজের রেকর্ড
                                  পাওয়া যায়নি।
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    );
                  } else if (perfDetailType === "sector" && perfDetailSector) {
                    if (perfDetailSector === "Store Control") {
                      const list = (storeOrders || []).filter((order) => {
                        return isInTimeframe(
                          order.submittedAt,
                          perfDetailTimeframe,
                        );
                      });
                      const approvedCount = list.filter(
                        (o) => o.status === "completed",
                      ).length;
                      const pendingCount = list.filter(
                        (o) => o.status === "pending",
                      ).length;
                      const aprVal = list
                        .filter((o) => o.status === "completed")
                        .reduce((a, c) => a + (c.itemPrice || 0), 0);

                      title = `STORE ORDERS LOG: ${timeframeLabel}`;
                      sub = `মোট অর্ডার: ${list.length} | কমপ্লিট: ${approvedCount} টি (৳${aprVal.toFixed(2)}) | পেন্ডিং: ${pendingCount} টি`;
                      content = (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse font-sans">
                            <thead>
                              <tr className="border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase text-slate-400">
                                <th className="pb-3 text-left">
                                  USER INFORMATION
                                </th>
                                <th className="pb-3 text-left">ITEM TITLE</th>
                                <th className="pb-3 text-center">
                                  ORDER STATUS
                                </th>
                                <th className="pb-3 text-right">ITEM PRICE</th>
                                <th className="pb-3 text-right">ORDER DATE</th>
                              </tr>
                            </thead>
                            <tbody>
                              {list.map((order, i) => (
                                <tr
                                  key={order.id || i}
                                  className="border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors"
                                >
                                  <td className="py-3.5 pr-3">
                                    <div className="font-bold text-slate-800 dark:text-white uppercase">
                                      {order.userName || "N/A"}
                                    </div>
                                    <div className="text-[9.5px] text-slate-400 font-mono select-all">
                                      UID: {order.userId}
                                    </div>
                                    {order.userEmail && (
                                      <div className="text-[8px] font-mono text-emerald-500">
                                        {order.userEmail}
                                      </div>
                                    )}
                                  </td>
                                  <td
                                    className="py-3.5 text-slate-700 dark:text-slate-300 font-medium max-w-[220px] truncate"
                                    title={order.itemTitle}
                                  >
                                    {order.itemTitle}
                                  </td>
                                  <td className="py-3.5 text-center">
                                    <span
                                      className={`px-2.5 py-1 rounded-lg text-[8.5px] font-black uppercase ${
                                        order.status === "completed"
                                          ? "bg-emerald-500/10 text-emerald-500"
                                          : "bg-amber-500/10 text-amber-500"
                                      }`}
                                    >
                                      {order.status === "completed"
                                        ? "completed"
                                        : "pending"}
                                    </span>
                                  </td>
                                  <td className="py-3.5 text-right font-black text-slate-800 dark:text-white">
                                    ৳{(order.itemPrice || 0).toFixed(2)}
                                  </td>
                                  <td className="py-3.5 text-right text-slate-500 font-mono text-[10px]">
                                    {formatDateString(order.submittedAt)}
                                  </td>
                                </tr>
                              ))}
                              {list.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={5}
                                    className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] opacity-60"
                                  >
                                    এই সময়সীমার মধ্যে কোনো অর্ডার সাবমিশন নেই।
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      );
                    } else {
                      const list = (taskSubmissions || []).filter((sub) => {
                        const typeStr = getTaskType(sub);
                        const isMatchingSector =
                          perfDetailSector === "General Task"
                            ? typeStr !== "App Install" &&
                              typeStr !== "Link Open" &&
                              typeStr !== "Watch & Earn" &&
                              typeStr !== "Social" &&
                              typeStr !== "Telegram" &&
                              typeStr !== "1 Device= 1 Task"
                            : typeStr === perfDetailSector;
                        return (
                          isMatchingSector &&
                          isInTimeframe(sub.submittedAt, perfDetailTimeframe)
                        );
                      });
                      const approvedCount = list.filter(
                        (s) => s.status === "approved",
                      ).length;
                      const pendingCount = list.filter(
                        (s) => s.status === "pending",
                      ).length;
                      const rejectedCount = list.filter(
                        (s) => s.status === "rejected",
                      ).length;
                      const aprVal = list
                        .filter((s) => s.status === "approved")
                        .reduce((a, c) => a + (c.reward || 0), 0);

                      title = `${perfDetailSector.toUpperCase()} SECTOR STREAM: ${timeframeLabel}`;
                      sub = `মোট কাজ: ${list.length} | অনুমোদিত: ${approvedCount} টি (৳${aprVal.toFixed(2)}) | পেন্ডিং: ${pendingCount} টি | রিজেক্টেড: ${rejectedCount} টি`;
                      content = (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse font-sans">
                            <thead>
                              <tr className="border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase text-slate-400">
                                <th className="pb-3 text-left">
                                  USER INFORMATION
                                </th>
                                <th className="pb-3 text-left">
                                  SUBMITTED TASK
                                </th>
                                <th className="pb-3 text-center">
                                  SUBMISSION STATUS
                                </th>
                                <th className="pb-3">
                                  PROCESS DETAILS & PROOF
                                </th>
                                <th className="pb-3 text-right">REWARD</th>
                                <th className="pb-3 text-right">
                                  SUBMISSION DATE
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {list.map((subItem, i) => (
                                <tr
                                  key={subItem.id || i}
                                  className="border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors"
                                >
                                  <td className="py-3.5 pr-3">
                                    <div className="font-bold text-slate-800 dark:text-white uppercase">
                                      {subItem.userName || "N/A"}
                                    </div>
                                    <div className="text-[9.5px] text-slate-400 font-mono select-all">
                                      UID: {subItem.userId}
                                    </div>
                                    {subItem.clientIp && (
                                      <div className="text-[8px] font-mono text-emerald-500">
                                        IP: {subItem.clientIp}
                                      </div>
                                    )}
                                  </td>
                                  <td
                                    className="py-3.5 text-slate-700 dark:text-slate-300 font-medium max-w-[200px] truncate"
                                    title={subItem.taskTitle}
                                  >
                                    {subItem.taskTitle}
                                  </td>
                                  <td className="py-3.5 text-center">
                                    <span
                                      className={`px-2.5 py-1 rounded-lg text-[8.5px] font-black uppercase ${
                                        subItem.status === "approved"
                                          ? "bg-emerald-500/10 text-emerald-500"
                                          : subItem.status === "pending"
                                            ? "bg-amber-500/10 text-amber-500"
                                            : "bg-rose-500/10 text-rose-500"
                                      }`}
                                    >
                                      {subItem.status}
                                    </span>
                                  </td>
                                  <td className="py-3.5">
                                    <div className="space-y-1 max-w-[250px]">
                                      {subItem.approvedByName ||
                                      subItem.approvedById ? (
                                        <div className="text-[10px] text-blue-600 dark:text-blue-400 font-black flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded w-fit">
                                          👤{" "}
                                          {getMonitorDisplayName(
                                            subItem.approvedById,
                                            subItem.approvedByName,
                                          )}
                                        </div>
                                      ) : (
                                        <div className="text-[9px] text-slate-400 italic">
                                          Approved by Admin (Auto)
                                        </div>
                                      )}
                                      {subItem.textProof && (
                                        <div className="text-[9px] bg-slate-100 dark:bg-white/5 p-1 rounded font-mono break-all text-slate-500 max-h-12 overflow-y-auto">
                                          Proof: {subItem.textProof}
                                        </div>
                                      )}
                                      {subItem.screenshots &&
                                        subItem.screenshots.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {subItem.screenshots.map(
                                              (s, idx) => (
                                                <button
                                                  key={idx}
                                                  type="button"
                                                  onClick={() =>
                                                    setLightboxImage(s)
                                                  }
                                                  className="text-[8px] font-black uppercase tracking-wider bg-[#10b981]/10 hover:bg-[#10b981] text-[#10b981] hover:text-white border border-[#10b981]/25 px-1.5 py-0.5 rounded transition-all"
                                                >
                                                  Img {idx + 1}
                                                </button>
                                              ),
                                            )}
                                          </div>
                                        )}
                                    </div>
                                  </td>
                                  <td className="py-3.5 text-right font-black text-slate-800 dark:text-white">
                                    ৳{(subItem.reward || 0).toFixed(2)}
                                  </td>
                                  <td className="py-3.5 text-right text-slate-500 font-mono text-[10px]">
                                    {formatDateString(subItem.submittedAt)}
                                  </td>
                                </tr>
                              ))}
                              {list.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={5}
                                    className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] opacity-60"
                                  >
                                    এই সময়সীমার মধ্যে কোনো কাজের সাবমিশন নেই।
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      );
                    }
                  } else if (perfDetailType === "withdraw") {
                    const list = (withdraws || []).filter((w) =>
                      isInTimeframe(w.date, perfDetailTimeframe),
                    );
                    const sumApproved = list
                      .filter((w) => w.status === "approved")
                      .reduce((a, c) => a + (c.amount || 0), 0);
                    const sumPending = list
                      .filter((w) => w.status === "pending")
                      .reduce((a, c) => a + (c.amount || 0), 0);

                    title = `WITHDRAWAL ARCHIVE: ${timeframeLabel}`;
                    sub = `উইথড্র আবেদন: ${list.length} টি | অনুমোদিত পেমেন্ট: ৳${sumApproved.toFixed(2)} | পেন্ডিং কিউ: ৳${sumPending.toFixed(2)}`;
                    content = (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse font-sans">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase text-slate-400">
                              <th className="pb-3 text-left">
                                USER & WALLET ID
                              </th>
                              <th className="pb-3 text-left">
                                GATEWAY AC / NUMBER
                              </th>
                              <th className="pb-3 text-center">
                                GATEWAY STATUS
                              </th>
                              <th className="pb-3 text-right">GATEWAY FEE</th>
                              <th className="pb-3 text-right">PAYOUT BDT</th>
                              <th className="pb-3 text-right">REQUEST DATE</th>
                            </tr>
                          </thead>
                          <tbody>
                            {list.map((w, i) => (
                              <tr
                                key={w.id || i}
                                className="border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors"
                              >
                                <td className="py-3.5">
                                  <div className="font-bold text-slate-800 dark:text-white uppercase">
                                    {w.userName || "N/A"}
                                  </div>
                                  <div className="text-[9.5px] text-slate-400 font-mono select-all">
                                    User ID: {w.userId}
                                  </div>
                                  {(w.approvedByName || w.approvedById) && (
                                    <div className="text-[8.5px] text-blue-600 dark:text-blue-400 font-black flex items-center gap-1 mt-1 bg-blue-500/10 px-1.5 py-0.5 rounded w-fit">
                                      👤 Approved by:{" "}
                                      {getMonitorDisplayName(
                                        w.approvedById,
                                        w.approvedByName,
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3.5">
                                  <div className="font-black text-slate-900 dark:text-white uppercase font-sans text-[11px]">
                                    {w.method}
                                  </div>
                                  <div className="text-slate-500 font-mono tracking-wide select-all text-[11px]">
                                    {w.accountNumber}
                                  </div>
                                </td>
                                <td className="py-3.5 text-center">
                                  <span
                                    className={`px-2.5 py-1 rounded-lg text-[8.5px] font-black uppercase ${
                                      w.status === "approved"
                                        ? "bg-emerald-500/10 text-emerald-500"
                                        : w.status === "pending"
                                          ? "bg-amber-500/10 text-amber-500"
                                          : "bg-rose-500/10 text-rose-500"
                                    }`}
                                  >
                                    {w.status}
                                  </span>
                                </td>
                                <td className="py-3.5 text-right text-slate-400 font-mono">
                                  ৳{(w.fee || 0).toFixed(1)}
                                </td>
                                <td className="py-3.5 text-right font-black text-rose-500 font-mono text-[13px]">
                                  ৳{(w.amount || 0).toFixed(2)}
                                </td>
                                <td className="py-3.5 text-right text-slate-500 font-mono text-[10px]">
                                  {formatDateString(w.date)}
                                </td>
                              </tr>
                            ))}
                            {list.length === 0 && (
                              <tr>
                                <td
                                  colSpan={6}
                                  className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] opacity-60"
                                >
                                  এই সময়সীমার মধ্যে কোনো পেমেন্ট রিকোয়েস্ট পাওয়া
                                  যায়নি।
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    );
                  } else if (perfDetailType === "membership") {
                    const list = (membershipRequests || []).filter((m) =>
                      isInTimeframe(m.date, perfDetailTimeframe),
                    );
                    const sumApproved = list
                      .filter((m) => m.status === "approved")
                      .reduce((a, c) => a + (c.amount || 0), 0);
                    const sumPending = list
                      .filter((m) => m.status === "pending")
                      .reduce((a, c) => a + (c.amount || 0), 0);

                    title = `MEMBERSHIP JOIN / UPGRADE ARCHIVE: ${timeframeLabel}`;
                    sub = `আবেদন সংখ্যা: ${list.length} | অনুমোদিত জমা: ৳${sumApproved.toFixed(2)} | পেন্ডিং জমা: ৳${sumPending.toFixed(2)}`;
                    content = (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse font-sans">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase text-slate-400">
                              <th className="pb-3 text-left">USER ACCOUNT</th>
                              <th className="pb-3 text-left">UPGRADE PLAN</th>
                              <th className="pb-3 text-left">
                                TRX ID & CHANNEL
                              </th>
                              <th className="pb-3 text-center">
                                APPROVAL STATUS
                              </th>
                              <th className="pb-3 text-right">
                                MEMBERSHIP BDT
                              </th>
                              <th className="pb-3 text-right">REQUEST DATE</th>
                            </tr>
                          </thead>
                          <tbody>
                            {list.map((m, i) => (
                              <tr
                                key={m.id || i}
                                className="border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors"
                              >
                                <td className="py-3.5">
                                  <div className="font-bold text-slate-800 dark:text-white uppercase">
                                    {m.userName || "N/A"}
                                  </div>
                                  <div className="text-[9.5px] text-slate-400 font-mono select-all">
                                    ID: {m.userId}
                                  </div>
                                  {(m.approvedByName || m.approvedById) && (
                                    <div className="text-[8.5px] text-blue-600 dark:text-blue-400 font-black flex items-center gap-1 mt-1 bg-blue-500/10 px-1.5 py-0.5 rounded w-fit">
                                      👤 Approved by:{" "}
                                      {getMonitorDisplayName(
                                        m.approvedById,
                                        m.approvedByName,
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3.5 text-indigo-500 font-black uppercase font-mono tracking-tight">
                                  {m.planName}
                                </td>
                                <td className="py-3.5">
                                  <div className="font-black text-slate-800 dark:text-white text-[10.5px] uppercase">
                                    {m.method}
                                  </div>
                                  <div className="text-slate-400 font-mono text-[10px] tracking-wide select-all">
                                    {m.transactionId}
                                  </div>
                                </td>
                                <td className="py-3.5 text-center">
                                  <span
                                    className={`px-2.5 py-1 rounded-lg text-[8.5px] font-black uppercase ${
                                      m.status === "approved"
                                        ? "bg-emerald-500/10 text-emerald-500"
                                        : m.status === "pending"
                                          ? "bg-amber-500/10 text-amber-500"
                                          : "bg-rose-500/10 text-rose-500"
                                    }`}
                                  >
                                    {m.status}
                                  </span>
                                </td>
                                <td className="py-3.5 text-right font-black text-indigo-600 dark:text-indigo-400 text-[12px]">
                                  ৳{(m.amount || 0).toFixed(2)}
                                </td>
                                <td className="py-3.5 text-right text-slate-500 font-mono text-[10px]">
                                  {formatDateString(m.date)}
                                </td>
                              </tr>
                            ))}
                            {list.length === 0 && (
                              <tr>
                                <td
                                  colSpan={6}
                                  className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] opacity-60"
                                >
                                  এই সময়সীমার মধ্যে কোনো মেম্বারশিপ আপগ্রেড
                                  রিকোয়েস্ট পাওয়া যায়নি।
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    );
                  } else if (perfDetailType === "referral") {
                    const stats = getReferralStats(perfDetailTimeframe);

                    title = `REFERRAL ANALYTICS REPORT: ${timeframeLabel}`;
                    sub = `মোট রেফারেল সংখ্যা: ${stats.total} টি | সক্রিয় আমন্ত্রক সংখ্যা: ${stats.rankings.length} জন`;

                    content = (
                      <div className="space-y-8">
                        {/* TOP REFERRERS BOARD */}
                        <div className="bg-slate-50 dark:bg-white/2 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5">
                          <span className="text-[9px] font-black text-teal-500 uppercase tracking-widest block mb-4">
                            🏆 LEADERBOARD: TOP REFERRERS IN TIMEFRAME (আমন্ত্রক
                            র‍্যাংকিং)
                          </span>

                          {stats.rankings.length === 0 ? (
                            <p className="text-xs font-bold text-slate-400 italic">
                              No referral rankings available for this timeframe.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {stats.rankings.slice(0, 3).map((r, index) => {
                                const medals = ["🥇", "🥈", "🥉"];
                                const colors = [
                                  "border-amber-400/30 bg-amber-400/5 text-amber-500",
                                  "border-slate-400/30 bg-slate-400/5 text-slate-400",
                                  "border-amber-600/30 bg-amber-600/5 text-amber-750",
                                ];
                                return (
                                  <div
                                    key={r.user.id}
                                    className={`p-4 rounded-2xl border ${colors[index] || "border-slate-200 dark:border-white/5"} flex items-center justify-between`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="text-xl">
                                        {medals[index] || "🎖️"}
                                      </span>
                                      <div>
                                        <h4
                                          className="font-black text-slate-900 dark:text-white uppercase text-xs truncate max-w-[120px]"
                                          title={r.user.name}
                                        >
                                          {r.user.name}
                                        </h4>
                                        <p className="text-[9px] text-slate-400 font-mono">
                                          ID: {r.user.uid}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-lg font-black italic">
                                        {r.count}
                                      </span>
                                      <span className="text-[8px] font-black uppercase text-slate-400 block tracking-wider">
                                        Refers
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* REFERRALS DETAILS TABLE */}
                        <div className="space-y-3">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                            Detailed referral transactions directory (রেফারেল
                            লেনদেন ও তথ্য)
                          </span>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse font-sans">
                              <thead>
                                <tr className="border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase text-slate-400">
                                  <th className="pb-3 text-left">
                                    NEW RECRUIT (যিনি জয়েন করেছেন)
                                  </th>
                                  <th className="pb-3 text-left">
                                    INVITED BY (যার মাধ্যমে রেফার)
                                  </th>
                                  <th className="pb-3 text-center">
                                    RECRUIT STATUS
                                  </th>
                                  <th className="pb-3 text-right">JOIN DATE</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const list = (users || []).filter(
                                    (u) =>
                                      u.referredBy &&
                                      isInTimeframe(
                                        u.createdAt,
                                        perfDetailTimeframe,
                                      ),
                                  );

                                  return list.map((u, i) => {
                                    const inviter = (users || []).find(
                                      (inv) =>
                                        inv.referralCode &&
                                        inv.referralCode.toUpperCase() ===
                                          u.referredBy?.toUpperCase(),
                                    );

                                    return (
                                      <tr
                                        key={u.id || i}
                                        className="border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors"
                                      >
                                        <td className="py-3.5">
                                          <div className="font-bold text-slate-800 dark:text-white uppercase">
                                            {u.name || "N/A"}
                                          </div>
                                          <div className="text-[9.5px] text-slate-400 font-mono">
                                            UID: {u.uid} | Email: {u.email}
                                          </div>
                                        </td>
                                        <td className="py-3.5">
                                          {inviter ? (
                                            <div>
                                              <div className="font-black text-teal-600 dark:text-teal-400 uppercase">
                                                {inviter.name}
                                              </div>
                                              <div className="text-[9.5px] text-slate-400 font-mono">
                                                UID: {inviter.uid} | Code:{" "}
                                                <span className="text-slate-500 font-bold">
                                                  {inviter.referralCode}
                                                </span>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="text-rose-500 font-bold text-xs">
                                              Unknown Referrer ({u.referredBy})
                                            </div>
                                          )}
                                        </td>
                                        <td className="py-3.5 text-center">
                                          <span
                                            className={`px-2.5 py-1 rounded-lg text-[8.5px] font-black uppercase ${
                                              u.status === "Verified"
                                                ? "bg-emerald-500/10 text-emerald-500"
                                                : "bg-amber-500/10 text-amber-500"
                                            }`}
                                          >
                                            {u.status}
                                          </span>
                                        </td>
                                        <td className="py-3.5 text-right text-slate-500 font-mono text-[10px]">
                                          {formatDateString(u.createdAt)}
                                        </td>
                                      </tr>
                                    );
                                  });
                                })()}
                                {(users || []).filter(
                                  (u) =>
                                    u.referredBy &&
                                    isInTimeframe(
                                      u.createdAt,
                                      perfDetailTimeframe,
                                    ),
                                ).length === 0 && (
                                  <tr>
                                    <td
                                      colSpan={4}
                                      className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] opacity-60"
                                    >
                                      এই সময়সীমার মধ্যে কোনো রেফারেল জয়েনিং
                                      পাওয়া যায়নি।
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  } else if (perfDetailType === "ads") {
                    const stats = getAdStats(perfDetailTimeframe);

                    title = `SPONSOR ADS PERFORMANCE: ${timeframeLabel}`;
                    sub = `মোট বিজ্ঞাপন প্রদর্শন সংখ্যা: ${stats.total} বার`;

                    content = (
                      <div className="space-y-6">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse font-sans">
                            <thead>
                              <tr className="border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase text-slate-400">
                                <th className="pb-3 text-left w-12"># (নম্বর)</th>
                                <th className="pb-3 text-left">USER INFO (ব্যবহারকারী তথ্য)</th>
                                <th className="pb-3 text-left">AD LINK / URL (বিজ্ঞাপন লিংক)</th>
                                <th className="pb-3 text-right">DISPLAYED AT (প্রদর্শনের সময়)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {stats.logs.map((log, i) => (
                                <tr
                                  key={log.id || i}
                                  className="border-b border-slate-50 dark:border-white/5 last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/2 transition-colors"
                                >
                                  <td className="py-3.5 font-bold text-slate-400 font-mono">
                                    {i + 1}
                                  </td>
                                  <td className="py-3.5">
                                    <div className="font-bold text-slate-800 dark:text-white uppercase">
                                      {log.userName}
                                    </div>
                                    <div className="text-[9.5px] text-slate-400 font-mono">
                                      UID: {log.userId} | Email: {log.userEmail}
                                    </div>
                                  </td>
                                  <td className="py-3.5 font-mono text-[10px] text-slate-600 dark:text-slate-300 max-w-xs truncate" title={log.adLink}>
                                    <a href={log.adLink} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
                                      {log.adLink}
                                    </a>
                                  </td>
                                  <td className="py-3.5 text-right text-slate-500 font-mono text-[10px]">
                                    {formatDateString(log.viewedAt)}
                                  </td>
                                </tr>
                              ))}
                              {stats.logs.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={4}
                                    className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] opacity-60"
                                  >
                                    এই সময়সীমার মধ্যে কোনো বিজ্ঞাপন প্রদর্শিত হয়নি।
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-[6px] animate-in fade-in transition-all">
                      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[85vh] rounded-[2.5rem] border border-slate-200/60 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 md:p-8 bg-slate-50 dark:bg-white/2 border-b border-slate-200/50 dark:border-white/5 flex items-start justify-between gap-4">
                          <div>
                            <span className="text-[10px] font-black tracking-widest text-[#10b981] uppercase block mb-1 font-mono">
                              PERFORMANCE DATA STREAM
                            </span>
                            <h4 className="text-xl font-black italic uppercase dark:text-white leading-tight">
                              {title}
                            </h4>
                            <p className="text-xs text-slate-400 dark:text-slate-300 font-bold mt-1 uppercase tracking-wide">
                              {sub}
                            </p>
                          </div>
                          <button
                            onClick={() => setPerfDetailOpen(false)}
                            className="w-10 h-10 select-none cursor-pointer rounded-2xl bg-slate-200/50 dark:bg-white/5 border border-slate-300/30 dark:border-white/5 text-slate-500 dark:text-slate-300 hover:text-rose-500 dark:hover:text-rose-500 flex items-center justify-center text-base hover:scale-105 active:scale-95 transition-all"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Modal Content Scroll Area */}
                        <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-4">
                          {content}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-5 bg-slate-50 dark:bg-white/2 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-end">
                          <button
                            onClick={() => setPerfDetailOpen(false)}
                            className="px-6 py-3 cursor-pointer bg-[#10b981] hover:bg-[#059669] text-white font-black uppercase text-[10px] tracking-widest rounded-xl hover:scale-[1.03] active:scale-[0.97] transition-all"
                          >
                            CLOSE STREAM (বন্ধ করুন)
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </div>
          );
        })()))}

      {/* HQ SETTINGS TAB CONTENT (GATEWAYS & TIERS) */}
      {activeTab === "settings" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-8">
            <h3 className="text-[10px] font-black italic uppercase text-slate-400 tracking-[0.2em] ml-2">
              MEMBERSHIP PRICING
            </h3>
            {localPlans.map((plan) => (
              <div
                key={plan.id}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    PRICE (৳)
                  </label>
                  <input
                    type="number"
                    value={plan.price}
                    onChange={(e) =>
                      setLocalPlans((p) =>
                        p.map((pl) =>
                          pl.id === plan.id
                            ? { ...pl, price: Number(e.target.value) }
                            : pl,
                        ),
                      )
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl font-black text-base outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    VALIDITY (DAYS)
                  </label>
                  <input
                    type="number"
                    value={plan.validityDays}
                    onChange={(e) =>
                      setLocalPlans((p) =>
                        p.map((pl) =>
                          pl.id === plan.id
                            ? { ...pl, validityDays: Number(e.target.value) }
                            : pl,
                        ),
                      )
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl font-black text-base outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    REFER BONUS (৳)
                  </label>
                  <input
                    type="number"
                    value={plan.referralBonus}
                    onChange={(e) =>
                      setLocalPlans((p) =>
                        p.map((pl) =>
                          pl.id === plan.id
                            ? { ...pl, referralBonus: Number(e.target.value) }
                            : pl,
                        ),
                      )
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl font-black text-base border-2 border-[#10b981]/30 text-[#10b981] outline-none"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                setPlans(localPlans);
                notify("Plans synchronized successfully and saved!");
              }}
              className="w-full bg-[#10b981] text-white font-black py-5 rounded-[1.8rem] shadow-xl uppercase text-[10px] tracking-[0.2em]"
            >
              SAVE ALL PLAN DATA
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black italic uppercase dark:text-white tracking-tighter">
                WITHDRAW TIGERS (TIERS)
              </h3>
              <button
                onClick={() =>
                  setEditingTier({
                    id: "opt_" + Date.now(),
                    label: "NEW TIGER",
                    amount: 500,
                    feeType: "flat",
                    feeValue: 20,
                    minRequired: 500,
                    isActive: true,
                  })
                }
                className="bg-[#10b981] text-white px-5 py-2.5 rounded-xl shadow-lg text-[10px] font-black uppercase tracking-widest transition-all"
              >
                + Add Tiger
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {withdrawOptions.map((opt) => (
                <div
                  key={opt.id}
                  className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 group hover:border-[#10b981]/30 transition-all"
                >
                  <div>
                    <h4 className="text-[11px] font-black uppercase italic dark:text-white leading-none mb-1 group-hover:text-[#10b981]">
                      {opt.label}
                    </h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">
                      ৳{opt.amount === "all" ? "FULL" : opt.amount} •{" "}
                      {opt.feeValue}
                      {opt.feeType === "percent" ? "%" : "৳"} FEE
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingTier({ ...opt })}
                      className="p-2 text-slate-300 hover:text-emerald-500 transition-colors"
                    >
                      <ICONS.Settings size={16} />
                    </button>
                    <button
                      onClick={() =>
                        setWithdrawOptions((prev) =>
                          prev.map((o) =>
                            o.id === opt.id
                              ? { ...o, isActive: !o.isActive }
                              : o,
                          ),
                        )
                      }
                      className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase ${opt.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-100 text-slate-400"}`}
                    >
                      {opt.isActive ? "LIVE" : "OFF"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-12">
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black italic uppercase dark:text-white tracking-tighter">
                  MEMBERSHIP GATEWAYS
                </h3>
                <button
                  onClick={() =>
                    setEditingMethod({
                      id: "mg_" + Date.now(),
                      name: "NEW GATEWAY",
                      number: "",
                      isActive: true,
                      type: "Personal",
                      feeType: "flat",
                      feeValue: 0,
                      minWithdraw: 0,
                      category: "membership",
                    })
                  }
                  className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl shadow-lg text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  + Add Method
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentMethods
                  .filter((m) => m.category === "membership")
                  .map((method) => (
                    <div
                      key={method.id}
                      className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 hover:border-[#10b981]/30 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-2 h-2 rounded-full ${method.isActive ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-slate-300"}`}
                        ></div>
                        <div>
                          <h4 className="text-[10px] font-black uppercase italic dark:text-white leading-none mb-1">
                            {method.name}
                          </h4>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                            {method.number} ({method.type})
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingMethod({ ...method })}
                          className="p-2 text-slate-300 hover:text-emerald-500 transition-colors"
                        >
                          <ICONS.Settings size={14} />
                        </button>
                        <button
                          onClick={() =>
                            setPaymentMethods((prev) =>
                              prev.map((m) =>
                                m.id === method.id
                                  ? { ...m, isActive: !m.isActive }
                                  : m,
                              ),
                            )
                          }
                          className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase ${method.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-100 text-slate-400"}`}
                        >
                          {method.isActive ? "ON" : "OFF"}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="space-y-8 pt-4 border-t border-slate-50 dark:border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black italic uppercase dark:text-white tracking-tighter">
                  WITHDRAW GATEWAYS
                </h3>
                <button
                  onClick={() =>
                    setEditingMethod({
                      id: "wg_" + Date.now(),
                      name: "NEW PAYOUT",
                      number: "User Account",
                      isActive: true,
                      type: "Personal",
                      feeType: "flat",
                      feeValue: 0,
                      minWithdraw: 50,
                      category: "withdraw",
                    })
                  }
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-xl shadow-lg text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  + Add Method
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentMethods
                  .filter((m) => m.category === "withdraw")
                  .map((method) => (
                    <div
                      key={method.id}
                      className="flex items-center justify-between p-5 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 hover:border-blue-500/30 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-2 h-2 rounded-full ${method.isActive ? "bg-blue-500 shadow-[0_0_8px_#3b82f6]" : "bg-slate-300"}`}
                        ></div>
                        <div>
                          <h4 className="text-[10px] font-black uppercase italic dark:text-white leading-none mb-1">
                            {method.name}
                          </h4>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                            MIN: ৳{method.minWithdraw} • FEE: {method.feeValue}
                            {method.feeType === "percent" ? "%" : "৳"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingMethod({ ...method })}
                          className="p-2 text-slate-300 hover:text-blue-500 transition-colors"
                        >
                          <ICONS.Settings size={14} />
                        </button>
                        <button
                          onClick={() =>
                            setPaymentMethods((prev) =>
                              prev.map((m) =>
                                m.id === method.id
                                  ? { ...m, isActive: !m.isActive }
                                  : m,
                              ),
                            )
                          }
                          className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase ${method.isActive ? "bg-blue-500/10 text-blue-500" : "bg-slate-100 text-slate-400"}`}
                        >
                          {method.isActive ? "ON" : "OFF"}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Gateway Daily Limit Management System (HQ Dashboard) */}
            <div className="space-y-8 pt-8 border-t border-slate-50 dark:border-white/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black italic uppercase dark:text-white tracking-tighter">
                    Gateway Daily Limit Management (HQ Dashboard)
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    Live limits, transaction statistics, and auto-disabling rules.
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    const nowStr = new Date().toISOString();
                    setPaymentMethods(prev => prev.map(m => ({ ...m, manualResetTimestamp: nowStr })));
                    notify("All payment gateway limit counters have been manually reset for today!");
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-5 py-2.5 rounded-xl shadow-lg text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  ⚡ Reset All Limits
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {paymentMethods.map(method => {
                  const stats = getGatewayStats(method);
                  const isCustom = method.dailyLimitType === 'custom';
                  
                  return (
                    <div 
                      key={method.id}
                      className="bg-slate-50 dark:bg-white/5 rounded-[2rem] p-6 border border-slate-100 dark:border-white/5 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md leading-none ${
                            method.category === 'membership' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                          }`}>
                            {method.category === 'membership' ? 'Deposit / Memb' : 'Withdraw'}
                          </span>
                          <h4 className="text-base font-black italic uppercase dark:text-white mt-1.5 leading-none">
                            {method.name}
                          </h4>
                        </div>
                        
                        <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                          stats.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' :
                          stats.status === 'Unlimited' ? 'bg-indigo-500/10 text-indigo-500' :
                          stats.status === 'Limit Reached' ? 'bg-red-500/10 text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.2)]' :
                          'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}>
                          {stats.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-white dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Today Total</span>
                          <span className="text-sm font-black dark:text-white">৳{stats.totalAmount}</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Today Count</span>
                          <span className="text-sm font-black dark:text-white">{stats.count} txn</span>
                        </div>
                        <div className="bg-white dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Daily Limit</span>
                          <span className="text-sm font-black dark:text-white">
                            {isCustom ? `৳${stats.limitAmount}` : 'Unlimited'}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Remaining</span>
                          <span className="text-sm font-black dark:text-white">
                            {isCustom ? `৳${stats.remaining}` : 'Unlimited'}
                          </span>
                        </div>
                      </div>

                      {isCustom && (
                        <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10 flex items-center justify-between text-[9px] font-black text-amber-500">
                          <span>GRACE RULE: {
                            stats.graceLimit === -1 ? "ALLOW LAST OVER (শেষ ওভার অনুমোদিত)" :
                            stats.graceLimit === 0 ? "STRICT BLOCK (কঠোর ব্লক)" :
                            `BUFFER LIMIT ৳${stats.graceLimit}`
                          }</span>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const nowStr = new Date().toISOString();
                            setPaymentMethods(prev => prev.map(m => m.id === method.id ? { ...m, manualResetTimestamp: nowStr } : m));
                            notify(`${method.name} today's transactions reset successfully!`);
                          }}
                          className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all"
                        >
                          Manual Reset
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingMethod({ ...method })}
                          className="px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                        >
                          <ICONS.Settings size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Admin History Logs */}
            <div className="space-y-6 pt-8 border-t border-slate-50 dark:border-white/5">
              <div>
                <h3 className="text-sm font-black italic uppercase dark:text-white tracking-tighter">
                  Gateway Daily Limit Events History (Admin Logs)
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  Historical tracking of daily limit hit events and auto-disable times.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-white/5 rounded-[2.5rem] border border-slate-100 dark:border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-100/50 dark:bg-white/[0.02]">
                        <th className="p-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Gateway</th>
                        <th className="p-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Date</th>
                        <th className="p-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Limit Set</th>
                        <th className="p-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Final Volume</th>
                        <th className="p-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Limit Hit Time</th>
                        <th className="p-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Disabled Time</th>
                        <th className="p-5 text-[9px] font-black uppercase tracking-widest text-slate-400">Reset Schedule</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {(gatewayLogs || []).map((log) => (
                        <tr key={log.id} className="hover:bg-slate-100/30 dark:hover:bg-white/[0.01] transition-colors">
                          <td className="p-5">
                            <span className="text-xs font-black dark:text-white italic uppercase tracking-tight">{log.gatewayName}</span>
                            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{log.category}</span>
                          </td>
                          <td className="p-5 text-xs font-bold text-slate-500 dark:text-slate-400">{log.dateStr}</td>
                          <td className="p-5 text-xs font-black dark:text-white">৳{log.limitAmount}</td>
                          <td className="p-5 text-xs font-black text-[#10b981]">৳{log.totalAmount}</td>
                          <td className="p-5 text-xs font-bold text-amber-500">{log.limitHitTime ? new Date(log.limitHitTime).toLocaleTimeString() : 'N/A'}</td>
                          <td className="p-5 text-xs font-bold text-red-500">{log.autoDisableTime ? new Date(log.autoDisableTime).toLocaleTimeString() : 'N/A'}</td>
                          <td className="p-5 text-xs font-bold text-slate-400">{log.autoResetTime ? new Date(log.autoResetTime).toLocaleDateString() + ' ' + new Date(log.autoResetTime).toLocaleTimeString() : 'N/A'}</td>
                        </tr>
                      ))}
                      {(gatewayLogs || []).length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-10 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                            No Daily Limit events logged yet today.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: TASK EDIT */}
      {editingTask && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] p-10 shadow-2xl relative border border-white/5 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setEditingTask(null)}
              className="absolute top-8 right-8 text-slate-300 hover:text-red-500 transition-colors"
            >
              <ICONS.Close size={24} />
            </button>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white mb-8">
              Configure Mission
            </h3>
            <form className="space-y-6" onSubmit={handleSaveTask}>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Mission Title
                </label>
                <input
                  value={editingTask.title}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, title: e.target.value })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl font-black text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Reward (৳)
                  </label>
                  <input
                    type="number"
                    value={editingTask.reward || ""}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        reward:
                          e.target.value === "" ? 0 : Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl font-black text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Category
                  </label>
                  <select
                    value={editingTask.type}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        type: e.target.value as any,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl font-black text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                  >
                    <option value="App Install">App Install</option>
                    <option value="Link Open">Link Open</option>
                    <option value="Watch & Earn">Watch & Earn</option>
                    <option value="Social">Social</option>
                    <option value="Telegram">Telegram</option>
                    <option value="1 Device= 1 Task">1 Device= 1 Task</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  YouTube Guide Link
                </label>
                <input
                  value={editingTask.youtubeLink || ""}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      youtubeLink: e.target.value,
                    })
                  }
                  placeholder="https://youtube.com/..."
                  className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl font-black text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Mission Briefing
                </label>
                <textarea
                  value={editingTask.description}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      description: e.target.value,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl font-bold text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white min-h-[80px]"
                  required
                />
              </div>
              <div className="space-y-4">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Execution Steps
                </label>
                {(editingTask.instructions || []).map((inst, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={inst}
                      onChange={(e) => {
                        const s = [...editingTask.instructions];
                        s[i] = e.target.value;
                        setEditingTask({ ...editingTask, instructions: s });
                      }}
                      className="flex-1 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold text-[11px] outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setEditingTask({
                          ...editingTask,
                          instructions: editingTask.instructions.filter(
                            (_, idx) => idx !== i,
                          ),
                        })
                      }
                      className="text-red-500 px-2"
                    >
                      <ICONS.Close size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setEditingTask({
                      ...editingTask,
                      instructions: [...editingTask.instructions, ""],
                    })
                  }
                  className="text-[9px] font-black text-[#10b981] uppercase tracking-[0.2em]"
                >
                  + ADD STEP
                </button>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setTasks((p) => p.filter((t) => t.id !== editingTask.id));
                    setEditingTask(null);
                    notify("Mission removed.");
                  }}
                  className="flex-1 bg-red-50 text-red-500 font-black py-5 rounded-2xl uppercase text-[10px] tracking-widest"
                >
                  Delete
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-[#10b981] text-white font-black py-5 rounded-2xl shadow-xl uppercase text-[10px] tracking-[0.2em] active:scale-95 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: USER MANAGEMENT */}
      {selectedUserForManage && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl relative border border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setSelectedUserForManage(null)}
              className="absolute top-8 right-8 text-slate-300 hover:text-red-500 transition-colors"
            >
              <ICONS.Close size={24} />
            </button>
            <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
              {selectedUserForManage.avatar ? (
                <img
                  src={selectedUserForManage.avatar}
                  alt="Avatar"
                  className="w-24 h-24 rounded-[2.5rem] object-cover shadow-2xl border-4 border-[#10b981]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-24 h-24 bg-[#10b981] text-white rounded-[2.5rem] flex items-center justify-center text-4xl font-black italic shadow-2xl">
                  {selectedUserForManage.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-center md:text-left">
                <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none mb-2">
                  {selectedUserForManage.name}
                </h3>
                <p className="text-[10px] font-black text-[#10b981] uppercase tracking-widest italic mb-1">
                  {selectedUserForManage.uid}
                </p>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">
                  {selectedUserForManage.email}
                </p>
                {selectedUserForManage.ip &&
                  ipCounts[selectedUserForManage.ip] > 1 && (
                    <div className="mt-4 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl">
                      <p className="text-[9px] font-black text-red-500 uppercase tracking-widest italic">
                        Multi-Account Detected:{" "}
                        {ipCounts[selectedUserForManage.ip]} Users on this IP
                      </p>
                    </div>
                  )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 space-y-4">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">
                  Security Profile
                </h4>
                <TechnicalItem label="UID" value={selectedUserForManage.uid} />
                <TechnicalItem label="IP" value={selectedUserForManage.ip} />
                <TechnicalItem
                  label="DEVICE"
                  value={selectedUserForManage.deviceInfo}
                />
              </div>
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/10 shadow-sm space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 italic">
                      BALANCE (৳)
                    </label>
                    <input
                      type="number"
                      placeholder="৳0.00"
                      value={editingBalanceValue || ""}
                      onChange={(e) => setEditingBalanceValue(e.target.value)}
                      className="w-full mt-1.5 bg-slate-50 dark:bg-slate-900 border border-transparent focus:border-[#10b981] rounded-2xl p-4 font-black text-lg outline-none dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2 italic">
                      Verification Password (নিরাপত্তা পাসওয়ার্ড)
                    </label>
                    <input
                      type="password"
                      placeholder="পাসওয়ার্ড লিখুন"
                      value={balanceUpdatePassword}
                      onChange={(e) => setBalanceUpdatePassword(e.target.value)}
                      className="w-full mt-1.5 bg-slate-50 dark:bg-slate-900 border border-transparent focus:border-[#10b981] rounded-2xl p-4 font-black text-xs outline-none dark:text-white"
                    />
                  </div>

                  <button
                    onClick={handleUpdateUserBalance}
                    className="w-full bg-[#10b981] hover:bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg transition-all active:scale-[0.98]"
                  >
                    Save Balance
                  </button>
                </div>

                {/* Logic: Protect Admin from being suspended */}
                <button
                  onClick={toggleUserSuspension}
                  disabled={selectedUserForManage.role === "admin"}
                  className={`w-full py-5 rounded-[1.8rem] font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-xl ${
                    selectedUserForManage.role === "admin"
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-white/5"
                      : selectedUserForManage.isSuspended
                        ? "bg-emerald-500 text-white"
                        : "bg-red-500 text-white"
                  }`}
                >
                  {selectedUserForManage.role === "admin"
                    ? "PROTECTED ADMIN NODE"
                    : selectedUserForManage.isSuspended
                      ? "UNBLOCK ACCOUNT"
                      : "BLOCK ACCOUNT"}
                </button>
              </div>
            </div>

            {/* USER/MONITOR WORK HISTORY HUB */}
            <div className="mt-8 bg-slate-50 dark:bg-white/5 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 space-y-6 text-left">
              <div>
                <h4 className="font-black italic dark:text-white uppercase text-base tracking-tighter leading-none mb-2">
                  Work History & Activity Logs (কাজের ইতিহাস ও প্রমাণসমূহ)
                </h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  Explore task submissions, deposits, upgrades, payouts &
                  transactions.
                </p>
              </div>

              {/* TAB SELECTOR */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 custom-scrollbar flex-nowrap">
                {(
                  [
                    { id: "tasks", label: "Tasks (টাস্ক)" },
                    { id: "deposits", label: "Deposits (ডিপোজিট)" },
                    { id: "upgrades", label: "Upgrades (মেম্বারশিপ)" },
                    { id: "withdraws", label: "Withdraws (উইথড্র)" },
                    { id: "transactions", label: "Transactions (লেনদেন)" },
                    { id: "referrals", label: "Referrals (রেফার)" },
                    { id: "info", label: "Full Details (যাবতীয় তথ্য)" },
                  ] as const
                ).map((tab) => {
                  const count =
                    tab.id === "tasks"
                      ? (taskSubmissions || []).filter(
                          (sub) => sub.userId === selectedUserForManage.id,
                        ).length
                      : tab.id === "deposits"
                        ? (depositRequests || []).filter(
                            (req) => req.userId === selectedUserForManage.id,
                          ).length
                        : tab.id === "upgrades"
                          ? (membershipRequests || []).filter(
                              (req) => req.userId === selectedUserForManage.id,
                            ).length
                          : tab.id === "withdraws"
                            ? (withdraws || []).filter(
                                (req) =>
                                  req.userId === selectedUserForManage.id,
                              ).length
                            : tab.id === "transactions"
                              ? (transactions || []).filter(
                                  (tx) =>
                                    tx.userId === selectedUserForManage.id,
                                ).length
                              : tab.id === "referrals"
                                ? (users || []).filter(
                                    (u) =>
                                      u.referredBy &&
                                      selectedUserForManage.referralCode &&
                                      u.referredBy.toUpperCase() ===
                                        selectedUserForManage.referralCode.toUpperCase(),
                                  ).length
                                : 11; // 11 pieces of system parameters

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setHistorySubTab(tab.id)}
                      className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        historySubTab === tab.id
                          ? "bg-[#10b981] text-white shadow-md shadow-[#10b981]/25 border-b-2 border-emerald-600"
                          : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 text-slate-400 hover:text-[#10b981]"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[7px] px-1.5 py-0.5 rounded-full font-mono ${historySubTab === tab.id ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-white/10"}`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* TAB CONTENT PANEL */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-white/5 min-h-[200px]">
                {/* 1. TASKS SUBMISSIONS */}
                {historySubTab === "tasks" && (
                  <div className="space-y-4">
                    {(() => {
                      const list = (taskSubmissions || []).filter(
                        (sub) => sub.userId === selectedUserForManage.id,
                      );
                      if (list.length === 0) {
                        return (
                          <p className="text-center py-12 text-slate-400 font-bold uppercase text-[9px] tracking-widest italic opacity-50">
                            No task submissions found for this user.
                          </p>
                        );
                      }
                      return list.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-white/5 space-y-3 text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-[11px] font-black uppercase italic dark:text-white leading-none mb-1">
                                {sub.taskTitle}
                              </h5>
                              <p className="text-[8px] text-slate-400 font-mono tracking-tighter">
                                {sub.submittedAt || sub.id}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  sub.status === "approved"
                                    ? "bg-emerald-500/10 text-emerald-500"
                                    : sub.status === "rejected"
                                      ? "bg-red-500/10 text-red-500"
                                      : "bg-amber-500/10 text-amber-500 animate-pulse"
                                }`}
                              >
                                {sub.status}
                              </span>
                              <span className="text-[9px] font-black text-[#10b981]">
                                ৳{sub.reward}
                              </span>
                            </div>
                          </div>

                          {sub.textProof && (
                            <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-left">
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                Text Proof (লিখিত প্রমাণ)
                              </p>
                              <p className="text-[10px] text-slate-700 dark:text-slate-300 font-bold">
                                {sub.textProof}
                              </p>
                            </div>
                          )}

                          {(sub.screenshots || []).length > 0 && (
                            <div className="space-y-1.5 text-left">
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                Screenshots Proof (স্ক্রিনশট প্রমাণাবলী)
                              </p>
                              <div className="grid grid-cols-5 gap-2">
                                {(sub.screenshots || []).map((s, i) => (
                                  <div
                                    key={i}
                                    className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 group cursor-zoom-in"
                                    onClick={() => setLightboxImage(s)}
                                  >
                                    <img
                                      src={s}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                      alt="Proof"
                                      referrerPolicy="no-referrer"
                                    />
                                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[7px] px-1 py-0.2 rounded font-mono font-bold">
                                      #{i + 1}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {(sub.approvedByName || sub.approvedById) && (
                            <div className="text-[9px] text-blue-600 dark:text-blue-400 font-black flex items-center gap-1 bg-blue-500/10 px-2.5 py-1 rounded-xl w-fit mt-1">
                              👤 Processed by:{" "}
                              {getMonitorDisplayName(
                                sub.approvedById,
                                sub.approvedByName,
                              )}
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                )}

                {/* 2. DEPOSITS */}
                {historySubTab === "deposits" && (
                  <div className="space-y-4">
                    {(() => {
                      const list = (depositRequests || []).filter(
                        (req) => req.userId === selectedUserForManage.id,
                      );
                      if (list.length === 0) {
                        return (
                          <p className="text-center py-12 text-slate-400 font-bold uppercase text-[9px] tracking-widest italic opacity-50">
                            No deposit requests found for this user.
                          </p>
                        );
                      }
                      return list.map((req) => (
                        <div
                          key={req.id}
                          className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-white/5 space-y-3 text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-[11px] font-black uppercase italic dark:text-white leading-none mb-1">
                                Deposit via {req.method}
                              </h5>
                              <p className="text-[8px] text-slate-400 font-mono tracking-tighter">
                                {req.date || req.id}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  req.status === "approved"
                                    ? "bg-emerald-500/10 text-emerald-500"
                                    : req.status === "rejected"
                                      ? "bg-red-500/10 text-red-500"
                                      : "bg-amber-500/10 text-amber-500 animate-pulse"
                                }`}
                              >
                                {req.status}
                              </span>
                              <span className="text-[10px] font-black text-[#10b981]">
                                ৳{req.amount}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-left">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl">
                              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider block">
                                Transaction ID
                              </span>
                              <span className="text-[9px] font-black dark:text-white font-mono break-all">
                                {req.transactionId || "N/A"}
                              </span>
                            </div>
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl">
                              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider block">
                                Payment Method
                              </span>
                              <span className="text-[9px] font-black dark:text-white font-mono">
                                {req.method}
                              </span>
                            </div>
                          </div>

                          {req.screenshot && (
                            <div className="space-y-1 block text-left">
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">
                                Payment Screenshot (পেমেন্ট স্ক্রিনশট)
                              </span>
                              <div
                                className="w-full max-w-xs aspect-video relative rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 cursor-zoom-in group"
                                onClick={() =>
                                  setLightboxImage(req.screenshot || null)
                                }
                              >
                                <img
                                  src={req.screenshot}
                                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                                  alt="Deposit Proof"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            </div>
                          )}

                          {(req.approvedByName || req.approvedById) && (
                            <div className="text-[9px] text-blue-600 dark:text-blue-400 font-black flex items-center gap-1 bg-blue-500/10 px-2.5 py-1 rounded-xl w-fit mt-1">
                              👤 Processed by:{" "}
                              {getMonitorDisplayName(
                                req.approvedById,
                                req.approvedByName,
                              )}
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                )}

                {/* 3. MEMBERSHIP UPGRADES */}
                {historySubTab === "upgrades" && (
                  <div className="space-y-4">
                    {(() => {
                      const list = (membershipRequests || []).filter(
                        (req) => req.userId === selectedUserForManage.id,
                      );
                      if (list.length === 0) {
                        return (
                          <p className="text-center py-12 text-slate-400 font-bold uppercase text-[9px] tracking-widest italic opacity-50">
                            No upgrade requests found for this user.
                          </p>
                        );
                      }
                      return list.map((req) => (
                        <div
                          key={req.id}
                          className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-white/5 space-y-3 text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-[11px] font-black uppercase italic dark:text-white leading-none mb-1">
                                Upgrade Model: {req.planName}
                              </h5>
                              <p className="text-[8px] text-slate-400 font-mono tracking-tighter">
                                {req.date || req.id}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  req.status === "approved"
                                    ? "bg-emerald-500/10 text-emerald-500"
                                    : req.status === "rejected"
                                      ? "bg-red-500/10 text-red-500"
                                      : "bg-amber-500/10 text-amber-500 animate-pulse"
                                }`}
                              >
                                {req.status}
                              </span>
                              <span className="text-[10px] font-black text-blue-500">
                                ৳{req.amount}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-left">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl">
                              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider block">
                                Transaction ID
                              </span>
                              <span className="text-[9px] font-black dark:text-white font-mono break-all">
                                {req.transactionId || "N/A"}
                              </span>
                            </div>
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl">
                              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider block">
                                Upgrade Gateway
                              </span>
                              <span className="text-[9px] font-black dark:text-white font-mono">
                                {req.method}
                              </span>
                            </div>
                          </div>

                          {req.screenshot && (
                            <div className="space-y-1 block text-left">
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">
                                Payment Screenshot (পেমেন্ট স্ক্রিনশট)
                              </span>
                              <div
                                className="w-full max-w-xs aspect-video relative rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 cursor-zoom-in group"
                                onClick={() =>
                                  setLightboxImage(req.screenshot || null)
                                }
                              >
                                <img
                                  src={req.screenshot}
                                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                                  alt="Upgrade Proof"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            </div>
                          )}

                          {(req.approvedByName || req.approvedById) && (
                            <div className="text-[9px] text-blue-600 dark:text-blue-400 font-black flex items-center gap-1 bg-blue-500/10 px-2.5 py-1 rounded-xl w-fit mt-1">
                              👤 Processed by:{" "}
                              {getMonitorDisplayName(
                                req.approvedById,
                                req.approvedByName,
                              )}
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                )}

                {/* 4. WITHDRAW ACTIONS */}
                {historySubTab === "withdraws" && (
                  <div className="space-y-4">
                    {(() => {
                      const list = (withdraws || []).filter(
                        (req) => req.userId === selectedUserForManage.id,
                      );
                      if (list.length === 0) {
                        return (
                          <p className="text-center py-12 text-slate-400 font-bold uppercase text-[9px] tracking-widest italic opacity-55">
                            No withdrawal history found for this user.
                          </p>
                        );
                      }
                      return list.map((req) => (
                        <div
                          key={req.id}
                          className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-white/5 space-y-3 text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-[11px] font-black uppercase italic dark:text-white leading-none mb-1">
                                Withdraw to {req.accountNumber}
                              </h5>
                              <p className="text-[8px] text-slate-400 font-mono tracking-tighter">
                                {req.date || req.id}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  req.status === "approved"
                                    ? "bg-emerald-500/10 text-emerald-500"
                                    : req.status === "rejected"
                                      ? "bg-red-500/10 text-red-500"
                                      : "bg-amber-500/10 text-amber-500 animate-pulse"
                                }`}
                              >
                                {req.status}
                              </span>
                              <span className="text-[10px] font-black text-rose-500">
                                -৳{req.amount}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-left">
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl">
                              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider block">
                                Service Network
                              </span>
                              <span className="text-[9px] font-black dark:text-white font-mono">
                                {req.method}
                              </span>
                            </div>
                            <div className="p-2 bg-white dark:bg-slate-800 rounded-xl">
                              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider block">
                                Transaction Fee
                              </span>
                              <span className="text-[9px] font-black dark:text-white font-mono">
                                ৳{req.fee || 0}
                              </span>
                            </div>
                          </div>

                          {(req.approvedByName || req.approvedById) && (
                            <div className="text-[9px] text-blue-600 dark:text-blue-400 font-black flex items-center gap-1 bg-blue-500/10 px-2.5 py-1 rounded-xl w-fit">
                              👤 Processed by:{" "}
                              {getMonitorDisplayName(
                                req.approvedById,
                                req.approvedByName,
                              )}
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                )}

                {/* 5. GENERAL TRANSACTIONS */}
                {historySubTab === "transactions" && (
                  <div className="space-y-4">
                    {(() => {
                      const list = (transactions || []).filter(
                        (tx) => tx.userId === selectedUserForManage.id,
                      );
                      if (list.length === 0) {
                        return (
                          <p className="text-center py-12 text-slate-400 font-bold uppercase text-[9px] tracking-widest italic opacity-50">
                            No transactions recorded for this user.
                          </p>
                        );
                      }
                      return list.map((tx) => (
                        <div
                          key={tx.id}
                          className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between text-left font-sans"
                        >
                          <div className="text-left font-sans">
                            <h5 className="text-[11px] font-black uppercase italic dark:text-white leading-none mb-1">
                              {tx.description}
                            </h5>
                            <p className="text-[8px] text-slate-400 font-mono tracking-tighter">
                              {tx.date || tx.id}
                            </p>
                            <span className="text-[6px] font-black uppercase px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 text-slate-500 mt-1.5 inline-block">
                              {tx.type}
                            </span>
                          </div>
                          <div className="text-right font-sans">
                            <span
                              className={`text-[12px] font-black ${
                                tx.amount > 0 && tx.type !== "Withdraw"
                                  ? "text-emerald-500"
                                  : "text-rose-500"
                              }`}
                            >
                              {tx.amount > 0 && tx.type !== "Withdraw"
                                ? "+"
                                : "-"}
                              ৳{Math.abs(tx.amount)}
                            </span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}

                {/* 6. REFERRALS */}
                {historySubTab === "referrals" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 space-y-2 text-left font-sans">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        মোট রেফার সংখ্যা (Total Referrals Count):{" "}
                        <span className="text-[#10b981] font-black">
                          {
                            (users || []).filter(
                              (u) =>
                                u.referredBy &&
                                selectedUserForManage.referralCode &&
                                u.referredBy.toUpperCase() ===
                                  selectedUserForManage.referralCode.toUpperCase(),
                            ).length
                          }
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        রেফারাল কোড (Referral Code):{" "}
                        <span className="font-mono text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs select-all font-black">
                          {selectedUserForManage.referralCode || "N/A"}
                        </span>
                      </p>
                      {selectedUserForManage.referredBy && (
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          যাঁর মাধ্যমে রেফার হয়েছেন (Referred By):{" "}
                          <span className="font-mono text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-black">
                            {selectedUserForManage.referredBy}
                          </span>
                        </p>
                      )}
                    </div>

                    {(() => {
                      const list = (users || []).filter(
                        (u) =>
                          u.referredBy &&
                          selectedUserForManage.referralCode &&
                          u.referredBy.toUpperCase() ===
                            selectedUserForManage.referralCode.toUpperCase(),
                      );
                      if (list.length === 0) {
                        return (
                          <p className="text-center py-12 text-slate-400 font-bold uppercase text-[9px] tracking-widest italic opacity-50">
                            No one has registered using this user's referral
                            code yet.
                          </p>
                        );
                      }
                      return (
                        <div className="space-y-3">
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
                            সরাসরি রেফারকৃত ইউজারদের তালিকা (Referred Users
                            List):
                          </p>
                          {list.map((u) => (
                            <div
                              key={u.id}
                              className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between text-left font-sans animate-in fade-in duration-200"
                            >
                              <div className="flex items-center gap-3">
                                {u.avatar ? (
                                  <img
                                    src={u.avatar}
                                    alt="Avatar"
                                    className="w-9 h-9 rounded-xl object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-9 h-9 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-slate-600 dark:text-white text-xs">
                                    {u.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <h5 className="text-[11px] font-black uppercase italic dark:text-white leading-none mb-1">
                                    {u.name}
                                  </h5>
                                  <p className="text-[8px] text-[#10b981] font-mono tracking-tighter">
                                    {u.email}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right font-sans">
                                <span className="text-[8px] font-bold text-slate-400 uppercase block leading-none mb-1">
                                  Registered At
                                </span>
                                <span className="text-[9px] font-black text-slate-700 dark:text-slate-300 font-mono">
                                  {new Date(
                                    u.createdAt || Date.now(),
                                  ).toLocaleString("en-US", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 7. ALL DETAILS (যাবতীয় তথ্য) */}
                {historySubTab === "info" && (
                  <div className="space-y-4 text-left font-sans animate-in fade-in duration-200">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
                      ইউজারের যাবতীয় সকল তথ্য (Complete Metadata & Profile
                      Details):
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                          পূর্ণ নাম (Full Name)
                        </span>
                        <span className="text-[11px] font-black dark:text-white uppercase italic">
                          {selectedUserForManage.name}
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                          ইমেইল এড্রেস (Email Address)
                        </span>
                        <span className="text-[11px] font-black dark:text-white font-mono break-all">
                          {selectedUserForManage.email}
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                          ইউনিক ইউজার আইডি (UID)
                        </span>
                        <span className="text-[11px] font-black dark:text-white font-mono">
                          {selectedUserForManage.uid}
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                          অ্যাকাউন্টের বর্তমান ব্যালেন্স (Current Balance)
                        </span>
                        <span className="text-[11px] font-black text-[#10b981]">
                          ৳{selectedUserForManage.balance || 0}
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                          আজকের আয় (Today's Income)
                        </span>
                        <span className="text-[11px] font-black text-amber-500">
                          ৳{selectedUserForManage.todayIncome || 0}
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                          টেলিগ্রাম ভেরিফিকেশন (Telegram Status)
                        </span>
                        <span
                          className={`text-[11px] font-black ${selectedUserForManage.isTelegramVerified ? "text-emerald-500" : "text-amber-500"}`}
                        >
                          {selectedUserForManage.isTelegramVerified
                            ? "✓ ভেরিফাইড (VERIFIED)"
                            : "✗ আন-ভেরিফাইড (NOT LINKED)"}
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                          টেলিগ্রাম আইডি ও কোড (Telegram ID & Code)
                        </span>
                        <span className="text-[11px] font-black dark:text-white font-mono">
                          {selectedUserForManage.telegramId || "None"} /{" "}
                          {selectedUserForManage.telegramVerificationCode ||
                            "None"}
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                          অ্যাকাউন্ট খোলার সময় (Account Created At)
                        </span>
                        <span className="text-[11px] font-black dark:text-white font-mono">
                          {new Date(
                            selectedUserForManage.createdAt || Date.now(),
                          ).toLocaleString()}
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                          আইপি এড্রেস (IP Address)
                        </span>
                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 font-mono">
                          {selectedUserForManage.ip || "Unknown"}
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                          ইউজারের ডিভাইস তথ্য (Device Vendor)
                        </span>
                        <span className="text-[11px] font-black text-slate-700 dark:text-slate-300 break-words">
                          {selectedUserForManage.deviceInfo || "Unknown"}
                        </span>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1 md:col-span-2">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                          অ্যাকাউন্ট স্ট্যাটাস (Account Status / Role / Monitor
                          Mode)
                        </span>
                        <div className="flex gap-1.5 flex-wrap mt-1">
                          <span
                            className={`text-[8px] font-black px-2 py-0.5 rounded-full ${selectedUserForManage.status === "Verified" ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}
                          >
                            {selectedUserForManage.status}
                          </span>
                          <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {selectedUserForManage.role}
                          </span>
                          {selectedUserForManage.isMonitor && (
                            <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500">
                              SYSTEM MONITOR ACTIVE
                            </span>
                          )}
                          {selectedUserForManage.isSuspended && (
                            <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-red-500 text-white">
                              BANNED ACCOUNT
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-white/5 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 space-y-6 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black italic dark:text-white uppercase text-base tracking-tighter leading-none mb-2">
                    Monitor Settings (মনিটর সেটআপ)
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                    Delegate task processing and approvals
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleMonitor}
                  disabled={selectedUserForManage.role === "admin"}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    selectedUserForManage.role === "admin"
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                      : selectedUserForManage.isMonitor
                        ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                        : "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  }`}
                >
                  {selectedUserForManage.isMonitor
                    ? "REMOVE MONITOR"
                    : "ASSIGN MONITOR"}
                </button>
              </div>

              {selectedUserForManage.isMonitor && (
                <div className="pt-6 border-t border-slate-200 dark:border-white/5 space-y-4 animate-in slide-in-from-top-4">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-2">
                    Configure Granular Permissions (মনিটর অ্যাক্সেস নিয়ন্ত্রণ)
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 1. Membership Upgrade Approval */}
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-white/5 animate-in fade-in zoom-in duration-200">
                      <div>
                        <h5 className="text-[11px] font-black uppercase italic dark:text-white leading-none">
                          Membership Upgrades
                        </h5>
                        <p className="text-[9px] font-bold text-[#10b981] uppercase tracking-widest mt-1">
                          মেম্বারশিপ ও প্লাস প্ল্যান অ্যাপ্রুভ
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={
                          !!selectedUserForManage.monitorPermissions
                            ?.canApproveMembership
                        }
                        onChange={() =>
                          handleTogglePermission("canApproveMembership")
                        }
                        className="w-5 h-5 accent-[#10b981] rounded cursor-pointer"
                      />
                    </div>

                    {/* 2. Deposit Approval */}
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-white/5 animate-in fade-in zoom-in duration-200">
                      <div>
                        <h5 className="text-[11px] font-black uppercase italic dark:text-white leading-none">
                          Deposit Approvals
                        </h5>
                        <p className="text-[9px] font-bold text-[#10b981] uppercase tracking-widest mt-1">
                          ব্যবহারকারীদের ডিপোজিট অ্যাপ্রুভ
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={
                          !!selectedUserForManage.monitorPermissions
                            ?.canApproveDeposits
                        }
                        onChange={() =>
                          handleTogglePermission("canApproveDeposits")
                        }
                        className="w-5 h-5 accent-[#10b981] rounded cursor-pointer"
                      />
                    </div>

                    {/* 3. Missions (Task submission) Approval */}
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-white/5 animate-in fade-in zoom-in duration-200">
                      <div>
                        <h5 className="text-[11px] font-black uppercase italic dark:text-white leading-none">
                          Mission Proofs
                        </h5>
                        <p className="text-[9px] font-bold text-[#10b981] uppercase tracking-widest mt-1">
                          ইউজার সাবমিশন টাস্ক প্রুফ যাচাই
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={
                          !!selectedUserForManage.monitorPermissions
                            ?.canApproveTaskSubmissions
                        }
                        onChange={() =>
                          handleTogglePermission("canApproveTaskSubmissions")
                        }
                        className="w-5 h-5 accent-[#10b981] rounded cursor-pointer"
                      />
                    </div>

                    {/* 4. Withdraw payouts processing */}
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-white/5 animate-in fade-in zoom-in duration-200">
                      <div>
                        <h5 className="text-[11px] font-black uppercase italic dark:text-white leading-none">
                          Withdraw Payouts
                        </h5>
                        <p className="text-[9px] font-bold text-[#10b981] uppercase tracking-widest mt-1">
                          উইথড্র রিকোয়েস্ট পরিশোধ বা বাতিল
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={
                          !!selectedUserForManage.monitorPermissions
                            ?.canProcessPayouts
                        }
                        onChange={() =>
                          handleTogglePermission("canProcessPayouts")
                        }
                        className="w-5 h-5 accent-[#10b981] rounded cursor-pointer"
                      />
                    </div>

                    {/* 5. Task Control / Campaigns */}
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-white/5 animate-in fade-in zoom-in duration-200">
                      <div>
                        <h5 className="text-[11px] font-black uppercase italic dark:text-white leading-none">
                          Task Campaigns
                        </h5>
                        <p className="text-[9px] font-bold text-[#10b981] uppercase tracking-widest mt-1">
                          টাস্ক তৈরি, এডিট ও লাইভ অ্যাকশন
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={
                          !!selectedUserForManage.monitorPermissions
                            ?.canManageCampaigns
                        }
                        onChange={() =>
                          handleTogglePermission("canManageCampaigns")
                        }
                        className="w-5 h-5 accent-[#10b981] rounded cursor-pointer"
                      />
                    </div>

                    {/* 6. Modify Users */}
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-white/5 animate-in fade-in zoom-in duration-200">
                      <div>
                        <h5 className="text-[11px] font-black uppercase italic dark:text-white leading-none">
                          User Directory
                        </h5>
                        <p className="text-[9px] font-bold text-[#10b981] uppercase tracking-widest mt-1 font-mono">
                          ইউজার ব্যালেন্স ও স্ট্যাটাস পরিবর্তন
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={
                          !!selectedUserForManage.monitorPermissions
                            ?.canModifyUsers
                        }
                        onChange={() =>
                          handleTogglePermission("canModifyUsers")
                        }
                        className="w-5 h-5 accent-[#10b981] rounded cursor-pointer"
                      />
                    </div>

                    {/* 7. Store Custom Assets Control */}
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-white/5 animate-in fade-in zoom-in duration-200">
                      <div>
                        <h5 className="text-[11px] font-black uppercase italic dark:text-white leading-none">
                          Store Control
                        </h5>
                        <p className="text-[9px] font-bold text-[#10b981] uppercase tracking-widest mt-1 font-mono">
                          শপ লিস্ট এবং ডিজিটাল প্রোডাক্ট কন্ট্রোল
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={
                          !!selectedUserForManage.monitorPermissions
                            ?.canManageStore
                        }
                        onChange={() =>
                          handleTogglePermission("canManageStore")
                        }
                        className="w-5 h-5 accent-[#10b981] rounded cursor-pointer"
                      />
                    </div>

                    {/* 8. Notifications */}
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-white/5 animate-in fade-in zoom-in duration-200">
                      <div>
                        <h5 className="text-[11px] font-black uppercase italic dark:text-white leading-none">
                          Push Notifications
                        </h5>
                        <p className="text-[9px] font-bold text-[#10b981] uppercase tracking-widest mt-1 font-mono">
                          নোটিশ ও পুশ নোটিফিকেশন ব্রডকাস্ট
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={
                          !!selectedUserForManage.monitorPermissions
                            ?.canManagePush
                        }
                        onChange={() => handleTogglePermission("canManagePush")}
                        className="w-5 h-5 accent-[#10b981] rounded cursor-pointer"
                      />
                    </div>

                    {/* 9. Social setup */}
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-white/5 animate-in fade-in zoom-in duration-200">
                      <div>
                        <h5 className="text-[11px] font-black uppercase italic dark:text-white leading-none">
                          Social Linkages
                        </h5>
                        <p className="text-[9px] font-bold text-[#10b981] uppercase tracking-widest mt-1 font-mono">
                          সোশ্যাল মিডিয়া ও সাপোর্ট লিংক আপডেট
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={
                          !!selectedUserForManage.monitorPermissions
                            ?.canManageSocials
                        }
                        onChange={() =>
                          handleTogglePermission("canManageSocials")
                        }
                        className="w-5 h-5 accent-[#10b981] rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SOCIAL EDIT */}
      {editingSocial && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 w-full max-md rounded-[3rem] p-10 shadow-2xl relative border border-white/5">
            <button
              onClick={() => setEditingSocial(null)}
              className="absolute top-8 right-8 text-slate-300 hover:text-red-500 transition-colors"
            >
              <ICONS.Close size={24} />
            </button>
            <h3 className="text-xl font-black italic uppercase dark:text-white mb-8">
              Edit Social Link
            </h3>
            <form onSubmit={handleSaveSocial} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Label
                </label>
                <input
                  value={editingSocial.name}
                  onChange={(e) =>
                    setEditingSocial({ ...editingSocial, name: e.target.value })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-black text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  URL (https://...)
                </label>
                <input
                  value={editingSocial.url}
                  onChange={(e) =>
                    setEditingSocial({ ...editingSocial, url: e.target.value })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-black text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Style
                </label>
                <select
                  value={editingSocial.type}
                  onChange={(e) =>
                    setEditingSocial({
                      ...editingSocial,
                      type: e.target.value as any,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-black text-[10px] outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                >
                  <option value="Telegram">Telegram (Blue)</option>
                  <option value="Facebook">Facebook (Dark Blue)</option>
                  <option value="Youtube">Youtube (Red)</option>
                  <option value="Other">Other (Emerald)</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setSocialLinks((p) =>
                      p.filter((s) => s.id !== editingSocial.id),
                    );
                    setEditingSocial(null);
                  }}
                  className="flex-1 bg-red-50 text-red-500 py-4 rounded-xl font-black uppercase text-[10px]"
                >
                  Delete
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-[#10b981] text-white py-4 rounded-xl font-black uppercase text-[10px] shadow-lg"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW MEMBERSHIP PROOF (সম্পূর্ণ স্ক্রিনশট দেখার সমাধান) */}
      {viewingMembershipProof && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] p-10 shadow-2xl relative border border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setViewingMembershipProof(null)}
              className="absolute top-8 right-8 text-slate-300 hover:text-red-500 transition-colors"
            >
              <ICONS.Close size={24} />
            </button>
            <div className="text-center mb-10">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white leading-none">
                Membership Upgrade Proof
              </h3>
              <p className="text-[10px] font-black text-[#10b981] uppercase tracking-widest mt-2">
                {viewingMembershipProof.userName} •{" "}
                {viewingMembershipProof.planName}
              </p>
            </div>
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Transaction ID
                  </p>
                  <p className="text-lg font-black dark:text-white italic tracking-tight">
                    {viewingMembershipProof.transactionId}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Amount Paid
                  </p>
                  <p className="text-lg font-black dark:text-white italic tracking-tight">
                    ৳{viewingMembershipProof.amount}
                  </p>
                </div>
              </div>
              <div className="space-y-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Payment Screenshot
                </p>
                <div className="bg-slate-100 dark:bg-black/40 rounded-3xl overflow-hidden border border-white/5 shadow-xl group flex flex-col items-center">
                  <div className="w-full p-4 bg-slate-50 dark:bg-slate-805 border-b border-slate-100 dark:border-white/5 flex flex-wrap gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        setViewingActiveScreenshot(
                          viewingMembershipProof?.screenshot || null,
                        )
                      }
                      className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                        viewingActiveScreenshot ===
                        (viewingMembershipProof?.screenshot || null)
                          ? "bg-[#10b981] text-white shadow-lg shadow-emerald-500/10"
                          : "bg-white dark:bg-slate-800 text-slate-500 hover:text-[#10b981]"
                      }`}
                    >
                      File 1 (প্রুফ ফাইল ১)
                    </button>
                  </div>
                  <img
                    src={
                      viewingActiveScreenshot ||
                      viewingMembershipProof.screenshot ||
                      ""
                    }
                    className="w-full h-auto block cursor-zoom-in hover:scale-[1.01] transition-transform duration-500"
                    onClick={() =>
                      setLightboxImage(
                        viewingActiveScreenshot ||
                          viewingMembershipProof.screenshot ||
                          null,
                      )
                    }
                    alt="Membership Proof"
                  />
                  <div className="w-full p-4 bg-white/5 text-center border-t border-white/5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
                      সম্পূর্ণ বড় করে দেখতে ছবির উপর ক্লিক করুন
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 pt-8 sticky bottom-0 bg-white dark:bg-slate-900 py-4 border-t border-slate-100 dark:border-white/5">
                <button
                  onClick={() => {
                    handleRejectMembership(viewingMembershipProof.id);
                    setViewingMembershipProof(null);
                  }}
                  className="flex-1 bg-red-50 text-red-500 font-black py-5 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-red-100 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => {
                    handleApproveMembership(viewingMembershipProof);
                    setViewingMembershipProof(null);
                  }}
                  className="flex-[2] bg-[#10b981] text-white font-black py-5 rounded-2xl shadow-xl uppercase text-[10px] tracking-[0.2em] active:scale-95 transition-all"
                >
                  Approve Membership
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW DEPOSIT PROOF (সম্পূর্ণ স্ক্রিনশট দেখার সমাধান) */}
      {viewingDepositProof && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[3rem] p-10 shadow-2xl relative border border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setViewingDepositProof(null)}
              className="absolute top-8 right-8 text-slate-300 hover:text-red-500 transition-colors"
            >
              <ICONS.Close size={24} />
            </button>
            <div className="text-center mb-10">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white leading-none">
                Deposit Proof
              </h3>
              <p className="text-[10px] font-black text-[#10b981] uppercase tracking-widest mt-2">
                {viewingDepositProof.userName} • Deposit ৳
                {viewingDepositProof.amount}
              </p>
            </div>
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Transaction ID
                  </p>
                  <p className="text-lg font-black dark:text-white italic tracking-tight">
                    {viewingDepositProof.transactionId}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Amount Paid
                  </p>
                  <p className="text-lg font-black dark:text-white italic tracking-tight">
                    ৳{viewingDepositProof.amount}
                  </p>
                </div>
              </div>
              <div className="space-y-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Payment Screenshot
                </p>
                <div className="bg-slate-100 dark:bg-black/40 rounded-3xl overflow-hidden border border-white/5 shadow-xl group flex flex-col items-center">
                  <div className="w-full p-4 bg-slate-50 dark:bg-slate-805 border-b border-slate-100 dark:border-white/5 flex flex-wrap gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        setViewingActiveScreenshot(
                          viewingDepositProof?.screenshot || null,
                        )
                      }
                      className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                        viewingActiveScreenshot ===
                        (viewingDepositProof?.screenshot || null)
                          ? "bg-[#10b981] text-white shadow-lg shadow-emerald-500/10"
                          : "bg-white dark:bg-slate-800 text-slate-500 hover:text-[#10b981]"
                      }`}
                    >
                      File 1 (প্রুফ ফাইল ১)
                    </button>
                  </div>
                  <img
                    src={
                      viewingActiveScreenshot ||
                      viewingDepositProof.screenshot ||
                      ""
                    }
                    className="w-full h-auto block cursor-zoom-in hover:scale-[1.01] transition-transform duration-500"
                    onClick={() =>
                      setLightboxImage(
                        viewingActiveScreenshot ||
                          viewingDepositProof.screenshot ||
                          null,
                      )
                    }
                    alt="Deposit Proof"
                  />
                  <div className="w-full p-4 bg-white/5 text-center border-t border-white/5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
                      সম্পূর্ণ বড় করে দেখতে ছবির উপর ক্লিক করুন
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 pt-8 sticky bottom-0 bg-white dark:bg-slate-900 py-4 border-t border-slate-100 dark:border-white/5">
                <button
                  onClick={() => {
                    handleRejectDeposit(viewingDepositProof.id);
                    setViewingDepositProof(null);
                  }}
                  className="flex-1 bg-red-50 text-red-500 font-black py-5 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-red-100 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => {
                    handleApproveDeposit(viewingDepositProof);
                    setViewingDepositProof(null);
                  }}
                  className="flex-[2] bg-[#10b981] text-white font-black py-5 rounded-2xl shadow-xl uppercase text-[10px] tracking-[0.2em] active:scale-95 transition-all"
                >
                  Approve Deposit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW PROOF (সম্পূর্ণ স্ক্রিনশট দেখার সমাধান) */}
      {viewingProof &&
        (() => {
          const matchingTask = tasks.find((t) => t.id === viewingProof.taskId);
          return (
            <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 md:p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-900 w-full max-w-6xl rounded-[3rem] p-6 md:p-10 shadow-2xl relative border border-white/10 max-h-[95vh] overflow-y-auto custom-scrollbar">
                <button
                  onClick={() => setViewingProof(null)}
                  className="absolute top-6 right-6 md:top-8 md:right-8 text-slate-300 hover:text-red-500 transition-colors z-10"
                >
                  <ICONS.Close size={24} />
                </button>

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white leading-none">
                    Mission Proof Review
                  </h3>
                  <p className="text-[10px] font-black text-[#10b981] uppercase tracking-widest mt-2">
                    Compare Admin Post Details vs User Submitted Proof
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    <div className="inline-flex items-center gap-2 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">
                        Verified Hash: {viewingProof.securityHash || "NONE"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* LEFT COLUMN: ADMIN ORIGINAL POST DETAILS */}
                  <div className="space-y-6">
                    <div className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 rounded-2xl w-fit">
                      <span className="text-[10px] font-black uppercase text-[#10b981] tracking-wider flex items-center gap-1.5">
                        <ICONS.Shield size={12} /> 🎯 Admin Task Details (কাজের
                        আসল বিবরণ)
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5 space-y-4">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Task Title
                        </p>
                        <h4 className="text-base font-black dark:text-white uppercase tracking-tight">
                          {matchingTask
                            ? matchingTask.title
                            : viewingProof.taskTitle}
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Task Reward
                          </p>
                          <p className="text-lg font-black text-[#10b981] italic">
                            ৳
                            {matchingTask
                              ? matchingTask.reward
                              : viewingProof.reward}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Task Category
                          </p>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[9px] font-black uppercase tracking-wider rounded-lg border border-blue-500/15">
                            {matchingTask ? matchingTask.type : "Mission"}
                          </span>
                        </div>
                      </div>

                      {matchingTask && matchingTask.description && (
                        <div className="pt-3 border-t border-slate-200/50 dark:border-white/5">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Description (কাজের বিবরণ)
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                            {matchingTask.description}
                          </p>
                        </div>
                      )}

                      {matchingTask && matchingTask.youtubeLink && (
                        <div className="pt-3 border-t border-slate-200/50 dark:border-white/5">
                          <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                            🎥 Required Video Link (ভিডিও লিংক)
                          </p>
                          <a
                            href={matchingTask.youtubeLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline font-bold flex items-center gap-1.5 break-all bg-blue-500/5 p-3 rounded-xl border border-blue-500/10"
                          >
                            <ICONS.Link size={12} /> {matchingTask.youtubeLink}
                          </a>
                        </div>
                      )}
                    </div>

                    {matchingTask &&
                      matchingTask.instructions &&
                      matchingTask.instructions.length > 0 && (
                        <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5 space-y-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            📋 Task Instructions (প্রুফ মেলাতে নিচের ধাপগুলো
                            দেখুন):
                          </p>
                          <ul className="space-y-2">
                            {matchingTask.instructions.map((inst, index) => (
                              <li
                                key={index}
                                className="flex gap-3 text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed bg-white dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-white/5"
                              >
                                <span className="w-5 h-5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black flex items-center justify-center shrink-0">
                                  {index + 1}
                                </span>
                                <span>{inst}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {!matchingTask && (
                      <div className="bg-amber-500/5 p-6 rounded-3xl border border-amber-500/10 text-amber-500 space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wider">
                          ⚠️ Original Task Deleted
                        </p>
                        <p className="text-[11px] leading-relaxed opacity-80">
                          This task was deleted from the active campaign list,
                          but the submission is still accessible for payout
                          review.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* RIGHT COLUMN: USER SUBMITTED PROOF */}
                  <div className="space-y-6">
                    <div className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 rounded-2xl w-fit">
                      <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider flex items-center gap-1.5">
                        <ICONS.Users size={12} /> 👤 User Proof Submission
                        (গ্রাহকের সাবমিট করা প্রুফ)
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5 space-y-4">
                      <div className="flex justify-between items-center gap-4">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Submitted By
                          </p>
                          <h4 className="text-base font-black dark:text-white uppercase tracking-tight">
                            {viewingProof.userName}
                          </h4>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Submitted At
                          </p>
                          <p className="text-[11px] font-bold dark:text-slate-300">
                            {new Date(
                              viewingProof.submittedAt,
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200/50 dark:border-white/5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                          Text Proof (ব্যবহারকারীর লেখা প্রুফ)
                        </p>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-white/5 min-h-[80px]">
                          <p className="text-xs font-bold dark:text-white italic leading-relaxed select-all whitespace-pre-wrap">
                            {viewingProof.textProof ||
                              "No additional text proof provided."}
                          </p>
                        </div>
                      </div>

                      {viewingProof.status === "rejected" && viewingProof.rejectionNote && (
                        <div className="pt-3 border-t border-rose-200/50 dark:border-rose-500/10">
                          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1.5">
                            Rejection Reason (বাতিল করার কারণ)
                          </p>
                          <div className="bg-rose-500/5 p-4 rounded-2xl border border-rose-500/15">
                            <p className="text-xs font-black text-rose-500 italic leading-relaxed select-all whitespace-pre-wrap">
                              {viewingProof.rejectionNote}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {viewingProof.telegramIdUsed && (
                      <div className="bg-blue-500/10 p-5 rounded-3xl border border-blue-500/20 text-left space-y-2 animate-in fade-in duration-300">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                          <ICONS.Telegram size={14} /> ভেরিফাইড টেলিগ্রাম আইডি
                          ট্র্যাক (Verified Telegram ID Used)
                        </p>
                        <p className="text-sm font-black dark:text-white font-mono">
                          ID:{" "}
                          <span className="text-blue-500 text-base font-bold select-all">
                            {viewingProof.telegramIdUsed}
                          </span>
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-tight leading-normal font-sans">
                          ⚠️ ব্যবহারকারী এই কাজ সাবমিট করার সময় তার ভেরিফাইড
                          টেলিগ্রাম আইডি দিয়ে এটি সম্পন্ন করেছে। অনুগ্রহ করে
                          নির্দেশনাবলীর সাথে আইডি মিলিয়ে নিন।
                        </p>
                      </div>
                    )}

                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Screenshots & Proof Files (
                        {(viewingProof.screenshots || []).length})
                      </p>
                      <div className="flex flex-col gap-4">
                        {/* TABS SELECTOR CONTAINER */}
                        <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                          {(viewingProof.screenshots || []).map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setViewingActiveScreenshot(s)}
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                viewingActiveScreenshot === s
                                  ? "bg-[#10b981] text-white shadow-lg shadow-emerald-500/10"
                                  : "bg-white dark:bg-slate-800 text-slate-500 hover:text-[#10b981] border border-slate-100 dark:border-white/0"
                              }`}
                            >
                              File {i + 1}
                            </button>
                          ))}
                        </div>

                        {viewingActiveScreenshot && (
                          <div className="bg-slate-100 dark:bg-black/40 rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 p-2 flex flex-col items-center animate-in fade-in duration-300">
                            <div className="w-full text-right p-1.5 mb-1 flex items-center justify-between px-3">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Active File: Proof{" "}
                                {(viewingProof.screenshots || []).indexOf(
                                  viewingActiveScreenshot,
                                ) + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setLightboxImage(viewingActiveScreenshot)
                                }
                                className="text-[#10b981] hover:underline font-black uppercase text-[10px] tracking-wider flex items-center gap-1"
                              >
                                <ICONS.Link size={12} /> FULLSCREEN (বড় করে
                                দেখুন)
                              </button>
                            </div>
                            <img
                              src={viewingActiveScreenshot}
                              className="max-h-[380px] w-auto max-w-full object-contain cursor-zoom-in rounded-2xl border border-white/5 hover:scale-[1.01] transition-transform duration-300"
                              onClick={() =>
                                setLightboxImage(viewingActiveScreenshot)
                              }
                              referrerPolicy="no-referrer"
                              alt="Active Proof"
                            />
                            <div className="w-full p-3 text-[#10b981] text-center">
                              <p className="text-[9px] font-black uppercase tracking-widest italic leading-none">
                                ছবির ওপরে ক্লিক করে সম্পূর্ণ স্পষ্ট স্ক্রিনশট
                                এবং লাইটবক্স ভিউ উপভোগ করুন
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-8 sticky bottom-0 bg-white dark:bg-slate-900 py-4 border-t border-slate-100 dark:border-white/5 z-10 mt-8">
                  <button
                    onClick={() => {
                      handleRejectTaskProof(viewingProof);
                      setViewingProof(null);
                    }}
                    className="flex-1 bg-red-50 hover:bg-red-100 text-red-500 font-black py-5 rounded-2xl uppercase text-[10px] tracking-widest transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      handleApproveTaskProof(viewingProof);
                      setViewingProof(null);
                    }}
                    className="flex-[2] bg-[#10b981] text-white font-black py-5 rounded-2xl shadow-xl uppercase text-[10px] tracking-[0.2em] active:scale-95 transition-all"
                  >
                    Approve & Pay
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* MODAL: GATEWAY EDIT */}
      {editingMethod && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative border border-white/5">
            <button
              onClick={() => setEditingMethod(null)}
              className="absolute top-8 right-8 text-slate-300 hover:text-red-500 transition-colors"
            >
              <ICONS.Close size={24} />
            </button>
            <h3 className="text-xl font-black italic uppercase dark:text-white mb-8">
              Edit Gateway
            </h3>
            <form onSubmit={handleSaveGateway} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Name
                  </label>
                  <input
                    value={editingMethod.name}
                    onChange={(e) =>
                      setEditingMethod({
                        ...editingMethod,
                        name: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-black text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Type
                  </label>
                  <input
                    value={editingMethod.type}
                    onChange={(e) =>
                      setEditingMethod({
                        ...editingMethod,
                        type: e.target.value,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-black text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  {editingMethod.category === "membership"
                    ? "Number"
                    : "Min Withdraw (৳)"}
                </label>
                <input
                  value={
                    editingMethod.category === "membership"
                      ? editingMethod.number
                      : editingMethod.minWithdraw || ""
                  }
                  onChange={(e) =>
                    editingMethod.category === "membership"
                      ? setEditingMethod({
                          ...editingMethod,
                          number: e.target.value,
                        })
                      : setEditingMethod({
                          ...editingMethod,
                          minWithdraw:
                            e.target.value === "" ? 0 : Number(e.target.value),
                        })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-black text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Fee Type
                  </label>
                  <select
                    value={editingMethod.feeType}
                    onChange={(e) =>
                      setEditingMethod({
                        ...editingMethod,
                        feeType: e.target.value as "flat" | "percent",
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-black text-[10px] outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                  >
                    <option value="flat">Fixed (৳)</option>
                    <option value="percent">Percent (%)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Fee Value
                  </label>
                  <input
                    type="number"
                    value={editingMethod.feeValue !== undefined && editingMethod.feeValue !== null ? editingMethod.feeValue : ""}
                    onChange={(e) =>
                      setEditingMethod({
                        ...editingMethod,
                        feeValue:
                          e.target.value === "" ? 0 : Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-black text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                  />
                </div>
              </div>

              {/* Gateway Daily Limit Configuration */}
              <div className="border-t border-slate-100 dark:border-white/5 pt-6 space-y-4">
                <h4 className="text-[10px] font-black italic uppercase text-slate-400 tracking-[0.2em]">
                  Daily Limit Settings
                </h4>
                
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Daily Limit Type
                  </label>
                  <select
                    value={editingMethod.dailyLimitType || "unlimited"}
                    onChange={(e) =>
                      setEditingMethod({
                        ...editingMethod,
                        dailyLimitType: e.target.value as 'unlimited' | 'custom',
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-black text-[10px] outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                  >
                    <option value="unlimited">Unlimited (সীমাহীন)</option>
                    <option value="custom">Custom Limit (নির্দিষ্ট লিমিট)</option>
                  </select>
                </div>

                {editingMethod.dailyLimitType === "custom" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Max Amount (৳)
                      </label>
                      <input
                        type="number"
                        value={editingMethod.dailyLimitAmount || ""}
                        onChange={(e) =>
                          setEditingMethod({
                            ...editingMethod,
                            dailyLimitAmount: e.target.value === "" ? 0 : Number(e.target.value),
                          })
                        }
                        className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-black text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                        placeholder="e.g. 50000"
                        required={editingMethod.dailyLimitType === "custom"}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                        Grace Rule Option
                      </label>
                      <select
                        value={editingMethod.graceLimitAmount !== undefined ? (editingMethod.graceLimitAmount > 0 ? "yes_custom" : editingMethod.graceLimitAmount === 0 ? "no" : "yes") : "yes"}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "no") {
                            setEditingMethod({
                              ...editingMethod,
                              graceLimitAmount: 0,
                            });
                          } else if (val === "yes") {
                            setEditingMethod({
                              ...editingMethod,
                              graceLimitAmount: -1,
                            });
                          } else {
                            setEditingMethod({
                              ...editingMethod,
                              graceLimitAmount: 500,
                            });
                          }
                        }}
                        className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-black text-[10px] outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                      >
                        <option value="yes">Allow Last Over (শেষ ট্রানজেকশন সফল)</option>
                        <option value="yes_custom">Custom Buffer Limit (বাফার লিমিট)</option>
                        <option value="no">Strict Block (সীমা পেরোতে পারবে না)</option>
                      </select>
                    </div>
                  </div>
                )}

                {editingMethod.dailyLimitType === "custom" && editingMethod.graceLimitAmount !== undefined && editingMethod.graceLimitAmount > 0 && (
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Custom Buffer Amount (৳)
                    </label>
                    <input
                      type="number"
                      value={editingMethod.graceLimitAmount}
                      onChange={(e) =>
                        setEditingMethod({
                          ...editingMethod,
                          graceLimitAmount: e.target.value === "" ? 0 : Number(e.target.value),
                        })
                      }
                      className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-black text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                      placeholder="e.g. 1000"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethods((p) =>
                      p.filter((m) => m.id !== editingMethod.id),
                    );
                    setEditingMethod(null);
                  }}
                  className="flex-1 bg-red-50 text-red-500 py-4 rounded-xl font-black uppercase text-[10px]"
                >
                  Delete
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-[#10b981] text-white py-4 rounded-xl font-black uppercase text-[10px] shadow-lg"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TIGER EDIT */}
      {editingTier && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative border border-white/5">
            <button
              onClick={() => setEditingTier(null)}
              className="absolute top-8 right-8 text-slate-300 hover:text-red-500 transition-colors"
            >
              <ICONS.Close size={24} />
            </button>
            <h3 className="text-xl font-black italic uppercase dark:text-white mb-8">
              Edit Withdraw Tiger
            </h3>
            <form className="space-y-6" onSubmit={handleSaveTier}>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Label (e.g. TIGER A)
                </label>
                <input
                  value={editingTier.label}
                  onChange={(e) =>
                    setEditingTier({
                      ...editingTier,
                      label: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-black text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Amount ('all' or ৳)
                  </label>
                  <input
                    value={editingTier.amount}
                    onChange={(e) =>
                      setEditingTier({
                        ...editingTier,
                        amount:
                          e.target.value === "all"
                            ? "all"
                            : e.target.value === ""
                              ? 0
                              : Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-black text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Min Balance Req.
                  </label>
                  <input
                    type="number"
                    value={editingTier.minRequired || ""}
                    onChange={(e) =>
                      setEditingTier({
                        ...editingTier,
                        minRequired:
                          e.target.value === "" ? 0 : Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-black text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Fee Type
                  </label>
                  <select
                    value={editingTier.feeType}
                    onChange={(e) =>
                      setEditingTier({
                        ...editingTier,
                        feeType: e.target.value as "flat" | "percent",
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-black text-[10px] outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                  >
                    <option value="flat">Fixed (৳)</option>
                    <option value="percent">Percent (%)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Fee Value
                  </label>
                  <input
                    type="number"
                    value={editingTier.feeValue !== undefined && editingTier.feeValue !== null ? editingTier.feeValue : ""}
                    onChange={(e) =>
                      setEditingTier({
                        ...editingTier,
                        feeValue:
                          e.target.value === "" ? 0 : Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-black text-xs outline-none border border-transparent focus:border-[#10b981] dark:text-white"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setWithdrawOptions((p) =>
                      p.filter((o) => o.id !== editingTier.id),
                    );
                    setEditingTier(null);
                  }}
                  className="flex-1 bg-red-50 text-red-500 py-4 rounded-xl font-black uppercase text-[10px]"
                >
                  Delete
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-[#10b981] text-white py-4 rounded-xl font-black uppercase text-[10px] shadow-lg"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECT PROMPT MODAL */}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 border border-slate-100 dark:border-white/5 shadow-2xl flex flex-col gap-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black uppercase italic text-red-500 flex items-center gap-2 leading-none">
                {rejectModal.title}
              </h3>
              <button
                type="button"
                onClick={() => setRejectModal({ ...rejectModal, isOpen: false })}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-50 dark:bg-white/5 p-2 rounded-full transition-all"
              >
                <ICONS.Close size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {rejectModal.description}
            </p>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">
                রিজেক্ট করার কারণ (ঐচ্ছিক)
              </label>
              <textarea
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                placeholder="উদাহরণ: স্ক্রিনশট ভুল, পেমেন্ট পাওয়া যায়নি..."
                className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl text-xs font-bold outline-none border border-transparent focus:border-red-500/50 dark:text-white resize-none h-24"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRejectModal({ ...rejectModal, isOpen: false })}
                className="flex-1 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-300 py-4 rounded-xl font-black uppercase text-[10px] transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  rejectModal.onConfirm(rejectReasonInput);
                  setRejectModal({ ...rejectModal, isOpen: false });
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-4 rounded-xl font-black uppercase text-[10px] shadow-lg shadow-red-500/10 transition-all active:scale-95"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-2xl animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-6 right-6 text-white hover:text-[#10b981] bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all shadow-lg active:scale-95"
          >
            <ICONS.Close size={24} />
          </button>

          <img
            src={lightboxImage}
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
            alt="Fullscreen Proof"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

const AdminTab: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}> = ({ active, onClick, label, icon, badge }) => (
  <button
    onClick={onClick}
    className={`px-5 py-3 rounded-full transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${active ? "bg-[#10b981] border-[#10b981] text-white shadow-lg shadow-emerald-500/10" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 text-slate-400 hover:border-[#10b981]/20 hover:text-[#10b981]"}`}
  >
    {icon} {label}{" "}
    {badge !== undefined && badge > 0 && (
      <span className="bg-red-500 text-white w-4 h-4 rounded-full text-[8px] flex items-center justify-center font-bold animate-pulse">
        {badge}
      </span>
    )}
  </button>
);

const TechnicalItem = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-white/5 last:border-0">
    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
      {label}
    </span>
    <span className="text-[10px] font-bold dark:text-white italic truncate max-w-[140px]">
      {value}
    </span>
  </div>
);

export default AdminPanel;
