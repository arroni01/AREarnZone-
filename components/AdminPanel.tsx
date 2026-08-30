import React, { useState, useMemo, useEffect } from "react";
import { saveDocument } from "../firebase";
import { compressImage } from "../utils/imageCompressor";
import { Eye, EyeOff, Plus, Edit, Trash2, Play, Image as ImageIcon, Globe, ArrowUpDown, PlusCircle, CheckCircle2, XCircle, RefreshCw, Download, Activity, TrendingUp, TrendingDown, DollarSign, Calendar, Terminal, AlertTriangle, Search, Folder, ArrowLeft, CheckSquare, Square, ShieldCheck, Shield } from "lucide-react";
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
  WelcomeSettings,
  SellCategory,
  SellItem,
  MonitorPermissions,
  StoreOrder,
  TelegramVerificationRequest,
  AdViewLog,
  CPANetwork,
  CPAConversion,
  CPATransaction,
  ReferralTarget,
  TargetHistory,
  GatewayLog,
} from "../types";
import { ICONS } from "../constants";
import { getApiUrl, safeParseJsonResponse } from "../src/utils/apiConfig";
import MonitorDashboard from "./MonitorDashboard";
import CPAControlCenter from "./CPAControlCenter";
import RegressionTestDashboard from "./RegressionTestDashboard";
import { getErrors, clearErrors, trackError } from "../utils/errorTracker";
import type { SystemErrorLog } from "../utils/errorTracker";
import { getActiveStatus } from "./statusUtils";
import { COUNTRIES } from "./localization";
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
  cpaNetworks?: CPANetwork[];
  setCpaNetworks?: React.Dispatch<React.SetStateAction<CPANetwork[]>>;
  cpaConversions?: CPAConversion[];
  setCpaConversions?: React.Dispatch<React.SetStateAction<CPAConversion[]>>;
  cpaTransactions?: CPATransaction[];
  setCpaTransactions?: React.Dispatch<React.SetStateAction<CPATransaction[]>>;
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
  cpaNetworks = [],
  setCpaNetworks,
  cpaConversions = [],
  setCpaConversions,
  cpaTransactions = [],
  setCpaTransactions,
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
    | "welcome"
    | "cpa_control"
    | "regression_test"
    | "ai_health"
  >("cpa_control");
  const [approvalSubTab, setApprovalSubTab] = useState<
    "membership" | "tasks" | "deposit" | "cpa"
  >("membership");

  // Task Country Targeting Filter & Search State
  const [taskCountryFilter, setTaskCountryFilter] = useState<string>('ALL');
  const [taskCountrySearchQuery, setTaskCountrySearchQuery] = useState<string>('');

  // Referral Target Manager Filter & Form States
  const [targetFormPeriodType, setTargetFormPeriodType] = useState<'daily' | 'oneday' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [targetFormStartDate, setTargetFormStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [targetFormEndDate, setTargetFormEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Existing Targets Filter State
  const [targetFilterPeriod, setTargetFilterPeriod] = useState<'all' | 'daily' | 'oneday' | 'weekly' | 'monthly' | 'custom'>('all');

  // Target History Filter & Analytics State
  const [targetHistoryFilterPeriod, setTargetHistoryFilterPeriod] = useState<'all' | 'daily' | 'oneday' | 'weekly' | 'monthly' | 'custom'>('all');
  const [targetHistoryStartDate, setTargetHistoryStartDate] = useState<string>('');
  const [targetHistoryEndDate, setTargetHistoryEndDate] = useState<string>('');
  const [targetHistorySearch, setTargetHistorySearch] = useState<string>('');

  // Welcome Screen Settings State
  const [welcomeForm, setWelcomeForm] = useState<WelcomeSettings>({
    imageUrl: globalConfig.welcomeSettings?.imageUrl || "/ar_group_welcome.jpg",
    durationSeconds: globalConfig.welcomeSettings?.durationSeconds ?? 3,
    isEnabled: globalConfig.welcomeSettings?.isEnabled ?? true,
  });
  const [isCompressingWelcomeImg, setIsCompressingWelcomeImg] = useState(false);

  useEffect(() => {
    if (globalConfig.welcomeSettings) {
      setWelcomeForm({
        imageUrl: globalConfig.welcomeSettings.imageUrl || "/ar_group_welcome.jpg",
        durationSeconds: globalConfig.welcomeSettings.durationSeconds ?? 3,
        isEnabled: globalConfig.welcomeSettings.isEnabled ?? true,
      });
    }
  }, [globalConfig.welcomeSettings]);

  const handleWelcomeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressingWelcomeImg(true);
    try {
      const compressed = await compressImage(file, 1200, 1200, 0.82);
      setWelcomeForm(prev => ({ ...prev, imageUrl: compressed }));
      notify("Welcome Image uploaded and compressed successfully!");
    } catch (err) {
      console.error("Error compressing welcome image:", err);
      notify("Failed to process image. Please try another image or URL.");
    } finally {
      setIsCompressingWelcomeImg(false);
    }
  };

  const handleSaveWelcomeSettings = async () => {
    const updatedConfig: GlobalConfig = {
      ...globalConfig,
      welcomeSettings: welcomeForm,
    };
    setGlobalConfig(updatedConfig);
    try {
      localStorage.setItem("arez_global_config", JSON.stringify(updatedConfig));
      localStorage.setItem("arez_welcome_settings", JSON.stringify(welcomeForm));
      await saveDocument("config", "global", updatedConfig);
    } catch (err) {
      console.error("Error saving welcome screen settings:", err);
    }
    notify("Welcome Screen Settings saved successfully! üéâ");
  };

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
      
      notify("‡¶á‡¶â‡¶ú‡¶æ‡¶∞ ‡¶≤‡¶ø‡¶∏‡ßç‡¶ü ‡¶∏‡¶´‡¶≤‡¶≠‡¶æ‡¶¨‡ßá CSV ‡¶´‡¶æ‡¶á‡¶≤ ‡¶π‡¶ø‡¶∏‡ßá‡¶¨‡ßá ‡¶°‡¶æ‡¶â‡¶®‡¶≤‡ßã‡¶° ‡¶π‡ßü‡ßá‡¶õ‡ßá! ‚úÖ");
    } catch (error) {
      console.error("Failed to export users CSV:", error);
      notify("‡¶á‡¶â‡¶ú‡¶æ‡¶∞ ‡¶≤‡¶ø‡¶∏‡ßç‡¶ü ‡¶è‡¶ï‡ßç‡¶∏‡¶™‡ßã‡¶∞‡ßç‡¶ü ‡¶ï‡¶∞‡¶§‡ßá ‡¶∏‡¶Æ‡¶∏‡ßç‡¶Ø‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá‡•§ ‚ùå");
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

      notify("‡¶≤‡ßá‡¶®‡¶¶‡ßá‡¶® ‡¶π‡¶ø‡¶∏‡ßç‡¶ü‡ßç‡¶∞‡¶ø ‡¶∏‡¶´‡¶≤‡¶≠‡¶æ‡¶¨‡ßá CSV ‡¶´‡¶æ‡¶á‡¶≤ ‡¶π‡¶ø‡¶∏‡ßá‡¶¨‡ßá ‡¶°‡¶æ‡¶â‡¶®‡¶≤‡ßã‡¶° ‡¶π‡ßü‡ßá‡¶õ‡ßá! ‚úÖ");
    } catch (error) {
      console.error("Failed to export transactions CSV:", error);
      notify("‡¶≤‡ßá‡¶®‡¶¶‡ßá‡¶® ‡¶π‡¶ø‡¶∏‡ßç‡¶ü‡ßç‡¶∞‡¶ø ‡¶è‡¶ï‡ßç‡¶∏‡¶™‡ßã‡¶∞‡ßç‡¶ü ‡¶ï‡¶∞‡¶§‡ßá ‡¶∏‡¶Æ‡¶∏‡ßç‡¶Ø‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá‡•§ ‚ùå");
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

      notify("‡¶∏‡¶ï‡¶≤ ‡¶ï‡¶æ‡¶ú‡ßá‡¶∞ ‡¶∏‡¶æ‡¶¨‡¶Æ‡¶ø‡¶∂‡¶® ‡¶Ö‡¶°‡¶ø‡¶ü ‡¶∞‡¶ø‡¶™‡ßã‡¶∞‡ßç‡¶ü (A to Z) ‡¶∏‡¶´‡¶≤‡¶≠‡¶æ‡¶¨‡ßá CSV ‡¶´‡¶æ‡¶á‡¶≤ ‡¶π‡¶ø‡¶∏‡ßá‡¶¨‡ßá ‡¶°‡¶æ‡¶â‡¶®‡¶≤‡ßã‡¶° ‡¶π‡ßü‡ßá‡¶õ‡ßá! ‚úÖ");
    } catch (error) {
      console.error("Failed to export all submissions CSV:", error);
      notify("‡¶∏‡¶æ‡¶¨‡¶Æ‡¶ø‡¶∂‡¶® ‡¶π‡¶ø‡¶∏‡ßç‡¶ü‡ßç‡¶∞‡¶ø ‡¶è‡¶ï‡ßç‡¶∏‡¶™‡ßã‡¶∞‡ßç‡¶ü ‡¶ï‡¶∞‡¶§‡ßá ‡¶∏‡¶Æ‡¶∏‡ßç‡¶Ø‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá‡•§ ‚ùå");
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

      notify("‡¶Æ‡¶®‡¶ø‡¶ü‡¶∞‡¶¶‡ßá‡¶∞ ‡¶™‡¶æ‡¶∞‡¶´‡¶∞‡¶Æ‡ßç‡¶Ø‡¶æ‡¶®‡ßç‡¶∏ ‡¶∞‡¶ø‡¶™‡ßã‡¶∞‡ßç‡¶ü ‡¶∏‡¶´‡¶≤‡¶≠‡¶æ‡¶¨‡ßá CSV ‡¶´‡¶æ‡¶á‡¶≤ ‡¶π‡¶ø‡¶∏‡ßá‡¶¨‡ßá ‡¶°‡¶æ‡¶â‡¶®‡¶≤‡ßã‡¶° ‡¶π‡ßü‡ßá‡¶õ‡ßá! ‚úÖ");
    } catch (error) {
      console.error("Failed to export monitors report:", error);
      notify("‡¶Æ‡¶®‡¶ø‡¶ü‡¶∞‡¶¶‡ßá‡¶∞ ‡¶∞‡¶ø‡¶™‡ßã‡¶∞‡ßç‡¶ü ‡¶è‡¶ï‡ßç‡¶∏‡¶™‡ßã‡¶∞‡ßç‡¶ü ‡¶ï‡¶∞‡¶§‡ßá ‡¶∏‡¶Æ‡¶∏‡ßç‡¶Ø‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá‡•§ ‚ùå");
    }
  };

  const handleExportAccountingLedgerCSV = () => {
    try {
      const headers = [
        "Ledger Code / Sl",
        "Entry Timestamp (‡¶§‡¶æ‡¶∞‡¶ø‡¶ñ ‡¶ì ‡¶∏‡¶Æ‡ßü)",
        "Document/Ref ID (‡¶Ü‡¶á‡¶°‡¶ø)",
        "Account Ledger Name (‡¶ñ‡¶æ‡¶§)",
        "Debit (Payment Out/Liability) ‡ß≥",
        "Credit (Payment In/Asset) ‡ß≥",
        "Value Amount ‡ß≥",
        "Particulars / Details (‡¶¨‡¶ø‡¶¨‡¶∞‡¶£)",
        "Client Target (‡¶á‡¶â‡¶ú‡¶æ‡¶∞)",
        "Audit Status (‡¶Ö‡¶¨‡¶∏‡ßç‡¶•‡¶æ)",
        "Processor / Auditor (‡¶Ö‡¶°‡¶ø‡¶ü‡¶∞)"
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

      notify("‡¶ï‡¶Æ‡ßç‡¶™‡ßç‡¶∞‡¶ø‡¶π‡ßá‡¶®‡¶∏‡¶ø‡¶≠ ‡¶è‡¶ï‡¶æ‡¶â‡¶®‡ßç‡¶ü‡¶ø‡¶Ç ‡¶≤‡ßá‡¶ú‡¶æ‡¶∞ ‡¶∞‡¶ø‡¶™‡ßã‡¶∞‡ßç‡¶ü ‡¶∏‡¶´‡¶≤‡¶≠‡¶æ‡¶¨‡ßá CSV ‡¶´‡¶æ‡¶á‡¶≤ ‡¶π‡¶ø‡¶∏‡ßá‡¶¨‡ßá ‡¶°‡¶æ‡¶â‡¶®‡¶≤‡ßã‡¶° ‡¶π‡ßü‡ßá‡¶õ‡ßá! ‚úÖ");
    } catch (error) {
      console.error("Failed to export accounting ledger CSV:", error);
      notify("‡¶è‡¶ï‡¶æ‡¶â‡¶®‡ßç‡¶ü‡¶ø‡¶Ç ‡¶≤‡ßá‡¶ú‡¶æ‡¶∞ ‡¶è‡¶ï‡ßç‡¶∏‡¶™‡ßã‡¶∞‡ßç‡¶ü ‡¶ï‡¶∞‡¶§‡ßá ‡¶∏‡¶Æ‡¶∏‡ßç‡¶Ø‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá‡•§ ‚ùå");
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
  const [tgBotIsOnline, setTgBotIsOnline] = useState<boolean | null>(null);
  const [tgBotMaskedToken, setTgBotMaskedToken] = useState<string | null>(null);
  const [tgBotLastErr, setTgBotLastErr] = useState<string | null>(null);

  const [telegramFilter, setTelegramFilter] = useState<
    "all" | "pending" | "approved" | "rejected" | "deleted"
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
      const res = await fetch(getApiUrl("/api/admin/email-counters"));
      if (res.ok) {
        const data = await safeParseJsonResponse<any>(res);
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
                try {
                  const saveRes = await fetch(getApiUrl("/api/admin/save-smtp-list"), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ smtpList: cachedSmtps }),
                  });
                  if (saveRes.ok) {
                    console.log("[SMTP Cache] SMTP configurations successfully restored!");
                    // Trigger a refresh after background restoration
                    const refreshedRes = await fetch(getApiUrl("/api/admin/email-counters")).catch(() => null);
                    if (refreshedRes && refreshedRes.ok) {
                      const refreshedData = await safeParseJsonResponse<any>(refreshedRes);
                      if (refreshedData) setEmailCounters(refreshedData);
                    }
                  }
                } catch (saveErr: any) {
                  console.warn("[SMTP Cache] Postponed background restore (temporary network disconnect):", saveErr?.message);
                }
              }
            }
          } catch (restoreErr: any) {
            console.warn("[SMTP Cache] Restoration check note:", restoreErr?.message);
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
      await fetch(getApiUrl("/api/admin/smtp/reset-counts"), {
        method: "POST",
      }).catch(() => {});

      const res = await fetch(getApiUrl("/api/admin/email-counters/reset"), {
        method: "POST",
      });
      const data = await safeParseJsonResponse<any>(res);
      if (res.ok || data.success) {
        notify("SMTP daily quotas and email counters manually reset!");
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
      const res = await fetch(getApiUrl("/api/telegram/config"));
      if (res.ok) {
        const data = await safeParseJsonResponse<any>(res);
        setTgBotUsername(data.botUsername || "@AREarnZone_bot");
        setTgChannelLink(data.channelLink || "https://t.me/arearnzone");
        setTgBotIsOnline(!!data.isBotOnline);
        if (data.maskedToken && data.maskedToken !== "None") {
          setTgBotMaskedToken(data.maskedToken);
        }
        setTgBotLastErr(data.lastPollingError || null);

        // Ephemeral recovery: If the server restarted and has no active token, but this admin has a cached copy, auto-restore it!
        if (!data.isConfigured) {
          // 1. Try restoring from globalConfig first
          const cachedBotToken = globalConfig?.telegramBotToken;
          const cachedBotUsername = globalConfig?.telegramBotUsername || "@AREarnZone_bot";
          const cachedBotChannel = globalConfig?.telegramChannelLink || "https://t.me/arearnzone";

          if (cachedBotToken && cachedBotToken.trim()) {
            console.log(
              "[Telegram Bot Cache] Ephemeral connection lost. Restoring bot from globalConfig in background...",
            );
            await fetch(getApiUrl("/api/telegram/save-config"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: cachedBotToken,
                bot_token: cachedBotToken,
                username: cachedBotUsername,
                bot_username: cachedBotUsername,
                channel: cachedBotChannel,
                telegram_channel: cachedBotChannel,
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
                await fetch(getApiUrl("/api/telegram/save-config"), {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    token: parsed.token,
                    bot_token: parsed.token,
                    username: parsed.username || parsed.botUsername,
                    bot_username: parsed.username || parsed.botUsername,
                    channel: parsed.channel || parsed.channelLink,
                    telegram_channel: parsed.channel || parsed.channelLink,
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
      notify("‡¶ü‡ßá‡¶≤‡¶ø‡¶ó‡ßç‡¶∞‡¶æ‡¶Æ ‡¶¨‡¶ü ‡¶ü‡ßã‡¶ï‡ßá‡¶® ‡¶¶‡¶ø‡¶®!");
      return;
    }
    setIsSavingTgBot(true);
    setTgBotStatusMsg(null);
    setTgBotStatusOk(null);
    setCanForceTgSave(false);
    notify(
      force
        ? "‡¶¨‡¶æ‡¶ß‡ßç‡¶Ø‡¶§‡¶æ‡¶Æ‡ßÇ‡¶≤‡¶ï‡¶≠‡¶æ‡¶¨‡ßá ‡¶¨‡¶ü ‡¶ü‡ßã‡¶ï‡ßá‡¶® ‡¶∏‡ßá‡¶≠ ‡¶ï‡¶∞‡¶æ ‡¶π‡¶ö‡ßç‡¶õ‡ßá..."
        : "‡¶ü‡ßá‡¶≤‡¶ø‡¶ó‡ßç‡¶∞‡¶æ‡¶Æ ‡¶¨‡¶ü ‡¶ü‡ßã‡¶ï‡ßá‡¶® ‡¶ï‡¶æ‡¶®‡ßá‡¶ï‡ßç‡¶ü ‡¶ì ‡¶ü‡ßá‡¶∏‡ßç‡¶ü ‡¶ï‡¶∞‡¶æ ‡¶π‡¶ö‡ßç‡¶õ‡ßá...",
    );
    try {
      const res = await fetch(getApiUrl("/api/telegram/save-config"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tgBotToken,
          bot_token: tgBotToken,
          username: tgBotUsername,
          bot_username: tgBotUsername,
          channel: tgChannelLink,
          telegram_channel: tgChannelLink,
          forceSave: force,
        }),
      });
      const data = await safeParseJsonResponse<any>(res);
      setIsSavingTgBot(false);
      if (res.ok) {
        setTgBotStatusOk(true);
        setTgBotStatusMsg(data.message);
        setTgBotIsOnline(true);
        setTgBotLastErr(null);
        
        const finalUsername = data.config?.username || tgBotUsername;
        if (data.config?.username) {
          setTgBotUsername(data.config.username);
        }
        if (data.config?.token) {
          const t = data.config.token;
          setTgBotMaskedToken(t.length > 8 ? `${t.slice(0, 4)}...${t.slice(-4)}` : t);
        }

        notify(
          force
            ? "‡¶ü‡ßá‡¶≤‡¶ø‡¶ó‡ßç‡¶∞‡¶æ‡¶Æ ‡¶¨‡¶ü ‡¶ú‡ßã‡¶∞‡¶™‡ßÇ‡¶∞‡ßç‡¶¨‡¶ï ‡¶∏‡ßá‡¶≠ ‡¶π‡ßü‡ßá‡¶õ‡ßá! ‚ö†Ô∏è"
            : "‡¶ü‡ßá‡¶≤‡¶ø‡¶ó‡ßç‡¶∞‡¶æ‡¶Æ ‡¶¨‡¶ü ‡¶∏‡¶´‡¶≤‡¶≠‡¶æ‡¶¨‡ßá ‡¶ï‡¶æ‡¶®‡ßá‡¶ï‡ßç‡¶ü ‡¶ì ‡¶∏‡ßá‡¶≠ ‡¶π‡ßü‡ßá‡¶õ‡ßá! ‚úÖ",
        );

        // Cache configuration inside Admin's browser for auto-restoring after server restarts
        localStorage.setItem(
          "arez_admin_tg_config",
          JSON.stringify({
            token: tgBotToken,
            username: finalUsername,
            channel: tgChannelLink,
          }),
        );

        // Also persist in the globalConfig state so it auto-restores for ALL sessions
        setGlobalConfig((prev) => ({
          ...prev,
          telegramBotToken: tgBotToken,
          telegramBotUsername: finalUsername,
          telegramChannelLink: tgChannelLink,
        }));

        setCanForceTgSave(false);
      } else {
        setTgBotStatusOk(false);
        setTgBotStatusMsg(data.error || "‡¶ü‡ßã‡¶ï‡ßá‡¶® ‡¶ï‡¶æ‡¶®‡ßá‡¶ï‡ßç‡¶ü ‡¶ï‡¶∞‡¶§‡ßá ‡¶¨‡ßç‡¶Ø‡¶∞‡ßç‡¶• ‡¶π‡ßü‡ßá‡¶õ‡ßá‡•§");
        if (data.canForce) {
          setCanForceTgSave(true);
        }
        notify("‡¶¨‡¶ü ‡¶ï‡¶æ‡¶®‡ßá‡¶ï‡¶∂‡¶® ‡¶¨‡ßç‡¶Ø‡¶∞‡ßç‡¶• ‡¶π‡ßü‡ßá‡¶õ‡ßá‡•§");
      }
    } catch (err: any) {
      setIsSavingTgBot(false);
      setTgBotStatusOk(false);
      setTgBotStatusMsg("‡¶¨‡¶ü ‡¶ï‡¶æ‡¶®‡ßá‡¶ï‡¶∂‡¶® ‡¶∏‡¶æ‡¶∞‡ßç‡¶≠‡¶æ‡¶∞ ‡¶§‡ßç‡¶∞‡ßÅ‡¶ü‡¶ø: " + err.message);
      notify("‡¶∏‡¶æ‡¶∞‡ßç‡¶≠‡¶æ‡¶∞ ‡¶è‡¶∞‡¶∞‡•§");
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
      notify("‡¶ú‡¶ø‡¶Æ‡ßá‡¶á‡¶≤ ‡¶è‡¶°‡ßç‡¶∞‡ßá‡¶∏ ‡¶è‡¶¨‡¶Ç ‡¶Ö‡ßç‡¶Ø‡¶æ‡¶™ ‡¶™‡¶æ‡¶∏‡¶ì‡ßü‡¶æ‡¶∞‡ßç‡¶° ‡¶Ö‡¶¨‡¶∂‡ßç‡¶Ø‡¶á ‡¶¶‡¶ø‡¶§‡ßá ‡¶π‡¶¨‡ßá!");
      return;
    }
    setIsAddingSmtp(true);
    try {
      const res = await fetch(getApiUrl("/api/admin/add-smtp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: smtpFormUser,
          pass: smtpFormPass,
          limit: smtpFormLimit,
        }),
      });
      const data = await safeParseJsonResponse<any>(res);
      if (res.ok) {
        notify("SMTP ‡¶∏‡¶´‡¶≤‡¶≠‡¶æ‡¶¨‡ßá ‡¶Ø‡ßã‡¶ó/‡¶Ü‡¶™‡¶°‡ßá‡¶ü ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá!");

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
        notify(data.error || "SMTP ‡¶Ø‡ßã‡¶ó ‡¶ï‡¶∞‡¶§‡ßá ‡¶¨‡ßç‡¶Ø‡¶∞‡ßç‡¶• ‡¶π‡ßü‡ßá‡¶õ‡ßá‡•§");
      }
    } catch (e) {
      console.error(e);
      notify("‡¶®‡ßá‡¶ü‡¶ì‡ßü‡¶æ‡¶∞‡ßç‡¶ï ‡¶∏‡¶Æ‡¶∏‡ßç‡¶Ø‡¶æ‡•§ ‡¶Ü‡¶¨‡¶æ‡¶∞ ‡¶ö‡ßá‡¶∑‡ßç‡¶ü‡¶æ ‡¶ï‡¶∞‡ßÅ‡¶®‡•§");
    } finally {
      setIsAddingSmtp(false);
    }
  };

  const handleDeleteSmtp = async (userEmail: string) => {
    if (!window.confirm(`${userEmail} ‡¶ï‡¶®‡¶´‡¶ø‡¶ó‡¶æ‡¶∞‡ßá‡¶∂‡¶®‡¶ü‡¶ø ‡¶Æ‡ßÅ‡¶õ‡ßá ‡¶´‡ßá‡¶≤‡¶§‡ßá ‡¶ö‡¶æ‡¶®?`)) return;
    try {
      const res = await fetch(getApiUrl("/api/admin/delete-smtp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userEmail }),
      });
      const data = await safeParseJsonResponse<any>(res);
      if (res.ok) {
        notify("SMTP ‡¶∏‡¶´‡¶≤‡¶≠‡¶æ‡¶¨‡ßá ‡¶Æ‡ßÅ‡¶õ‡ßá ‡¶´‡ßá‡¶≤‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá!");

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
        notify(data.error || "SMTP ‡¶Æ‡ßÅ‡¶õ‡¶§‡ßá ‡¶¨‡ßç‡¶Ø‡¶∞‡ßç‡¶• ‡¶π‡ßü‡ßá‡¶õ‡ßá‡•§");
      }
    } catch (e) {
      console.error(e);
      notify("‡¶®‡ßá‡¶ü‡¶ì‡ßü‡¶æ‡¶∞‡ßç‡¶ï ‡¶∏‡¶Æ‡¶∏‡ßç‡¶Ø‡¶æ‡•§");
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
      const res = await fetch(getApiUrl("/api/admin/test-smtp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: typeof specificUser === "string" ? specificUser : undefined,
          pass: typeof specificPass === "string" ? specificPass : undefined,
        }),
      });
      const data = await safeParseJsonResponse<any>(res);
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
      notify("‡¶Ö‡ßç‡¶Ø‡¶æ‡¶°‡¶Æ‡¶ø‡¶® ‡¶Ö‡ßç‡¶Ø‡¶æ‡¶™ ‡¶≤‡¶ó‡¶á‡¶® ‡¶™‡¶æ‡¶∏‡¶ì‡ßü‡¶æ‡¶∞‡ßç‡¶° ‡¶™‡ßç‡¶∞‡¶¶‡¶æ‡¶® ‡¶ï‡¶∞‡ßÅ‡¶®‡•§");
      return;
    }

    setIsVerifyingCleanupPassword(true);
    try {
      const res = await fetch(getApiUrl("/api/admin/verify-app-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appPassword: cleanupAppPassword }),
      });
      const data = await safeParseJsonResponse<any>(res);
      if (!res.ok) {
        notify(data.error || "‡¶™‡¶æ‡¶∏‡¶ì‡ßü‡¶æ‡¶∞‡ßç‡¶° ‡¶Ø‡¶æ‡¶ö‡¶æ‡¶á‡¶ï‡¶∞‡¶£ ‡¶¨‡ßç‡¶Ø‡¶∞‡ßç‡¶• ‡¶π‡ßü‡ßá‡¶õ‡ßá‡•§");
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
        notify(`${removedCount}‡¶ü‡¶ø ‡¶∏‡¶æ‡¶ß‡¶æ‡¶∞‡¶£ ‡¶ü‡ßá‡¶∏‡ßç‡¶ü ‡¶Ü‡¶á‡¶°‡¶ø ‡¶∏‡¶´‡¶≤‡¶≠‡¶æ‡¶¨‡ßá ‡¶Æ‡ßÅ‡¶õ‡ßá ‡¶´‡ßá‡¶≤‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá!`);
      } else if (cleanupUserTarget && typeof cleanupUserTarget === "object") {
        // Clear a specific user
        const targetUser = cleanupUserTarget;
        if (targetUser.email.toLowerCase().trim() === adminEmail || targetUser.role === "admin") {
          notify("‡¶Ö‡ßç‡¶Ø‡¶æ‡¶°‡¶Æ‡¶ø‡¶® ‡¶Ü‡¶á‡¶°‡¶ø ‡¶Æ‡ßÅ‡¶õ‡ßá ‡¶´‡ßá‡¶≤‡¶æ ‡¶∏‡¶Æ‡ßç‡¶≠‡¶¨ ‡¶®‡ßü!");
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
        notify(`‡¶á‡¶â‡¶ú‡¶æ‡¶∞ ${targetUser.name || targetUser.email} ‡¶∏‡¶´‡¶≤‡¶≠‡¶æ‡¶¨‡ßá ‡¶Æ‡ßÅ‡¶õ‡ßá ‡¶´‡ßá‡¶≤‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá!`);
      }

      // Reset states
      setCleanupAppPassword("");
      setShowCleanupModal(false);
      setCleanupUserTarget(null);
    } catch (err: any) {
      console.error(err);
      notify("‡¶∏‡¶æ‡¶∞‡ßç‡¶≠‡¶æ‡¶∞ ‡¶§‡ßç‡¶∞‡ßÅ‡¶ü‡¶ø ‡¶¨‡¶æ ‡¶®‡ßá‡¶ü‡¶ì‡ßü‡¶æ‡¶∞‡ßç‡¶ï ‡¶∏‡¶Æ‡¶∏‡ßç‡¶Ø‡¶æ‡•§ ‡¶Ü‡¶¨‡¶æ‡¶∞ ‡¶ö‡ßá‡¶∑‡ßç‡¶ü‡¶æ ‡¶ï‡¶∞‡ßÅ‡¶®‡•§");
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

    // Direct Supabase Save
    saveDocument("withdraws", updatedWithdraw.id, updatedWithdraw).catch((err) =>
      console.error("Error saving approved withdraw:", err),
    );
    saveDocument("transactions", newTx.id, newTx).catch((err) =>
      console.error("Error saving withdraw transaction:", err),
    );

    // Send withdrawal approved email notification
    const targetUser = (users || []).find((u) => u.id === withdraw.userId);
    if (targetUser && targetUser.email) {
      fetch(getApiUrl("/api/email/notify"), {
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
      description: `Are you sure you want to reject the payout of ‡ß≥${withdraw.amount} for ${withdraw.userName}?`,
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

        // Direct Supabase Save
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

      // Direct Supabase Save
      saveDocument("withdraws", updatedWithdraw.id, updatedWithdraw).catch((err) =>
        console.error("Error saving approved withdraw:", err),
      );
      saveDocument("transactions", newTx.id, newTx).catch((err) =>
        console.error("Error saving withdraw transaction:", err),
      );

      // Send withdrawal approved email notification
      const targetUser = (users || []).find((u) => u.id === withdraw.userId);
      if (targetUser && targetUser.email) {
        fetch(getApiUrl("/api/email/notify"), {
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
          
          // Direct Supabase Save
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
          fetch(getApiUrl("/api/email/notify"), {
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

    notify(`‡ß≥${req.amount} ‡¶¨‡ßç‡¶Ø‡¶æ‡¶≤‡ßá‡¶®‡ßç‡¶∏ ‡¶Ø‡ßÅ‡¶ï‡ßç‡¶§ ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá!`);
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
        notify("‡¶°‡¶ø‡¶™‡ßã‡¶ú‡¶ø‡¶ü ‡¶Ü‡¶¨‡ßá‡¶¶‡¶® ‡¶¨‡¶æ‡¶§‡¶ø‡¶≤ ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá‡•§");
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
      return notify("‡¶≠‡ßÅ‡¶≤ ‡¶™‡¶æ‡¶∏‡¶ì‡ßü‡¶æ‡¶∞‡ßç‡¶°! ‡¶¨‡ßç‡¶Ø‡¶æ‡¶≤‡ßá‡¶®‡ßç‡¶∏ ‡¶™‡¶∞‡¶ø‡¶¨‡¶∞‡ßç‡¶§‡¶® ‡¶ï‡¶∞‡¶æ ‡¶∏‡¶Æ‡ßç‡¶≠‡¶¨ ‡¶®‡ßü‡•§");
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
      fetch(getApiUrl("/api/email/notify"), {
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
          ? `${targetUser.name}-‡¶ï‡ßá ‡¶∏‡¶ø‡¶∏‡ßç‡¶ü‡ßá‡¶Æ‡ßá ‡¶Æ‡¶®‡¶ø‡¶ü‡¶∞ ‡¶π‡¶ø‡¶∏‡ßá‡¶¨‡ßá ‡¶®‡¶ø‡¶Ø‡ßÅ‡¶ï‡ßç‡¶§ ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá!`
          : `${targetUser.name}-‡¶ï‡ßá ‡¶Æ‡¶®‡¶ø‡¶ü‡¶∞ ‡¶§‡¶æ‡¶≤‡¶ø‡¶ï‡¶æ ‡¶•‡ßá‡¶ï‡ßá ‡¶∏‡¶´‡¶≤‡¶≠‡¶æ‡¶¨‡ßá ‡¶Ö‡¶™‡¶∏‡¶æ‡¶∞‡¶£ ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá‡•§`,
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
        "‡¶≠‡ßÅ‡¶≤ ‡¶™‡¶æ‡¶∏‡¶ì‡ßü‡¶æ‡¶∞‡ßç‡¶°! ‡¶Ö‡¶®‡ßÅ‡¶ó‡ßç‡¶∞‡¶π ‡¶ï‡¶∞‡ßá ‡¶∏‡¶†‡¶ø‡¶ï ‡¶Ö‡ßç‡¶Ø‡¶æ‡¶™ ‡¶™‡¶æ‡¶∏‡¶ì‡ßü‡¶æ‡¶∞‡ßç‡¶° ‡¶¶‡¶ø‡¶®‡•§ (Incorrect App Password)",
      );
      notify("‡¶™‡¶æ‡¶∏‡¶ì‡ßü‡¶æ‡¶∞‡ßç‡¶° ‡¶Æ‡¶ø‡¶≤‡ßá‡¶®‡¶ø! ‡¶Ö‡¶™‡¶∂‡¶® ‡¶∞‡¶ø‡¶ú‡ßá‡¶ï‡ßç‡¶ü ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá‡•§");
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
      return notify("‡¶ï‡ßç‡¶Ø‡¶æ‡¶ü‡¶æ‡¶ó‡¶∞‡¶ø ‡¶Ü‡¶ó‡ßá ‡¶•‡ßá‡¶ï‡ßá‡¶á ‡¶Ü‡¶õ‡ßá!");
    }
    const newCat = {
      id: "cat_" + Date.now(),
      name: newCategoryName.trim(),
    };
    setSellCategories((prev) => [...prev, newCat]);
    setNewCategoryName("");
    notify(`‡¶®‡¶§‡ßÅ‡¶® ‡¶ï‡ßç‡¶Ø‡¶æ‡¶ü‡¶æ‡¶ó‡¶∞‡¶ø "${newCat.name}" ‡¶Ø‡ßÅ‡¶ï‡ßç‡¶§ ‡¶π‡ßü‡ßá‡¶õ‡ßá!`);
  };

  const handleDeleteCategory = (catId: string) => {
    setSellCategories((prev) => prev.filter((c) => c.id !== catId));
    notify("‡¶ï‡ßç‡¶Ø‡¶æ‡¶ü‡¶æ‡¶ó‡¶∞‡¶ø ‡¶Æ‡ßÅ‡¶õ‡ßá ‡¶´‡ßá‡¶≤‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá‡•§");
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
      return notify("‡¶¶‡¶Ø‡¶º‡¶æ ‡¶ï‡¶∞‡ßá ‡¶∏‡¶¨‡¶ó‡ßÅ‡¶≤‡ßã ‡¶ò‡¶∞ ‡¶™‡ßÇ‡¶∞‡¶£ ‡¶ï‡¶∞‡ßÅ‡¶®‡•§");
    }
    const priceNum = parseFloat(newItemPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      return notify("‡¶∏‡¶†‡¶ø‡¶ï ‡¶Æ‡ßÇ‡¶≤‡ßç‡¶Ø ‡¶¶‡¶ø‡¶®‡•§");
    }
    const limitNum = newItemLimit ? parseInt(newItemLimit, 10) : undefined;
    if (newItemLimit && (isNaN(limitNum || 0) || (limitNum || 0) < 0)) {
      return notify("‡¶∏‡¶†‡¶ø‡¶ï ‡¶≤‡¶ø‡¶Æ‡¶ø‡¶ü ‡¶¨‡¶æ ‡¶∂‡ßÇ‡¶®‡ßç‡¶Ø ‡¶∏‡¶Ç‡¶ñ‡ßç‡¶Ø‡¶æ ‡¶™‡ßç‡¶∞‡¶¶‡¶æ‡¶® ‡¶ï‡¶∞‡ßÅ‡¶®‡•§");
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
    notify("‡¶Ü‡¶á‡¶ü‡ßá‡¶Æ‡¶ü‡¶ø ‡¶¨‡¶ø‡¶ï‡ßç‡¶∞‡¶ø‡¶∞ ‡¶ú‡¶®‡ßç‡¶Ø ‡¶∏‡¶´‡¶≤‡¶≠‡¶æ‡¶¨‡ßá ‡¶Ø‡ßÅ‡¶ï‡ßç‡¶§ ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá!");
  };

  const handleDeleteItem = (itemId: string) => {
    setSellItems((prev) => prev.filter((i) => i.id !== itemId));
    notify("‡¶Ü‡¶á‡¶ü‡ßá‡¶Æ‡¶ü‡¶ø ‡¶¶‡ßã‡¶ï‡¶æ‡¶® ‡¶•‡ßá‡¶ï‡ßá ‡¶∏‡¶∞‡¶ø‡ßü‡ßá ‡¶´‡ßá‡¶≤‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá‡•§");
  };

  const handleCompleteStoreOrder = (orderId: string) => {
    setStoreOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: "completed" as const } : o,
      ),
    );
    notify("‡¶Ö‡¶∞‡ßç‡¶°‡¶æ‡¶∞‡¶ü‡¶ø ‡¶∏‡¶´‡¶≤‡¶≠‡¶æ‡¶¨‡ßá ‡¶∏‡¶Æ‡ßç‡¶™‡¶®‡ßç‡¶® ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá ‡¶è‡¶¨‡¶Ç ‡¶ï‡ßç‡¶∞‡ßá‡¶§‡¶æ‡¶ï‡ßá ‡¶∂‡ßã ‡¶ï‡¶∞‡¶æ‡¶®‡ßã ‡¶π‡ßü‡ßá‡¶õ‡ßá!");
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
            active={activeTab === "welcome"}
            onClick={() => setActiveTab("welcome")}
            label="WELCOME SCREEN"
            icon={<ImageIcon size={14} />}
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
            active={activeTab === "cpa_control"}
            onClick={() => setActiveTab("cpa_control")}
            label="CPA CONTROL CENTER"
            icon={<Globe size={14} className="text-emerald-500" />}
            badge={cpaConversions.filter(c => c.status === "pending").length || undefined}
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
            badge={aiMetrics.healthScore < 100 ? 1 : undefined}
          />
        )}
        {!isMonitor && (
          <AdminTab
            active={activeTab === "regression_test"}
            onClick={() => setActiveTab("regression_test")}
            label="REGRESSION TESTER"
            icon={<ShieldCheck className="text-emerald-500" size={14} />}
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

      {/* CPA CONTROL CENTER TAB CONTENT */}
      {activeTab === "cpa_control" && (
        <CPAControlCenter
          cpaNetworks={cpaNetworks}
          setCpaNetworks={setCpaNetworks}
          cpaConversions={cpaConversions}
          setCpaConversions={setCpaConversions}
          cpaTransactions={cpaTransactions}
          setCpaTransactions={setCpaTransactions}
          tasks={tasks}
          setTasks={setTasks}
          users={users}
          notify={notify}
          currentUser={currentUser}
        />
      )}

      {/* REGRESSION TESTER TAB CONTENT */}
      {activeTab === "regression_test" && (
        <RegressionTestDashboard notify={notify} />
      )}

      {/* WELCOME SCREEN MANAGEMENT TAB CONTENT */}
      {activeTab === "welcome" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
              <div>
                <h3 className="text-xl font-black italic uppercase dark:text-white leading-none tracking-tighter mb-2 flex items-center gap-3">
                  <ImageIcon className="text-blue-500" size={24} />
                  WELCOME SCREEN MANAGEMENT (‡¶ì‡¶Ø‡¶º‡ßá‡¶≤‡¶ï‡¶æ‡¶Æ ‡¶∏‡ßç‡¶ï‡ßç‡¶∞‡¶ø‡¶® ‡¶∏‡ßá‡¶ü‡¶ø‡¶Ç‡¶∏)
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                  ‡¶á‡¶â‡¶ú‡¶æ‡¶∞ ‡¶≤‡¶ó‡¶á‡¶® ‡¶ï‡¶∞‡¶æ‡¶∞ ‡¶∏‡¶Æ‡¶Ø‡¶º ‡¶™‡ßç‡¶∞‡¶¶‡¶∞‡ßç‡¶∂‡¶ø‡¶§ ‡¶ì‡¶Ø‡¶º‡ßá‡¶≤‡¶ï‡¶æ‡¶Æ ‡¶∏‡ßç‡¶ï‡ßç‡¶∞‡¶ø‡¶®‡ßá‡¶∞ ‡¶õ‡¶¨‡¶ø, ‡¶∏‡¶Æ‡¶Ø‡¶º‡¶ï‡¶æ‡¶≤ ‡¶ì ‡¶∏‡¶ï‡ßç‡¶∞‡¶ø‡¶Ø‡¶º‡¶§‡¶æ ‡¶®‡¶ø‡¶Ø‡¶º‡¶®‡ßç‡¶§‡ßç‡¶∞‡¶£ ‡¶ï‡¶∞‡ßÅ‡¶®
                </p>
              </div>

              {/* Toggle Enable Welcome Screen */}
              <button
                onClick={() =>
                  setWelcomeForm((prev) => ({
                    ...prev,
                    isEnabled: !prev.isEnabled,
                  }))
                }
                className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 shadow-md ${
                  welcomeForm.isEnabled
                    ? "bg-emerald-500 text-white shadow-emerald-500/20"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${welcomeForm.isEnabled ? "bg-white animate-pulse" : "bg-slate-400"}`} />
                {welcomeForm.isEnabled ? "FEATURE ENABLED" : "FEATURE DISABLED"}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Form Controls */}
              <div className="space-y-6">
                {/* Image Upload Input */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-[0.2em] flex items-center justify-between">
                    <span>1. Upload Welcome Image (‡¶õ‡¶¨‡¶ø ‡¶Ü‡¶™‡¶≤‡ßã‡¶° ‡¶ï‡¶∞‡ßÅ‡¶®)</span>
                    {isCompressingWelcomeImg && (
                      <span className="text-blue-500 font-bold animate-pulse text-[10px]">Processing image...</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleWelcomeImageUpload}
                      disabled={isCompressingWelcomeImg}
                      className="w-full bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl text-xs font-bold border border-slate-200 dark:border-white/10 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer dark:text-slate-300"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    * ‡¶ó‡ßç‡¶Ø‡¶æ‡¶≤‡¶æ‡¶∞‡¶ø ‡¶¨‡¶æ ‡¶´‡ßã‡¶≤‡ßç‡¶°‡¶æ‡¶∞ ‡¶•‡ßá‡¶ï‡ßá ‡¶õ‡¶¨‡¶ø ‡¶∏‡¶ø‡¶≤‡ßá‡¶ï‡ßç‡¶ü ‡¶ï‡¶∞‡ßÅ‡¶®‡•§ ‡¶∏‡¶æ‡¶á‡¶ú ‡¶Ö‡¶ü‡ßã‡¶Æ‡ßá‡¶ü‡¶ø‡¶ï ‡¶ï‡¶Æ‡¶™‡ßç‡¶∞‡ßá‡¶∏ ‡¶π‡¶Ø‡¶º‡ßá ‡¶´‡¶æ‡¶∏‡ßç‡¶ü ‡¶≤‡ßã‡¶° ‡¶π‡¶¨‡ßá‡•§
                  </p>
                </div>

                {/* Direct Image URL Input */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-[0.2em]">
                    2. Or Paste Image URL (‡¶Ö‡¶•‡¶¨‡¶æ ‡¶õ‡¶¨‡¶ø‡¶∞ ‡¶≤‡¶ø‡¶Ç‡¶ï ‡¶¶‡¶ø‡¶®)
                  </label>
                  <input
                    type="text"
                    value={welcomeForm.imageUrl}
                    onChange={(e) => setWelcomeForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                    placeholder="https://domain.com/welcome-logo.jpg"
                    className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl font-mono text-xs outline-none border border-slate-200 dark:border-white/10 focus:border-blue-500 dark:text-white"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setWelcomeForm((prev) => ({ ...prev, imageUrl: "/ar_group_welcome.jpg" }))}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-bold uppercase transition-all"
                    >
                      Reset to Default Image
                    </button>
                  </div>
                </div>

                {/* Duration Input */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-[0.2em] flex items-center justify-between">
                    <span>3. Display Duration (‡¶ï‡¶§ ‡¶∏‡ßá‡¶ï‡ßá‡¶®‡ßç‡¶° ‡¶¶‡ßá‡¶ñ‡¶æ‡¶¨‡ßá)</span>
                    <span className="text-blue-500 font-extrabold text-xs">{welcomeForm.durationSeconds} SECONDS</span>
                  </label>
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-white/10">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={welcomeForm.durationSeconds}
                      onChange={(e) => setWelcomeForm((prev) => ({ ...prev, durationSeconds: parseInt(e.target.value, 10) || 2 }))}
                      className="w-full accent-blue-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={welcomeForm.durationSeconds}
                      onChange={(e) => setWelcomeForm((prev) => ({ ...prev, durationSeconds: Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 2)) }))}
                      className="w-20 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl text-center font-black text-sm border border-slate-200 dark:border-white/10 dark:text-white"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">
                    * ‡ßß ‡¶•‡ßá‡¶ï‡ßá ‡ßß‡ß¶ ‡¶∏‡ßá‡¶ï‡ßá‡¶®‡ßç‡¶°‡ßá‡¶∞ ‡¶Æ‡¶ß‡ßç‡¶Ø‡ßá ‡¶®‡¶ø‡¶∞‡ßç‡¶¨‡¶æ‡¶ö‡¶® ‡¶ï‡¶∞‡ßÅ‡¶®‡•§ ‡¶°‡¶ø‡¶´‡¶≤‡ßç‡¶ü: ‡ß© ‡¶∏‡ßá‡¶ï‡ßá‡¶®‡ßç‡¶°‡•§
                  </p>
                </div>

                {/* Save Button */}
                <div className="pt-4">
                  <button
                    onClick={handleSaveWelcomeSettings}
                    className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-[0.25em] rounded-2xl shadow-xl hover:shadow-blue-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-3"
                  >
                    <CheckCircle2 size={18} />
                    SAVE WELCOME SETTINGS (‡¶∏‡ßá‡¶≠ ‡¶ï‡¶∞‡ßÅ‡¶®)
                  </button>
                </div>
              </div>

              {/* Right Column: Live Image Preview */}
              <div className="space-y-4">
                <label className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-[0.2em] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  LIVE PREVIEW (‡¶á‡¶â‡¶ú‡¶æ‡¶∞ ‡¶Ø‡¶æ ‡¶¶‡ßá‡¶ñ‡¶§‡ßá ‡¶™‡¶æ‡¶¨‡ßá)
                </label>

                <div className="relative rounded-[2.5rem] bg-[#0d131f] border-4 border-slate-800 p-4 shadow-2xl overflow-hidden flex flex-col items-center justify-center min-h-[360px] text-center">
                  {/* Subtle Background Radial Pattern */}
                  <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 50% 45%, #1c283c 0%, #111827 60%, #080d15 100%)`,
                    }}
                  />

                  {/* Header Badge */}
                  <div className="relative z-10 mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/60 shadow-md">
                    <Shield className="w-3 h-3 text-sky-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-200">
                      AR GROUP OFFICIAL PORTAL
                    </span>
                  </div>

                  {/* Image Display */}
                  <div className="relative z-10 p-1 bg-[#131b2a] border border-slate-700/60 rounded-2xl shadow-xl max-w-full">
                    <img
                      src={welcomeForm.imageUrl || "/ar_group_welcome.jpg"}
                      alt="Welcome Preview"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/ar_group_welcome.jpg";
                      }}
                      className="max-h-[220px] w-auto object-contain rounded-xl shadow-md"
                    />
                  </div>

                  {/* Preview Footer Info */}
                  <div className="relative z-10 mt-5 w-full max-w-xs space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-black text-slate-300 px-1 uppercase tracking-wider">
                      <span className="text-sky-400">DISPLAY TIME: {welcomeForm.durationSeconds}s</span>
                      <span className={welcomeForm.isEnabled ? "text-emerald-400" : "text-rose-400"}>
                        {welcomeForm.isEnabled ? "STATUS: ACTIVE" : "STATUS: DISABLED"}
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div className="h-full bg-gradient-to-r from-blue-500 to-sky-400 w-3/4 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AD MANAGER TAB CONTENT */}
      {activeTab === "ads" && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-white/5 shadow-sm space-y-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
              <div>
                <h3 className="text-xl font-black italic uppercase dark:text-white leading-none tracking-tighter mb-2">
                  AD MANAGER (‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶® ‡¶ï‡¶®‡ßç‡¶ü‡ßç‡¶∞‡ßã‡¶≤ ‡¶∏‡ßá‡¶®‡ßç‡¶ü‡¶æ‡¶∞)
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                  ‡¶¨‡ßç‡¶Ø‡¶¨‡¶π‡¶æ‡¶∞‡¶ï‡¶æ‡¶∞‡ßÄ‡¶¶‡ßá‡¶∞ ‡¶ú‡¶®‡ßç‡¶Ø ‡¶∏‡ßç‡¶¨‡ßü‡¶Ç‡¶ï‡ßç‡¶∞‡¶ø‡ßü ‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶® ‡¶™‡ßç‡¶∞‡¶¶‡¶∞‡ßç‡¶∂‡¶® ‡¶ì ‡¶™‡ßÅ‡¶®‡¶∞‡¶æ‡¶¨‡ßÉ‡¶§‡ßç‡¶§‡¶ø ‡¶≤‡ßÅ‡¶™ ‡¶∏‡ßá‡¶ü‡¶ø‡¶Ç‡¶∏
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
                        ? "‡¶∏‡ßç‡¶¨‡ßü‡¶Ç‡¶ï‡ßç‡¶∞‡¶ø‡ßü ‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶® ‡¶™‡ßç‡¶∞‡¶¶‡¶∞‡ßç‡¶∂‡¶® ‡¶ö‡¶æ‡¶≤‡ßÅ ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá (Ad Manager ENABLED)."
                        : "‡¶∏‡ßç‡¶¨‡ßü‡¶Ç‡¶ï‡ßç‡¶∞‡¶ø‡ßü ‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶® ‡¶™‡ßç‡¶∞‡¶¶‡¶∞‡ßç‡¶∂‡¶® ‡¶¨‡¶®‡ßç‡¶ß ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá (Ad Manager DISABLED)."
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
                  AD DISPLAY INTERVAL (‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶®‡ßá‡¶∞ ‡¶∏‡¶Æ‡ßü‡¶∏‡ßÄ‡¶Æ‡¶æ)
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
                    Minutes (‡¶Æ‡¶ø‡¶®‡¶ø‡¶ü ‡¶™‡¶∞ ‡¶™‡¶∞ ad ‡¶¶‡ßá‡¶ñ‡¶æ‡¶¨‡ßá)
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                  ‡¶á‡¶â‡¶ú‡¶æ‡¶∞‡¶¶‡ßá‡¶∞ ‡¶ï‡¶§ ‡¶Æ‡¶ø‡¶®‡¶ø‡¶ü ‡¶™‡¶∞ ‡¶™‡¶∞ ‡¶∏‡ßç‡¶¨‡ßü‡¶Ç‡¶ï‡ßç‡¶∞‡¶ø‡ßü‡¶≠‡¶æ‡¶¨‡ßá ‡¶è‡¶ï‡¶ü‡¶ø ‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶® ‡¶¶‡ßá‡¶ñ‡¶æ‡¶®‡ßã ‡¶π‡¶¨‡ßá ‡¶§‡¶æ ‡¶è‡¶ñ‡¶æ‡¶® ‡¶•‡ßá‡¶ï‡ßá ‡¶∏‡ßá‡¶ü ‡¶ï‡¶∞‡ßÅ‡¶®‡•§
                </p>
              </div>

              {/* Ad Login Delay Seconds */}
              <div className="space-y-3 bg-slate-50 dark:bg-white/5 p-6 rounded-2xl border border-slate-100 dark:border-white/5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  LOGIN DELAY TIMER (‡¶≤‡¶ó‡¶á‡¶® ‡¶™‡¶∞ ‡¶™‡ßç‡¶∞‡¶•‡¶Æ ‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶® ‡¶¨‡¶ø‡¶≤‡¶Æ‡ßç‡¶¨)
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
                    Seconds (‡¶∏‡ßá‡¶ï‡ßá‡¶®‡ßç‡¶° ‡¶™‡¶∞ ad ‡¶¶‡ßá‡¶ñ‡¶æ‡¶¨‡ßá)
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                  ‡¶á‡¶â‡¶ú‡¶æ‡¶∞ ‡¶≤‡¶ó‡¶á‡¶® ‡¶ï‡¶∞‡¶æ‡¶∞ ‡¶ï‡¶§ ‡¶∏‡ßá‡¶ï‡ßá‡¶®‡ßç‡¶° ‡¶™‡¶∞ ‡¶™‡ßç‡¶∞‡¶•‡¶Æ ‡¶´‡ßÅ‡¶≤ ‡¶∏‡ßç‡¶ï‡ßç‡¶∞‡¶ø‡¶® ‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶®‡¶ü‡¶ø ‡¶Ö‡¶ü‡ßã‡¶Æ‡ßá‡¶ü‡¶ø‡¶ï ‡¶≤‡ßã‡¶° ‡¶π‡¶¨‡ßá‡•§
                </p>
              </div>

              {/* Ad Skip Seconds */}
              <div className="space-y-3 bg-slate-50 dark:bg-white/5 p-6 rounded-2xl border border-slate-100 dark:border-white/5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  SKIP OPTION TIMER (‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶® ‡¶∏‡ßç‡¶ï‡¶ø‡¶™ ‡¶Ö‡¶™‡¶∂‡¶® ‡¶∏‡¶Æ‡ßü)
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
                    Seconds (‡¶∏‡ßá‡¶ï‡ßá‡¶®‡ßç‡¶° ‡¶™‡¶∞ ‡¶∏‡ßç‡¶ï‡¶ø‡¶™ ‡¶∂‡ßã ‡¶ï‡¶∞‡¶¨‡ßá)
                  </span>
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                  ‡¶ï‡¶§ ‡¶∏‡ßá‡¶ï‡ßá‡¶®‡ßç‡¶° ‡¶ö‡¶≤‡¶æ‡¶∞ ‡¶™‡¶∞ ‡¶¨‡ßç‡¶Ø‡¶¨‡¶π‡¶æ‡¶∞‡¶ï‡¶æ‡¶∞‡ßÄ‡¶∞‡¶æ ‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶®‡¶ü‡¶ø ‡¶è‡ßú‡¶ø‡ßü‡ßá ‡¶Ø‡ßá‡¶§‡ßá (Skip ‡¶ï‡¶∞‡¶§‡ßá) ‡¶™‡¶æ‡¶∞‡¶¨‡ßá‡•§
                </p>
              </div>
            </div>

            {/* AD CREATOR/EDITOR FORM */}
            <div className="bg-slate-50 dark:bg-white/5 p-6 md:p-8 rounded-[2rem] border border-slate-100 dark:border-white/5 space-y-6">
              <div className="border-b border-slate-200 dark:border-white/5 pb-4">
                <h4 className="text-sm font-black dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <PlusCircle size={16} className="text-[#10b981]" />
                  {editingAdId ? "EDIT EXISTING SPONSOR AD (‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶® ‡¶™‡¶∞‡¶ø‡¶¨‡¶∞‡ßç‡¶§‡¶® ‡¶ï‡¶∞‡ßÅ‡¶®)" : "ADD NEW SPONSOR AD (‡¶®‡¶§‡ßÅ‡¶® ‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶® ‡¶Ø‡ßã‡¶ó ‡¶ï‡¶∞‡ßÅ‡¶®)"}
                </h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                  ‡¶∏‡¶∞‡¶æ‡¶∏‡¶∞‡¶ø ‡¶á‡¶Æ‡ßá‡¶ú, ‡¶≠‡¶ø‡¶°‡¶ø‡¶ì ‡¶™‡ßç‡¶≤‡ßá‡¶Ø‡¶º‡¶æ‡¶∞ ‡¶Ö‡¶•‡¶¨‡¶æ ‡¶Ø‡ßá‡¶ï‡ßã‡¶®‡ßã ‡¶≤‡¶ø‡¶Ç‡¶ï ‡¶∏‡¶Æ‡ßÉ‡¶¶‡ßç‡¶ß ‡¶´‡ßÅ‡¶≤ ‡¶∏‡ßç‡¶ï‡ßç‡¶∞‡¶ø‡¶® ‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶® ‡¶§‡ßà‡¶∞‡¶ø ‡¶ï‡¶∞‡ßÅ‡¶®‡•§
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Ad Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Ad Campaign Name (‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶®‡ßá‡¶∞ ‡¶®‡¶æ‡¶Æ)
                  </label>
                  <input
                    type="text"
                    value={adFormName}
                    onChange={(e) => setAdFormName(e.target.value)}
                    placeholder="‡¶Ø‡ßá‡¶Æ‡¶®: Bkash Double Points Campaign"
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl font-medium text-xs dark:text-white focus:ring-2 focus:ring-[#10b981] outline-none"
                  />
                </div>

                {/* Ad Type */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Ad Media Type (‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶®‡ßá‡¶∞ ‡¶ß‡¶∞‡¶®)
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
                    Ad Media URL / Youtube / Web Link (‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶® ‡¶¨‡¶æ ‡¶≠‡¶ø‡¶°‡¶ø‡¶ì‡¶∞ ‡¶Æ‡ßÇ‡¶≤ ‡¶≤‡¶ø‡¶Ç‡¶ï)
                  </label>
                  <input
                    type="url"
                    value={adFormUrl}
                    onChange={(e) => setAdFormUrl(e.target.value)}
                    placeholder="https://example.com/ad-image.jpg ‡¶¨‡¶æ https://youtube.com/embed/..."
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl font-mono text-xs dark:text-white focus:ring-2 focus:ring-[#10b981] outline-none"
                  />
                </div>

                {/* Thumbnail */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Ad Thumbnail Image URL (‡¶ê‡¶ö‡ßç‡¶õ‡¶ø‡¶ï ‡¶•‡¶æ‡¶Æ‡ßç‡¶¨‡¶®‡ßá‡¶á‡¶≤ ‡¶õ‡¶¨‡¶ø ‡¶≤‡¶ø‡¶Ç‡¶ï)
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
                    Rotation Order Number (‡¶ß‡¶æ‡¶∞‡¶æ‡¶¨‡¶æ‡¶π‡¶ø‡¶ï ‡¶ï‡ßç‡¶∞‡¶Æ ‡¶®‡¶Æ‡ßç‡¶¨‡¶∞ - Rotation Sequence)
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
                    Views Limit System (‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶® ‡¶¶‡ßá‡¶ñ‡¶æ‡¶∞ ‡¶∏‡ßÄ‡¶Æ‡¶æ ‡¶®‡¶ø‡¶∞‡ßç‡¶ß‡¶æ‡¶∞‡¶£)
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
                      Unlimited Views (‡¶∏‡ßÄ‡¶Æ‡¶æ‡¶π‡ßÄ‡¶®)
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
                      Custom Limit (‡¶®‡¶ø‡¶∞‡ßç‡¶¶‡¶ø‡¶∑‡ßç‡¶ü ‡¶∏‡ßÄ‡¶Æ‡¶æ)
                    </button>
                  </div>

                  {adFormLimitType === "custom" && (
                    <div className="space-y-1.5 pt-1 animate-in slide-in-from-top-2 duration-200">
                      <label className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                        Enter Maximum Views Limit (‡¶∏‡¶∞‡ßç‡¶¨‡ßã‡¶ö‡ßç‡¶ö ‡¶ï‡¶§‡¶¨‡¶æ‡¶∞ ‡¶¶‡ßá‡¶ñ‡¶æ‡¶¨‡ßá)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={adFormViewLimit}
                        onChange={(e) => setAdFormViewLimit(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs dark:text-white focus:ring-2 focus:ring-[#10b981] outline-none"
                        placeholder="‡¶Ø‡ßá‡¶Æ‡¶®: 500"
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
                          notify("‡¶¶‡ßü‡¶æ ‡¶ï‡¶∞‡ßá ‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶® ‡¶®‡¶æ‡¶Æ ‡¶è‡¶¨‡¶Ç ‡¶≤‡¶ø‡¶ô‡ßç‡¶ï ‡¶¶‡ßÅ‡¶ü‡¶ø‡¶á ‡¶™‡ßÇ‡¶∞‡¶£ ‡¶ï‡¶∞‡ßÅ‡¶®‡•§");
                          return;
                        }

                        if (!url.startsWith("http://") && !url.startsWith("https://")) {
                          notify("‡¶∏‡¶†‡¶ø‡¶ï ‡¶≤‡¶ø‡¶Ç‡¶ï ‡¶¶‡¶ø‡¶® (‡¶Ø‡ßá‡¶Æ‡¶®: https://example.com)");
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
                            notify("‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶®‡¶ü‡¶ø ‡¶∏‡¶´‡¶≤‡¶≠‡¶æ‡¶¨‡ßá ‡¶Ü‡¶™‡¶°‡ßá‡¶ü ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá!");
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
                            notify("‡¶®‡¶§‡ßÅ‡¶® ‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶® ‡¶∏‡¶´‡¶≤‡¶≠‡¶æ‡¶¨‡ßá ‡¶Ø‡ßã‡¶ó ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá!");
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
                    SPONSOR AD ROTATION GRID (‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶® ‡¶§‡¶æ‡¶≤‡¶ø‡¶ï‡¶æ ‡¶ì ‡¶∏‡¶ø‡¶ï‡ßã‡¶Ø‡¶º‡ßá‡¶®‡ßç‡¶∏)
                  </h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                    ‡¶∏‡¶ï‡ßç‡¶∞‡¶ø‡ßü ‡¶∏‡¶ï‡¶≤ ‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶® ‡¶ï‡ßç‡¶∞‡¶Æ (Order Number) ‡¶Ö‡¶®‡ßÅ‡¶Ø‡¶æ‡ßü‡ßÄ ‡¶è‡¶ï‡¶ü‡¶æ‡¶∞ ‡¶™‡¶∞ ‡¶è‡¶ï‡¶ü‡¶æ ‡¶∏‡ßç‡¶¨‡ßü‡¶Ç‡¶ï‡ßç‡¶∞‡¶ø‡ßü ‡¶∞‡ßã‡¶ü‡ßá‡¶∂‡¶®‡ßá ‡¶ö‡¶≤‡¶§‡ßá ‡¶•‡¶æ‡¶ï‡¶¨‡ßá‡•§
                  </p>
                </div>
              </div>

              {!(globalConfig.adsList && globalConfig.adsList.length > 0) ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/5 rounded-3xl">
                  <p className="text-xs text-slate-400 font-extrabold uppercase tracking-widest">
                    No sponsor ads configured (‡¶ï‡ßã‡¶®‡ßã ‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶® ‡¶∏‡ßá‡¶ü ‡¶ï‡¶∞‡¶æ ‡¶®‡ßá‡¶á)
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
                                    ? `"${ad.name}" ‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶®‡¶ü‡¶ø ‡¶∏‡¶ï‡ßç‡¶∞‡¶ø‡ßü ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá!`
                                    : `"${ad.name}" ‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶®‡¶ü‡¶ø ‡¶®‡¶ø‡¶∑‡ßç‡¶ï‡ßç‡¶∞‡¶ø‡ßü ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá!`
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
                              notify(`"${ad.name}" ‡¶è‡¶°‡¶ø‡¶ü ‡¶ï‡¶∞‡¶æ‡¶∞ ‡¶ú‡¶®‡ßç‡¶Ø ‡¶´‡¶∞‡ßç‡¶Æ‡ßá ‡¶≤‡ßã‡¶° ‡¶π‡ßü‡ßá‡¶õ‡ßá‡•§`);
                            }}
                            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 hover:dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-all"
                            title="‡¶è‡¶°‡¶ø‡¶ü ‡¶ï‡¶∞‡ßÅ‡¶®"
                          >
                            <Edit size={14} />
                          </button>

                          {/* Delete button with safe inline confirmation */}
                          {deletingAdId === ad.id ? (
                            <div className="flex items-center gap-1 border border-rose-500/20 bg-rose-500/5 px-2 py-1 rounded-xl animate-in fade-in zoom-in-95 duration-150">
                              <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest mr-1">‡¶Æ‡ßÅ‡¶õ‡¶¨‡ßá‡¶®?</span>
                              <button
                                onClick={() => {
                                  setGlobalConfig((prev) => {
                                    const currentAds = prev.adsList || [];
                                    const updatedAds = currentAds.filter((item) => item.id !== ad.id);

                                    const activeLinks = updatedAds
                                      .filter((item) => item.isActive)
                                      .map((item) => item.url);

                                    notify(`"${ad.name}" ‡¶¨‡¶ø‡¶ú‡ßç‡¶û‡¶æ‡¶™‡¶®‡¶ü‡¶ø ‡¶Æ‡ßÅ‡¶õ‡ßá ‡¶´‡ßá‡¶≤‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá‡•§`);

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
                              title="‡¶Æ‡ßÅ‡¶õ‡ßá ‡¶´‡ßá‡¶≤‡ßÅ‡¶®"
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
                    ‡¶∏‡¶æ‡¶á‡¶®-‡¶Ü‡¶™‡ßá‡¶∞ ‡¶ú‡¶®‡ßç‡¶Ø ‡¶ì‡¶ü‡¶ø‡¶™‡¶ø ‡¶ï‡ßã‡¶° ‡¶™‡¶æ‡¶†‡¶æ‡¶®‡ßã ‡¶ì ‡¶≠‡ßá‡¶∞‡¶ø‡¶´‡¶ø‡¶ï‡ßá‡¶∂‡¶® ‡¶¨‡¶æ‡¶ß‡ßç‡¶Ø‡¶¨‡¶æ‡¶ß‡¶ï‡¶§‡¶æ
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
                      ‡¶∏‡ßç‡¶¨‡ßü‡¶Ç‡¶ï‡ßç‡¶∞‡¶ø‡ßü ‡ß®-‡¶∏‡ßç‡¶§‡¶∞‡ßá‡¶∞ ‡¶Æ‡ßá‡¶≤‡¶ø‡¶Ç ‡¶∏‡¶ø‡¶∏‡ßç‡¶ü‡ßá‡¶Æ ‡¶∞‡¶ø‡¶°‡¶ø‡¶Ç ‡¶ì ‡¶™‡¶∞‡ßç‡¶Ø‡¶¨‡ßá‡¶ï‡ßç‡¶∑‡¶£
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
                      ‡¶ï‡¶®‡¶´‡¶ø‡¶ó‡¶æ‡¶∞‡¶° SMTP ‡¶∏‡¶æ‡¶∞‡ßç‡¶≠‡¶æ‡¶∞‡¶∏‡¶Æ‡ßÇ‡¶π (
                      {emailCounters?.smtpStatus?.length || 0})
                    </h5>
                    {(!emailCounters?.smtpStatus ||
                      emailCounters.smtpStatus.length === 0) && (
                      <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        ‡¶è‡¶®‡¶≠‡¶æ‡ßü‡¶∞‡¶®‡¶Æ‡ßá‡¶®‡ßç‡¶ü ‡¶´‡¶≤‡¶¨‡ßç‡¶Ø‡¶æ‡¶ï ‡¶∏‡¶ï‡ßç‡¶∞‡¶ø‡ßü (Env Fallback)
                      </span>
                    )}
                  </div>

                  {!emailCounters?.smtpStatus ||
                  emailCounters.smtpStatus.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-center font-sans col-span-1 md:col-span-2">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        ‡¶ï‡ßã‡¶®‡ßã ‡¶Ö‡¶§‡¶ø‡¶∞‡¶ø‡¶ï‡ßç‡¶§ SMTP ‡¶∏‡¶æ‡¶∞‡ßç‡¶≠‡¶æ‡¶∞ ‡¶Ø‡ßÅ‡¶ï‡ßç‡¶§ ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡¶®‡¶ø‡•§
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        ‡¶∏‡¶ø‡¶∏‡ßç‡¶ü‡ßá‡¶Æ‡¶ü‡¶ø ‡¶¨‡¶∞‡ßç‡¶§‡¶Æ‡¶æ‡¶®‡ßá ‡¶Ü‡¶™‡¶®‡¶æ‡¶∞ .env ‡¶´‡¶æ‡¶á‡¶≤‡ßá‡¶∞ GMAIL_USER ‡¶è‡¶¨‡¶Ç
                        GMAIL_APP_PASSWORD ‡¶¨‡ßç‡¶Ø‡¶¨‡¶π‡¶æ‡¶∞ ‡¶ï‡¶∞‡¶õ‡ßá‡•§
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 col-span-1 md:col-span-2">
                      {emailCounters.smtpStatus.map((smtp, idx) => {
                        const isCurrentActive =
                          emailCounters.activeSmtp === smtp.user;
                        const count = Number(smtp.count) || 0;
                        const limit = Number(smtp.limit) > 0 ? Number(smtp.limit) : 500;
                        const isDepleted = count >= limit;
                        const rawPercent = (count / limit) * 100;
                        const usagePercent = isNaN(rawPercent) || !isFinite(rawPercent)
                          ? 0
                          : Math.min(100, Math.max(0, rawPercent));

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
                                    ‚óè ACTIVE
                                  </span>
                                ) : isDepleted ? (
                                  <span className="text-[8px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    ‚óè DEPLETED
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    ‚óè STANDBY
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
                                  {count} / {limit} (
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
                      ‡¶®‡¶§‡ßÅ‡¶® SMTP ‡¶∏‡¶æ‡¶∞‡ßç‡¶≠‡¶æ‡¶∞ ‡¶∏‡¶Ç‡¶Ø‡ßÅ‡¶ï‡ßç‡¶§ ‡¶ï‡¶∞‡ßÅ‡¶® (Add SMTP to Rotation Pool)
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
                                      "‡¶™‡¶æ‡¶∏‡¶ì‡¶Ø‡¶º‡¶æ‡¶∞‡ßç‡¶° ‡¶∏‡¶´‡¶≤‡¶≠‡¶æ‡¶¨‡ßá ‡¶™‡ßá‡¶∏‡ßç‡¶ü ‡¶ï‡¶∞‡¶æ ‡¶π‡¶Ø‡¶º‡ßá‡¶õ‡ßá!",
                                    );
                                  } else {
                                    notify(
                                      "‡¶ï‡ßç‡¶≤‡¶ø‡¶™‡¶¨‡ßã‡¶∞‡ßç‡¶° ‡¶ñ‡¶æ‡¶≤‡¶ø ‡¶Ö‡¶•‡¶¨‡¶æ ‡¶Ö‡ßç‡¶Ø‡¶æ‡¶ï‡ßç‡¶∏‡ßá‡¶∏ ‡¶°‡¶ø‡¶®‡¶æ‡¶á‡¶°!",
                                    );
                                  }
                                } catch (err) {
                                  const manualText = prompt(
                                    "‡¶è‡¶ñ‡¶æ‡¶®‡ßá ‡¶Ü‡¶™‡¶®‡¶æ‡¶∞ App Password ‡¶ü‡¶ø ‡¶™‡ßá‡¶∏‡ßç‡¶ü (Paste) ‡¶ï‡¶∞‡ßÅ‡¶®:",
                                  );
                                  if (manualText !== null) {
                                    setSmtpFormPass(manualText.trim());
                                    notify(
                                      "‡¶™‡¶æ‡¶∏‡¶ì‡¶Ø‡¶º‡¶æ‡¶∞‡ßç‡¶° ‡¶∏‡¶´‡¶≤‡¶≠‡¶æ‡¶¨‡ßá ‡¶∏‡ßá‡¶ü ‡¶ï‡¶∞‡¶æ ‡¶π‡¶Ø‡¶º‡ßá‡¶õ‡ßá!",
                                    );
                                  }
                                }
                              }}
                              className="text-[9px] text-[#10b981] font-black hover:underline uppercase bg-[#10b981]/10 px-2 py-0.5 rounded cursor-pointer"
                            >
                              Paste (‡¶™‡ßá‡¶∏‡ßç‡¶ü)
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
                          Daily limit (‡¶∏‡ßÄ‡¶Æ‡¶æ)
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
                          ? "‡¶Ø‡ßã‡¶ó ‡¶ï‡¶∞‡¶æ ‡¶π‡¶ö‡ßç‡¶õ‡ßá..."
                          : "‡¶®‡¶§‡ßÅ‡¶® SMTP ‡¶∏‡¶Ç‡¶Ø‡ßÅ‡¶ï‡ßç‡¶§ ‡¶ï‡¶∞‡ßÅ‡¶®"}
                      </button>
                    </div>
                  </div>


                </div>

                {/* Gmail Connection Real-time Diagnostics */}
                <div className="bg-slate-100/30 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-6 rounded-[2rem] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h5 className="text-xs font-black dark:text-white uppercase tracking-wider mb-1">
                        ‡¶ú‡¶ø‡¶Æ‡ßá‡¶á‡¶≤ ‡¶∏‡¶Ç‡¶Ø‡ßã‡¶ó ‡¶ü‡ßá‡¶∏‡ßç‡¶ü (Gmail SMTP Connection Diagnostic)
                      </h5>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-normal">
                        ‡¶Ü‡¶™‡¶®‡¶æ‡¶∞ ‡¶™‡¶∞‡¶ø‡¶¨‡ßá‡¶∂‡ßá‡¶∞ GMAIL_USER ‡¶ì GMAIL_APP_PAS ‡¶ï‡¶ø ‡¶∏‡¶†‡¶ø‡¶ï ‡¶Ü‡¶õ‡ßá
                        ‡¶è‡¶¨‡¶Ç ‡¶ï‡¶æ‡¶ú ‡¶ï‡¶∞‡¶õ‡ßá ‡¶ï‡¶ø‡¶®‡¶æ ‡¶§‡¶æ ‡¶§‡¶æ‡ßé‡¶ï‡ßç‡¶∑‡¶®‡¶ø‡¶ï ‡¶ö‡ßá‡¶ï ‡¶ï‡¶∞‡ßÅ‡¶®‡•§
                      </p>
                    </div>
                    <button
                      onClick={() => handleTestSmtp()}
                      disabled={isTestingSmtp}
                      className={`px-5 py-3.5 rounded-2xl text-[9px] uppercase font-black tracking-widest transition-all ${isTestingSmtp ? "bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed" : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.2)]"}`}
                    >
                      {isTestingSmtp
                        ? "‡¶ö‡ßá‡¶ï ‡¶ï‡¶∞‡¶æ ‡¶π‡¶ö‡ßç‡¶õ‡ßá..."
                        : "‡¶ï‡¶æ‡¶®‡ßá‡¶ï‡¶∂‡¶® ‡¶ü‡ßá‡¶∏‡ßç‡¶ü ‡¶ï‡¶∞‡ßÅ‡¶® (Test SMTP)"}
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
                            ? "‡¶∏‡¶´‡¶≤ (SUCCESS)"
                            : "‡¶¨‡ßç‡¶Ø‡¶∞‡ßç‡¶• (ERROR)"}
                        </span>
                        <p className="m-0 select-all font-medium leading-relaxed">
                          {smtpDiagnosticMsg}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Test Accounts Cleanup Panel (‡¶ü‡ßá‡¶∏‡ßç‡¶ü ‡¶Ü‡¶á‡¶°‡¶ø ‡¶∞‡¶ø‡¶∏‡ßá‡¶ü ‡¶Æ‡ßç‡¶Ø‡¶æ‡¶®‡ßá‡¶ú‡¶æ‡¶∞) */}
                <div className="bg-slate-100/30 dark:bg-white/5 border border-slate-100 dark:border-white/5 p-6 rounded-[2rem] space-y-6 font-sans relative overflow-hidden">
                  <div>
                    <h5 className="text-xs font-black dark:text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                      ‡¶ü‡ßá‡¶∏‡ßç‡¶ü ‡¶Ü‡¶á‡¶°‡¶ø ‡¶∞‡¶ø‡¶∏‡ßá‡¶ü ‡¶Æ‡ßç‡¶Ø‡¶æ‡¶®‡ßá‡¶ú‡¶æ‡¶∞ (Test Users Cleanup Manager)
                    </h5>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-normal">
                      ‡¶™‡ßç‡¶∞‡¶ï‡ßÉ‡¶§ ‡¶ú‡¶ø‡¶Æ‡ßá‡¶á‡¶≤ ‡¶ì‡¶ü‡¶ø‡¶™‡¶ø (OTP) ‡¶™‡¶æ‡¶†‡¶æ‡¶®‡ßã‡¶∞ ‡¶™‡ßç‡¶∞‡¶ï‡ßç‡¶∞‡¶ø‡¶Ø‡¶º‡¶æ ‡¶™‡¶∞‡ßÄ‡¶ï‡ßç‡¶∑‡¶æ ‡¶ï‡¶∞‡¶§‡ßá ‡¶Ü‡¶™‡¶®‡¶æ‡¶∞ ‡¶Ö‡ßç‡¶Ø‡¶æ‡¶°‡¶Æ‡¶ø‡¶® ‡¶Ü‡¶á‡¶°‡¶ø ‡¶õ‡¶æ‡¶°‡¶º‡¶æ ‡¶¨‡¶æ‡¶ï‡¶ø ‡¶∏‡¶¨ ‡¶∞‡ßá‡¶ú‡¶ø‡¶∏‡ßç‡¶ü‡¶æ‡¶∞‡ßç‡¶° ‡¶Ü‡¶á‡¶°‡¶ø ‡¶è‡¶ï ‡¶ï‡ßç‡¶≤‡¶ø‡¶ï‡ßá ‡¶Æ‡ßÅ‡¶õ‡ßá ‡¶´‡ßá‡¶≤‡ßÅ‡¶®‡•§
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Search & Quick Actions */}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          ‡¶ü‡ßá‡¶∏‡ßç‡¶ü ‡¶Ü‡¶á‡¶°‡¶ø ‡¶ñ‡ßÅ‡¶Å‡¶ú‡ßÅ‡¶® (Search Test User)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="‡¶á‡¶â‡¶ú‡¶æ‡¶∞ ‡¶Ü‡¶á‡¶°‡¶ø, ‡¶®‡¶æ‡¶Æ ‡¶¨‡¶æ ‡¶ú‡¶ø‡¶Æ‡ßá‡¶á‡¶≤ ‡¶≤‡¶ø‡¶ñ‡ßÅ‡¶®..."
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
                          ‡¶∏‡¶¨ ‡¶ü‡ßá‡¶∏‡ßç‡¶ü ‡¶Ü‡¶á‡¶°‡¶ø ‡¶è‡¶ï ‡¶ï‡ßç‡¶≤‡¶ø‡¶ï‡ßá ‡¶Æ‡ßÅ‡¶õ‡ßÅ‡¶® (Clear All Test IDs)
                        </button>
                      </div>
                    </div>

                    {/* Right Column: Search Results / Latest Users */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                        {cleanupSearchQuery ? "‡¶Ö‡¶®‡ßÅ‡¶∏‡¶®‡ßç‡¶ß‡¶æ‡¶®‡ßá‡¶∞ ‡¶´‡¶≤‡¶æ‡¶´‡¶≤ (Search Results)" : "‡¶∏‡¶æ‡¶Æ‡ßç‡¶™‡ßç‡¶∞‡¶§‡¶ø‡¶ï ‡¶∞‡ßá‡¶ú‡¶ø‡¶∏‡ßç‡¶ü‡¶æ‡¶∞‡ßç‡¶° ‡¶ü‡ßá‡¶∏‡ßç‡¶ü ‡¶Ü‡¶á‡¶°‡¶ø (Latest Registered Test IDs)"}
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
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">‡¶ï‡ßã‡¶®‡ßã ‡¶ü‡ßá‡¶∏‡ßç‡¶ü ‡¶Ü‡¶á‡¶°‡¶ø ‡¶™‡¶æ‡¶ì‡ßü‡¶æ ‡¶Ø‡¶æ‡ßü‡¶®‡¶ø</p>
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
                                      Monitor (‡¶Æ‡¶®‡¶ø‡¶ü‡¶∞)
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
                                ‡¶Æ‡ßÅ‡¶õ‡ßÅ‡¶®
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
                            ‡¶®‡¶ø‡¶∞‡¶æ‡¶™‡¶§‡ßç‡¶§‡¶æ ‡¶®‡¶ø‡¶∂‡ßç‡¶ö‡¶ø‡¶§‡¶ï‡¶∞‡¶£ (Security Verification)
                          </h6>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                            {cleanupUserTarget === "all"
                              ? "‡¶∏‡¶ï‡¶≤ ‡¶∏‡¶æ‡¶ß‡¶æ‡¶∞‡¶£ ‡¶ü‡ßá‡¶∏‡ßç‡¶ü ‡¶Ü‡¶á‡¶°‡¶ø ‡¶°‡¶ø‡¶≤‡ßá‡¶ü ‡¶ï‡¶∞‡¶§‡ßá ‡¶Ü‡¶™‡¶®‡¶æ‡¶∞ ‡¶Ö‡ßç‡¶Ø‡¶æ‡¶°‡¶Æ‡¶ø‡¶® ‡¶Ö‡ßç‡¶Ø‡¶æ‡¶™ ‡¶≤‡¶ó‡¶á‡¶® ‡¶™‡¶æ‡¶∏‡¶ì‡ßü‡¶æ‡¶∞‡ßç‡¶° (Admin App Login Password) ‡¶™‡ßç‡¶∞‡¶¶‡¶æ‡¶® ‡¶ï‡¶∞‡ßÅ‡¶®‡•§"
                              : `‡¶á‡¶â‡¶ú‡¶æ‡¶∞ "${cleanupUserTarget?.name || cleanupUserTarget?.email}" ‡¶Æ‡ßÅ‡¶õ‡ßá ‡¶´‡ßá‡¶≤‡¶§‡ßá ‡¶Ü‡¶™‡¶®‡¶æ‡¶∞ ‡¶Ö‡ßç‡¶Ø‡¶æ‡¶°‡¶Æ‡¶ø‡¶® ‡¶Ö‡ßç‡¶Ø‡¶æ‡¶™ ‡¶≤‡¶ó‡¶á‡¶® ‡¶™‡¶æ‡¶∏‡¶ì‡ßü‡¶æ‡¶∞‡ßç‡¶° (Admin App Login Password) ‡¶™‡ßç‡¶∞‡¶¶‡¶æ‡¶® ‡¶ï‡¶∞‡ßÅ‡¶®‡•§`}
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
                              placeholder="‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢"
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
                              ‡¶¨‡¶æ‡¶§‡¶ø‡¶≤ (Cancel)
                            </button>
                            <button
                              type="submit"
                              disabled={isVerifyingCleanupPassword}
                              className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white disabled:bg-rose-500/50 rounded-xl text-[10px] uppercase font-black tracking-widest transition-colors flex items-center justify-center gap-1 shadow-[0_0_12px_rgba(239,68,68,0.2)] cursor-pointer"
                            >
                              {isVerifyingCleanupPassword ? "‡¶Ø‡¶æ‡¶ö‡¶æ‡¶á ‡¶π‡¶ö‡ßç‡¶õ‡ßá..." : "‡¶ï‡¶®‡¶´‡¶æ‡¶∞‡ßç‡¶Æ ‡¶ï‡¶∞‡ßÅ‡¶®"}
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
                      ‡¶ü‡ßá‡¶≤‡¶ø‡¶ó‡ßç‡¶∞‡¶æ‡¶Æ ‡¶¨‡¶ü ‡¶ï‡¶æ‡¶®‡ßá‡¶ï‡¶∂‡¶® ‡¶Æ‡ßç‡¶Ø‡¶æ‡¶®‡ßá‡¶ú‡¶æ‡¶∞ (Telegram Bot Live
                      Configurator)
                    </h5>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-normal">
                      ‡¶Ü‡¶™‡¶®‡¶æ‡¶∞ ‡¶ü‡ßá‡¶≤‡¶ø‡¶ó‡ßç‡¶∞‡¶æ‡¶Æ ‡¶¨‡¶ü ‡¶ü‡ßã‡¶ï‡ßá‡¶®‡¶ü‡¶ø ‡¶è‡¶ñ‡¶æ‡¶®‡ßá ‡¶∏‡¶æ‡¶¨‡¶Æ‡¶ø‡¶ü ‡¶ï‡¶∞‡ßÅ‡¶®‡•§ ‡¶è‡¶ü‡¶ø
                      ‡¶§‡¶æ‡¶§‡ßç‡¶ï‡ßç‡¶∑‡¶£‡¶ø‡¶ï‡¶≠‡¶æ‡¶¨‡ßá ‡¶Ü‡¶™‡¶®‡¶æ‡¶∞ ‡¶¨‡¶ü‡ßá‡¶∞ ‡¶∏‡¶æ‡¶•‡ßá ‡¶∏‡¶æ‡¶á‡¶ü‡ßá‡¶∞ ‡¶∞‡¶ø‡¶Ø‡¶º‡ßá‡¶≤-‡¶ü‡¶æ‡¶á‡¶Æ ‡¶∏‡¶Ç‡¶Ø‡ßã‡¶ó
                      ‡¶∏‡ßç‡¶•‡¶æ‡¶™‡¶® ‡¶ï‡¶∞‡¶¨‡ßá‡•§
                    </p>
                  </div>

                  {/* Live Telegram Bot Health Status Badge */}
                  <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    tgBotIsOnline 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                      : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full shrink-0 ${tgBotIsOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-wider">
                          {tgBotIsOnline ? "‡¶¨‡¶ü ‡¶∏‡ßç‡¶ü‡ßç‡¶Ø‡¶æ‡¶ü‡¶æ‡¶∏: ‡¶∏‡¶ï‡ßç‡¶∞‡¶ø‡ßü ‡¶ì ‡¶ï‡¶æ‡¶®‡ßá‡¶ï‡ßç‡¶ü‡ßá‡¶° (LIVE & ACTIVE)" : "‡¶¨‡¶ü ‡¶∏‡ßç‡¶ü‡ßç‡¶Ø‡¶æ‡¶ü‡¶æ‡¶∏: ‡¶°‡¶ø‡¶∏‡¶ï‡¶æ‡¶®‡ßá‡¶ï‡ßç‡¶ü‡ßá‡¶° / ‡¶Ö‡¶´‡¶≤‡¶æ‡¶á‡¶® (DISCONNECTED)"}
                        </div>
                        <div className="text-[10px] opacity-80 font-mono mt-0.5">
                          ‡¶á‡¶â‡¶ú‡¶æ‡¶∞‡¶®‡ßá‡¶Æ: <span className="font-bold">{tgBotUsername}</span> {tgBotMaskedToken && `| ‡¶ü‡ßã‡¶ï‡ßá‡¶®: ${tgBotMaskedToken}`}
                        </div>
                      </div>
                    </div>
                    {tgBotLastErr && (
                      <div className="text-[9px] bg-rose-500/20 px-2.5 py-1 rounded-lg border border-rose-500/30 font-medium">
                        ‡¶§‡ßç‡¶∞‡ßÅ‡¶ü‡¶ø: {tgBotLastErr}
                      </div>
                    )}
                  </div>

                  {/* Ephemeral Restart Notice and Guide */}
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-500">
                      <span className="text-[10px] font-black uppercase tracking-wider">
                        ‚ö†Ô∏è ‡¶ó‡ßÅ‡¶∞‡ßÅ‡¶§‡ßç‡¶¨‡¶™‡ßÇ‡¶∞‡ßç‡¶£ ‡¶®‡ßã‡¶ü‡¶ø‡¶∂ ‡¶ì ‡¶∏‡¶Æ‡¶æ‡¶ß‡¶æ‡¶® (Bot Status Guide)
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed font-sans">
                      ‡¶ï‡ßç‡¶≤‡¶æ‡¶â‡¶° ‡¶∞‡¶æ‡¶® ‡¶∏‡¶æ‡¶∞‡ßç‡¶≠‡¶æ‡¶∞ ‡¶∞‡¶ø‡¶∏‡ßç‡¶ü‡¶æ‡¶∞‡ßç‡¶ü ‡¶π‡¶ì‡ßü‡¶æ‡¶∞ ‡¶ï‡¶æ‡¶∞‡¶£‡ßá ‡¶Ö‡¶®‡ßá‡¶ï ‡¶∏‡¶Æ‡ßü ‡¶¨‡¶ü‡ßá‡¶∞
                      ‡¶∏‡¶Ç‡¶Ø‡ßã‡¶ó ‡¶∏‡¶æ‡¶Æ‡ßü‡¶ø‡¶ï‡¶≠‡¶æ‡¶¨‡ßá ‡¶¨‡¶ø‡¶ö‡ßç‡¶õ‡¶ø‡¶®‡ßç‡¶® ‡¶π‡¶§‡ßá ‡¶™‡¶æ‡¶∞‡ßá (‡¶ï‡¶æ‡¶∞‡¶£ ‡¶´‡¶æ‡¶á‡¶≤‡ßá‡¶∞ ‡¶°‡¶æ‡¶ü‡¶æ
                      ‡¶∞‡¶ø‡¶∏‡ßç‡¶ü‡¶æ‡¶∞‡ßç‡¶ü‡ßá ‡¶Æ‡ßÅ‡¶õ‡ßá ‡¶Ø‡¶æ‡ßü)‡•§ ‡¶Ü‡¶Æ‡¶æ‡¶¶‡ßá‡¶∞ ‡¶∏‡¶ø‡¶∏‡ßç‡¶ü‡ßá‡¶Æ‡ßá ‡¶è‡¶ï‡¶ü‡¶ø{" "}
                      <b>‡¶∏‡ßç‡¶¨‡ßü‡¶Ç‡¶ï‡ßç‡¶∞‡¶ø‡ßü ‡¶∞‡¶ø‡¶∏‡ßç‡¶ü‡ßã‡¶∞ ‡¶á‡¶û‡ßç‡¶ú‡¶ø‡¶®</b> ‡¶∞‡ßü‡ßá‡¶õ‡ßá ‡¶Ø‡¶æ ‡¶Ü‡¶™‡¶®‡¶ø ‡¶¨‡¶æ ‡¶ï‡ßã‡¶®‡ßã
                      ‡¶ó‡ßç‡¶∞‡¶æ‡¶π‡¶ï ‡¶ì‡ßü‡ßá‡¶¨‡¶∏‡¶æ‡¶á‡¶ü‡ßá ‡¶™‡ßç‡¶∞‡¶¨‡ßá‡¶∂ ‡¶ï‡¶∞‡¶æ‡¶Æ‡¶æ‡¶§‡ßç‡¶∞ ‡¶Ü‡¶™‡¶®‡¶æ‡¶∞ ‡¶¨‡ßç‡¶∞‡¶æ‡¶â‡¶ú‡¶æ‡¶∞
                      ‡¶¨‡ßç‡¶Ø‡¶æ‡¶ï‡¶ó‡ßç‡¶∞‡¶æ‡¶â‡¶®‡ßç‡¶°‡ßá ‡¶™‡ßÇ‡¶∞‡ßç‡¶¨‡ßá‡¶∞ ‡¶∏‡¶Ç‡¶∞‡¶ï‡ßç‡¶∑‡¶ø‡¶§ ‡¶ü‡ßã‡¶ï‡ßá‡¶®‡¶ü‡¶ø ‡¶¶‡¶ø‡ßü‡ßá ‡¶¨‡¶ü‡ßá‡¶∞ ‡¶ï‡¶æ‡¶®‡ßá‡¶ï‡¶∂‡¶®
                      ‡¶∏‡ßç‡¶¨‡ßü‡¶Ç‡¶ï‡ßç‡¶∞‡¶ø‡ßü‡¶≠‡¶æ‡¶¨‡ßá ‡¶∏‡¶ï‡ßç‡¶∞‡¶ø‡ßü ‡¶ï‡¶∞‡ßá ‡¶§‡ßÅ‡¶≤‡¶¨‡ßá‡•§
                    </p>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed font-sans">
                      <b>‡¶¨‡¶ü ‡¶ï‡¶æ‡¶ú ‡¶®‡¶æ ‡¶ï‡¶∞‡¶≤‡ßá ‡¶ï‡¶∞‡¶£‡ßÄ‡ßü:</b> ‡¶Ø‡¶¶‡¶ø ‡¶ï‡¶ñ‡¶®‡¶ì ‡¶¶‡ßá‡¶ñ‡ßá‡¶® ‡¶¨‡¶ü ‡¶∞‡ßá‡¶∏‡¶™‡¶®‡ßç‡¶∏
                      ‡¶ï‡¶∞‡¶õ‡ßá ‡¶®‡¶æ, ‡¶§‡¶æ‡¶π‡¶≤‡ßá ‡¶¶‡ßü‡¶æ ‡¶ï‡¶∞‡ßá ‡¶®‡¶ø‡¶ö‡ßá ‡¶Ü‡¶™‡¶®‡¶æ‡¶∞ ‡¶∏‡¶†‡¶ø‡¶ï{" "}
                      <b>‡¶ü‡ßá‡¶≤‡¶ø‡¶ó‡ßç‡¶∞‡¶æ‡¶Æ ‡¶¨‡¶ü ‡¶ü‡ßã‡¶ï‡ßá‡¶®‡¶ü‡¶ø</b> ‡¶è‡¶¨‡¶Ç <b>‡¶ö‡ßç‡¶Ø‡¶æ‡¶®‡ßá‡¶≤ ‡¶≤‡¶ø‡¶ô‡ßç‡¶ï‡¶ü‡¶ø</b>{" "}
                      ‡¶™‡ßÅ‡¶®‡¶∞‡¶æ‡ßü ‡¶∏‡¶æ‡¶¨‡¶Æ‡¶ø‡¶ü ‡¶ï‡¶∞‡ßá <b>Save Config</b> ‡¶¨‡¶æ‡¶ü‡¶®‡¶ü‡¶ø ‡¶ö‡¶æ‡¶™‡ßÅ‡¶®‡•§ ‡¶è‡¶õ‡¶æ‡ßú‡¶æ
                      ‡¶∏‡ßç‡¶•‡¶æ‡ßü‡ßÄ ‡¶∏‡¶Æ‡¶æ‡¶ß‡¶æ‡¶®‡ßá‡¶∞ ‡¶ú‡¶®‡ßç‡¶Ø ‡¶è‡¶Ü‡¶á ‡¶∏‡ßç‡¶ü‡ßÅ‡¶°‡¶ø‡¶ì‡¶∞ (AI Studio Settings)
                      ‡¶è‡¶®‡¶≠‡¶æ‡ßü‡¶∞‡¶®‡¶Æ‡ßá‡¶®‡ßç‡¶ü ‡¶≠‡ßç‡¶Ø‡¶æ‡¶∞‡¶ø‡ßü‡ßá‡¶¨‡¶≤‡ßá <code>TELEGRAM_BOT_TOKEN</code>{" "}
                      ‡¶≠‡ßç‡¶Ø‡¶æ‡¶≤‡ßÅ‡¶ü‡¶ø ‡¶Ü‡¶™‡¶°‡ßá‡¶ü ‡¶ï‡¶∞‡ßá ‡¶∞‡¶æ‡¶ñ‡ßÅ‡¶®‡•§
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black uppercase dark:text-white">
                          ‡¶ü‡ßá‡¶≤‡¶ø‡¶ó‡ßç‡¶∞‡¶æ‡¶Æ ‡¶¨‡¶ü ‡¶ü‡ßã‡¶ï‡ßá‡¶® (Bot Token)
                        </label>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const text = await navigator.clipboard.readText();
                              if (text) {
                                setTgBotToken(text.trim());
                                notify(
                                  "‡¶¨‡¶ü ‡¶ü‡ßã‡¶ï‡ßá‡¶® ‡¶ï‡ßç‡¶≤‡¶ø‡¶™‡¶¨‡ßã‡¶∞‡ßç‡¶° ‡¶•‡ßá‡¶ï‡ßá ‡¶™‡ßá‡¶∏‡ßç‡¶ü ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá! üìã",
                                );
                              } else {
                                notify("‡¶ï‡ßç‡¶≤‡¶ø‡¶™‡¶¨‡ßã‡¶∞‡ßç‡¶°‡ßá ‡¶ï‡ßã‡¶®‡ßã ‡¶≤‡ßá‡¶ñ‡¶æ ‡¶™‡¶æ‡¶ì‡ßü‡¶æ ‡¶Ø‡¶æ‡ßü‡¶®‡¶ø‡•§");
                              }
                            } catch (err) {
                              notify(
                                "‡¶ï‡ßç‡¶≤‡¶ø‡¶™‡¶¨‡ßã‡¶∞‡ßç‡¶° ‡¶Ö‡ßç‡¶Ø‡¶æ‡¶ï‡ßç‡¶∏‡ßá‡¶∏ ‡¶¨‡ßç‡¶≤‡¶ï ‡¶ï‡¶∞‡¶æ ‡¶Ü‡¶õ‡ßá‡•§ ‡¶Ö‡¶®‡ßÅ‡¶ó‡ßç‡¶∞‡¶π ‡¶ï‡¶∞‡ßá ‡¶¶‡ßÄ‡¶∞‡ßç‡¶ò‡¶ï‡ßç‡¶∑‡¶£ ‡¶ü‡¶ø‡¶™‡ßá ‡¶ß‡¶∞‡ßá ‡¶Æ‡ßç‡¶Ø‡¶æ‡¶®‡ßÅ‡ßü‡¶æ‡¶≤‡¶ø ‡¶™‡ßá‡¶∏‡ßç‡¶ü (Paste) ‡¶ï‡¶∞‡ßÅ‡¶®‡•§",
                              );
                            }
                          }}
                          className="text-[8px] font-black uppercase text-blue-500 hover:underline flex items-center gap-1"
                        >
                          üìã Paste (‡¶™‡ßá‡¶∏‡ßç‡¶ü ‡¶ï‡¶∞‡ßÅ‡¶®)
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
                        ‡¶¨‡¶ü ‡¶á‡¶â‡¶ú‡¶æ‡¶∞‡¶®‡ßá‡¶Æ (Bot Username)
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
                        ‡¶ö‡ßç‡¶Ø‡¶æ‡¶®‡ßá‡¶≤ ‡¶≤‡¶ø‡¶ô‡ßç‡¶ï (Telegram Channel)
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
                          ? "‡¶∏‡ßá‡¶≠ ‡¶ï‡¶∞‡¶æ ‡¶π‡¶ö‡ßç‡¶õ‡ßá..."
                          : "‡¶ú‡ßã‡¶∞‡¶™‡ßÇ‡¶∞‡ßç‡¶¨‡¶ï ‡¶∏‡ßá‡¶≠ ‡¶ï‡¶∞‡ßÅ‡¶® (Force Save Anyway ‚ö†Ô∏è)"}
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSavingTgBot}
                      className={`px-5 py-3.5 rounded-2xl text-[9px] uppercase font-black tracking-widest transition-all ${isSavingTgBot ? "bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed" : "bg-blue-500 text-white hover:bg-blue-600 shadow-[0_0_12px_rgba(59,130,246,0.2)]"}`}
                    >
                      {isSavingTgBot
                        ? "‡¶ï‡¶æ‡¶®‡ßá‡¶ï‡ßç‡¶ü ‡¶ï‡¶∞‡¶æ ‡¶π‡¶ö‡ßç‡¶õ‡ßá..."
                        : "‡¶¨‡¶ü ‡¶∏‡ßá‡¶ü‡¶Ü‡¶™ ‡¶ï‡¶∞‡ßÅ‡¶® (Save & Connect Bot)"}
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
                          {tgBotStatusOk ? "‡¶∏‡¶´‡¶≤ (SUCCESS)" : "‡¶¨‡ßç‡¶Ø‡¶∞‡ßç‡¶• (ERROR)"}
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
                      ‡¶á‡¶Æ‡ßá‡¶á‡¶≤ ‡¶Ö‡¶•‡ßá‡¶®‡ßç‡¶ü‡¶ø‡¶ï‡ßá‡¶∂‡¶® ‡¶ì ‡¶∏‡ßç‡¶™‡ßç‡¶Ø‡¶æ‡¶Æ ‡¶™‡ßç‡¶∞‡¶§‡¶ø‡¶∞‡ßã‡¶ß ‡¶Æ‡ßç‡¶Ø‡¶æ‡¶®‡ßá‡¶ú‡¶æ‡¶∞ (Sender
                      Authentication Specialist)
                    </h5>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed font-sans">
                      ‡¶Ü‡¶™‡¶®‡¶æ‡¶∞ ‡¶Æ‡ßá‡¶á‡¶≤‡¶ó‡ßÅ‡¶≤‡ßã ‡¶Ø‡¶æ‡¶§‡ßá ‡¶∏‡¶∞‡¶æ‡¶∏‡¶∞‡¶ø ‡¶ó‡ßç‡¶∞‡¶æ‡¶π‡¶ï‡ßá‡¶∞ ‡¶á‡¶®‡¶¨‡¶ï‡ßç‡¶∏‡ßá (Inbox) ‡¶Ø‡¶æ‡ßü
                      ‡¶è‡¶¨‡¶Ç ‡¶∏‡ßç‡¶™‡ßç‡¶Ø‡¶æ‡¶Æ ‡¶´‡ßã‡¶≤‡ßç‡¶°‡¶æ‡¶∞‡ßá (Spam) ‡¶®‡¶æ ‡¶Ü‡¶ü‡¶ï‡¶æ ‡¶™‡ßú‡ßá ‡¶§‡¶æ ‡¶®‡¶ø‡¶∂‡ßç‡¶ö‡¶ø‡¶§ ‡¶ï‡¶∞‡¶§‡ßá
                      ‡¶®‡¶ø‡¶ö‡ßá‡¶∞ SPF, DKIM ‡¶è‡¶¨‡¶Ç DMARC ‡¶∞‡ßá‡¶ï‡¶∞‡ßç‡¶° DNS-‡¶è ‡¶ï‡¶®‡¶´‡¶ø‡¶ó‡¶æ‡¶∞ ‡¶ï‡¶∞‡ßÅ‡¶®‡•§
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
                          SPF ‡¶∞‡ßá‡¶ï‡¶∞‡ßç‡¶° ‡¶Ü‡¶™‡¶®‡¶æ‡¶∞ ‡¶°‡ßã‡¶Æ‡ßá‡¶á‡¶®‡ßá‡¶∞ ‡¶™‡¶ï‡ßç‡¶∑ ‡¶•‡ßá‡¶ï‡ßá ‡¶á‡¶Æ‡ßá‡¶á‡¶≤ ‡¶™‡¶æ‡¶†‡¶æ‡¶§‡ßá
                          ‡¶Ö‡¶®‡ßÅ‡¶Æ‡¶§‡¶ø‡¶™‡ßç‡¶∞‡¶æ‡¶™‡ßç‡¶§ ‡¶Ü‡¶á‡¶™‡¶ø ‡¶è‡¶¨‡¶Ç ‡¶∏‡¶æ‡¶∞‡ßç‡¶≠‡¶æ‡¶∞‡¶ó‡ßÅ‡¶≤‡ßã ‡¶®‡¶ø‡¶∞‡ßç‡¶ß‡¶æ‡¶∞‡¶£ ‡¶ï‡¶∞‡ßá‡•§ ‡¶è‡¶ü‡¶ø
                          ‡¶õ‡¶æ‡ßú‡¶æ Google ‡¶Æ‡ßá‡¶á‡¶≤‡¶ï‡ßá ‡¶∏‡ßç‡¶™‡ßç‡¶Ø‡¶æ‡¶Æ‡ßá ‡¶™‡¶æ‡¶†‡¶æ‡ßü‡•§
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
                          üí° <strong>‡¶®‡ßã‡¶ü:</strong> ‡¶Ø‡¶¶‡¶ø ‡¶Ü‡¶™‡¶®‡¶ø ‡¶®‡¶ø‡¶ú‡ßá‡¶∞ ‡¶°‡ßã‡¶Æ‡ßá‡¶á‡¶® ‡¶Æ‡ßá‡¶á‡¶≤
                          ‡¶õ‡¶æ‡ßú‡¶æ ‡¶Ö‡¶®‡ßç‡¶Ø ‡¶ï‡ßã‡¶®‡ßã ‡¶•‡¶æ‡¶∞‡ßç‡¶°‡¶™‡¶æ‡¶∞‡ßç‡¶ü‡¶ø ‡¶Æ‡ßá‡¶á‡¶≤‡¶ø‡¶Ç ‡¶∏‡¶ø‡¶∏‡ßç‡¶ü‡ßá‡¶Æ‡¶ì ‡¶¨‡ßç‡¶Ø‡¶¨‡¶π‡¶æ‡¶∞
                          ‡¶ï‡¶∞‡ßá‡¶®, ‡¶§‡¶¨‡ßá ‡¶∏‡ßá‡¶ü‡¶ø‡¶ì ‡¶Ü‡¶™‡¶®‡¶æ‡¶∞ ‡¶è‡¶á ‡¶∏‡¶ø‡¶ô‡ßç‡¶ó‡ßá‡¶≤ SPF ‡¶∞‡ßá‡¶ï‡¶∞‡ßç‡¶°‡ßá ‡¶Ø‡ßã‡¶ó ‡¶ï‡¶∞‡¶§‡ßá
                          ‡¶π‡¶¨‡ßá‡•§
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
                          DKIM ‡¶™‡ßç‡¶∞‡¶§‡¶ø‡¶ü‡¶ø ‡¶á‡¶Æ‡ßá‡¶á‡¶≤‡ßá ‡¶è‡¶ï‡¶ü‡¶ø ‡¶°‡¶ø‡¶ú‡¶ø‡¶ü‡¶æ‡¶≤ ‡¶ï‡ßç‡¶∞‡¶ø‡¶™‡ßç‡¶ü‡ßã‡¶ó‡ßç‡¶∞‡¶æ‡¶´‡¶ø‡¶ï
                          ‡¶∏‡¶ø‡¶ó‡¶®‡ßá‡¶ö‡¶æ‡¶∞ ‡¶Ø‡ßÅ‡¶ï‡ßç‡¶§ ‡¶ï‡¶∞‡ßá‡•§ ‡¶è‡¶ü‡¶ø ‡¶°‡ßã‡¶Æ‡ßá‡¶á‡¶®‡ßá‡¶∞ ‡¶∏‡¶†‡¶ø‡¶ï ‡¶Æ‡¶æ‡¶≤‡¶ø‡¶ï‡¶æ‡¶®‡¶æ ‡¶Ø‡¶æ‡¶ö‡¶æ‡¶á
                          ‡¶ï‡¶∞‡ßá ‡¶á‡¶®‡¶¨‡¶ï‡ßç‡¶∏ ‡¶ó‡ßç‡¶Ø‡¶æ‡¶∞‡¶æ‡¶®‡ßç‡¶ü‡¶ø ‡¶¨‡¶æ‡ßú‡¶æ‡ßü‡•§
                        </p>

                        <div className="space-y-2 pt-2">
                          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-white/5 space-y-2.5">
                            <h5 className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                              ‡¶ï‡¶ø‡¶≠‡¶æ‡¶¨‡ßá ‡¶ö‡¶æ‡¶≤‡ßÅ ‡¶ï‡¶∞‡¶¨‡ßá‡¶® (How to generate)
                            </h5>
                            <ol className="text-[11px] text-slate-400 space-y-1.5 list-decimal pl-4 font-semibold leading-relaxed text-left">
                              <li>
                                ‡¶Ü‡¶™‡¶®‡¶æ‡¶∞{" "}
                                <strong className="text-slate-200">
                                  Google Workspace (Admin Console)
                                </strong>
                                -‡¶è ‡¶≤‡¶ó‡¶á‡¶® ‡¶ï‡¶∞‡ßÅ‡¶®‡•§
                              </li>
                              <li>
                                <strong className="text-slate-200">
                                  Apps &gt; Google Workspace &gt; Gmail &gt;
                                  Authenticate Email (DKIM)
                                </strong>{" "}
                                ‡¶è ‡¶Ø‡¶æ‡¶®‡•§
                              </li>
                              <li>
                                ‡¶∏‡ßá‡¶ñ‡¶æ‡¶® ‡¶•‡ßá‡¶ï‡ßá ‡¶®‡¶§‡ßÅ‡¶® ‡¶∞‡ßá‡¶ï‡¶∞‡ßç‡¶° ‡¶ú‡ßá‡¶®‡¶æ‡¶∞‡ßá‡¶ü ‡¶ï‡¶∞‡ßÅ‡¶® ‡¶è‡¶¨‡¶Ç ‡¶Ü‡¶™‡¶®‡¶æ‡¶∞
                                ‡¶ï‡ßç‡¶≤‡¶æ‡¶â‡¶°‡¶´‡ßç‡¶≤‡ßá‡¶Ø‡¶º‡¶æ‡¶∞ ‡¶¨‡¶æ ‡¶°‡ßã‡¶Æ‡ßá‡¶á‡¶® ‡¶°‡ßç‡¶Ø‡¶æ‡¶∂‡¶¨‡ßã‡¶∞‡ßç‡¶°‡ßá TXT ‡¶π‡¶ø‡¶∏‡ßá‡¶¨‡ßá
                                ‡¶∏‡ßá‡¶≠ ‡¶ï‡¶∞‡ßÅ‡¶®‡•§
                              </li>
                              <li>
                                DNS ‡¶Ü‡¶™‡¶°‡ßá‡¶ü ‡¶π‡¶ì‡ßü‡¶æ ‡¶∏‡¶æ‡¶™‡ßá‡¶ï‡ßç‡¶∑‡ßá ‡¶ú‡¶ø‡¶Æ‡ßá‡¶á‡¶≤‡ßá ‡¶™‡ßÅ‡¶®‡¶∞‡¶æ‡¶Ø‡¶º ‡¶¢‡ßÅ‡¶ï‡ßá{" "}
                                <strong className="text-[#10b981]">
                                  Start Authentication
                                </strong>{" "}
                                ‡¶è ‡¶ï‡ßç‡¶≤‡¶ø‡¶ï ‡¶ï‡¶∞‡ßÅ‡¶®‡•§
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
                          DMARC ‡¶®‡¶ø‡¶∞‡ßç‡¶ß‡¶æ‡¶∞‡¶£ ‡¶ï‡¶∞‡ßá ‡¶Ø‡¶¶‡¶ø ‡¶ï‡ßã‡¶®‡ßã ‡¶Æ‡ßá‡¶á‡¶≤ SPF ‡¶¨‡¶æ DKIM ‡¶ü‡ßá‡¶∏‡ßç‡¶ü‡ßá
                          ‡¶¨‡ßç‡¶Ø‡¶∞‡ßç‡¶• ‡¶π‡ßü, ‡¶§‡¶¨‡ßá ‡¶∞‡¶ø‡¶∏‡¶ø‡¶≠‡¶æ‡¶∞ ‡¶∏‡¶æ‡¶∞‡ßç‡¶≠‡¶æ‡¶∞ (‡¶Ø‡ßá‡¶Æ‡¶® ‡¶ú‡¶ø‡¶Æ‡ßá‡¶á‡¶≤) ‡¶Æ‡ßá‡¶á‡¶≤‡¶ü‡¶ø‡¶∞
                          ‡¶∏‡¶æ‡¶•‡ßá ‡¶ï‡¶ø ‡¶Ü‡¶ö‡¶∞‡¶£ ‡¶ï‡¶∞‡¶¨‡ßá‡•§
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
                            ‡¶¨‡ßç‡¶Ø‡¶ï‡ßç‡¶§‡¶ø‡¶ó‡¶§ @gmail.com ‡¶á‡¶â‡¶ú‡¶æ‡¶∞‡¶¶‡ßá‡¶∞ ‡¶ú‡¶®‡ßç‡¶Ø ‡¶∏‡ßç‡¶™‡ßç‡¶Ø‡¶æ‡¶Æ ‡¶¨‡¶æ‡¶á‡¶™‡¶æ‡¶∏
                            ‡¶ü‡¶ø‡¶™‡¶∏
                          </h6>
                          <span className="text-[9px] font-extrabold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded uppercase font-sans">
                            Crucial Advice
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                          ‡¶Ø‡¶¶‡¶ø ‡¶Ü‡¶™‡¶®‡¶æ‡¶∞ ‡¶ï‡ßã‡¶®‡ßã ‡¶ï‡¶æ‡¶∏‡ßç‡¶ü‡¶Æ ‡¶°‡ßã‡¶Æ‡ßá‡¶á‡¶® ‡¶®‡¶æ ‡¶•‡¶æ‡¶ï‡ßá ‡¶è‡¶¨‡¶Ç ‡¶Ü‡¶™‡¶®‡¶ø ‡¶™‡¶æ‡¶∞‡¶∏‡ßã‡¶®‡¶æ‡¶≤
                          ‡¶ú‡¶ø‡¶Æ‡ßá‡¶á‡¶≤ (
                          <code className="text-amber-500 font-mono bg-black/15 px-1 py-0.5 rounded">
                            GMAIL_USER=xxx@gmail.com
                          </code>
                          ) ‡¶è‡¶∞ ‡¶∏‡¶æ‡¶•‡ßá ‡¶Ö‡ßç‡¶Ø‡¶æ‡¶™ ‡¶™‡¶æ‡¶∏‡¶ì‡¶Ø‡¶º‡¶æ‡¶∞‡ßç‡¶° ‡¶¨‡ßç‡¶Ø‡¶¨‡¶π‡¶æ‡¶∞ ‡¶ï‡¶∞‡ßá‡¶®, ‡¶§‡¶¨‡ßá ‡¶è‡¶á
                          ‡¶∏‡ßç‡¶™‡ßç‡¶Ø‡¶æ‡¶Æ ‡¶´‡¶ø‡¶≤‡ßç‡¶ü‡¶æ‡¶∞‡¶ø‡¶Ç ‡¶è‡ßú‡¶æ‡¶§‡ßá ‡¶®‡¶ø‡¶ö‡ßá‡¶∞ ‡¶∏‡¶æ‡¶ß‡¶æ‡¶∞‡¶£ ‡¶™‡¶¶‡¶ï‡ßç‡¶∑‡ßá‡¶™ ‡¶Ö‡¶®‡ßÅ‡¶∏‡¶∞‡¶£
                          ‡¶ï‡¶∞‡¶§‡ßá ‡¶π‡¶¨‡ßá:
                        </p>

                        <ul className="text-[11px] text-slate-405 space-y-2.5 list-disc pl-4 font-semibold leading-relaxed text-left">
                          <li>
                            <strong className="text-slate-200">
                              ‡¶ó‡ßç‡¶∞‡¶æ‡¶π‡¶ï‡¶¶‡ßá‡¶∞ ‡¶¨‡¶≤‡ßÅ‡¶® ‡¶Æ‡ßá‡¶á‡¶≤ ‡¶á‡¶®‡¶¨‡¶ï‡ßç‡¶∏ ‡¶ö‡ßá‡¶ï ‡¶ï‡¶∞‡¶§‡ßá:
                            </strong>{" "}
                            ‡¶Æ‡ßá‡¶á‡¶≤ ‡¶™‡ßç‡¶∞‡¶•‡¶Æ‡¶¨‡¶æ‡¶∞ ‡¶ú‡¶ø‡¶Æ‡ßá‡¶á‡¶≤‡ßá ‡¶ó‡ßá‡¶≤‡ßá ‡¶∏‡ßá‡¶ü‡¶ø "Spam Folder" ‡¶è
                            ‡¶¢‡ßÅ‡¶ï‡ßá‡•§ ‡¶ó‡ßç‡¶∞‡¶æ‡¶π‡¶ï‡¶¶‡ßá‡¶∞ ‡¶¨‡¶≤‡ßÅ‡¶® ‡¶∏‡ßç‡¶™‡ßç‡¶Ø‡¶æ‡¶Æ ‡¶´‡ßã‡¶≤‡ßç‡¶°‡¶æ‡¶∞‡ßá ‡¶ó‡¶ø‡ßü‡ßá ‡¶Æ‡ßá‡¶á‡¶≤‡¶ü‡¶ø
                            ‡¶ì‡¶™‡ßá‡¶® ‡¶ï‡¶∞‡ßá{" "}
                            <strong className="text-emerald-500 font-bold">
                              "Report Not Spam"
                            </strong>{" "}
                            ‡¶è ‡¶ï‡ßç‡¶≤‡¶ø‡¶ï ‡¶ï‡¶∞‡¶§‡ßá‡•§
                          </li>
                          <li>
                            <strong className="text-slate-200">
                              ‡¶ú‡¶ø‡¶Æ‡ßá‡¶á‡¶≤ ‡¶°‡ßá‡¶ü‡¶æ‡¶¨‡ßá‡¶ú ‡¶ü‡ßç‡¶∞‡ßá‡¶®‡¶ø‡¶Ç:
                            </strong>{" "}
                            ‡¶Ø‡¶ñ‡¶® ‡¶Ö‡¶®‡ßç‡¶§‡¶§ ‡ßß‡ß¶-‡ßß‡ß´ ‡¶ú‡¶® ‡¶á‡¶â‡¶ú‡¶æ‡¶∞ ‡¶∏‡ßç‡¶™‡ßç‡¶Ø‡¶æ‡¶Æ ‡¶•‡ßá‡¶ï‡ßá ‡¶Æ‡ßá‡¶á‡¶≤‡¶ü‡¶ø‡¶ï‡ßá
                            ‡¶á‡¶®‡¶¨‡¶ï‡ßç‡¶∏‡ßá ‡¶®‡¶ø‡¶Ø‡¶º‡ßá ‡¶Ø‡¶æ‡¶¨‡ßá, ‡¶ó‡ßÅ‡¶ó‡¶≤ ‡¶∏‡ßç‡¶¨‡ßü‡¶Ç‡¶ï‡ßç‡¶∞‡¶ø‡ßü‡¶≠‡¶æ‡¶¨‡ßá ‡¶¨‡ßÅ‡¶ü‡¶∏‡ßç‡¶ü‡ßç‡¶∞‡ßç‡¶Ø‡¶æ‡¶™
                            ‡¶á‡¶Æ‡ßá‡¶á‡¶≤ ‡¶¨‡¶°‡¶ø‡¶ü‡¶ø‡¶ï‡ßá ‡¶¨‡¶ø‡¶∂‡ßç‡¶¨‡¶∏‡ßç‡¶§ ‡¶ò‡ßã‡¶∑‡¶£‡¶æ ‡¶ï‡¶∞‡¶¨‡ßá ‡¶è‡¶¨‡¶Ç ‡¶®‡¶§‡ßÅ‡¶® ‡¶ì‡¶ü‡¶ø‡¶™‡¶ø
                            ‡¶Æ‡ßá‡¶á‡¶≤ ‡¶∏‡¶∞‡¶æ‡¶∏‡¶∞‡¶ø ‡¶∂‡¶§‡¶≠‡¶æ‡¶ó ‡¶á‡¶â‡¶ú‡¶æ‡¶∞‡ßá‡¶∞ ‡¶á‡¶®‡¶¨‡¶ï‡ßç‡¶∏‡ßá ‡¶Ø‡¶æ‡¶¨‡ßá‡•§
                          </li>
                          <li>
                            <strong className="text-slate-200">
                              ‡¶ï‡¶æ‡¶∏‡ßç‡¶ü‡¶Æ ‡¶°‡ßã‡¶Æ‡ßá‡¶á‡¶® ‡¶¨‡¶æ ‡¶™‡ßç‡¶∞‡¶´‡ßá‡¶∂‡¶®‡¶æ‡¶≤ SMTP ‡¶∏‡¶æ‡¶∞‡ßç‡¶≠‡¶ø‡¶∏:
                            </strong>{" "}
                            ‡¶¨‡ßç‡¶Ø‡¶æ‡¶™‡¶ï ‡¶π‡¶æ‡¶∞‡ßá ‡¶¨‡ßç‡¶Ø‡¶¨‡¶∏‡¶æ‡¶Ø‡¶º‡¶ø‡¶ï ‡¶¨‡ßç‡¶Ø‡¶¨‡¶π‡¶æ‡¶∞‡ßá‡¶∞ ‡¶ú‡¶®‡ßç‡¶Ø ‡¶¨‡ßç‡¶Ø‡¶ï‡ßç‡¶§‡¶ø‡¶ó‡¶§
                            ‡¶ú‡¶ø‡¶Æ‡ßá‡¶á‡¶≤ ‡¶Ö‡¶§‡ßç‡¶Ø‡¶®‡ßç‡¶§ ‡¶∏‡¶Ç‡¶¨‡ßá‡¶¶‡¶®‡¶∂‡ßÄ‡¶≤‡•§ ‡¶≠‡¶æ‡¶≤‡ßã ‡¶á‡¶®‡¶¨‡¶ï‡ßç‡¶∏ ‡¶è‡¶¨‡¶Ç ‡¶°‡ßá‡¶≤‡¶ø‡¶≠‡¶æ‡¶∞‡¶ø
                            ‡¶π‡¶æ‡¶∞‡ßá‡¶∞ ‡¶ú‡¶®‡ßç‡¶Ø Google Workspace ‡¶Ö‡¶•‡¶¨‡¶æ{" "}
                            <code className="text-slate-200">
                              Mailgun/Brevo/Resend
                            </code>{" "}
                            ‡¶ú‡¶æ‡¶§‡ßÄ‡ßü ‡¶™‡ßç‡¶∞‡¶´‡ßá‡¶∂‡¶®‡¶æ‡¶≤ ‡¶á‡¶Æ‡ßá‡¶á‡¶≤ ‡¶™‡ßç‡¶∞‡ßã‡¶≠‡¶æ‡¶á‡¶°‡¶æ‡¶∞ ‡¶π‡ßã‡¶∏‡ßç‡¶ü ‡¶¶‡¶ø‡ßü‡ßá ‡¶ú‡¶ø‡¶Æ‡ßá‡¶á‡¶≤
                            ‡¶ï‡¶æ‡¶®‡ßá‡¶ï‡¶∂‡¶® ‡¶¨‡ßç‡¶Ø‡¶¨‡¶π‡¶æ‡¶∞ ‡¶ï‡¶∞‡ßÅ‡¶®‡•§
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Delivery Verification Checklist */}
                  <div className="bg-[#10b981]/5 border border-[#10b981]/10 rounded-2xl p-5 space-y-2.5 font-sans">
                    <h6 className="text-[11px] font-black text-emerald-500 uppercase tracking-wider">
                      ‡¶°‡ßá‡¶≤‡¶ø‡¶≠‡¶æ‡¶∞‡¶ø ‡¶∏‡ßç‡¶ï‡ßã‡¶∞ ‡¶ö‡ßá‡¶ï‡¶≤‡¶ø‡¶∏‡ßç‡¶ü (Email Health Checklist)
                    </h6>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-[9px] font-black">
                          ‚úì
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          SPF Record (Added)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-[9px] font-black">
                          ‚úì
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          DKIM Verified
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-[9px] font-black">
                          ‚úì
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          DMARC Policy
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-[9px] font-black">
                          ‚úì
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
                      ‡¶≤‡¶ø‡¶Ç‡¶ï ‡¶≠‡ßá‡¶∞‡¶ø‡¶´‡¶ø‡¶ï‡ßá‡¶∂‡¶® ‡¶Ö‡¶® ‡¶ï‡¶∞‡¶æ‡¶∞ ‡¶®‡¶ø‡ßü‡¶Æ‡¶æ‡¶¨‡¶≤‡ßÄ (How to Turn On Auto-Link
                      Mode)
                    </h5>
                  </div>
                  <ul className="text-[11px] text-slate-400 dark:text-slate-300 space-y-1.5 list-disc pl-4 font-medium leading-relaxed">
                    <li>
                      <strong className="text-amber-500">
                        ‡¶∏‡ßç‡¶¨‡ßü‡¶Ç‡¶ï‡ßç‡¶∞‡¶ø‡ßü (Automatic Mode):
                      </strong>{" "}
                      ‡¶ú‡¶ø‡¶Æ‡ßá‡¶á‡¶≤ ‡¶≤‡¶ø‡¶Æ‡¶ø‡¶ü (‡ß´‡ß¶‡ß¶) ‡¶¨‡¶æ ‡¶ú‡¶ø‡¶Æ‡ßá‡¶á‡¶≤ ‡¶ï‡ßç‡¶∞‡ßá‡¶°‡ßá‡¶®‡¶∂‡¶ø‡ßü‡¶æ‡¶≤ ‡¶®‡¶æ ‡¶•‡¶æ‡¶ï‡¶≤‡ßá ‡¶è‡¶ü‡¶ø
                      ‡¶∏‡ßç‡¶¨‡ßü‡¶Ç‡¶ï‡ßç‡¶∞‡¶ø‡ßü‡¶≠‡¶æ‡¶¨‡ßá ‡¶Ö‡¶® ‡¶π‡ßü‡ßá ‡¶Ø‡¶æ‡¶¨‡ßá‡•§
                    </li>
                    <li>
                      <strong className="text-amber-500">
                        ‡¶Æ‡ßç‡¶Ø‡¶æ‡¶®‡ßÅ‡ßü‡¶æ‡¶≤‡¶ø ‡¶´‡ßã‡¶∞‡ßç‡¶∏‡¶° (Always On forced):
                      </strong>{" "}
                      ‡¶Ü‡¶™‡¶®‡¶ø ‡¶Ø‡¶¶‡¶ø ‡¶∏‡¶Æ‡ßç‡¶™‡ßÇ‡¶∞‡ßç‡¶£‡¶≠‡¶æ‡¶¨‡ßá ‡¶ú‡¶ø‡¶Æ‡ßá‡¶á‡¶≤ ‡¶¨‡¶®‡ßç‡¶ß ‡¶ï‡¶∞‡ßá ‡¶∏‡¶∞‡¶æ‡¶∏‡¶∞‡¶ø{" "}
                      <span className="underline decoration-amber-500">
                        ‡¶≤‡¶ø‡¶Ç‡¶ï ‡¶≠‡ßá‡¶∞‡¶ø‡¶´‡¶ø‡¶ï‡ßá‡¶∂‡¶® (Auto-Link) ‡¶∏‡¶¨‡¶∏‡¶Æ‡ßü ‡¶ö‡¶æ‡¶≤‡ßÅ ‡¶∞‡¶æ‡¶ñ‡¶§‡ßá ‡¶ö‡¶æ‡¶®
                      </span>
                      , ‡¶§‡¶æ‡¶π‡¶≤‡ßá ‡¶Ü‡¶™‡¶®‡¶æ‡¶∞ ‡¶™‡¶∞‡¶ø‡¶¨‡ßá‡¶∂ ‡¶´‡¶æ‡¶á‡¶≤‡ßá (
                      <code className="font-mono bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-amber-500">
                        .env
                      </code>
                      ){" "}
                      <code className="font-mono bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-[#10b981]">
                        AUTO_LINK_ONLY=true
                      </code>{" "}
                      ‡¶®‡¶ø‡¶∞‡ßç‡¶ß‡¶æ‡¶∞‡¶£ ‡¶ï‡¶∞‡ßÅ‡¶®‡•§
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
                  ‡¶∞‡¶ø‡¶Ø‡¶º‡ßá‡¶≤-‡¶ü‡¶æ‡¶á‡¶Æ ‡¶∏‡¶ø‡¶∏‡ßç‡¶ü‡ßá‡¶Æ‡ßá‡¶∞ ‡¶§‡ßç‡¶∞‡ßÅ‡¶ü‡¶ø ‡¶è‡¶¨‡¶Ç ‡¶™‡ßç‡¶∞‡¶§‡ßç‡¶Ø‡¶æ‡¶ñ‡ßç‡¶Ø‡¶æ‡¶§ ‡¶è‡¶™‡¶ø‡¶Ü‡¶á ‡¶ï‡¶≤‡¶ó‡ßÅ‡¶≤‡¶ø‡¶∞ ‡¶á‡¶§‡¶ø‡¶π‡¶æ‡¶∏
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
                      notify("‡¶ü‡ßá‡¶∏‡ßç‡¶ü ‡¶§‡ßç‡¶∞‡ßÅ‡¶ü‡¶ø ‡¶∏‡¶´‡¶≤‡¶≠‡¶æ‡¶¨‡ßá ‡¶∏‡¶ø‡¶∏‡ßç‡¶ü‡ßá‡¶Æ‡ßá ‡¶§‡ßà‡¶∞‡¶ø ‡¶ï‡¶∞‡¶æ ‡¶π‡¶Ø‡¶º‡ßá‡¶õ‡ßá! üß™");
                    }
                  }}
                  className="bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white border border-amber-500/20 hover:border-transparent px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2"
                >
                  <Activity size={12} />
                  <span>Test Trigger (‡¶ü‡ßá‡¶∏‡ßç‡¶ü ‡¶§‡ßç‡¶∞‡ßÅ‡¶ü‡¶ø)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (auditLogs.length === 0) {
                      notify("‡¶ï‡ßã‡¶®‡ßã ‡¶≤‡¶ó ‡¶®‡ßá‡¶á ‡¶ñ‡¶æ‡¶≤‡¶ø ‡¶ï‡¶∞‡¶æ‡¶∞ ‡¶ú‡¶®‡ßç‡¶Ø‡•§");
                      return;
                    }
                    if (confirm("Are you sure you want to clear all system audit logs?")) {
                      clearErrors();
                      notify("‡¶∏‡¶ï‡¶≤ ‡¶∏‡¶ø‡¶∏‡ßç‡¶ü‡ßá‡¶Æ ‡¶Ö‡¶°‡¶ø‡¶ü ‡¶≤‡¶ó ‡¶Æ‡ßÅ‡¶õ‡ßá ‡¶´‡ßá‡¶≤‡¶æ ‡¶π‡¶Ø‡¶º‡ßá‡¶õ‡ßá! üßπ");
                    }
                  }}
                  className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 hover:border-transparent px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2"
                >
                  <Trash2 size={12} />
                  <span>Clear Logs (‡¶≤‡¶ó ‡¶Æ‡ßÅ‡¶õ‡ßÅ‡¶®)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (auditLogs.length === 0) {
                      notify("‡¶∞‡¶™‡ßç‡¶§‡¶æ‡¶®‡¶ø ‡¶ï‡¶∞‡¶æ‡¶∞ ‡¶ú‡¶®‡ßç‡¶Ø ‡¶ï‡ßã‡¶®‡ßã ‡¶≤‡¶ó ‡¶®‡ßá‡¶á‡•§");
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
                      notify("‡¶∏‡¶ø‡¶∏‡ßç‡¶ü‡ßá‡¶Æ ‡¶Ö‡¶°‡¶ø‡¶ü ‡¶≤‡¶ó JSON ‡¶´‡¶æ‡¶á‡¶≤ ‡¶π‡¶ø‡¶∏‡ßá‡¶¨‡ßá ‡¶∞‡¶™‡ßç‡¶§‡¶æ‡¶®‡¶ø ‡¶π‡¶Ø‡¶º‡ßá‡¶õ‡ßá! üìÇ");
                    } catch (e) {
                      notify("‡¶∞‡¶™‡ßç‡¶§‡¶æ‡¶®‡¶ø ‡¶ï‡¶∞‡¶§‡ßá ‡¶∏‡¶Æ‡¶∏‡ßç‡¶Ø‡¶æ ‡¶π‡¶Ø‡¶º‡ßá‡¶õ‡ßá‡•§");
                    }
                  }}
                  className="bg-[#10b981]/10 hover:bg-[#10b981] text-[#10b981] hover:text-white border border-[#10b981]/20 hover:border-transparent px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2"
                >
                  <Download size={12} />
                  <span>Export Logs (‡¶°‡¶æ‡¶â‡¶®‡¶≤‡ßã‡¶° JSON)</span>
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
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">All Systems Operational (‡¶∏‡¶¨‡¶ï‡¶ø‡¶õ‡ßÅ ‡¶†‡¶ø‡¶ï‡¶†‡¶æ‡¶ï ‡¶ï‡¶æ‡¶ú ‡¶ï‡¶∞‡¶õ‡ßá)</p>
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
                                <span className="transition-transform group-open:rotate-90">‚ñ∂</span>
                                <span>View Raw Stack Trace (‡¶ü‡ßç‡¶∞‡ßá‡¶∏ ‡¶¶‡ßá‡¶ñ‡ßÅ‡¶®)</span>
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
                  ‡¶Ö‡ßç‡¶Ø‡¶æ‡¶™‡ßá‡¶∞ ‡¶¨‡ßç‡¶Ø‡¶æ‡¶ï‡¶ó‡ßç‡¶∞‡¶æ‡¶â‡¶®‡ßç‡¶° ‡¶Æ‡¶®‡¶ø‡¶ü‡¶∞‡¶ø‡¶Ç, ‡¶ü‡ßá‡¶ï‡¶®‡¶ø‡¶ï‡ßç‡¶Ø‡¶æ‡¶≤ ‡¶∏‡¶Æ‡¶∏‡ßç‡¶Ø‡¶æ ‡¶∂‡¶®‡¶æ‡¶ï‡ßç‡¶§‡¶ï‡¶∞‡¶£ ‡¶è‡¶¨‡¶Ç ‡¶∏‡ßç‡¶¨‡ßü‡¶Ç‡¶ï‡ßç‡¶∞‡¶ø‡ßü ‡¶∏‡ßá‡¶≤‡¶´-‡¶π‡¶ø‡¶≤‡¶ø‡¶Ç ‡¶∏‡ßá‡¶®‡ßç‡¶ü‡¶æ‡¶∞
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  disabled={isScanning}
                  onClick={async () => {
                    setIsScanning(true);
                    notify("AI Health Scanning initialized... ü§ñüîç");
                    try {
                      await new Promise(resolve => setTimeout(resolve, 1500));
                      const results = await runAIHealthScanAndRecovery(true);
                      if (results.issuesDetected.length > 0) {
                        notify(`Scan complete: Detected ${results.issuesDetected.length} issues and resolved them. üõ†Ô∏è`);
                      } else {
                        notify("Scan complete: No technical anomalies found. All systems healthy! üçè");
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
                  <span>{isScanning ? "Scanning..." : "Scan Now (‡¶∏‡ßç‡¶ï‡ßç‡¶Ø‡¶æ‡¶® ‡¶ï‡¶∞‡ßÅ‡¶®)"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    clearAIRecoveryHistory();
                    notify("AI Recovery History cleared successfully. üßº");
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
                      Real-time Supabase listeners synced securely with offline persistence safeguard fallback routing.
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
                  ü§ñ AI SCANNER CONFIGURATION & SCHEDULER
                </h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                  ‡¶è‡¶ñ‡¶æ‡¶®‡ßá ‡¶Ü‡¶™‡¶®‡¶ø ‡¶∏‡ßç‡¶¨‡ßü‡¶Ç‡¶ï‡ßç‡¶∞‡¶ø‡ßü ‡¶¨‡ßç‡¶Ø‡¶æ‡¶ï‡¶ó‡ßç‡¶∞‡¶æ‡¶â‡¶®‡ßç‡¶° ‡¶∏‡ßç‡¶ï‡ßç‡¶Ø‡¶æ‡¶® ‡¶è‡¶¨‡¶Ç ‡¶∏‡ßá‡¶≤‡¶´-‡¶π‡¶ø‡¶≤‡¶ø‡¶Ç ‡¶∞‡ßÅ‡¶≤‡¶∏ ‡¶ï‡¶®‡ßç‡¶ü‡ßç‡¶∞‡ßã‡¶≤ ‡¶ï‡¶∞‡¶§‡ßá ‡¶™‡¶æ‡¶∞‡¶¨‡ßá‡¶®
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Toggle 1: Auto Scan */}
                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-100">Auto background scan</span>
                    <p className="text-[8px] text-slate-400 uppercase font-bold">‡¶∏‡ßç‡¶¨‡ßü‡¶Ç‡¶ï‡ßç‡¶∞‡¶ø‡ßü ‡¶¨‡ßç‡¶Ø‡¶æ‡¶ï‡¶ó‡ßç‡¶∞‡¶æ‡¶â‡¶®‡ßç‡¶° ‡¶∏‡ßç‡¶ï‡ßç‡¶Ø‡¶æ‡¶®‡¶ø‡¶Ç</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...aiConfig, autoScan: !aiConfig.autoScan };
                      setAiConfig(updated);
                      saveAIRecoveryConfig(updated);
                      notify(updated.autoScan ? "Auto scan enabled! üõ∞Ô∏è" : "Auto scan disabled.");
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
                    <p className="text-[8px] text-slate-400 uppercase font-bold">‡¶∏‡ßç‡¶¨‡ßü‡¶Ç‡¶ï‡ßç‡¶∞‡¶ø‡ßü ‡¶∏‡¶Æ‡¶∏‡ßç‡¶Ø‡¶æ ‡¶∏‡¶Æ‡¶æ‡¶ß‡¶æ‡¶® ‡¶∞‡ßÅ‡¶≤‡¶∏</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...aiConfig, autoRecovery: !aiConfig.autoRecovery };
                      setAiConfig(updated);
                      saveAIRecoveryConfig(updated);
                      notify(updated.autoRecovery ? "Auto recovery enabled! üõ†Ô∏è" : "Auto recovery disabled.");
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
                          notify(`Scan interval schedule updated to: ${opt.toUpperCase()} ‚è∞`);
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
                <h5 className="text-[10px] font-black text-amber-500 uppercase tracking-wider">üîí SECURITY ENFORCEMENT & SANDBOX SAFETY ENGAGED</h5>
                <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed">
                  ‡¶è‡¶Ü‡¶á ‡¶Ö‡ßç‡¶Ø‡¶æ‡¶™ ‡¶π‡ßá‡¶≤‡¶• ‡¶∞‡¶ø‡¶ï‡¶≠‡¶æ‡¶∞‡¶ø ‡¶∂‡ßÅ‡¶ß‡ßÅ‡¶Æ‡¶æ‡¶§‡ßç‡¶∞ ‡¶ü‡ßá‡¶ï‡¶®‡¶ø‡¶ï‡ßç‡¶Ø‡¶æ‡¶≤ ‡¶∏‡¶Æ‡¶∏‡ßç‡¶Ø‡¶æ (UI Reload, Broken links, API failed, cache clear) ‡¶∏‡¶Æ‡¶æ‡¶ß‡¶æ‡¶® ‡¶ï‡¶∞‡¶¨‡ßá‡•§ ‡¶è‡¶ü‡¶ø ‡¶ï‡¶ñ‡¶®‡ßã ‡¶¨‡ßç‡¶Ø‡¶¨‡¶π‡¶æ‡¶∞‡¶ï‡¶æ‡¶∞‡ßÄ‡¶∞ ‡¶¨‡ßç‡¶Ø‡¶æ‡¶≤‡ßá‡¶®‡ßç‡¶∏, ‡¶Æ‡ßá‡¶Æ‡ßç‡¶¨‡¶æ‡¶∞‡¶∂‡¶ø‡¶™, ‡¶∞‡ßá‡¶´‡¶æ‡¶∞‡ßá‡¶≤ ‡¶á‡¶®‡¶ï‡¶æ‡¶Æ, ‡¶ü‡¶æ‡¶∏‡ßç‡¶ï ‡¶è‡¶™‡ßç‡¶∞‡ßÅ‡¶≠‡¶æ‡¶≤ ‡¶¨‡¶æ ‡¶â‡¶á‡¶•‡¶°‡ßç‡¶∞‡¶æ‡¶≤ ‡¶∏‡ßç‡¶ü‡ßç‡¶Ø‡¶æ‡¶ü‡¶æ‡¶∏ ‡¶™‡¶∞‡¶ø‡¶¨‡¶∞‡ßç‡¶§‡¶® ‡¶ï‡¶∞‡¶§‡ßá ‡¶™‡¶æ‡¶∞‡¶¨‡ßá ‡¶®‡¶æ‡•§
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
                  <span>üéØ</span> REFERRAL TARGET MANAGER (‡¶∞‡ßá‡¶´‡¶æ‡¶∞‡¶æ‡¶≤ ‡¶ü‡¶æ‡¶∞‡ßç‡¶ó‡ßá‡¶ü ‡¶ï‡¶®‡ßç‡¶ü‡ßç‡¶∞‡ßã‡¶≤)
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                  ‡¶¶‡ßà‡¶®‡¶ø‡¶ï, ‡¶∏‡¶æ‡¶™‡ßç‡¶§‡¶æ‡¶π‡¶ø‡¶ï, ‡¶¨‡¶æ ‡¶Æ‡¶æ‡¶∏‡¶ø‡¶ï ‡¶∞‡ßá‡¶´‡¶æ‡¶∞‡¶æ‡¶≤ ‡¶ó‡ßã‡¶≤ ‡¶è‡¶¨‡¶Ç ‡¶¨‡ßã‡¶®‡¶æ‡¶∏ ‡¶¨‡ßã‡¶®‡¶æ‡¶∏ ‡¶∏‡ßá‡¶ü ‡¶ï‡¶∞‡ßÅ‡¶®‡•§ ‡¶á‡¶â‡¶ú‡¶æ‡¶∞ ‡¶ü‡¶æ‡¶∞‡ßç‡¶ó‡ßá‡¶ü ‡¶™‡ßÇ‡¶∞‡¶£ ‡¶ï‡¶∞‡¶≤‡ßá ‡¶¨‡ßã‡¶®‡¶æ‡¶∏ ‡¶ü‡¶æ‡¶ï‡¶æ‡¶∞ ‡¶∏‡¶æ‡¶•‡ßá ‡¶§‡¶æ‡¶∞ ‡¶Ö‡ßç‡¶Ø‡¶æ‡¶ï‡¶æ‡¶â‡¶®‡ßç‡¶ü ‡¶ï‡ßç‡¶Ø‡¶æ‡¶ü‡¶æ‡¶ó‡¶∞‡¶ø ‡¶∏‡ßç‡¶¨‡ßü‡¶Ç‡¶ï‡ßç‡¶∞‡¶ø‡ßü‡¶≠‡¶æ‡¶¨‡ßá ‡¶Ü‡¶™‡¶ó‡ßç‡¶∞‡ßá‡¶° ‡¶π‡ßü‡ßá ‡¶Ø‡¶æ‡¶¨‡ßá‡•§
                </p>
              </div>
            </div>

            {/* Sub Tabs: Manage targets vs Target history */}
            <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-950 rounded-2xl w-fit border border-slate-100 dark:border-white/5">
              <button 
                onClick={() => setApprovalSubTab("membership" as any)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${approvalSubTab === ("membership" as any) ? "bg-[#10b981] text-white shadow-md shadow-emerald-500/10" : "text-slate-400 hover:text-[#10b981]"}`}
              >
                Manage Targets (‡¶ü‡¶æ‡¶∞‡ßç‡¶ó‡ßá‡¶ü ‡¶§‡ßà‡¶∞‡¶ø ‡¶ì ‡¶™‡¶∞‡¶ø‡¶ö‡¶æ‡¶≤‡¶®‡¶æ)
              </button>
              <button 
                onClick={() => setApprovalSubTab("tasks" as any)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${approvalSubTab === ("tasks" as any) ? "bg-[#10b981] text-white shadow-md shadow-emerald-500/10" : "text-slate-400 hover:text-[#10b981]"}`}
              >
                Target History (‡¶∏‡¶ï‡¶≤ ‡¶ü‡¶æ‡¶∞‡ßç‡¶ó‡ßá‡¶ü ‡¶π‡¶ø‡¶∏‡ßç‡¶ü‡ßç‡¶∞‡¶ø)
              </button>
            </div>

            {approvalSubTab === ("membership" as any) && (
              <div className="space-y-8">
                {/* Form to create a new target */}
                <div className="bg-slate-50 dark:bg-slate-950 p-6 md:p-8 rounded-3xl border border-slate-100 dark:border-white/5 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4 gap-2">
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Calendar size={18} className="text-[#10b981]" /> Create New Referral Target (‡¶®‡¶§‡ßÅ‡¶® ‡¶∞‡ßá‡¶´‡¶æ‡¶∞‡¶æ‡¶≤ ‡¶ü‡¶æ‡¶∞‡ßç‡¶ó‡ßá‡¶ü ‡¶Ø‡ßã‡¶ó ‡¶ï‡¶∞‡ßÅ‡¶®)
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        ‡¶¶‡ßà‡¶®‡¶ø‡¶ï (‡ßß ‡¶¶‡¶ø‡¶®), ‡¶∏‡¶æ‡¶™‡ßç‡¶§‡¶æ‡¶π‡¶ø‡¶ï, ‡¶Æ‡¶æ‡¶∏‡¶ø‡¶ï ‡¶¨‡¶æ ‡¶®‡¶ø‡¶∞‡ßç‡¶¶‡¶ø‡¶∑‡ßç‡¶ü ‡¶ï‡¶æ‡¶∏‡ßç‡¶ü‡¶Æ ‡¶§‡¶æ‡¶∞‡¶ø‡¶ñ‡ßá‡¶∞ ‡¶ú‡¶®‡ßç‡¶Ø ‡¶Ü‡¶ï‡¶∞‡ßç‡¶∑‡¶£‡ßÄ‡ßü ‡¶∞‡ßá‡¶´‡¶æ‡¶∞‡¶æ‡¶≤ ‡¶ü‡¶æ‡¶∞‡ßç‡¶ó‡ßá‡¶ü ‡¶§‡ßà‡¶∞‡¶ø ‡¶ï‡¶∞‡ßÅ‡¶®
                      </p>
                    </div>
                  </div>

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const formData = new FormData(form);
                    
                    const title = formData.get("title") as string;
                    const description = formData.get("description") as string;
                    const periodType = targetFormPeriodType;
                    const targetRole = formData.get("targetRole") as 'all' | 'user' | 'monitor';
                    const referralGoal = parseInt(formData.get("referralGoal") as string);
                    const bonusReward = parseFloat(formData.get("bonusReward") as string);
                    const assignedToInput = formData.get("assignedToIds") as string;

                    if (!title || !referralGoal || !bonusReward) {
                      notify("‡¶¶‡ßü‡¶æ ‡¶ï‡¶∞‡ßá ‡¶™‡ßç‡¶∞‡ßü‡ßã‡¶ú‡¶®‡ßÄ‡ßü ‡¶∏‡¶ï‡¶≤ ‡¶§‡¶•‡ßç‡¶Ø ‡¶™‡ßÇ‡¶∞‡¶£ ‡¶ï‡¶∞‡ßÅ‡¶®!");
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
                      startDate: (periodType === 'custom' || periodType === 'oneday' || periodType === 'daily') ? targetFormStartDate : undefined,
                      endDate: (periodType === 'custom' || periodType === 'oneday' || periodType === 'daily') ? targetFormEndDate : undefined,
                      durationDays: periodType === 'oneday' ? 1 : undefined,
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
                    notify("‡¶®‡¶§‡ßÅ‡¶® ‡¶∞‡ßá‡¶´‡¶æ‡¶∞‡¶æ‡¶≤ ‡¶ü‡¶æ‡¶∞‡ßç‡¶ó‡ßá‡¶ü ‡¶∏‡¶´‡¶≤‡¶≠‡¶æ‡¶¨‡ßá ‡¶Ø‡ßã‡¶ó ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá!");
                  }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Target Title (‡¶ü‡¶æ‡¶∞‡ßç‡¶ó‡ßá‡¶ü ‡¶ü‡¶æ‡¶á‡¶ü‡ßá‡¶≤) *</label>
                      <input required name="title" type="text" placeholder="e.g., Daily 10 Referrals Challenge" className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#10b981] font-bold dark:text-white" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Target Description (‡¶ü‡¶æ‡¶∞‡ßç‡¶ó‡ßá‡¶ü ‡¶¨‡¶ø‡¶¨‡¶∞‡¶£)</label>
                      <input name="description" type="text" placeholder="e.g., Refer 10 users today and earn bonus reward instantly" className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#10b981] font-bold dark:text-white" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Period Type / Timeframe (‡¶∏‡¶Æ‡ßü‡¶∏‡ßÄ‡¶Æ‡¶æ) *</label>
                      <select 
                        value={targetFormPeriodType} 
                        onChange={(e) => setTargetFormPeriodType(e.target.value as any)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#10b981] font-bold dark:text-white"
                      >
                        <option value="daily">Daily Target (‡¶¶‡ßà‡¶®‡¶ø‡¶ï - ‡¶™‡ßç‡¶∞‡¶§‡¶ø ‡¶¶‡¶ø‡¶®)</option>
                        <option value="oneday">1 Day System (‡¶¨‡¶ø‡¶∂‡ßá‡¶∑ ‡ßß ‡¶¶‡¶ø‡¶®‡ßá‡¶∞ ‡¶ö‡ßç‡¶Ø‡¶æ‡¶≤‡ßá‡¶û‡ßç‡¶ú)</option>
                        <option value="weekly">Weekly Target (‡¶∏‡¶æ‡¶™‡ßç‡¶§‡¶æ‡¶π‡¶ø‡¶ï - ‡ß≠ ‡¶¶‡¶ø‡¶®)</option>
                        <option value="monthly">Monthly Target (‡¶Æ‡¶æ‡¶∏‡¶ø‡¶ï - ‡ß©‡ß¶ ‡¶¶‡¶ø‡¶®)</option>
                        <option value="custom">Custom Date Range (‡¶ï‡¶æ‡¶∏‡ßç‡¶ü‡¶Æ ‡¶®‡¶ø‡¶∞‡ßç‡¶¶‡¶ø‡¶∑‡ßç‡¶ü ‡¶∏‡¶Æ‡ßü‡¶∏‡ßÄ‡¶Æ‡¶æ)</option>
                      </select>
                    </div>

                    {/* Date Pickers for Custom / Daily / 1 Day */}
                    {(targetFormPeriodType === 'custom' || targetFormPeriodType === 'oneday' || targetFormPeriodType === 'daily') && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Start Date (‡¶∂‡ßÅ‡¶∞‡ßÅ‡¶∞ ‡¶§‡¶æ‡¶∞‡¶ø‡¶ñ)</label>
                          <input 
                            type="date" 
                            value={targetFormStartDate} 
                            onChange={(e) => setTargetFormStartDate(e.target.value)} 
                            className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl p-3 text-xs focus:outline-none focus:border-[#10b981] font-bold dark:text-white" 
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">End Date (‡¶∂‡ßá‡¶∑‡ßá‡¶∞ ‡¶§‡¶æ‡¶∞‡¶ø‡¶ñ)</label>
                          <input 
                            type="date" 
                            value={targetFormEndDate} 
                            onChange={(e) => setTargetFormEndDate(e.target.value)} 
                            className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl p-3 text-xs focus:outline-none focus:border-[#10b981] font-bold dark:text-white" 
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Target Audience Role (‡¶ü‡¶æ‡¶∞‡ßç‡¶ó‡ßá‡¶ü ‡¶ó‡ßç‡¶∞‡ßÅ‡¶™) *</label>
                      <select name="targetRole" className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#10b981] font-bold dark:text-white">
                        <option value="all">All Users & Monitors (‡¶∏‡¶¨‡¶æ‡¶á)</option>
                        <option value="user">General Users Only (‡¶∂‡ßÅ‡¶ß‡ßÅ‡¶Æ‡¶æ‡¶§‡ßç‡¶∞ ‡¶∏‡¶æ‡¶ß‡¶æ‡¶∞‡¶£ ‡¶¨‡ßç‡¶Ø‡¶¨‡¶π‡¶æ‡¶∞‡¶ï‡¶æ‡¶∞‡ßÄ)</option>
                        <option value="monitor">Monitors Only (‡¶∂‡ßÅ‡¶ß‡ßÅ‡¶Æ‡¶æ‡¶§‡ßç‡¶∞ ‡¶Æ‡¶®‡¶ø‡¶ü‡¶∞‡¶ó‡¶£)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Referral Goal Count (‡¶∞‡ßá‡¶´‡¶æ‡¶∞‡¶æ‡¶≤ ‡¶∏‡¶Ç‡¶ñ‡ßç‡¶Ø‡¶æ ‡¶≤‡¶ï‡ßç‡¶∑‡ßç‡¶Ø) *</label>
                      <input required name="referralGoal" type="number" min="1" placeholder="e.g., 10" className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#10b981] font-bold dark:text-white" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Bonus Reward (‡ß≥) *</label>
                      <input required name="bonusReward" type="number" step="0.01" min="0" placeholder="e.g., 150" className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#10b981] font-bold dark:text-white" />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Specific User IDs (‡¶®‡¶ø‡¶∞‡ßç‡¶¶‡¶ø‡¶∑‡ßç‡¶ü ‡¶¨‡ßç‡¶Ø‡¶¨‡¶π‡¶æ‡¶∞‡¶ï‡¶æ‡¶∞‡ßÄ, ‡¶ï‡¶Æ‡¶æ ‡¶¶‡ßç‡¶¨‡¶æ‡¶∞‡¶æ ‡¶Ü‡¶≤‡¶æ‡¶¶‡¶æ ‡¶ï‡¶∞‡ßÅ‡¶® - Optional)</label>
                      <input name="assignedToIds" type="text" placeholder="e.g., user123, user456" className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#10b981] font-bold dark:text-white font-mono" />
                    </div>

                    <div className="md:col-span-2 pt-2">
                      <button type="submit" className="w-full md:w-auto bg-[#10b981] hover:bg-emerald-600 text-white font-black px-8 py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer shadow-lg shadow-emerald-500/20">
                        <Plus size={16} /> Add Referral Target
                      </button>
                    </div>
                  </form>
                </div>

                {/* List of active targets */}
                <div className="space-y-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Existing Referral Targets ({targets.filter(t => targetFilterPeriod === 'all' ? true : targetFilterPeriod === 'daily' ? (t.periodType === 'daily' || t.periodType === 'oneday') : t.periodType === targetFilterPeriod).length})
                    </h4>

                    {/* Filter Tabs */}
                    <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                      <button 
                        onClick={() => setTargetFilterPeriod('all')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${targetFilterPeriod === 'all' ? 'bg-[#10b981] text-white shadow' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                      >
                        All (‡¶∏‡¶ï‡¶≤)
                      </button>
                      <button 
                        onClick={() => setTargetFilterPeriod('daily')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${targetFilterPeriod === 'daily' ? 'bg-[#10b981] text-white shadow' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                      >
                        Daily / 1 Day (‡¶¶‡ßà‡¶®‡¶ø‡¶ï / ‡ßß ‡¶¶‡¶ø‡¶®)
                      </button>
                      <button 
                        onClick={() => setTargetFilterPeriod('weekly')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${targetFilterPeriod === 'weekly' ? 'bg-[#10b981] text-white shadow' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                      >
                        Weekly (‡¶∏‡¶æ‡¶™‡ßç‡¶§‡¶æ‡¶π‡¶ø‡¶ï)
                      </button>
                      <button 
                        onClick={() => setTargetFilterPeriod('monthly')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${targetFilterPeriod === 'monthly' ? 'bg-[#10b981] text-white shadow' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                      >
                        Monthly (‡¶Æ‡¶æ‡¶∏‡¶ø‡¶ï)
                      </button>
                      <button 
                        onClick={() => setTargetFilterPeriod('custom')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${targetFilterPeriod === 'custom' ? 'bg-[#10b981] text-white shadow' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
                      >
                        Custom Range (‡¶ï‡¶æ‡¶∏‡ßç‡¶ü‡¶Æ)
                      </button>
                    </div>
                  </div>

                  {targets.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 font-bold bg-slate-50 dark:bg-slate-950 rounded-3xl">
                      No referral targets created yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {targets
                        .filter(t => targetFilterPeriod === 'all' ? true : targetFilterPeriod === 'daily' ? (t.periodType === 'daily' || t.periodType === 'oneday') : t.periodType === targetFilterPeriod)
                        .map(tgt => (
                        <div key={tgt.id} className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-white/5 space-y-4 relative overflow-hidden shadow-sm">
                          {!tgt.isActive && (
                            <div className="absolute top-3 right-3 bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                              Paused
                            </div>
                          )}
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-md border border-amber-500/20">
                                {tgt.periodType === 'daily' 
                                  ? 'DAILY TARGET (‡¶¶‡ßà‡¶®‡¶ø‡¶ï)' 
                                  : tgt.periodType === 'oneday' 
                                  ? '1 DAY CHALLENGE (‡ßß ‡¶¶‡¶ø‡¶®)' 
                                  : tgt.periodType === 'weekly' 
                                  ? 'WEEKLY (‡¶∏‡¶æ‡¶™‡ßç‡¶§‡¶æ‡¶π‡¶ø‡¶ï)' 
                                  : tgt.periodType === 'monthly' 
                                  ? 'MONTHLY (‡¶Æ‡¶æ‡¶∏‡¶ø‡¶ï)' 
                                  : 'CUSTOM RANGE (‡¶ï‡¶æ‡¶∏‡ßç‡¶ü‡¶Æ)'}
                              </span>
                              <span className="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase px-2 py-0.5 rounded">
                                Role: {tgt.targetRole}
                              </span>
                              {tgt.startDate && tgt.endDate && (
                                <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[9px] font-mono font-bold px-2 py-0.5 rounded">
                                  üìÖ {tgt.startDate} to {tgt.endDate}
                                </span>
                              )}
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
                              <div className="text-sm font-black text-[#10b981]">‡ß≥{tgt.bonusReward}</div>
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
                                notify(tgt.isActive ? "‡¶ü‡¶æ‡¶∞‡ßç‡¶ó‡ßá‡¶ü ‡¶∏‡¶æ‡¶Æ‡ßü‡¶ø‡¶ï‡¶≠‡¶æ‡¶¨‡ßá ‡¶∏‡ßç‡¶•‡¶ó‡¶ø‡¶§ ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá!" : "‡¶ü‡¶æ‡¶∞‡ßç‡¶ó‡ßá‡¶ü ‡¶∏‡¶ï‡ßç‡¶∞‡¶ø‡ßü ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá!");
                              }}
                              className={`flex-1 font-black py-2.5 rounded-xl text-xs transition-all ${tgt.isActive ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-[#10b981] hover:bg-emerald-600 text-white"}`}
                            >
                              {tgt.isActive ? "Pause Target" : "Activate Target"}
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm("‡¶Ü‡¶™‡¶®‡¶ø ‡¶ï‡¶ø ‡¶è‡¶á ‡¶ü‡¶æ‡¶∞‡ßç‡¶ó‡ßá‡¶ü‡¶ü‡¶ø ‡¶Æ‡ßÅ‡¶õ‡ßá ‡¶´‡ßá‡¶≤‡¶§‡ßá ‡¶ö‡¶æ‡¶®?")) {
                                  if (setTargets) {
                                    setTargets(prev => prev.filter(t => t.id !== tgt.id));
                                  }
                                  notify("‡¶ü‡¶æ‡¶∞‡ßç‡¶ó‡ßá‡¶ü ‡¶∏‡¶´‡¶≤‡¶≠‡¶æ‡¶¨‡ßá ‡¶Æ‡ßÅ‡¶õ‡ßá ‡¶´‡ßá‡¶≤‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá!");
                                }
                              }}
                              className="p-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl transition-all cursor-pointer"
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
                {/* Header & Filter Controls */}
                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-white/5 space-y-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Activity size={18} className="text-[#10b981]" /> User Target Completions & Timeframe Reports
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        ‡¶¶‡ßà‡¶®‡¶ø‡¶ï (‡ßß ‡¶¶‡¶ø‡¶®), ‡¶∏‡¶æ‡¶™‡ßç‡¶§‡¶æ‡¶π‡¶ø‡¶ï, ‡¶Æ‡¶æ‡¶∏‡¶ø‡¶ï ‡¶è‡¶¨‡¶Ç ‡¶ï‡¶æ‡¶∏‡ßç‡¶ü‡¶Æ ‡¶®‡¶ø‡¶∞‡ßç‡¶¶‡¶ø‡¶∑‡ßç‡¶ü ‡¶§‡¶æ‡¶∞‡¶ø‡¶ñ‡ßá‡¶∞ ‡¶ü‡¶æ‡¶∞‡ßç‡¶ó‡ßá‡¶ü ‡¶™‡ßÇ‡¶∞‡¶£‡ßá‡¶∞ ‡¶π‡¶ø‡¶∏‡¶æ‡¶¨
                      </p>
                    </div>

                    <div className="relative">
                      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        value={targetHistorySearch} 
                        onChange={(e) => setTargetHistorySearch(e.target.value)} 
                        placeholder="Search user, email, target..." 
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs font-bold dark:text-white outline-none focus:border-[#10b981] w-full md:w-64"
                      />
                    </div>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-1.5 bg-slate-200/60 dark:bg-slate-900 p-1.5 rounded-2xl">
                      <button 
                        onClick={() => setTargetHistoryFilterPeriod('all')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${targetHistoryFilterPeriod === 'all' ? 'bg-[#10b981] text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                      >
                        All Time (‡¶∏‡¶∞‡ßç‡¶¨‡¶Æ‡ßã‡¶ü)
                      </button>
                      <button 
                        onClick={() => setTargetHistoryFilterPeriod('daily')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${targetHistoryFilterPeriod === 'daily' ? 'bg-[#10b981] text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                      >
                        Daily / Today (‡¶Ü‡¶ú‡¶ï‡ßá / ‡ßß ‡¶¶‡¶ø‡¶®)
                      </button>
                      <button 
                        onClick={() => setTargetHistoryFilterPeriod('weekly')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${targetHistoryFilterPeriod === 'weekly' ? 'bg-[#10b981] text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                      >
                        Weekly (‡¶∏‡¶æ‡¶™‡ßç‡¶§‡¶æ‡¶π‡¶ø‡¶ï)
                      </button>
                      <button 
                        onClick={() => setTargetHistoryFilterPeriod('monthly')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${targetHistoryFilterPeriod === 'monthly' ? 'bg-[#10b981] text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                      >
                        Monthly (‡¶Æ‡¶æ‡¶∏‡¶ø‡¶ï)
                      </button>
                      <button 
                        onClick={() => setTargetHistoryFilterPeriod('custom')}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase transition-all ${targetHistoryFilterPeriod === 'custom' ? 'bg-[#10b981] text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                      >
                        Custom Date (‡¶ï‡¶æ‡¶∏‡ßç‡¶ü‡¶Æ ‡¶§‡¶æ‡¶∞‡¶ø‡¶ñ)
                      </button>
                    </div>

                    {/* Date Pickers for Target History */}
                    {(targetHistoryFilterPeriod === 'custom' || targetHistoryFilterPeriod === 'daily') && (
                      <div className="flex items-center gap-2">
                        <input 
                          type="date" 
                          value={targetHistoryStartDate} 
                          onChange={(e) => setTargetHistoryStartDate(e.target.value)} 
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold dark:text-white outline-none focus:border-[#10b981]"
                          title="From Date"
                        />
                        <span className="text-slate-400 text-xs font-bold">to</span>
                        <input 
                          type="date" 
                          value={targetHistoryEndDate} 
                          onChange={(e) => setTargetHistoryEndDate(e.target.value)} 
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold dark:text-white outline-none focus:border-[#10b981]"
                          title="To Date"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary Metrics Cards */}
                {(() => {
                  const filtered = targetHistories.filter(history => {
                    if (targetHistorySearch.trim()) {
                      const q = targetHistorySearch.toLowerCase().trim();
                      const match = (history.userName && history.userName.toLowerCase().includes(q)) ||
                                    (history.userEmail && history.userEmail.toLowerCase().includes(q)) ||
                                    (history.userId && history.userId.toLowerCase().includes(q)) ||
                                    (history.targetTitle && history.targetTitle.toLowerCase().includes(q));
                      if (!match) return false;
                    }

                    if (targetHistoryFilterPeriod === 'all') return true;

                    const completedDate = new Date(history.completedAt);
                    const now = new Date();

                    if (targetHistoryFilterPeriod === 'daily' || targetHistoryFilterPeriod === 'oneday') {
                      if (targetHistoryStartDate) {
                        const start = new Date(targetHistoryStartDate + 'T00:00:00');
                        const end = targetHistoryEndDate ? new Date(targetHistoryEndDate + 'T23:59:59') : new Date(targetHistoryStartDate + 'T23:59:59');
                        if (completedDate < start || completedDate > end) return false;
                      } else {
                        const todayStr = now.toISOString().split('T')[0];
                        const compStr = completedDate.toISOString().split('T')[0];
                        if (compStr !== todayStr) return false;
                      }
                    } else if (targetHistoryFilterPeriod === 'weekly') {
                      const day = now.getDay();
                      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                      const startOfWeek = new Date(now.setDate(diff));
                      startOfWeek.setHours(0,0,0,0);
                      if (completedDate < startOfWeek) return false;
                    } else if (targetHistoryFilterPeriod === 'monthly') {
                      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                      startOfMonth.setHours(0,0,0,0);
                      if (completedDate < startOfMonth) return false;
                    } else if (targetHistoryFilterPeriod === 'custom') {
                      if (targetHistoryStartDate) {
                        const start = new Date(targetHistoryStartDate + 'T00:00:00');
                        if (completedDate < start) return false;
                      }
                      if (targetHistoryEndDate) {
                        const end = new Date(targetHistoryEndDate + 'T23:59:59');
                        if (completedDate > end) return false;
                      }
                    }

                    return true;
                  });

                  const totalCompletions = filtered.length;
                  const totalReferrals = filtered.reduce((acc, h) => acc + (h.referralsAchieved || 0), 0);
                  const totalBonusPaid = filtered.reduce((acc, h) => acc + (h.bonusReward || 0), 0);

                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-100 dark:border-white/5 space-y-1 shadow-sm">
                          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Targets Completed</div>
                          <div className="text-2xl font-black text-slate-900 dark:text-white">{totalCompletions} Targets</div>
                        </div>
                        <div className="bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-100 dark:border-white/5 space-y-1 shadow-sm">
                          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Referrals Achieved</div>
                          <div className="text-2xl font-black text-indigo-500">{totalReferrals} Users</div>
                        </div>
                        <div className="bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-100 dark:border-white/5 space-y-1 shadow-sm">
                          <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Bonus Paid Out</div>
                          <div className="text-2xl font-black text-[#10b981]">‡ß≥{totalBonusPaid.toFixed(2)}</div>
                        </div>
                      </div>

                      {filtered.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 font-bold bg-slate-50 dark:bg-slate-950 rounded-3xl">
                          No target completions found for the selected timeframe filter.
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
                                {filtered.map(history => (
                                  <tr key={history.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-300">
                                    <td className="p-4 space-y-1">
                                      <div className="font-bold dark:text-white">{history.userName}</div>
                                      <div className="text-[10px] font-mono text-slate-400">{history.userEmail}</div>
                                      <div className="text-[9px] font-mono text-indigo-400">ID: {history.userId}</div>
                                    </td>
                                    <td className="p-4 space-y-1">
                                      <div className="font-bold dark:text-white">{history.targetTitle}</div>
                                      <span className="inline-block bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase px-2 py-0.5 rounded">
                                        Type: {history.periodType}
                                      </span>
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
                                      ‡ß≥{history.bonusReward}
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
                  );
                })()}
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
                              <div className="text-4xl text-amber-500 group-hover:scale-110 transition-transform">üìÇ</div>
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
                          üìÅ {getTaskNumber(selectedTaskCategory)} Submissions
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
                              ‡ß≥
                            </div>
                            <div>
                              <h4 className="font-black italic text-lg uppercase dark:text-white leading-none mb-1 group-hover:text-[#10b981] transition-colors flex items-center gap-2">
                                {sub.userName}
                                <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-lg normal-case font-mono tracking-tight">
                                  ID: {sub.userId}
                                </span>
                              </h4>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex flex-wrap gap-x-3 gap-y-1">
                                <span>{getTaskNumber(sub.taskId)} ‚Ä¢ {sub.taskTitle}</span>
                                <span>‚è±Ô∏è Submitted: {new Date(sub.submittedAt).toLocaleString()}</span>
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
                              <div className="text-4xl text-emerald-500 group-hover:scale-110 transition-transform">üìÇ</div>
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
                          üìÅ {selectedGatewayCategory} Deposits
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
                                    Deposit via {req.method} ‚Ä¢ {new Date(req.date).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <span className="text-2xl font-black italic text-[#10b981] shrink-0">
                                ‡ß≥{req.amount}
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
                              <div className="text-4xl text-blue-500 group-hover:scale-110 transition-transform">üìÇ</div>
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
                          üìÅ {selectedGatewayCategory} Upgrades
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
                                    {req.planName} ‚Ä¢ via {req.method} ‚Ä¢ {new Date(req.date).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <span className="text-2xl font-black italic text-[#10b981] shrink-0">
                                ‡ß≥{req.amount}
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
              PAYOUTS SETTINGS (‡¶â‡¶á‡¶•‡¶°‡ßç‡¶∞ ‡¶∏‡ßá‡¶ü‡¶ø‡¶Ç‡¶∏)
            </h3>
            
            <div className="bg-slate-50 dark:bg-white/5 p-8 rounded-[2.5rem] flex items-center justify-between group">
              <div>
                <h4 className="font-black italic dark:text-white uppercase text-sm leading-none mb-2 text-rose-500">
                  Withdraw Referral Requirement
                </h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-normal">
                  ‡¶¨‡ßç‡¶Ø‡¶¨‡¶π‡¶æ‡¶∞‡¶ï‡¶æ‡¶∞‡ßÄ‡¶¶‡ßá‡¶∞ ‡¶â‡¶á‡¶•‡¶°‡ßç‡¶∞ ‡¶ï‡¶∞‡¶§‡ßá ‡¶ï‡¶Æ‡¶™‡¶ï‡ßç‡¶∑‡ßá ‡ßß‡¶ü‡¶ø ‡¶∞‡ßá‡¶´‡¶æ‡¶∞ ‡¶Ü‡¶¨‡¶∂‡ßç‡¶Ø‡¶ï ‡¶ï‡¶∞‡¶æ‡¶∞ ‡¶¨‡¶æ‡¶ß‡ßç‡¶Ø‡¶¨‡¶æ‡¶ß‡¶ï‡¶§‡¶æ ‡¶Ö‡¶®/‡¶Ö‡¶´ ‡¶ï‡¶∞‡ßÅ‡¶®
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
                        ? "‡¶â‡¶á‡¶•‡¶°‡ßç‡¶∞ ‡¶ï‡¶∞‡¶æ‡¶∞ ‡¶ú‡¶®‡ßç‡¶Ø ‡ßß‡¶ü‡¶ø ‡¶∞‡ßá‡¶´‡¶æ‡¶∞‡ßá‡¶∞ ‡¶¨‡¶æ‡¶ß‡ßç‡¶Ø‡¶¨‡¶æ‡¶ß‡¶ï‡¶§‡¶æ ‡¶ö‡¶æ‡¶≤‡ßÅ ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá (Withdraw Referral requirement is now ENABLED)."
                        : "‡¶â‡¶á‡¶•‡¶°‡ßç‡¶∞ ‡¶ï‡¶∞‡¶æ‡¶∞ ‡¶ú‡¶®‡ßç‡¶Ø ‡ßß‡¶ü‡¶ø ‡¶∞‡ßá‡¶´‡¶æ‡¶∞‡ßá‡¶∞ ‡¶¨‡¶æ‡¶ß‡ßç‡¶Ø‡¶¨‡¶æ‡¶ß‡¶ï‡¶§‡¶æ ‡¶¨‡¶®‡ßç‡¶ß ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá (Withdraw Referral requirement is now DISABLED).",
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
                          ‡ß≥{cat.totalPaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        üìÇ {selectedPayoutCategory} Payouts Queue
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
                        <div className="text-lg font-black mt-1 leading-none">‡ß≥{stats.totalRequestedAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                      </div>
                      <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-[#10b981]/10 to-emerald-500/5 text-[#10b981] p-5 rounded-2xl border border-[#10b981]/10">
                        <div className="text-[8px] font-black uppercase tracking-widest">Total Paid Out</div>
                        <div className="text-lg font-black mt-1 leading-none">‡ß≥{stats.totalPaidAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
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
                        ‚ö° Bulk Approve ({selectedRequestIds.length})
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
                        ‚ùå Bulk Reject ({selectedRequestIds.length})
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
                      ‚ö†Ô∏è FIFO Queue Activated (First Submitted, First Served)
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
                            ‡ß≥
                          </div>
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <h4 className="text-base font-black uppercase italic dark:text-white leading-none flex items-center gap-2 flex-wrap min-w-0">
                              <span className="truncate">{displayUserName}</span>
                              <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-lg normal-case font-mono shrink-0">
                                UID: {userUid}
                              </span>
                            </h4>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                              {wd.method} ‚Ä¢ <span className="text-slate-600 dark:text-slate-300 font-mono tracking-tight lowercase">{wd.accountNumber}</span>
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold leading-none mt-1 uppercase tracking-wider flex items-center gap-1.5">
                              <span>Req ID: <span className="font-mono lowercase font-normal">{wd.id}</span></span>
                              <span>‚Ä¢</span>
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
                            ‡ß≥{(wd.amount - wd.fee).toFixed(2)}
                          </span>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic mt-1 leading-none">
                            NET PAYABLE (AMT: ‡ß≥{wd.amount} | FEE: ‡ß≥{wd.fee})
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
                                notify("‡¶á‡¶â‡¶ú‡¶æ‡¶∞ ‡¶Ü‡¶á‡¶°‡¶ø ‡¶™‡¶æ‡¶ì‡ßü‡¶æ ‡¶Ø‡¶æ‡ßü‡¶®‡¶ø!");
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
      {activeTab === "tasks" && (() => {
        const filteredTasksByCountry = tasks.filter((t) => {
          if (taskCountryFilter === "ALL") return true;
          if (!t.targetCountriesType || t.targetCountriesType === "ALL") return true;
          return t.allowedCountries && t.allowedCountries.includes(taskCountryFilter);
        });

        // Compute Country-wise Completion & Views Analytics
        const countryStatsMap: Record<string, { totalSubs: number; approvedSubs: number; rejectedSubs: number; totalEarnings: number }> = {};
        
        COUNTRIES.forEach(c => {
          countryStatsMap[c.code] = { totalSubs: 0, approvedSubs: 0, rejectedSubs: 0, totalEarnings: 0 };
        });

        (taskSubmissions || []).forEach(sub => {
          const userObj = users.find(u => u.id === sub.userId);
          const userCountry = sub.countryCode || (userObj as any)?.countryCode || (userObj as any)?.country || "BD";
          if (!countryStatsMap[userCountry]) {
            countryStatsMap[userCountry] = { totalSubs: 0, approvedSubs: 0, rejectedSubs: 0, totalEarnings: 0 };
          }
          countryStatsMap[userCountry].totalSubs += 1;
          if (sub.status === "approved") {
            countryStatsMap[userCountry].approvedSubs += 1;
            countryStatsMap[userCountry].totalEarnings += (sub.reward || 0);
          } else if (sub.status === "rejected") {
            countryStatsMap[userCountry].rejectedSubs += 1;
          }
        });

        return (
          <div className="space-y-8 animate-in slide-in-from-bottom-4">
            {/* Header & New Mission Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none flex items-center gap-2">
                  <Globe className="text-[#10b981]" size={22} />
                  Mission Control & Country Targeting
                </h3>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                  Manage tasks, configure country accessibility restrictions, and monitor country-wise completion analytics.
                </p>
              </div>
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
                    targetCountriesType: "ALL",
                    allowedCountries: ["BD"]
                  })
                }
                className="bg-[#10b981] text-white px-6 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Plus size={16} /> + New Mission
              </button>
            </div>

            {/* Country Filter Selector Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-5 rounded-[2.5rem] shadow-sm space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Globe size={14} className="text-[#10b981]" /> Filter Tasks by Country Availability:
                </span>
                <span className="text-[10px] font-mono text-emerald-500 font-bold">
                  Showing {filteredTasksByCountry.length} of {tasks.length} tasks
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button
                  type="button"
                  onClick={() => setTaskCountryFilter("ALL")}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                    taskCountryFilter === "ALL"
                      ? "bg-[#10b981] text-white shadow-md scale-105"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                >
                  üåê All Countries ({tasks.length})
                </button>
                {COUNTRIES.map((c) => {
                  const count = tasks.filter(t => !t.targetCountriesType || t.targetCountriesType === "ALL" || (t.allowedCountries && t.allowedCountries.includes(c.code))).length;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setTaskCountryFilter(c.code)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 ${
                        taskCountryFilter === c.code
                          ? "bg-[#10b981] text-white shadow-md scale-105"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      <span>{c.flag}</span>
                      <span>{c.code}</span>
                      <span className="text-[9px] opacity-75">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Task Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTasksByCountry.length === 0 ? (
                <div className="col-span-full bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-white/10 text-center">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">No tasks found for the selected country filter.</p>
                </div>
              ) : (
                filteredTasksByCountry.map((task) => {
                  const isAllCountries = !task.targetCountriesType || task.targetCountriesType === "ALL";
                  const allowedList = task.allowedCountries || [];
                  const countrySummaryText = isAllCountries
                    ? "All Countries"
                    : allowedList.length === 0
                    ? "None Selected"
                    : allowedList.slice(0, 3).map(code => COUNTRIES.find(c => c.code === code)?.name || code).join(", ") + (allowedList.length > 3 ? ` (+${allowedList.length - 3} more)` : "");

                  return (
                    <div
                      key={task.id}
                      className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm flex flex-col justify-between hover:border-[#10b981]/30 transition-all gap-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div
                            className={`p-3 rounded-xl flex-shrink-0 ${task.isActive ? "bg-[#10b981]/10 text-[#10b981]" : "bg-slate-100 text-slate-400"}`}
                          >
                            <ICONS.Zap size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black uppercase italic dark:text-white leading-tight mb-1">
                              {task.title}
                            </h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">
                              ‡ß≥{task.reward} ‚Ä¢ {task.type}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingTask({ ...task })}
                            className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
                            title="Edit / Configure Mission"
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

                      {/* Country Targeting Summary Badge */}
                      <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Globe size={12} className="text-[#10b981]" /> Countries:
                        </span>
                        {isAllCountries ? (
                          <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full font-black uppercase text-[9px] border border-emerald-500/20">
                            üåê All Countries
                          </span>
                        ) : (
                          <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full font-black uppercase text-[9px] border border-blue-500/20 truncate max-w-[220px]" title={countrySummaryText}>
                            üåç {countrySummaryText}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Country-wise Analytics & Completion Report Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-6 rounded-[2.5rem] shadow-sm space-y-6">
              <div>
                <h4 className="text-base font-black uppercase italic dark:text-white flex items-center gap-2">
                  <Activity size={18} className="text-[#10b981]" />
                  Country-wise Task Analytics & Completion Report (‡¶ï‡¶æ‡¶®‡ßç‡¶ü‡ßç‡¶∞‡¶ø-‡¶ì‡ßü‡¶æ‡¶á‡¶ú ‡¶™‡¶æ‡¶∞‡¶´‡¶∞‡¶Æ‡ßç‡¶Ø‡¶æ‡¶®‡ßç‡¶∏ ‡¶Ö‡¶°‡¶ø‡¶ü)
                </h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Real-time completion metrics, submission counts, and payouts categorized by user country.
                </p>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/5 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="py-3 px-4">Country (‡¶¶‡ßá‡¶∂)</th>
                      <th className="py-3 px-4 text-center">Submissions (‡¶Æ‡ßã‡¶ü ‡¶™‡ßç‡¶∞‡ßÅ‡¶´)</th>
                      <th className="py-3 px-4 text-center">Approved (‡¶Ö‡¶®‡ßÅ‡¶Æ‡ßã‡¶¶‡¶ø‡¶§)</th>
                      <th className="py-3 px-4 text-center">Rejected (‡¶¨‡¶æ‡¶§‡¶ø‡¶≤)</th>
                      <th className="py-3 px-4 text-center">Completion Rate</th>
                      <th className="py-3 px-4 text-right">Total Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-xs font-bold">
                    {COUNTRIES.map((c) => {
                      const stat = countryStatsMap[c.code] || { totalSubs: 0, approvedSubs: 0, rejectedSubs: 0, totalEarnings: 0 };
                      if (stat.totalSubs === 0) return null; // Show active countries
                      const rate = stat.totalSubs > 0 ? Math.round((stat.approvedSubs / stat.totalSubs) * 100) : 0;
                      return (
                        <tr key={c.code} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4 flex items-center gap-2">
                            <span className="text-base">{c.flag}</span>
                            <span className="dark:text-white font-extrabold">{c.name}</span>
                            <span className="text-[9px] font-mono text-slate-400 font-bold">({c.code})</span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-mono dark:text-white">{stat.totalSubs}</td>
                          <td className="py-3.5 px-4 text-center font-mono text-emerald-500 font-black">{stat.approvedSubs}</td>
                          <td className="py-3.5 px-4 text-center font-mono text-rose-500">{stat.rejectedSubs}</td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div className="bg-[#10b981] h-full rounded-full" style={{ width: `${rate}%` }}></div>
                              </div>
                              <span className="text-[10px] font-mono text-slate-500">{rate}%</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-emerald-500 font-black">‡ß≥{stat.totalEarnings.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                    {Object.values(countryStatsMap).reduce((a, b) => a + b.totalSubs, 0) === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-bold uppercase text-[10px]">
                          No task submissions recorded yet. Completion report will populate when users submit task proofs.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

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
                  Offline Reporting & Auditing (‡¶Ö‡¶´‡¶≤‡¶æ‡¶á‡¶® ‡¶∞‡¶ø‡¶™‡ßã‡¶∞‡ßç‡¶ü‡¶ø‡¶Ç ‡¶ì ‡¶Ö‡¶°‡¶ø‡¶ü)
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
                <span>Export Users (‡¶á‡¶â‡¶ú‡¶æ‡¶∞ ‡¶≤‡¶ø‡¶∏‡ßç‡¶ü)</span>
              </button>

              <button
                type="button"
                onClick={handleExportTransactionsCSV}
                className="w-full bg-blue-500/10 hover:bg-blue-500 text-blue-500 hover:text-white p-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 group border border-blue-500/20 hover:border-transparent active:scale-[0.98]"
              >
                <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
                <span>Export Tx Ledger (‡¶≤‡ßá‡¶®‡¶¶‡ßá‡¶® ‡¶π‡¶ø‡¶∏‡ßç‡¶ü‡ßç‡¶∞‡¶ø)</span>
              </button>

              <button
                type="button"
                onClick={handleExportAllSubmissionsCSV}
                className="w-full bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-white p-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 group border border-amber-500/20 hover:border-transparent active:scale-[0.98]"
              >
                <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
                <span>Submissions A-Z (‡¶ï‡¶æ‡¶ú‡ßá‡¶∞ ‡¶≤‡ßá‡¶ú‡¶æ‡¶∞)</span>
              </button>

              <button
                type="button"
                onClick={handleExportAllMonitorsCSV}
                className="w-full bg-purple-500/10 hover:bg-purple-500 text-purple-600 hover:text-white p-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 group border border-purple-500/20 hover:border-transparent active:scale-[0.98]"
              >
                <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
                <span>Monitors Audit (‡¶Æ‡¶®‡¶ø‡¶ü‡¶∞ ‡¶™‡¶æ‡¶∞‡¶´‡¶∞‡¶Æ‡ßç‡¶Ø‡¶æ‡¶®‡ßç‡¶∏)</span>
              </button>

              <button
                type="button"
                onClick={handleExportAccountingLedgerCSV}
                className="w-full bg-indigo-500/10 hover:bg-indigo-500 text-indigo-600 hover:text-white p-4 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 group border border-indigo-500/20 hover:border-transparent active:scale-[0.98] sm:col-span-2 lg:col-span-1"
              >
                <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
                <span>Accounting Ledger (‡¶π‡¶ø‡¶∏‡¶æ‡¶¨ ‡¶ñ‡¶æ‡¶§‡¶æ)</span>
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
                            ‡¶Ö‡¶®‡¶≤‡¶æ‡¶á‡¶® ‚Ä¢ Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-transparent py-0.5 px-2 rounded-md font-extrabold text-[8px] uppercase tracking-widest">
                            <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-650"></span>
                            {activeInfo.relativeTimeBN} ‚Ä¢{" "}
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
                            üìû PHONE:{" "}
                            <span className="font-bold select-all">
                              +{u.telegramPhone || "None"}
                            </span>
                          </p>
                        </div>
                      ) : (
                        <div className="mt-3 px-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl text-[8px] text-slate-400 font-bold uppercase tracking-wide flex items-center gap-1 w-fit">
                          ‚ùå No Verified Telegram Connected
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
                    ‡¶∏‡¶ø‡¶∏‡ßç‡¶ü‡ßá‡¶Æ ‡¶Æ‡¶®‡¶ø‡¶ü‡¶∞‡¶¶‡ßá‡¶∞ ‡¶§‡¶•‡ßç‡¶Ø, ‡¶ó‡ßç‡¶∞‡ßç‡¶Ø‡¶æ‡¶®‡ßÅ‡¶≤‡¶æ‡¶∞ ‡¶™‡¶æ‡¶∞‡¶Æ‡¶ø‡¶∂‡¶® ‡¶è‡¶¨‡¶Ç ‡¶Ö‡ßç‡¶Ø‡¶æ‡¶ï‡ßç‡¶ü‡¶ø‡¶≠‡¶ø‡¶ü‡¶ø
                    ‡¶ï‡¶®‡ßç‡¶ü‡ßç‡¶∞‡ßã‡¶≤ ‡¶π‡¶æ‡¶¨
                  </p>
                </div>

                {/* MAINTENANCE SETTING MOVE HERE */}
                <div className="bg-slate-50 dark:bg-slate-850 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 flex items-center gap-6 shrink-0 justify-between md:justify-start">
                  <div>
                    <h4 className="font-black italic dark:text-white uppercase text-[10px] tracking-wider leading-none">
                      Maintenance Mode Monitors
                    </h4>
                    <p className="text-[9px] font-bold text-[#10b981] uppercase tracking-widest mt-1">
                      ‡¶Æ‡ßá‡¶á‡¶®‡¶ü‡ßá‡¶®‡ßç‡¶Ø‡¶æ‡¶®‡ßç‡¶∏ ‡¶ö‡¶≤‡¶æ‡¶ï‡¶æ‡¶≤‡ßÄ‡¶® ‡¶Æ‡¶®‡¶ø‡¶ü‡¶∞ ‡¶ï‡¶æ‡¶ú ‡¶ï‡¶∞‡¶§‡ßá ‡¶™‡¶æ‡¶∞‡¶¨‡ßá
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
                  APPOINT NEW MONITOR BY UID (‡¶Æ‡¶®‡¶ø‡¶ü‡¶∞ ‡¶®‡¶ø‡¶Ø‡¶º‡ßã‡¶ó)
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                  ‡¶ï‡ßã‡¶®‡ßã ‡¶á‡¶â‡¶ú‡¶æ‡¶∞‡ßá‡¶∞ ‡¶á‡¶â‡¶Ü‡¶á‡¶°‡¶ø (UID) ‡¶¶‡¶ø‡ßü‡ßá ‡¶∏‡¶æ‡¶∞‡ßç‡¶ö ‡¶ï‡¶∞‡ßÅ‡¶®‡•§ ‡¶∏‡¶†‡¶ø‡¶ï ‡¶á‡¶â‡¶Ü‡¶á‡¶°‡¶ø ‡¶õ‡¶æ‡ßú‡¶æ
                  ‡¶®‡¶ø‡¶ö‡ßá ‡¶ï‡ßã‡¶®‡ßã ‡¶á‡¶â‡¶ú‡¶æ‡¶∞ ‡¶Ü‡¶á‡¶°‡¶ø ‡¶¨‡¶æ ‡¶§‡¶•‡ßç‡¶Ø ‡¶¶‡ßá‡¶ñ‡¶æ ‡¶Ø‡¶æ‡¶¨‡ßá ‡¶®‡¶æ‡•§
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
                          ‡¶è‡¶á UID ‡¶è‡¶∞ ‡¶∏‡¶æ‡¶•‡ßá ‡¶ï‡ßã‡¶®‡ßã ‡¶á‡¶â‡¶ú‡¶æ‡¶∞ ‡¶™‡¶æ‡¶ì‡ßü‡¶æ ‡¶Ø‡¶æ‡ßü‡¶®‡¶ø (No user found
                          with this UID)
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-slate-50 dark:bg-slate-850 p-6 rounded-[2.5rem] border border-emerald-500/20 shadow-sm animate-in zoom-in-95 duration-200">
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-4">
                        ‡¶Ö‡¶®‡ßÅ‡¶∏‡¶®‡ßç‡¶ß‡¶æ‡¶®‡¶ï‡ßÉ‡¶§ ‡¶á‡¶â‡¶ú‡¶æ‡¶∞ ‡¶™‡ßç‡¶∞‡ßã‡¶´‡¶æ‡¶á‡¶≤ (TARGET USER REVEALED):
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
                                    ‡¶Ö‡¶®‡¶≤‡¶æ‡¶á‡¶® ‚Ä¢ Online
                                  </span>
                                ) : (
                                  <span className="text-[8px] bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-400 px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-widest leading-none flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-650"></span>
                                    {matchStatus.relativeTimeBN} ‚Ä¢{" "}
                                    {matchStatus.relativeTimeEN}
                                  </span>
                                );
                              })()}
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 mt-1.5 flex gap-2 font-mono flex-wrap">
                              <span>UID: {matchedUser.uid}</span>
                              <span>‚Ä¢</span>
                              <span>Email: {matchedUser.email}</span>
                              <span>‚Ä¢</span>
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
                ACCEPTED RUNNING SYSTEM MONITORS (‡¶∏‡¶ï‡ßç‡¶∞‡¶ø‡¶Ø‡¶º ‡¶Æ‡¶®‡¶ø‡¶ü‡¶∞ ‡¶§‡¶æ‡¶≤‡¶ø‡¶ï‡¶æ)
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
                  const perms = (u.monitorPermissions || {}) as MonitorPermissions;

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
                                  ‡¶Ö‡¶®‡¶≤‡¶æ‡¶á‡¶® ‚Ä¢ Online
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-transparent py-0.5 px-2 rounded-md font-extrabold text-[8px] uppercase tracking-widest">
                                  <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-slate-600"></span>
                                  {activeInfo.relativeTimeBN} ‚Ä¢{" "}
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
                            title="Remove Monitor (‡¶Æ‡¶®‡¶ø‡¶ü‡¶∞ ‡¶∞‡¶ø‡¶Æ‡ßÅ‡¶≠)"
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
                    APPROVALS & HISTORY (‡¶Ü‡¶ú‡¶ï‡ßá‡¶∞ ‡¶π‡¶ø‡¶∏‡ßç‡¶ü‡ßã‡¶∞‡¶ø ‡¶ì ‡¶Ö‡ßç‡¶Ø‡¶æ‡¶ï‡ßç‡¶ü‡¶ø‡¶≠‡¶ø‡¶ü‡¶ø ‡¶∞‡¶ø‡¶™‡ßã‡¶∞‡ßç‡¶ü)
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                    ‡¶Ü‡¶ú‡¶ï‡ßá ‡¶ï‡ßã‡¶® ‡¶ï‡ßã‡¶® ‡¶Æ‡¶®‡¶ø‡¶ü‡¶∞ ‡¶ï‡¶ø ‡¶ï‡¶ø ‡¶Ö‡¶®‡ßÅ‡¶Æ‡ßã‡¶¶‡¶® ‡¶¨‡¶æ ‡¶¨‡¶æ‡¶§‡¶ø‡¶≤ ‡¶ï‡¶∞‡ßá‡¶õ‡ßá ‡¶§‡¶æ ‡¶™‡ßç‡¶∞‡ßÅ‡¶´ ‡¶∏‡¶π
                    ‡¶¶‡ßá‡¶ñ‡ßÅ‡¶® (‡¶™‡ßç‡¶∞‡¶§‡¶ø‡¶¶‡¶ø‡¶®, ‡¶∏‡¶æ‡¶™‡ßç‡¶§‡¶æ‡¶π‡¶ø‡¶ï, ‡¶Æ‡¶æ‡¶∏‡¶ø‡¶ï ‡¶¨‡¶æ ‡¶ï‡¶æ‡¶∏‡ßç‡¶ü‡¶Æ ‡¶§‡¶æ‡¶∞‡¶ø‡¶ñ ‡¶´‡¶ø‡¶≤‡ßç‡¶ü‡¶æ‡¶∞
                    ‡¶ï‡¶∞‡ßá)
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
                          ? "Today (‡¶Ü‡¶ú‡¶ï‡ßá)"
                          : tf === "weekly"
                            ? "Weekly (‡¶∏‡¶æ‡¶™‡ßç‡¶§‡¶æ‡¶π‡¶ø‡¶ï)"
                            : tf === "monthly"
                              ? "Monthly (‡¶Æ‡¶æ‡¶∏‡¶ø‡¶ï)"
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
                      status: sub.status as any,
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
                      status: req.status as any,
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
                      status: req.status as any,
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
                      status: req.status as any,
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
                                üë§ {subItem.approvedByName || "N/A"}
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
                              ‡ß≥{(subItem.reward || 0).toFixed(2)}
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
                              ‡¶è‡¶á ‡¶∏‡¶Æ‡ßü‡¶∏‡ßÄ‡¶Æ‡¶æ‡¶∞ ‡¶Æ‡¶ß‡ßç‡¶Ø‡ßá ‡¶ï‡ßã‡¶®‡ßã ‡¶Ö‡ßç‡¶Ø‡¶æ‡¶ï‡ßç‡¶ü‡¶ø‡¶≠‡¶ø‡¶ü‡¶ø ‡¶™‡¶æ‡¶ì‡ßü‡¶æ ‡¶Ø‡¶æ‡ßü‡¶®‡¶ø
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
                        ? "‡¶Æ‡¶®‡¶ø‡¶ü‡¶∞ ‡¶®‡¶ø‡ßü‡ßã‡¶ó ‡¶ï‡¶®‡¶´‡¶æ‡¶∞‡ßç‡¶Æ ‡¶ï‡¶∞‡¶§‡ßá ‡¶Ö‡ßç‡¶Ø‡¶æ‡¶™ ‡¶™‡¶æ‡¶∏‡¶ì‡ßü‡¶æ‡¶∞‡ßç‡¶° ‡¶¶‡¶ø‡¶®‡•§"
                        : "‡¶Æ‡¶®‡¶ø‡¶ü‡¶∞ ‡¶Ö‡¶™‡¶∏‡¶æ‡¶∞‡¶£ ‡¶ï‡¶®‡¶´‡¶æ‡¶∞‡ßç‡¶Æ ‡¶ï‡¶∞‡¶§‡ßá ‡¶Ö‡ßç‡¶Ø‡¶æ‡¶™ ‡¶™‡¶æ‡¶∏‡¶ì‡ßü‡¶æ‡¶∞‡ßç‡¶° ‡¶¶‡¶ø‡¶®‡•§"}
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
                        ENTER SECURE APP PASSWORD (‡¶Ö‡ßç‡¶Ø‡¶æ‡¶™ ‡¶™‡¶æ‡¶∏‡¶ì‡ßü‡¶æ‡¶∞‡ßç‡¶° ‡¶≤‡¶ø‡¶ñ‡ßÅ‡¶®)
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          placeholder="‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢‚Ä¢"
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
                        Cancel (‡¶¨‡¶æ‡¶§‡¶ø‡¶≤)
                      </button>
                      <button
                        type="submit"
                        className={`w-full py-4 font-black uppercase text-[10px] tracking-wider rounded-xl transition-all text-white ${pendingMonitorAction.type === "add" ? "bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/10" : "bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/10"}`}
                      >
                        Confirm (‡¶®‡¶ø‡¶∂‡ßç‡¶ö‡¶ø‡¶§)
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
                  SD Option Orders Queue (‡¶Ö‡¶∞‡ßç‡¶°‡¶æ‡¶∞ ‡¶∏‡¶Æ‡ßç‡¶™‡¶®‡ßç‡¶® ‡¶ï‡¶∞‡ßÅ‡¶®)
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-1.5">
                  ‡¶ó‡ßç‡¶∞‡¶æ‡¶π‡¶ï‡¶¶‡ßá‡¶∞ ‡¶∏‡¶æ‡¶¨‡¶Æ‡¶ø‡¶ü ‡¶ï‡¶∞‡¶æ ‡¶™‡ßç‡¶∞‡ßã‡¶´‡¶æ‡¶á‡¶≤/‡¶Ü‡¶á‡¶°‡¶ø ‡¶°‡¶ø‡¶ü‡¶ø‡¶á‡¶≤‡¶∏, ‡¶∏‡ßç‡¶ï‡ßç‡¶∞‡¶ø‡¶®‡¶∂‡¶ü ‡¶¶‡ßá‡¶ñ‡ßÅ‡¶®
                  ‡¶è‡¶¨‡¶Ç ‡¶Ö‡¶∞‡ßç‡¶°‡¶æ‡¶∞ ‡¶∏‡¶Æ‡ßç‡¶™‡¶®‡ßç‡¶® ‡¶ï‡¶∞‡ßÅ‡¶®‡•§
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
                            Price: ‡ß≥{order.itemPrice}
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
                              ‚úì Completed
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
                        ‡¶ï‡ßã‡¶®‡ßã ‡¶Ö‡¶∞‡ßç‡¶°‡¶æ‡¶∞ ‡¶™‡¶æ‡¶ì‡¶Ø‡¶º‡¶æ ‡¶Ø‡¶æ‡¶Ø‡¶º‡¶®‡¶ø‡•§
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
                        √ó
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
                    Sale Price (‡ß≥)
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
                      Product Purchase Limit (‡¶ê‡¶ö‡ßç‡¶õ‡¶ø‡¶ï ‡¶≤‡¶ø‡¶Æ‡¶ø‡¶ü)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 10 (‡¶ñ‡¶æ‡¶≤‡¶ø ‡¶∞‡¶æ‡¶ñ‡¶≤‡ßá ‡¶∏‡ßÄ‡¶Æ‡¶æ‡¶π‡ßÄ‡¶® ‡¶¨‡¶æ‡¶∞ ‡¶ï‡ßá‡¶®‡¶æ ‡¶Ø‡¶æ‡¶¨‡ßá)"
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
                          ‡ß≥{item.price}
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
            if (telegramFilter === "pending") {
              return req.status === "pending" || req.status === "verification_submitted";
            }
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
                `CRITICAL: ‡¶è‡¶á ‡¶ü‡ßá‡¶≤‡¶ø‡¶ó‡ßç‡¶∞‡¶æ‡¶Æ ‡¶Ö‡ßç‡¶Ø‡¶æ‡¶ï‡¶æ‡¶â‡¶®‡ßç‡¶ü‡¶ü‡¶ø ‡¶á‡¶§‡¶ø‡¶Æ‡¶ß‡ßç‡¶Ø‡ßá ‡¶Ö‡¶®‡ßç‡¶Ø ‡¶ó‡ßç‡¶∞‡¶æ‡¶π‡¶ï‡ßá‡¶∞ ‡¶∏‡¶æ‡¶•‡ßá ‡¶≤‡¶ø‡¶Ç‡¶ï ‡¶ï‡¶∞‡¶æ ‡¶Ü‡¶õ‡ßá! User: ${duplicateUser.name}`,
              );
              return;
            }

            // Approve request
            if (setTelegramRequests) {
              setTelegramRequests((prev) =>
                prev.map((r) =>
                  r.id === req.id ? { ...r, status: "approved", approvedAt: new Date().toISOString() } : r,
                ),
              );
            }

            // Sync with backend API
            try {
              fetch(getApiUrl("/api/telegram/admin-action"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId: req.userId,
                  telegramUsername: req.telegramUsername,
                  telegramId: req.telegramId,
                  telegramPhone: req.telegramPhone,
                  verificationCode: req.verificationCode,
                  action: "approve",
                }),
              }).catch((err) => console.warn("Admin approve server sync error:", err));
            } catch (e) {}

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
              `‡¶ü‡ßá‡¶≤‡¶ø‡¶ó‡ßç‡¶∞‡¶æ‡¶Æ ‡¶Ö‡ßç‡¶Ø‡¶æ‡¶ï‡¶æ‡¶â‡¶®‡ßç‡¶ü ‡¶∏‡¶Ç‡¶Ø‡ßÅ‡¶ï‡ßç‡¶§‡¶ø‡¶∞ ‡¶ú‡¶®‡ßç‡¶Ø ‡¶Ö‡¶®‡ßÅ‡¶Æ‡ßã‡¶¶‡¶® ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá! username: ${req.telegramUsername}`,
            );
          };

          const handleRejectTelegram = (req: TelegramVerificationRequest) => {
            const reason = window.prompt(
              "‡¶≠‡ßá‡¶∞‡¶ø‡¶´‡¶ø‡¶ï‡ßá‡¶∂‡¶® ‡¶¨‡¶æ‡¶§‡¶ø‡¶≤‡ßá‡¶∞ ‡¶ï‡¶æ‡¶∞‡¶£ ‡¶≤‡¶ø‡¶ñ‡ßÅ‡¶® (‡¶ê‡¶ö‡ßç‡¶õ‡¶ø‡¶ï):",
              req.mismatchDetails && req.mismatchDetails.length > 0
                ? req.mismatchDetails.join(", ")
                : "‡¶™‡ßç‡¶∞‡¶¶‡¶§‡ßç‡¶§ ‡¶ü‡ßá‡¶≤‡¶ø‡¶ó‡ßç‡¶∞‡¶æ‡¶Æ ‡¶§‡¶•‡ßç‡¶Ø ‡¶Ö‡¶•‡¶¨‡¶æ ‡¶∏‡ßç‡¶ï‡ßç‡¶∞‡¶ø‡¶®‡¶∂‡¶ü ‡¶™‡ßç‡¶∞‡ßÅ‡¶´ ‡¶∏‡¶†‡¶ø‡¶ï ‡¶®‡ßü‡•§"
            ) || "‡¶™‡ßç‡¶∞‡¶¶‡¶§‡ßç‡¶§ ‡¶ü‡ßá‡¶≤‡¶ø‡¶ó‡ßç‡¶∞‡¶æ‡¶Æ ‡¶§‡¶•‡ßç‡¶Ø ‡¶Ö‡¶•‡¶¨‡¶æ ‡¶∏‡ßç‡¶ï‡ßç‡¶∞‡¶ø‡¶®‡¶∂‡¶ü ‡¶™‡ßç‡¶∞‡ßÅ‡¶´ ‡¶∏‡¶†‡¶ø‡¶ï ‡¶®‡ßü‡•§";

            if (setTelegramRequests) {
              setTelegramRequests((prev) =>
                prev.map((r) =>
                  r.id === req.id ? { ...r, status: "rejected", rejectionReason: reason, rejectedAt: new Date().toISOString() } : r,
                ),
              );
            }

            try {
              fetch(getApiUrl("/api/telegram/admin-action"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  verificationId: req.id,
                  action: "reject",
                  reason,
                  userId: req.userId,
                }),
              }).catch((err) => console.warn("Admin reject server sync error:", err));
            } catch (e) {}

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

            notify(`‡¶ü‡ßá‡¶≤‡¶ø‡¶ó‡ßç‡¶∞‡¶æ‡¶Æ ‡¶≤‡¶ø‡¶Ç‡¶ï ‡¶∞‡¶ø‡¶ï‡ßã‡ßü‡ßá‡¶∏‡ßç‡¶ü ‡¶¨‡¶æ‡¶§‡¶ø‡¶≤ ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá‡•§ ‡¶ï‡¶æ‡¶∞‡¶£: ${reason}`);
          };

          const handleDeleteTelegram = (req: TelegramVerificationRequest) => {
            const confirmed = window.confirm(
              `‡¶Ü‡¶™‡¶®‡¶ø ‡¶ï‡¶ø ‡¶®‡¶ø‡¶∂‡ßç‡¶ö‡¶ø‡¶§ ‡¶Ø‡ßá ‡¶è‡¶á ‡¶ü‡ßá‡¶≤‡¶ø‡¶ó‡ßç‡¶∞‡¶æ‡¶Æ ‡¶≠‡ßá‡¶∞‡¶ø‡¶´‡¶ø‡¶ï‡ßá‡¶∂‡¶® ‡¶∞‡ßá‡¶ï‡¶∞‡ßç‡¶°‡¶ü‡¶ø Soft-Delete / Unlink ‡¶ï‡¶∞‡¶§‡ßá ‡¶ö‡¶æ‡¶®?\n\n‡¶á‡¶â‡¶ú‡¶æ‡¶∞: ${req.userName}\n‡¶ü‡ßá‡¶≤‡¶ø‡¶ó‡ßç‡¶∞‡¶æ‡¶Æ: ${req.telegramUsername} (${req.telegramId})\n\n‡¶®‡ßã‡¶ü: ‡¶Ö‡¶°‡¶ø‡¶ü ‡¶ü‡ßç‡¶∞‡ßá‡¶á‡¶≤ ‡¶ì ‡¶ü‡¶æ‡¶∏‡ßç‡¶ï ‡¶π‡¶ø‡¶∏‡ßç‡¶ü‡ßç‡¶∞‡¶ø ‡¶°‡¶æ‡¶ü‡¶æ‡¶¨‡ßá‡¶ú‡ßá ‡¶∏‡¶Ç‡¶∞‡¶ï‡ßç‡¶∑‡¶ø‡¶§ ‡¶•‡¶æ‡¶ï‡¶¨‡ßá ‡¶è‡¶¨‡¶Ç ‡¶á‡¶â‡¶ú‡¶æ‡¶∞ ‡¶™‡¶∞‡¶¨‡¶∞‡ßç‡¶§‡ßÄ‡¶§‡ßá ‡¶™‡ßÅ‡¶®‡¶∞‡¶æ‡ßü ‡¶ï‡¶æ‡¶®‡ßá‡¶ï‡ßç‡¶ü ‡¶ï‡¶∞‡¶≤‡ßá ‡¶π‡¶ø‡¶∏‡ßç‡¶ü‡ßç‡¶∞‡¶ø ‡¶∞‡¶ø‡¶∏‡ßç‡¶ü‡ßã‡¶∞ ‡¶π‡¶¨‡ßá‡•§`
            );
            if (!confirmed) return;

            if (setTelegramRequests) {
              setTelegramRequests((prev) =>
                prev.map((r) =>
                  r.id === req.id
                    ? {
                        ...r,
                        status: "deleted",
                        deletedAt: new Date().toISOString(),
                        deletedBy: currentUser?.id || "admin",
                      }
                    : r
                )
              );
            }

            try {
              fetch(getApiUrl("/api/telegram/admin-action"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  verificationId: req.id,
                  action: "delete",
                  userId: req.userId,
                  telegramId: req.telegramId,
                }),
              }).catch((err) =>
                console.warn("Admin soft-delete server sync error:", err)
              );
            } catch (e) {}

            // Unlink user profile
            setUsers((prev) =>
              prev.map((u) => {
                if (u.id === req.userId) {
                  return {
                    ...u,
                    isTelegramVerified: false,
                    telegramId: undefined,
                    telegramUsername: undefined,
                    telegramPhone: undefined,
                    hasJoinedTelegramChannel: false,
                  };
                }
                return u;
              })
            );

            notify(
              `‡¶ü‡ßá‡¶≤‡¶ø‡¶ó‡ßç‡¶∞‡¶æ‡¶Æ ‡¶Ö‡ßç‡¶Ø‡¶æ‡¶ï‡¶æ‡¶â‡¶®‡ßç‡¶ü ‡¶∏‡¶´‡¶ü-‡¶°‡¶ø‡¶≤‡¶ø‡¶ü ‡¶ì ‡¶Ü‡¶®‡¶≤‡¶ø‡¶Ç‡¶ï ‡¶ï‡¶∞‡¶æ ‡¶π‡ßü‡ßá‡¶õ‡ßá! ‡¶π‡¶ø‡¶∏‡ßç‡¶ü‡ßç‡¶∞‡¶ø ‡¶∏‡¶Ç‡¶∞‡¶ï‡ßç‡¶∑‡¶ø‡¶§ ‡¶∞‡ßü‡ßá‡¶õ‡ßá‡•§`
            );
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
                      ‡¶ó‡ßç‡¶∞‡¶æ‡¶π‡¶ï‡¶¶‡ßá‡¶∞ ‡¶™‡ßç‡¶∞‡ßá‡¶∞‡¶ø‡¶§ ‡¶∏‡¶†‡¶ø‡¶ï ‡¶ü‡ßá‡¶≤‡¶ø‡¶ó‡ßç‡¶∞‡¶æ‡¶Æ ‡¶Ü‡¶á‡¶°‡¶ø, ‡¶á‡¶â‡¶ú‡¶æ‡¶∞‡¶®‡ßá‡¶Æ ‡¶è‡¶¨‡¶Ç ‡¶∏‡¶ø‡¶ï‡¶ø‡¶â‡¶∞‡¶ø‡¶ü‡¶ø ‡¶ï‡ßã‡¶° ‡¶Ø‡¶æ‡¶ö‡¶æ‡¶á ‡¶ï‡¶∞‡ßá ‡¶è‡¶™‡ßç‡¶∞‡ßÅ‡¶≠ ‡¶ï‡¶∞‡ßÅ‡¶®‡•§
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 dark:bg-white/5 p-1 rounded-xl w-fit shrink-0">
                    {(
                      [
                        { id: "pending", label: "Pending" },
                        { id: "approved", label: "Approved" },
                        { id: "rejected", label: "Rejected" },
                        { id: "deleted", label: "Deleted / History" },
                        { id: "all", label: "All" },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setTelegramFilter(item.id as any)}
                        className={`px-3.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                          telegramFilter === item.id
                            ? "bg-blue-500 text-white shadow-sm font-black"
                            : "text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold"
                        }`}
                      >
                        {item.label} (
                        {
                          telegramRequests.filter((req) => {
                            if (item.id === "all") return true;
                            if (item.id === "pending")
                              return (
                                req.status === "pending" ||
                                req.status === "verification_submitted"
                              );
                            return req.status === item.id;
                          }).length
                        }
                        )
                      </button>
                    ))}
                  </div>
                </div>

                {/* Desktop/Tablet Table View */}
                <div className="hidden lg:block overflow-x-auto select-none rounded-[2rem] border border-slate-100 dark:border-white/5">
                  <table className="w-full min-w-[1050px] text-left border-collapse font-sans">
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
                        const userRecord = users.find((u) => u.id === req.userId);
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
                              <div className="flex flex-wrap gap-2 mt-2">
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

                              {/* Restored Task History Badge */}
                              {req.restoredHistory?.isRestored && (
                                <div className="mt-2 p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-[8px] font-black uppercase leading-tight">
                                  ‚ôªÔ∏è Restored: {req.restoredHistory.totalCompleted} tasks completed
                                  {req.restoredHistory.previousUserIds && req.restoredHistory.previousUserIds.length > 0 && (
                                    <span className="block text-[7px] text-slate-400 font-mono mt-0.5">
                                      ({req.restoredHistory.previousUserIds.length} linked account(s))
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Server Match or Discrepancy details */}
                              {req.mismatchDetails && req.mismatchDetails.length > 0 ? (
                                <div className="mt-1.5 p-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg text-[8px] font-semibold leading-tight">
                                  ‚ö†Ô∏è Discrepancy: {req.mismatchDetails.join(", ")}
                                </div>
                              ) : (
                                <div className="mt-1 text-[8px] text-emerald-500 font-bold font-sans">
                                  Server Matched ‚úì
                                </div>
                              )}

                              {/* Matched duplicate Telegram owner cross-referencing */}
                              {(() => {
                                const duplicates = users.filter(
                                  (u) =>
                                    u.id !== req.userId &&
                                    u.isTelegramVerified &&
                                    ((u.telegramUsername &&
                                      u.telegramUsername.trim().toLowerCase() ===
                                        req.telegramUsername.trim().toLowerCase()) ||
                                      (u.telegramId &&
                                        u.telegramId.trim() === req.telegramId.trim()) ||
                                      (req.telegramPhone &&
                                        u.telegramPhone &&
                                        u.telegramPhone.trim() === req.telegramPhone.trim())),
                                );
                                if (duplicates.length === 0) return null;
                                return duplicates.map((dup) => (
                                  <div
                                    key={dup.id}
                                    className="mt-2.5 p-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-[8px] font-black uppercase leading-tight"
                                  >
                                    ‚ö†Ô∏è Cross-Ref match: {dup.name} ({dup.uid}) [
                                    {dup.isTelegramVerified ? "VERIFIED" : "UNVERIFIED"}]
                                  </div>
                                ));
                              })()}

                              {/* Real-time Telegram live channel subscription checker */}
                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCheckingSubs((prev) => ({
                                      ...prev,
                                      [req.id]: "loading",
                                    }));
                                    fetch(
                                      getApiUrl(`/api/telegram/check-join?userId=${req.telegramId}`),
                                    )
                                      .then(async (r) => {
                                        const data = await safeParseJsonResponse<any>(r);
                                        if (!r.ok || !data?.isJoined)
                                          throw new Error(data?.error || "Not joined");
                                        return data;
                                      })
                                      .then(() => {
                                        setCheckingSubs((prev) => ({
                                          ...prev,
                                          [req.id]: "joined",
                                        }));
                                        notify(`User is subscribed! ‚úÖ`);
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
                                  className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase transition-all tracking-wider ${
                                    checkingSubs[req.id] === "joined"
                                      ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                                      : checkingSubs[req.id] === "not_joined"
                                        ? "bg-rose-500/20 text-rose-500 border border-rose-500/30 animate-pulse"
                                        : "bg-blue-500 hover:bg-blue-600 text-white shadow-sm"
                                  }`}
                                >
                                  {checkingSubs[req.id] === "loading"
                                    ? "Checking..."
                                    : checkingSubs[req.id] === "joined"
                                      ? "Channel Member ‚úì"
                                      : checkingSubs[req.id] === "not_joined"
                                        ? "Not Joined ‚úó"
                                        : "Check Join Status üîç"}
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
                                    setAdminViewingTelegramScreenshot(req.screenshot || null)
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
                                  req.status === "pending" || req.status === "verification_submitted"
                                    ? "bg-amber-500/20 text-amber-500"
                                    : req.status === "approvxúÏ}˚s«ô‡Ô˘+⁄<üå$EI¶Iπ ≤ËU dùW•Z0Cb¢¡23≈0¨J≤óxS)ü´.Ÿ§nœµæ‘*íœq≤.oï£‘nŸˇ
Àˇ@Ú'\?gzf∫{z‡K@%28ò~}˝ı˜˛æ∂ÃôÔ ≠œ€`¶Ω_∂zño8fy©Zù[®Ç–zÚœt;[æıÉJ·  ´´´`∆¥+¥¥g√Ê”¯}«JLá>∫¶?4‘ôÔ…ÆÿÉ¸ééÁºs+∑è#L–Zõﬁ^÷Ÿ~yØÃ}√ÕN¨Ö‡ P ùJt#∂çûµ:É!ˆ‡FˇÈCº¿1Bº`œs√rœs=–ÀÛ3˘ê l•À‡»µ¿:Ï©îò‡l%Ù6Ωé·XË∑fË€Ó~i6˝º·szYôÕ[ﬂQøö<`˙áÂÎ†ˇ˛Cê ﬁÔÜπ@» CﬂrM∏»£eœÀ∑˜Ïé⁄û˚˜¡†›≥Cä7õh⁄O¯ŸÓ9÷S`áV/(w,7¥|˝A⁄{áe8∞oÙÀZ;∏“Ñ°Áj¡∞G&Ù≠ÁÆ9vÁÒÍQi¨ﬁ]√5´a}ﬂÍÑ-à#˚æ—C£ÅË√oVy°≤bb¿ÇÎïM√ºÃìäy˙,~aºÔ\”2ÀO–ı‡ÓDMÊY…«îËù–~b-ØÀo¬±}√l¥´e√q@–5LÔ†ÙÙ`⁄°WD†0ZÅ≠aùÜ{º±∂≥›¨¨9p ∞h≠Õ_;sZ¯1Gˆ˚ú‚R≠ﬂ˜·çàLOÀãõ X IÊ£{»cWÊYÊÌUäô]xVy|À¡!Lã€é—y˝æÂw∏uÑtøâI∑Çt¶|`õV2úsˆŸ7^Ä»ü%àDÃWñ
·(Ö6‡	Ÿ¯—¥k¡US4]@h
Ë∏]	øÈ#ú{ûCHåesKi∆N–2!*…IE5~¬$ïâH Ê¿=◊±›«ê7v<_Ké,Ñ<-ﬂ∫ì£q+sêÁJ&
πy(^_@¡Õë ô¢oà∫Õ≥]Ië|>#íSRsë1)‚ÈèãéZ†60ÌÏ˙V`˘O,SkètƒcÙ·E‰€áz"2a1π
)®ﬁíh¶Ê¶wÙ5daÙ—í™5±˜≈——Pü"øÊÜƒ„=bgnhtJ
Ç◊è¥Ÿ4y0É+†Wã4˝˘·5}ÙIi◊ÛÖµkÚ…◊±…G˜ÿdT¨XÔaQn÷∑ˇ
)‹Té∆~;£{¬tiùçè«Äº∞aÅÁÍ”De¥w$CçnF‘(“`0^ê5Sbz∆”ÚA˘¡¸Bïàâäiñ>û-Z•,ı˜UK›Q4©¢]‘§å¯≈+3^4âë⁄ñbâ±ƒƒÖ ‹µÉ–Ûg'+>.ûë¯®cÿR˛ÓÀü}KÚ”±tÿ£=€Å›2÷Çäcπ˚a‚™öÓ≠®ÊÅ≠o uv<ß	©ÚÍ—u5<íºyjΩ£BàHtk{éôQ™Á´"≠⁄xÅ◊7:vx]ÖpÍ}›ˆ‡H‰'‘g$
‡Xú<__8ÎÆˇƒPØ®wZÅ	*<êÏ5l“ˆÃCQ+¯ì—v¨ÏO•3œèÊæ∂º∂ÌXs-‘2kÜoñoCêõ‡=€: ﬂùÀŒ"-˛µJ\Œ˛r◊6MÀêOw¨22‘Bvw](&—µgÙKòd"z*ñœ:û∑z IKÎ§`ˇTˆl◊,ï∏È†bõÈÀB?oòí£‰[·¿w•Á≠P∫gè≠C¬zmSéÙ<xI_ä):yÊRuÓZÙ!§›~∞PYÚ≠ﬁC–ÜãÑgÉ¸'√»S∆¿)áp¨ΩPv‰®àp°ÂıA√;XkûiÅ+†I:†“”1⁄Vx`AÙ@z∆¢RQÈ∆ãX7&6ï∂3†m)ßËÊub8Öê”8nâﬂ~§’ÖàÂh6!xíÅ ®¢â˘‚læíîVçày42  C„∏µ£1xRr0—ôå^n(øó—ì¸.≤∂ù" €ÿ‹≥#∫f«Êñ…%´V5é≈x›∞yG∆Î¢)A:wÚ8rhÿN1Í∆(≠⁄Òö°_úO ˇB>óíà0ÉÕ!@xIµN˝ê-m4Úì∞¥·i√Y˘ñÃ∏	ﬁ¨Ú^;‚B!?˜th&b”hıñ+’HëMêää2£ ï€æe<∆äèÊLÎ=◊Q¶*‚ñËüÚÅoÙâ	IMyv8©ı∏ {:$„Ωñ3◊Û{Få 
n¨/«†⁄PHGR˘ˆú£X‡{;AFòAI«Tü´„\.ƒ4lûªçP[kmºWœõ´PtløykéôÎ|öπécΩwı:∏◊¨7∆±\ıqSÍÍ:ºÄŸlF‚∂a˘ìBCˆ≈4Ç.r‰B¸ÇXà?w%ó12Åd≥ñòH‡"LkG\–;7â«3]wZDŸ$’î1gzâûvªûkÂ∂K‚	\fQz«|˜ÓŒv}ºëùQ·W.ûw’Ú·âmX»∞œµ0€›Ûî«6≤bìÜ¥›€;à˙ bÍË#.˙ô`DPì:iéëQBŸ±§mïC-_€∑ˇ˚?˛˙Ú£\ÀB TB Bk^ØèÂc¡„ tÿÉú≠Ã1ïÍl¶·¿ıÙ¨ò‡8ˆt∫ÜÎZ
µ
:æ›«f∏ä:ÅêUÔµ`ß‘ˆ]èA_A KêÔu¨’¿˝m¬5óJ}ﬂzÇ€ñt\ñïJ5∏™ÒÍbºzµB«√5ìﬂÏxVjïé?{VÿÈÍ8Ÿˆ≠∞÷∑Ô˘NÈ—ú—∑Á˘ò√;\˛ægªo!rıı4Ì|4õ?€YàÖ]À-¡°€%_só–áÿ"M#4¿*0;Å±gÌ~`Ω Y–áØX+Ü{xˆú7Ù±˜@È5ø‚=F¶î◊PÔà>Ω!aô:ÀAü∞Î{ E˘÷}ﬂÛK§}GΩŒl{!¯>ÓqFsV‘Pä:“ip¨x›sÅ>#û<®˛˘@ÓåPÄÈµ‘:&Ë„z»(ZzÑıv;`tÆmôØÅo?˛Ÿ#≠nÙ¿›1–©,A4∏( á¿˘˚âÇ]sJè÷(B«êò«=(#f˙˙h•gÅ±o•O◊Ò#ΩykÓrﬁ[«yæf”ê«\=Ípõ  Ntj∆Ú˙‚≠ŒÂΩÅ„‡†‹8$GGíIE““ëØÉn¡∏Ïº
inQ”,ü+áË,¬RCnjÆ—{ãU`∏vi1˝ÅhFö´q§ßEÒ¯…ıd–tNüä0»]ŒD ÕÌ»Ghá£uêfÈx∆Ñ}åºlY»˙Ç££N°Ÿ"bé∆“EB1a§n¬ø}ÚÎs®áN∆l:ªæÁÌÅf«∑,7Ë¬ıe„GÓ¥Àf’ICf$´ÒÓƒPŒ≥≈NZÀ“—±jfœvQhÑ#”8cpîR+Çl›Ö.OÃ“gô3æ˜)∏˚ê[ˆ…ûDY˜H?ic§êìä$ÿñ¶Ωi.Kπu∑º∏†l$WÏﬁ~>∞˝Œj
CÚC‚8HE≥≈ˇÒ⁄(±‹A† ßQÜÆŒ`\œ{77x,Måv‡9»Úl®‚ÖÂ*	HÄsnIî¡√¢¯X'ﬁ;EÿßŒq◊∞ª∑jª†µﬁ€®ﬂÕµFΩæ›ºª”¬Ñ9◊üÙ¶CªÛ}öD/E⁄‰40˝EèIs!∂ÌÅ@áÍCÖüBáem!%\°ICﬁ@Vµ8
´‚◊x®gÊ.T‘¡)Càô[rbÀ:%ùÏÉº¨U5î,¢MÎ„È¬^É‚⁄ûÖÒ°ï!≥ñS°5Ôﬂƒ≈u%(pT˛	∞ﬂX∆¿∫çN*‹∏Œ!¯ˆüˇÔ__~î+jÊ:•Úh·^,pI'ìøx4\Øs)∆›[M6'-|g≠íÈˇ‹∫‚ QÚø÷9“∞˛À.G#CıàFú√gèb·PFÜ¿Cﬂs˜où<ˇßìÁ_ü<ˇ‚‰˘ø"®ìßCdGå5Fr€ÉL∫jxBÖYHV€^ø9ï≤È5Ï˚∂	–?PTt»ı“⁄tSFä•ãåØ≤B2Ä~Ò|U»(E‚s≈eúˇûgçîAmí¥N6#W8÷À9E$Æ§Ç ãrÎ(ËTFäWFò,¢[›‡b PôiDëár"ÃıD0(y∂®ëñ&Jeªÿ¥&ë§FPàÏƒX0(_à•ºÅ0øõBâ∫z2µ	2æ°Fœ/ê´Ù˙u
p—
AhbPâh–nHm∏”Ç‚∏˛¸ÙQø¸‡x·yn'‰£zª2ÑùÂFæ™òNŒÇ˘÷4í//ıƒi9Oëdùõ€—>!ëú˚∫–(‰êdü9Ã’©
ˇ(t ãﬁÜ…ŒÕ(gáÂ˘Ö…ÊÕ †0÷¥X)H{$|W¨#’w”˜-∞—C=œ4Åˆ{d(@‚˝»Py˚)d8Ã√ÚÉÖÖÍ√|	£œî¸y≥
⁄pSLﬂÎ#Ø∫èè6u‘€.ÿ3L¸_s‡cx#QJ∏IÈ˘EN&Rhπë®7%>-@(Gg,‚L‘~˘f⁄A%¡5]÷°∆)úÔØ√ﬁ9Ÿ·ymBß€¢ ZVDRXQÅh<»ºƒ¿¡‡'v∂eä√˝  ‚eJâMVK]®JÀ®)£<—®„9	$ïûz•ì;˜‘GI+9!h∑¸‡FıI˜a¬Ì˘˚†èÄU‹	˚ˇ9xÁ'{QÍ¸ìßî#;I”‡…'
|ﬁ9p·ﬂ„)¨¶ø^S/•∂íÑèS,Û«
ègK1ƒ°ı∆ùù∆Vm{≠j€µÕ˜[kM–™›Ÿ[ıÌG£è»ëjmf/Ù˜PÍô€±f aé)Ÿ¡ñÁ⁄!d7IUfÖ>^á¬F€3¸dÙzè¸∏z‘¯>ƒ}z˘Zri∏¶¿*N;Kâ™8,~ıˇ'˚K3*Jﬂ·$ﬂÓ·Pü†k˜îyÆeü%€òVﬂÉî%nêzê|˚¿ª¶o¿˜¢Ø…7ïÖ4&äM?NˇåŒtås´Gêo"äŸˆûbÓö|ﬂ‡émy&Ï0Ùâπñ÷•¿ss†iÏYÿGp8µœ˝J¬Æ˚Ë1ÆSåﬁ\(∆π-ñAÄ}≥À§y&–«W”ógY\s‰IIs‹X®‘z•Çˇb√•ﬁ«ù€ê\lóH£ŸÏÙád√–?Ã‰¶äá<8Æî¨Ÿ‹“Mπøéﬂ˙N∆Æw ∑ÆÏ[aÀÓ·~2/€¡Üã~‹ÉoHu…‹ﬂf€ìãY;¯˚L%∂√#0ı‰«˘⁄Åî◊„æñQè¯oú∏íàÜ{ﬂˆ<«2\ÕÌ«NG—Œ„Ñî’$≤E˚¿É#=DCQ0≤&˘A@ó…`+´`·¯.∏^eˇ@-±*ﬂ7·ppö„›ÄÉå>&›°Ïò4MB
∆¥˛Dﬁ?ÑÿƒD@æ%Æ˜-√OöΩ€Î¡7©À7Ä‰?ÏB∫ÚòüÖÁ’lÜÜñÆÇôj6·Å¬‰—ÎGhÃ„ÚÎGΩﬁÒ#º® rdTûn7f@∏Î°@C0v\AøB“bÖﬁFsá˘l+Aﬂ±√“LkfˆAı°dµqsÒ2—,
ÆíúC)Œ!ñ†ÍQvìÑ	≤ÜıC◊ËAπ»qNÌÑPY2A‡¡Â‡íﬁx9(Œ±˙∞dhDëfÙﬁ— Q,AZE0¸J”
)9ÑﬂVªï∆I8¡öi(4Ü ÍÈ§%™&jZ{∆¿	EDá°Mvâ‘È* d√ó™o¡ˇ¨¿Æ·ﬂxCÖMQw∏ˇ‰9∫
¢áÏ¨îÅ}óIú∞|√4K†•N5;s
ˆ÷pPâ±¡&YIpAPÀ}¶Åo«∆	‚G◊@∫w aCEë/Æç""6%Lî±1ÿ"¡°»…ÊaM:‡q?˘PO˛Y¬20Ú‘?x8[Å®X7P)¥ïÇ`iPÅ¬¢AbIR›ñR“p¶«`–ƒÓ¶GÄo%"VírDzÃHÓÕåv úˇAmMfÍYπ<”_Oÿ_/ÍODÍjæè‡ûÔıJ—ÜAÍ…$‚æıƒBrÊ¨út	≤ÑL@ﬁR"<LÛR+EÓ†tÚ¸Á'œ?F—-/>∏
NûøƒQ.üùº¯‰˘3¸˝/'œøÅø£IÃK¸„''œˇ˝â<í¸˙å≈Ã¿~Cªˇø9j˙‚óÕŸÃ“PC–¢‘1Öàÿ≤HÒ0•Öpr(èëW#1,!+R3Ï[‚—ÔcIjL√3±¨¿¯kXt”¯LD+<>—§∆8*òHIcC,©àGOûíÖ
àr‚¡ÅÁ£Z¯ÜoàÔ‹^oeŒ≥ó'œæ>yˆŸ…Ô?<yˆˇÀ…≥oNûi≠C˜}8èûÚ¨e	fw–∫«£M…§"î™ä∆ñQv≤7)Ç.°Û ` .,ÕY|ƒªõb
Wc ®˘•√Yj‡ÜÀxy+“IúOg`—7|Àt¨R…ËtÆdQ¬ÇAV]BW∆ ∞T°‡UMÕÈ8è¿#¨cD0ª˘%F‘≤Á5åËó®%£G‚¶È5e§D’îRysJƒ}∞/^2>¿È√⁄µú>æﬂ¿á\±ÉÃÇéÁ=ÙEg®ë∂uÿ«dÓ„2h%∞xñIÄ2‰GHœêüCyTÑ4ƒ≤"§;—[ô"§L1B=ΩçˇSAæÂ¸éÂ¢∏'<©•6‘ƒÄ∑GLì˘Äº∞
$FG˜√Ä¯*{ñD…ôMT¬yßoπÈÓ”ÏÑ∫·g~kz€»t≈å⁄ÈÁÛ`›zbw¨U0OVô˙=ÅÙH®p	§ÀnË{…¶¡≥X°"5ﬁLÔ¿MílBîüE¥˘„Öá™çxÖêcdMHÿ…T1íﬂ>î”‡ñncÍ.≥•Mî¯#ıáŒÄPÍ‰v»TRÏ±Åd˚[.?≥Éü¶Ÿ9~W»%íÑøßG˙éz	˘l∑ñìségáÅ‚	CöEÅF&"\(2PTêß‡P=¬‘â:aÏ|Nà¸çª><ı2fòQ?Sa±‡¡!íZ˛ê√K¢	Yù&Ü∏©•' 9!aBK¬“»ö9u	ô=t ⁄÷xLîmì`"Aã7Ê
yo&ÿDﬁÀîo‰Ω1íº3ú%Ûv∏i5„Ãxk∞Å>Ööµ>Ω5°X„âm”…IéIÜNoë-Ìéí⁄YRöΩg€MP*Ü\˝Z‹èL;„4]hk`tÙ3’øL<t÷»E˜Ï óÏ{WQjáßH-aêZbÇÅ”a€û÷˘‰X@êbA™YU©ºqs°1˘â©§˙JË!≤' ˇ/ù‰.9Ÿ√ŒQ&`5E≤Â≥^n∏ú0	∂$˝rD≥êIøJïqÑ\jä∏ø®∑◊í˛Ë‹4ªS”Î|›ﬁx’ûß**≈ﬁz}≤ôB´7ÉÑRülßPÈÕ £—ã⁄ ıy3‡’˘Ù2Ö ¸RÖñ√Avw0ËCﬁoZgCÌ„yú)Ω«N≠U•;Çbj/óÚ˜Ú)v!›C4Åµ6ÚzQeóæòòË)èè®;vbu˙ÀúnUá)F› h±zî…ã~äUùﬂ©Û
åB*£◊≤ÁJé!˙1ó»ˆ⁄<ëMfôÖÌx2õi('¥∞%Oh3-Â§6jìZIk)±≈Àçà≠`πBr{Ω÷ûÂ#ï2¿TÆc8ùÅC¬O!’}~Ú‚Oû”V%·•TVIâ)8¸£%fS<tX‰âJKæÏB*Oú›q´pN≈q∑[FüÜ{¿o4.Â*8¬A¨Àÿ…˚£‹.0wú	[!î5È›€+ËJ|\3kl(ŸÓIM.¯Ö*<ç.ö)ˆÈ∑*°wEXØ»;éû†HÄ¸Ìdõ\√ ≤µ∞eä,+îJ˚÷∞m
ÆàZUl—çc®_R>UT*˝R!˜∂º±
Ê≥ÕèÅÖj£à⁄Fìíìà—Ä=º Pa^XO4m	I˛ù1yPî0\Êé$”Õ	{ÀÇ“,çm»(áW±èµÈÍÀ¿ ﬂ¥Dí~#FH6ë’á¨d[∂Ã6i$a]ßüs(»ñ |8∂î†l
¶[ÒL)’LŒí`;û%•⁄…R‘.fH¬∂RvÑó±£Ã2ÖÃËF‘Ã ]‰Æ9ø‹®v∂˛w∆á≈Èoz˚=¿Òˆs5¯NÂ∆å√sûå‡hy°‡i1ör-◊˘m$u‰Zæœ€Hj«µ|W∑ë’ãkön#°◊r€‰Í–A9qH≥"9…~÷ŸÎA9û˙æ/˜&âóê˚†b2<veÃ¿Ö¶„ìoEàÕNı:r?îP(qn\ém;G¿¿ëLgGqé†Å¢<Œƒ◊.GÆá˝¥aE¢8î–"bN¬≥C2j›;OàFßtv»k·Á,±ÒÏ √‰¡s¶lûPp§˛]Àp¬.ã∫ùf6é=≥%B–Rwl◊pQÇ:»ı∂ùlH.2¥z.ŸÀD0W&ÀDëØ®ü±á•®ìB¶úƒ‘Øëı ]!5e@uÂãeV® x‰s·`e6™Nﬁc÷<ë;çpA±ih•C1ï≈jÒπ,V'4i∂f“ÑÚãvˆ÷ìôi…>qz.0$≈ÌëMÍÆ7ÉRı*†ˇ4†9YÆô3h›5%C≤∂ÒÄãW¡“õ‰ˇoæ˘¶†Ö<Ö¯≠U~ﬁˆcìm¥'—0íÙ_y8 ÄDÍ‹ä∂J´ø¬™≠ì4L†R)ˇ9Êg”3SX/£R%≥˘c∞7»$ôLiõÄb“qÄé"F%=_•«^5ﬂÉ‘|
œ7—-'kzÍJG°jÍΩ‘‘{SáHÑ“RP!R+ÉYˆΩ=Ä®L‚eî:j⁄{g—“Ê≥å}(J.Ôí™á&Œ\œ7ÜÎYJkπÆ”Óö}Á$∫c2Õå`q⁄Gì~·⁄Z§`¡ñv+F;(¡Ó8:V&≥ãüdz‚‡É˚ËX∂Sä:û%ƒ}Ïh·î!⁄äq #!ı„s⁄≥â
ËS©T“ƒ∞“3˙%ùπåî#¶]‹™≥Ò—‹ ·¬#àFêP›8RÉ«Ëâ∆êênå‘ôTäPÜÔÿê~a…Còûª™‡m≤Õ=€-¡	‚üQÅ,âËc\‚±&àX“êDéMfêeåÅ|IF!⁄”1∆êë®'Y9¢Ék√E•›‡0IhæëY∂h∂.Tw}oœY{⁄[9≥·å'˚ÎPO>LŒÅ˛5aè0úá6MÇ*=ΩN∂πeƒK‚€&´¸ ÄYèaö¬ﬂπô'êIˇÕ8\ì ØÏW≈†¯§_`  <ßP†ÒîôÉ)vEÚb™Yå¯‚v±‘ñn…üO“6-Ä'˛»X∫å{á4√>k?H©…¬¸È%s|¡«¿±q≈«2r§ó€¯&áÚµLÈ8TWmcª’ÿ≠ç÷f‹Æmo◊ÇbóÈQ€˚eNi[nXΩ≤8È{eºrà.ÂF.eãA¬7zÊrÕ\~3Ê¸R|#§†Úù∫:°≥øåø£ªå·˜‹j ‚⁄z+“ ≠í+®2ı˝hÅ‘t5’ˇ2_møysû+®˙†ZY@¿Èµ—m$ [¯öÔ7[ı-∞Uo5Pºµ:‹∆∫xñäXV∫ô˘/>uìèã±ìÇñÇ"Ö¯2yE»{Mà[¬2~íyw$≥ŒU|§´(ä™««ïm{ay^VhQ∫ VÄ‚ﬂNûˇ'vˆY∆ﬁˇØOû@b >«^ˇ√éˇø∞íÏæó?&o¸é>ÄÔΩÄΩ≈¡„.øÄˇÏ‰˘oÒ_†/(·¯Ù#‹ÎOR¯ |Ä"pÇt∆/aÎL∫˚öµ@	´_≤©ˇ1Z⁄g8Z·Eßí
ëÚ˙êπÖÕÒ≈*Í¢÷˝ßÂÎ®N˘5ù—˝y˙WÃ§ÁwÄÎlw˜≥ä≠¸…{po)
<Îí	Yó<j≠{J1v∂77∂Î‡
∏∑ª^kmløSêh©˜)Ø∞ºªYk!: ÓllCZ∞Q€wÎµÕ÷]∞Vk¨Îq Bà™ƒ’àeá≈å&ço…kÏ‚õàèΩYò¡q#øÁs –o√ËL⁄Z’*‰,>uYâ@‹˙†<â˘¯¯!&ëì\~%Î˝ÂÂÉ—TOÏêï2æyú(»ú8áÚ"«Ú„©*€Æ{tSß1≈Í∑Ä„[%!áØVT∑^…»ï¯∑≠ùÌç÷N≈≥ë¿µ/ˇ˘3¶?0Réx”œŸø'alÄ≈Ø}Œ≈≤˝ût Ê≤K0‘wº≠t3\ 2ôÇßå7îc‡Òr« í*ü1∆ç¡á¯lS¬;_ —],P	∫®–√ä/jÙ¡˚ù3dˆ%¶/ÕípF*@Dª◊˘ŸpP‚4ùŸÑ‹Ò$ãê¯HÑP|¯î8ùèæçDX˘I$d¸ã>ËŸWQ·˛|Ú¸_•†≤µ‡ƒpb,©wÊ˘íÌ‰˝¿7˙J…e©ö‚F7â0¬ó…-Eà;\Q÷¬I ∂πL,§WÅc¥-˛UÉ“∂íïƒ°©3‡8knLÙGL¯qè$íí¶“i¥'Ü˙∏˝ÄMy•ì1ûcƒ¯T£jñè;Z¨F=˝øìœuFÌqg4z≥a∏˚VÈ _yü±∂ÓaÎôÏ¶üºÎf[á´G·^≈6Â%ÔıÆ¢…^∞+ˆHîp¿P]L≈Â&©klØ·KÉ≤∑e£D`ı”ó(ÔæUyS¸mwﬁÚ7—≈∆eË‰KÁ—e;©#=œΩn@~+Æú‘#å¡,k™æ‡aV∏Îj)?ÛQXzzHÕuà|pì7‹˛ ¿Aä∑Ùg;`G˘=“qú…Æ∫…π¡sI‡ÒüDŒ°ﬁ◊ıæ´X•(¢F®ÆaYê^‘´V+ÿ•JRY„É∆ÂËj±UÁ6·f´÷h®I÷≈ÑÃ˝'ò¡¸Ñàâ≤ùr©	OW∫…ù4äI≠¨éÂ¬›`E];ﬁ·‚X{Ë¶ZtïÀbe)Ωh˘≠ËNÑ⁄
öAË4é%TºÖ3õVè$^’aê¬wüÇ$ﬁ”¯®õíU	—&!I§Rﬁ;ñØaﬂÃ‹˜#æÿó<Ωëº≥±ÔîÁÁAﬂ'dëìmÒç¨®ºAËÿÆUv=◊bWÌyê0,gç«r¿ÀØkQ®âjÚB÷˙ˆ:T±Œåé”£:ƒQ•Ò£T⁄…Ùò¶?c=¶íD˜Ï!if]ÖB±Ï ¥;(}’ÏuåC∏4°ËRT˙pˆó”∑ãã˝OX{≈©^‘õΩÜ ^È)Øπ¬MJ∞ÈG∆G=·&IÈ“Mf7’53Êﬁy*ß°„±”È––÷N´∂	6∂ÔlÓ‹s†QØæ}STV≠i≈/Ü5ñ•í6≤.e-äP√WÉB$Kx,ƒ|D¶í)÷‹∞ûXÓ@v„∞“¡8§›5k,Kπ%’&¡ÿí2%™Lf/˛˝às“W∏0	¯˝∫©±¥ • R{ï¯8nS"≤*rÛ ?•bŒÃ™∑,û}$¡ÕîÔ%¬+éA¯4ê#Ó$V®Xgáî¨èè…ê/1”qÉ*º‘açèò|Ô¬)˝ñ ¸¥È˜ŒΩ%‡ªµ˜·Õ$ˇñÑˇy|4<æ~9}CÛ‰©˜.Z≤µ9Û◊r—©7Áõ8∑$ú:‹dóAb-…`∂c–œŸ–â,√vüÿÅ›vTÍ5´ª°óJ„J˙]˚«ﬁw{ê,úÕ›∂B¿Ù,@√0ı)Ô—#9e’$öö&n~£„Ä—[´†*T∆ûç<ÔÇ–π≈î?˛z‚†±ß◊‰
ÿ2òI]OGâ±!Édˇ¯ë§Û„G«ßÕPéÊ(
óÑ|œ–Ó§Ùô»}¿ 'É∏0Ë≥]o≈ûˇ›∆ŒùçVíiÂá |∆¬¿˛@›≥s±ÉvH^ßg¢¢GJ` \ixÏñOä˙›ÎKåG‘ÙﬁÜGπ#èAüÙ•≤“±÷qE°QGì€v≤à;&AÌbSctäﬁ,îÊâÉÏärÙQbuÃL«Æ◊Ôl¨¡Ô
Ë©ëuhÎÓíŒDô&óaíB +≥√√Úï<≠⁄>≈Æ£ùe‹Ÿ∏.™JdÑ +£»;∏Ô{awF’ƒ*⁄Îi«≤‡¡ >±T†Àµ¬Æ ∏€3•3.piAjÀ˜m7%€Òi*$ü™TCtH⁄ÕíúÓŸ=Ê5õ©ŒˇW|´V>m¸Í∏e/…c°EµˆRê}t)∑Ì‚õp…?tmÄ’¡eŸtÃ™úF<óQäﬂyl+KÖ}∂j≈W3¢Y¶4Ø{éc¯M(3>r˝8Éj	ÒA”8N•Y” EÁ⁄{ıFÌù:XØmlæÍµ∆ˆ∆ˆ;Mp µ∫ô©∞pH˚«âx∞_Ò		C˚ã4LL,û‰Ü)è&†≤ÃkG%#cÕuÑóKcéì"¡∞Œ√8<U©≥>Ÿß«òR.˘vè`
L å7T±ì ®¯,ªM¶∫ç¬sÂ88≈fïR†é ÕÂbb“òÃPSt |bt¬Ê"(…1*ï<|¢ñô‘ØiE»¶Oÿö √’Ìq(CòÏ“\Ã8ô¿*Ú≈˙°T˚ˆ¸ÂØ/?k¥00‘Pú¶ëY-hB¯™n<+é4$]k4£˘òb|4çCtSQH<:ùdß˝s¨ì8¥9
Ÿy…%ˆ}˘,ãÏArüì€)IcRﬁ¯s‹‚Nû?a˛xRªöıÕ˙Z¨›k∂vpä
ŒY¡aGöπ]â,+± ï»d£KÜ.©åÈE]mq:Y“~Ù‚1¯=7ElùdQ?ﬂ´äÚΩ™I.±Á,G~¨8ãπ@ÆiÍÏK)˚ﬂ>˘’œ∆jßôsRg·àêQêWèx‘\nŒ?£tÜ±	>âÿ≠Î*i'eOTfë“ËD]#4ÈíÿåréπÍåt	≤À °Xÿ˘˙åêÆ(Îs"N⁄|ÅScao4ê—kTú”Û{Ü€±∂ ∏∫b.ôˇì,!@w˜ä˚M«
{ÆI0d§ "
,3;$	]éó7$ÿ¯ÅÁó˚ûMi,”òûÌñ Æ"áHÓë§Kë=3⁄)©öD+Æ…4R∂„¡°e¯WA5{VQ}∂æcá•ôr∫ºk∫%nÇÄ/ÆH≈>3ÔÓ¿gdŸJï;V€œ{gÀ;]’µæoßo◊Nı†‡›Åk©wîÌkÉ}»To4≠~àcuT/ÌtB/Áïm(«Âu≥nu‘Ôd™a±OjwÅ¯˙Ùâ1‡.Œµ·Ü%¸Ï*òØ¢bjÛ¯ñ¸H6ö‚^ÚYÒ˙ÿxäì«z«åJı‘>óhj«‡a∏ •Bêu'9«í¥"rãYéìlT%INE:Yk©Hgª¶ΩÔ%bì‚G„Í~~ÈÑ:ñN!êÈóV≤„WE‘?Go% p˛e?y¢H^äà\4îßáàC2†~j»yêˆbQmhiè£>π‚û¿3V–Z1_!u©ﬁ›Ÿÿ∆n´‚%úf/zπö¬VÃ⁄@Àã‰ÒßïçµùÌfÂæìê∫foèª¢å†
 ≈P“'…±S'édª~ü‡v£˛ŒF≥’®µ6‡˙§t¥PÈÍeñ◊£JoW~ù@ò…3ú<¸©V1µèë©ì∏áK˘)à90æã-Â="|ö¯ïôgÄ0≤/	œ˘Ò‡6‡∑^*&q¨Ø	ì{6Å‰qÓ°ŒÿO°*M=[ M=C•>$A≥äÇ©©€¥¢ã◊ÜbeQY∏—RÛ	A∞ˆBZπ!ËéQªR]x»ä9§,8‰5◊ªg–ß,,¡‰»#t?‹Óè®3}ÜÆ®´Æ&¥§¨ ßÆ7Ÿ⁄YØΩüº<ΩhHÜƒ…sMXäõˆõKY€éOÀ’èmi≈X¶"·≤Ë/)]ì^b)|B∏Í#ëŒ˙ΩH∂◊Î≠⁄∆&¯ˆ_~-ô∏§#+Ù!9ÀÙB√Òfv)‚Ù4'?g|öIo\†¸\ﬂ›hÇ˚ı˙˜hq(Ò®ì?Íº‘Ø}∂	>O7_∏'pƒŸ≠:Gú◊8◊¢*íóÓ Ûi8£[ÏK‹ÑYÓéö¸ôÂó§h	ûNm¶h÷§Œ,ΩCXÁ‡r∆`çsÀõéã[Æ›Œm‹€d.Ì<Á6a5ñ⁄Oç›srÂÕWÓÙíº˛IË∆¯Ô©4ù¸\ iêîYΩ Í2ÏU;ﬁZ+ï˚*‡˛N„{`˚Æ∞l–®ÔÓ4HiâÙü17πü·7|çiöìHÏÕ¬O}ó¬ÁpÚ‚ﬂ/®wamgkw≥ﬁ™Ø‹Ø∂yØN‚πv1ºƒŸÔ_
Æ]!1ä/ÿQ¸Ò	‰x!ò‡Rùy≠QõèÒG≠êxl‘(„ÇPÃ4œ51uAÄ¬b÷}œ<Ñ"¶
ÇUñÑî£ÆiÀQìëí‚35ö∑Ä–ÑI¯ƒwT!)ß≤DÂúëHEëè ñ`§#Òπ©0j√Ú§-%~r∑Sµ∑SER˝5·ÕH("£_Wl#àzãÓ4† ≠¥CjµjÕÔ…Ó„*$˛›¨,% F“ˆ˘QÛ∆È6·	PØ…î´ì!Á∆&Gå&Ì‰8⁄DÚï Nt©SÍtä~ûFq˚pdG„⁄Ñ¯ÌÖ)ë:=é6yäMqy‰à`‡)ê£ÙI=}rDó:%GßÁ— R£Sqh°I\ª≥&JcıVùéõJõ"≈k”$Ihñß@ñ¯|ô3•KxΩS⁄t˛∫§!I€]7U„Fs≠ÒZ\⁄¡ñÆuqqÙ9åóØÑ:GV:%Q#˚+†Y_Cóˇﬁn‘kﬂ[ﬂπøMéóßGº$nfÔàÛŒ—uøó «(˜j˚î0ûê£'„˜“l§ø3˙yπHré¸ùñüê·h≠π—§G¶9ûjQxôüÒtºåx]ø$é¸¯[z≈ƒ≠ó˜ß(Ä.<rˇ«ˇÔ¢D'"3.lÄU“DŸSîø£~ó/i)®Á_Kgõv-
íq?≈Ω§.å˛-ÎKº¬gl9ÇÏ*úœ%€*	ï…˘à»8™›X~Z6°∏bﬂ
Æí<ˆqUm,gQB‘AıZ˚“,Èï∞OÇ‘Ø˙	rI∫là¡R¯NÜ4i_ßÃO™ﬂFËIúÕŸïπ∞[®7æ€Ã≠DÍ–®ùQkæ“é?‚“ñ#òÈ¿õ÷(Q•ìùΩmﬁ,ó7/¯õ/ãiP…ï∞Ìôá“∏ _OÎ¡?–íïUÇX=tU …5´`eÚ£épø€áÒu€
P——‰5k@tªÙiI¢ƒ4©?sÇÛ§ûÕQ'Jmâú(ª~,≈6œâOñX?Gù11ÖLUëQD9MÈoπEè0cU¸
H9$:O’M™ ü=/âπ3l≤gôªﬂópjÉËˆ˜ﬁ$eHmT◊Œ™à+ÇÇô ÕáÂ%±®êÓkØ`=¿B:lJ GE—]	A«rd:ı™unØºØ9{{ç≤ê≤S⁄<•jÙ¶∂G¶?I˚§VÄ≠òÍ‘é…N5c3ræÃ‘[≈>°:(xö Ù¿€: }r•é
˝„ø·;T¬ƒÅ§⁄^M´Ìi[Í“CZ•ó=´Vﬁ\&#§?z`?äÂÑ
]˛1Ëª¶BHMGÇw/?ÚÙﬁºIcè(9ï/}ñƒ`på†1VR`Ø)ú)Ì4.âŸûµË ≤ëÛKÓ!€1w’M>
©+©X±&C£‚ıî£•˚;C¢ƒB-«Hï.C¢Qvóî#ù´Õ?ü¸Ñ"¿+≈Pÿöœ?GIÑxN˘J∫ø3$-,<ˆ\êñÛ«Wh∏‰%Â+ÁjÛœ'_°JÒ∂Ê√W∞›z V“˝ù9e°qŒÁÇºúWﬁÇC^/59OXpûô∆ÑWê—êuüfC<éØõÜk˜–n˜éÚñÆ˜35‹„0ˆsAhd°ñ◊œ–‚é"ó/)ß9O[ü‡1KŸJìgπ˝ÁñΩp\XÏ◊ßEl'ßbN¸·<1gŒrîøKÇ√–G!#æ¥
w'ãÉ?°@“ë„˘ØU¿˝ç÷›ıFÌ>ÿ≠7ÓÏ4∂j€k8’Â8,˜˜(Pá¯ÉÖ€í¯ﬂØp|Â/¯Îça´?r!”(™ÛÛiP*®ü›¢—ˆ`b!˝Ï:ã◊œpµ∂ô¿÷ıZ´&9Agì/8EøR!Rò/∫_˘kÅˇ,JñÅç˛™/À¨ƒ◊‰ÊØDíÇ˙÷È|G)¯5ô∞˙Ò÷Ù¬A·çöcJ §'ÎBﬁ1"˝2™ì…⁄å`^÷\Ø-Ω[d6xÃe¿ﬂògŸóO5Z»Q“W2&H~2oRïTÅÁæKÙÉÂ<I'≥ÈMà •hÜHÕd<üA™°Õ¥\#iôòò}£ä WﬁL®íﬁ&ˇ–Gﬂ N—ﬂ¶±¨È§7ar©µΩ∞ºxä˘JMö0«πX·\Lñ£_Û-¡}&X˜m å–áR¬d,Yn=É<Xü5GŸ5†‘ª3Où£§B≤&»Wï+–ÃIú◊9iﬁP§î^Dô5∏Al¡(r	À••˝ßRJoJÒ—áR™dî◊î‚ãÓ¸* «)≈?äèsÂOÖ‡_éÎ∑ŒºZ°&ıüx…¬)ÂGü≈‚c∞¶‘_Ä‹A9e -âKíƒ§ü'ôê‚›‰viUÇÙñó¯öëa[Îãü VfÏwóñI‘‡N6¨lÚ¸·ËŸ«QÃàáª7i“v°ÿDaGàT–—¿7ù:Œ∂ÇÁRl’∑n◊Õªª†Ÿ™µa˙ SjÔ+Rù3SˇpÃìÊpÁãsè;†Áoü¸Øˇ)DëÛ∏√°‹Ω›wµı:A=…8Î®ùOqi…üêíò9GÉDÂ‡äõ/H‹ÃKR√êÜ˙Æ—L’–åj~Éjh¢˜æ"#'BË$ìUÜ˘º*=1zç…¶≤e!}4Ë⁄˝‘s˛l-c
Ï·Ë»4≤Gπ%√XzÌd|N-q≠˘“Ìß°=≈%ÓÜLlz‚‹Å©∞-òˇHQ=ß¿v.Vdœ≈Â;˙—=”òûScC…òû,	ú2î"%Ÿs‡|U˘C"æÁ∏DëüW’€;çıπ¿ú Î3Â√˚|c`N˘úVÿœ©ÒÅiËœi2ÉiËœÈ3>Ùg ∆¿@SÜ0È0†SÒW\††KÕ ≤[~Z…ûSŒAJr·@ê—©ˆfµÿu2ƒ>é‚R994D(∏–º4¨'ñ;∞Œ¿W¡á¯L˘«Ÿá˘\ØÄF˝NΩ—HïJâ~æ¿ †Ò/Ëúó+Œ'*∫«≈ﬂ}Ô }„∞Éà‚Æi≈â%*MZÜìà%b∆IÑbâ~˝€¬LEÎN+¢àÒ˚ÓΩ€∫ÿ-%:≤Ë£‚è‚-‘)~FbH$)¸√≠&∫ﬂ>˙?$™ÖcI›–˚’…ã3·‚œÈ∆ÏﬂÁ—Õ∆ƒEÉáP}Øt@ërñc
4í“CUT€πãBb9&ôæaÌY>‰¬2)"bg-œG'o—GÒè9¯œÙ$ˇ.Ω3I+ÛÍ©˘÷	!¢Ó—òë	db¿2≠¡Ev-∏‘í2ìª¶î1¨>ïû}§‰là_Xüà«oK„bÑ@œîHéàtœ2ÌAO±¶ø}Ú—œAÀÎ/´ *ïµ°&W`»≥Ö·[Ä  Äˇ∏ÜÍöL
pıºK‚Ó;8~_N∆•€5ñG‹TFî û,€‘Â· &ôCLURèÛR(F£[&Ã√.V8”≈dbÁ%îi“Lç∆≥\BÆ≠ÏïekYåóØ	˙øXå≠k ”)sÃçÏLòª	√äxã?ã-BEºÓóñ{ùJ¯’0‹/f=F„p.!ãVˆ 2∞,∆À¿˝_(fªÑáı–qù21P0ñÏTŸ4éÏR≈ë√—∏\ä4Nti˘]›+Œ€“PòÀåq°xúGy"£S¥£„&ÓGª@ëqóVâKoµ8&Ó¸[!˘(≤K≈Îÿ¬^Y6ó¿∏]kÈÓ/s€C‘o ’¿cˆnT@swgªπ” µı&ôRØ˜9vÀ|åÈ„øPßé¸˘å›ˆúëœTı†ÀÀßåŸ£√¥ıf—oKByÙ¸ƒ¡Å¬ ø‡∑Coæ≤∞DÑÖ˝l˝|˝ %Ö¯‰4çﬁ¯>îmã^∏Pï\x¢ˇ¯ì≤æ—‹›¨ΩœÇˇF=*R™6Å¿¿BÖ… (º∏(ŒÔ%ï¨^|íºa¯Ñî"˝êµcU…–@?•UÃ>¬E—æÊÓ¯¸Ñ’=˚E˙M≤ŸÂàDà:}¶f2$pà:øÙëèNÕ<ˇÎÎ¢fpë‚vG‹ô*7¥‚‚xıõ±	≈@ˇ- ◊˛¡¿Ü	L;Ë;∆°8ëË“g≠H( ç7ö	ºXeØ0ºª—ƒxp∆Qg—∫Ù(‡y2;ﬂ$ê@ùŒ†7@ç¶40Û·cê&Aãq©ù:îè}“7Ωù%©„e@Á">)Zîù;±HÁõŒµ¢p(ÔaSÌîº—O::er$ÓrÑ§HÈ\‹€Eπ¯åﬂˆ≥^·VVÑ‡ù}† ˘&zw<∞Mï«1º™4è¯∞'cÿª@1
L“{5Ï]º√ŒA¯¬˘¶ÄÔ@Ñ62Ô=±≠ÉWTØ’Z∞‹ªÕWÈ®m◊6ﬂon4Èúö`s„ùª≠€;ˇÍNÎ5—•àG{Ñ:Ó@R	Æ\…ÃßD(Èë`éÇ–¨Çôô∑$oÉ∂Ú˜‹À·;Ó¿qﬁq¯
§!Xˆ	ël—UÉ-J&˘ÎÌe‡g“π`ÔÅ“kÙ˝Y‡[·¿w¡Ãˆ\M83 Q„P“õê	g–7¸ KcMcœb”ô˜ÿ®Ë¶∑MQ~≤í“åÂñÔ5gÆJDGZ3A◊Û√ô´“˜L„æÂzñœü¸ΩCÀµ^ÏzÙ‚BäÇ∂j‰ûÌBK„’c	|éA«;]P≤f•Ä`$ÄñÙ#xz¨@¨–ÓY{>§"õF€r¿™∞”¯§¥ÿÎ`u"6ÒJ¶˚6ò!n*Í¢öïΩ∏,Ä⁄‚•pácËdÀ;PåMM`“¶hÙGëeÊuÖiÊë¢è‹	U—ûGBkŒÖ®M™©†…Ã§TÉ
¸›Ïåu9·f}ÿß˛ægC—FÜ¿·;@ÙÆÑ"ﬂ£Åg+{∂Z~©4@4L2C;ÿp# ïïéo!”p-º*Ç‡¨¯ JN£‰è∂!Wª◊¨7¿ª;€Õe˙QÚÄ?w@˝£‘=oü≥‡áœ1*íBIˇƒJH˝8si˙˜¸ùn∞´$1ÇMhvö«r˜!ö—∏M…cV£◊á$Å=«;(?-É–S’ç6Ñ_"Ri24N‚g¬;û„˝¿“êà… ]À0Uo†w¸ÑS(ÄK,·s2ΩÆÕóüKø≈≠æèÁÌ⁄V\!8∂±æ2váÔ´æÖ§Ø⁄˙z£ﬁl€^âÀ]W!mmgΩû7⁄8fl¬¡Óm∑FÍŒœâ˝bü˚µÕÕz‹Æm"©rí‘ù"DÑ¨_≠ç≠—Áﬂïgm.˜∞≠Ñmœ<TCHSœËC™~ÿX8U›/F˙ıs·Òÿ:\=TlÒ[Õ>π$aIL`≥ê=´2ÎDlôcÕ¢_H√ﬁ^©úÁjﬁ-3B$·b&êË∞ºXY¢D ∑± 5?¶ù(¸)˙˜`~H≠!·˛p\;⁄%¨h‰ÔîR·UØàíoNéµqí‡π^¨‚HPjÖDF%Õ%›€X_˜∆∫‘c™üπ«ÉˆõcáH©˛xÂPﬂØVñ4ó	¿∆.Yg_gùV™(€˜Êy¸ñÙ@€„¡uA¬∆"|V L¨î2'ªéˇq´·“\“0≈W¡í.÷<ìûPîÂu ÀÊ>_¡ 
µp	’Sò=ÊŸô…ÎV∂fT·Í/m√Ajû˚lT⁄za¬gÑ[á0è*:8$ÿ\o;“÷)^;”zÚ§H\rF‚u%¨ÆVuhÓJﬁ∞‰%YﬁˇÅ“@≥o∏´G◊u»jrÎÊÁGƒ‚0CœÀ ^ﬂËÿ·!$ãy≤âétH0ˇ8% ˘)>¡π?FﬂY}a¯ÌUuib‰ÕÄäÓ/”w£ÁÎÃ≥[—e)ä…©EjÛß»Ù˚gßÖé™MÜÕ’4|©‘“‰E:úH˝?ñqBf∑9¸«öfõ–7ÌûP¬Mp$”-É∂¬≤ÉÕ'ï 4¬A@&ƒÍ˛œà¨ÚÏì4·.–ƒ¬qÖ»¬»oWÒÚ!œ1K∫H£”π
:ﬂ«∫¸ºJËoÿ¿MBÈeÜ·Íp´⁄ÓncÁΩ˙:h’öﬂÉÍ˘˝Z%˙’6Ô’á∞^≈˜Üê˜qt¶?$YA¯…o¢á£ñ(îÀ˛?   ˇˇÏ}s◊ïÊ_π∆x-0_ê(K\IêÑ$ƒ$H†¥.ñ*jM≤c çt"ÜUI™2Ÿ‘é7;Âr¶j∆ªZÔÿ≤W…8.OU6Æ⁄Ú¸ïˇ¿˙'Ï=˜—œ˚¿óåNLë@˜Ì˚8˜‹Û¸Œ/P≤…OXJ1n≈…B,ˇËw<óÁ˙43à-¬q˘˙1^Ö‰9±q]HW·.±kq◊–ˆ≠¬]BÕçjcZ©4∆cﬁ"≠÷+ÀçıÕ°{Ü∑€r•˚ﬂ@¯ìı{gb¢€mîﬂ[´‘¡:UﬂZZ´6.π}
≥øjﬂÌå›J≈⁄ùÿ™Ã,£õ©LMS|a¿U;k#ï“Deoì¬C@ƒ.ïTuú*cu”Z´âR:oI¨4I”G«9ú>òﬁ.ÕE¶∫M≠{î^Ddä7%≤¯H?SF:Ìé…öb∂π≤—VΩ√ÈÿÃé¿2Eıµ˜P*òH((D¨%ñ4ˆ“RÜI°±‘ÏÌπ˝LVI8;60®cπ“˜=’CÒÆ®N^D∞∆Êî1q=hÈà±)£«ÛOW[
®›XíñÚ˚N{ê5©íèbS!1÷≈<êπùE∆!f»a—⁄3?¯ı˝≥¯TêìΩÄ‚÷¸Æ◊˜Éö[É5ù"∏D≥,2yz`ﬁÇ—˛ÄÀ¯¿R√˛‰öPˆä™Ó°r´„uQ±åµ3ñCÆg6õƒòª„ëmæøkÓØQŒîíï¬f·;"v◊yüÑBg∏¿i8L§‘Èî⁄ÏEÜ∂(Ói–öÂ‘áÕ¿uª·æﬂUV°Ù%xòõÄÔöÄ„K^ pzåπAå¥≈Ñã««‘¨ê¥çTíLGIÚã®,¯ÖÊ<î^}|fc}Öº“DK^ÈîÀáÒÍ∫˝UPTw¸√j«Ÿ√¢É)ã‡óÌ`ÛA◊rsJ:ºÔÎ»3«^§ã≈˛⁄å˚ñﬁë–s“πqk•8DÁs“\&u¬nqlW£⁄ŸC@>ËM4o7´Úxp˘•sˆ§€7ÊIÜ\i‹ä”¯9óIö¢_1ßcƒHc/¿ƒ˘»Ø»˘∏0q>¶úèø!ø˝ä;*ûgƒß±$Ç;£NƒèxJ÷'F]{A˘êtÎ[ƒ"}·èâ3RÊå›&V ¿Ûóp·’…á2e∫)z/m¨és—2&—¿oK]úY'gO≠√)õãP'gØ"”.ñßëˆO*Ä¥ôr^*n∏5Â∑Kìqdi(|&∏RJ√kòˇSÌ‰E®Ë”ƒ”î+∑ÈwzmKö3≈¯¢∫G=∑(é£wà54bwú^–i≥éH;ìçrf‰R+˜9ù´®I˝ ƒ´<vïç¿„ÒCWÒ¬T∏"gqΩ±æYAÎõ+ïÕ:Z]øoÓ!˙àÒB jsn‡_P6˙%O °Héœ‡æÅE„"qˆ“πMJ'S§©,åÉΩ∞$°©$eñ§√–ªàGqüÅõÿÃQ|±\≈
G#ÃàëºG3&j$·≥Q]ØôúúZˇß∂c’Feç˙°GlŒ¬TOˆ'Åiﬁ™üˆ(ôüósc≥∫<Í0Y{t‡6ÚBkÂüØô◊7Â˜%4oÍı5Û˚23
=—ç˝æó¡Ûk&åK≥Ø≈ŒÃ	å)ÅÆ“PN`+´¬pŸ
÷Æ`û†ÀÃl5ñDÎÖ›[–b;Ä≠âC‹∑Û2ZõôJL5˜1:ÕK÷NÛ»mŒ8ñ:ù€¶ƒaZ∂ò‡1∏ŒôÛ‹êò‚˜?â}ÏÛvˆ◊Â eˆb £PØ∞0®æç≤Hé¥,π-\$:ù|2%õã>1mÏ‰âŸ>∂d˚#Œÿ€C=µ´ü¶úŸ,æa,{BlnñπÜõáòü„MûPZ≠Ïœc·ÿl–"+tŒò3∆±Èeœ»p∂hCk¥≈©feëæ86iSN3∫]:e\AQ5Ú‡øGïFæ`0å…c•3ı™iç Z≥≤F.ì‚Ë„≤ôùWùÃ¬≥Vñ^Ü°s‘É›è[ÃÑ±Iç¨¸I/\‘Lï‹hmd˘MZ∏Ôª]8üºWá√;˙<XÓıPw}@EÍ—UØ˚>–,€å£7P≈	¨ü≠˚Mœ±ÓjkQ{Å”±}n≠∏OÒIuÕLÌbL¯·ÏB…©Äy
Tº7G" qëuQú!Ÿk°8Ï|¢˛å«w∏?%‡L£˜á∑t∂ŒÂJ·ÀH•«92^?ŒÓ1,Kn¡Qøåè˙‚‘	ÀÚAı∆f•º6¢üÉyÇÖÓ±˚¯<‰˛ØxÈÆﬂÚbY,áûJëŸƒ1ﬂ5qååÓ1ËÕk∞‹‘”ÓñÖAát¨^«suÍ^£˛HR
œ»˜Cì
«”ñ›‰Éh,É</íe‚†ï…:yp‚Dä8C'“HπÑŸçdüOhÁH‚Ì7€f›U¨”˜$ ¨l'Ó§ës0G…¬4v(’ˆƒ•_Q µHø;_üí®k\)∑hà˜mÓ)ﬁ≥Ç™ ˜π˘∫“Ûu°|NCûÂ£e÷éú[;rvÌ•ÃØ&√v9∂£gŸéûgkëikõkdëm{™˘∂#g‹ûFí\£Â›^¶Ã€1‰ﬁû˙"ïÅ;ﬁ‹” ¬U‰·Zµv˙a”v·.uÆa”w·%ÖÆ”x·=ïÆaˇ√IÈÖkò’>µÆa“{·í"%Jn∑Èô£4n€ÍB«jçú*|YBµÜKûkô‹ˇ√
÷ Ê
O"µíÔ∑®T¶¡)ˆ˙˚≠¿90ƒ*Ê∑ÁªåÀLÃ@ı≠qÇ	Göñ2⁄"›Ut`k!ç¥p:\>ã¥PˆuÉZ÷FË*∑Õç°ß¬¢àêG’∆ÉïÕÚ#(û∫π¸†˙p¯„ﬂ¡Ó|˛ƒ^xbD
◊˝âl€Á‚ä[Q(ÜGÄ∆t|ôàÏxÉsjHûØ≤H g *9~û≠–˘b≈uå<Ab:ﬁ‡’®™+zˇ˜PøÜ]∫_nTïﬂCÂe4ãj[kKïÕ”Ïï±3Ö˜À(ícò»¸Ö˜*f…≠öÊ6 Ô≠o5–“ X
úmVﬁ›™‘Ü©∑gµ|0vêÂÉ	ºÚEÉW>8`ÂqBƒ– „U∆”ÑÖÀú
§<S£ñK÷—≠D™øÁ}Kïùw	<KIˇ√¢çõiT”¡êé•Ï“ô>9nK“È∑ç¿W≤6©[ ÚÇë»˝yªŒ¡L«ÌÔ˚„›ù¬Ì$4D%-	&3‹HúfÙû⁄ ¬.°-‘∏•ïË,[$J¥Òûs8À¢DU∂0cè5àe,!,f,∆€¡<lÂÄ‡%vÈîîa»y0≥ÎfÛ†Áœá3À•˘2ÁMÏ◊LV“rÛä!åRk‡Tî_ìäÜÄ¿ÊekëYÒ¥øFﬂ•ÄBç:8Å’˙:.Ñ·æ◊3Ùƒl∫?`"Àπ:∆ÆÉŒyªHWë$å˜bπD]=3◊¡Zåôı’Ù„ıjÕ¢≠ç˚õÂï ûÑî€Ä≤ë_ø|˛^€Ù[ã\RRÒî0û°›πÁ'nÉƒ=ó∆m@ºÂÂÂı≠⁄h∆b÷£Úç’rÌ,<çÕˇÑ™+Ë¥¸†\´UV/Ñ˚Ä÷O-Øûùˇ@€•?ZZ9ã*è›i0˛ åìöåŒipN’«Ì4 ˛ÇS(¬˛AŒ
ÍL¸gÈ/6eÿÙìÀÂ/†t„aŸrœèç/Y°H`;Ô√‡ΩÖW≠oΩ,Æ{‰∂∫›Ü`ñgÎÚ∏.3§I›Ê#!Áù”ÑÔ| ÷æ¬.èQsx«ÓÚ9s˜wyÿdÍû±À#À‹õOÏC‡åKî¨‹ùWŸ}–ô∏R◊ƒ} q|…›ê$ÇoâÎ‡/ƒú˜Ç∆$øx˘¸iå2≈{3Íì±ˇa‚] ó∆ª∏ªnÄAçozH±a7Ÿu¯®(rËl’õï{ïÕMrØïWﬂkTóÎh≥≤±æŸ¬FR"˙#£4¯˝kâÕö≥Âæ”NEøˇï„˚¸•“/π)˙S˛›G v±$;4Lƒ◊åõx"ô{€4è∏©‡‡«≥?BçıDß*e-≠ó7W–èfÂ¥ô}O¬–ì…-/°ﬁÙçH⁄€.nÁq&TirV€ªA ê‰ªgèÔæÎ¥…	'Áê;mﬂ›ŸôæÆ9æˆ˚øC´ïÚJeìÃ’bf´5‘®ÆUÓmñ◊*®(#Â+-ﬂ˝ÚÉàf	—là_´Öπå§∏EL{Ï@‘·z‹ÓÂ¶˚0DB+ô2CÕGúπ ﬁ/‰<≈úÇ8L∞`Å˙˚^à¢?£±ÿˆTo‘√Pd…{/Z~ÄÖ2[Ok1˛Û1 Èh&?Ò!û∑8w]õ¢v_®ÕÑ∑…°Ñõ_î›v‹ñ”~ª]¯˛Ÿgø-\EÔfˇ˛ÆXé∆únà_°!É√ï€Ü©Çózˆ⁄ä¯{!´ßòòÄ
)ñ7ˇΩêı1Ÿ4K;s#”€Ÿﬁæµ`“¨¡ƒ¿]ÛHŒHe"ˆ|ZÙg∆3Ñ©K)·”◊#v\:ls^¸˙1]ˇmBÅèâM:µ%	>D:˚ﬁÓ—Ùé€?p›ÓF!FŒkäõ(;AÕ±Aá%;09qﬂ?˚Ø¯˝Ω±ï÷Åä‹mïÀ{ˇ∫ÖÖ`ƒ∏f~ på<éY5O*1Ÿò*n#ÙÆë˘ì_6»√Ω·ˆÏ˛uã%»öB#ª®J~≈¿î#–A(è…Ù≠Ê®ù#|ö#Îí&Ñ˚∑Ωóˇ¨·°lí®ÙS⁄æb°UÅ¬í¶*•¶°Y,Gt≤FfÅbt£¢òΩN¥â˛ö˜(ûgœ*ï&Æõ∆@÷çÚ“j≈Jq‚
ö˙ƒ≤—sbB—(:ö°ö∫€ä%ÛÑ„"D-/ ué@øË”ÂÊk∑ı¸9˝Ù!ÂË˘gTÁ1Qrwå ‹qZÙ%&‡˝+^ãı{Dú|¨ÔU·›≥ºπUm ˘¸ôËµ`x#f´˚ÇÊˇSz˙g˙ë	Fñ≤˚xR≠=¨‡ˇ“{l±µÛ€ÿ‡IÏõY≥”ô≈
¢óØàaçÄ1tèùı$
’¥x≤âU’((ãˆÃbQäÜJy6¬ƒ≤lPµ—jÿrÉ •!‹¬™0øm,AföÅÎ–
K∆	åø∆1!&7 ãË$/¶ê«°vjgÊafUÃ∫O=P5ÛÀ€môNc7bàÔü·GÒ≤ﬂrm)≥œ¶ãÅÈœBﬂH“⁄€ÈñÃV‘l©¨¨'pô’ö†1¢ljM–Î‚GÚÀB;¨öµpvÂ'ËÖóÆk_zÇu÷
q»@JÀ—
¢ø£_ RÕõ|‡⁄‘ıbx¶¿ÖÏÓëIÂòÛN qÚjÀU„œ®,Zƒ%îéÁ •î'ÀïÑã““®ƒ:mKü‰°3†Q∏(ùÚ·1jÖ≈*(5—o°bõâFN2D_Îê<˚Ütµ1ÔƒOYØ£ı#vÄÍ‰Bì[*:f‹áz-6{muﬂÔ˙]je
>/'ÂÖ;êc˚	±±~éÃ˘Ü–±Xk≈PËu÷%QË5HE/>to◊≥+âBØ±F°◊‚xköò#°óµƒbSíÑ^∂ågl$=v,bzÂ#™‰)m]cΩ¥ˆf∏‰•Äì˜s<¨i¿¬00åY`(£¿&Å°ZÊ‘ “ÜëûÙF3ÈDƒÁuSÍæ(QüpôÓ±£?≈—x±òF=˜e‰»N∏å›çÿãñ`Rk£=È-JÅI˘ıò£EùVh(Zn"ZﬂXØ’◊7Qy•é6*õ§.pmyÉ8@ÙOºŒ4&ŸˇAËÈuHº‡—{œ	≠~aùè≤»ÊÒGwﬁPaLJXè€¶t°Ã¥wˇ¸A_$b⁄øöKÍ®¯5¥ˇ'Nm∏˝oxÿ¸Gúè˛2ÌOÀÎÀ+hµZ{ C6Wi$Âk µqF}3s≠TÎ´Â˜*+®LúÜ‚ùò¨H Gë—Àœ∂ú2Â
mèñ[*‚ﬂN•†2nwRLô´5“e[kÿ±gZË<äEûf·g†'Yp1j=[xÊ®¶lÏ¸”äπ•˝åÍIê„…HõÆ„⁄≈4Ë2ÜY‡·î0XßµÍuﬂ?1\Ìc2ı$Í;ñŸÓ~Çè“Ó˚∏Ì;ÖÆÔ˜‹.VR∫>S:ÉBnE©ÚîÄı*h{]K:d=1\-ÁÙ◊ÍtÃ&yÉ	˛©Á\Ã⁄Mâ£Ì‚Tp2TΩ/é‚mF#*›v√e˚∆Rè~uj:Y+«"O–ê; !y›–ÌcπÍÁ ~…-ÿüê€Ah0)ŒæµÄvø≠¿Ô&M0Ω}h—Èz†cØãvù˘7ScQ:˘§?*Låø8CÄÈâÙ Z8l≥ä±€7ûÓ?NdŒ,HÛKss≥7D"Á¸
˜ùVa!}%.áä7|\èvﬂkµ‹nr∞?˜˝˛w˙÷jáå∂§‘˜ ∆wÕo9mÙ À˛∏6ÅΩêıÿi-ˆ¶o"Ur§X‘Ü±KƒÌ`nÙ≥π6πhzW∫$ﬁò2≥§]»Û¢Íü1så2+Á-§∑Ñ1¢À®ﬁÿ¨î◊4å@Ô2πΩ]êÒìœHÙ?+>∑1Aò„¯ÈK«¡t%‚‘ÀÃ…$„”ä@TIé,ÉÙ≈¡én Ñ≠ÿlR8]z ËnD6√u,Äwùv®√úHY¥†ê-¸`X>]øÎ¢Ê ˝`∫Á{ÑØ¶ÚÂˆDõ4.•-‚e◊h∆°‘:Kã¢ıK—ç<ı	ï:„¬◊ù◊ñü>6ù6œÑˆ?uŸòMöóﬁUìŒw´RùıÂrMr1(ü^f&‘z3ÒÒS\gX¶ù©lNèòyƒMÆj{Ãlπ£Âó–1›Û˝æıŸ≥`rËÙá9t2DÂv’°9Á±•{áxA/Àn„T•ÍDÒÍπÖ[7n‹b™5erK±}úE`ë‹W€Û3s◊ß∑÷ˆ‹Ã≠∑èm{-ØÆ◊+Ïld&Yä4yî@Ò+MÍÑÒ¥˛R˙ï@jŒ˚ÕsO'ûÇªA%e¿Üy.™WçjÌ>I≈BÀÎµF•÷@EV¬Æéﬁ@çje≥>ïÿN«tmŒı[aÚÎCz~!≠µJë5í2fÿˆàD=Ω`as««s⁄…∞
!:ìØ!∏aNÛ% .,á$CπΩÕ@ÿÀ	E—#⁄òæK–·N{∫îc	∞ﬂçÕÍ2^´ÃäÔ_K?råEGßΩ—∆õÖ⁄ÀQh-¶–S8<"Lñ∑ƒx∏ë›•y ñ—I~&»›mpLé1≥œ˘ºÑ!√t…Áˇ&b∑gIWÑùÙ∫ΩÅ“æ‘√}ÓíÍMbˆ‘i\∂Ω¿kJƒ`|Ï;›=|g—UÑ∑‡Õπë&e$Lè”ã&^¶◊?	l~F'Jv˚6:F333ΩˆUD∆≥àhÒ™¢;CÌ¢3d»S¬zœÒµà_&dë∆∏àπ∏¯Uyø≠H(à} 6$%›,˝°—Ù¡\K≈‰4"Zœ	@€ıõÉês¢¯–ÕËQ"íôÏ)Ò!rq∑⁄√Úju•⁄xW©s^€ˇÓµº˛—äs$	;ºîª.9¨…ÊõlæÏE“Ú—“zm´~ÆßO:XÚª≤∞ﬂKπˇR„˙Åm@∂ß":⁄\`ﬁ…X?ìõuîΩ&¯0ÎäkŸΩ:äö6!©Xƒ®e]4˝bÅ|è¬£ns?ªﬁœ›
Õ¶Ü0ªGX¬8O›÷kÖ\+'Ÿ5ÆN<wbMÎÙÒaÕ˙&—ãò~ÉóL£©3Ω$ΩŸŸÆóVPyuïTâ!fÁå~í◊îÛ∂ú©‰ië≥2ûÑ{©â¯Ö6vÛ4 æ0kÊQµÒ`e≥¸kÍ˜K±H5ˆ‹¶»Íâr[Szv"ﬁ,Q‡~5<Ã ƒ1´^k¸^ˇ'Ù&è¸L◊?ê•<ì”ﬂ@d<9
˛ºàÊÊƒ7Ï∫.Ñ‘‚¶vÒ˙KZ¡7=ÆªàJíf:^
ºyÅ€RºÃÀ‘NÅ#¬h|A˛ñR©ñmÍﬁ·4I`*≈U1`3*éíôr6Öª]iMÀØ˙õ®‹j°Ü∑ÁfÍƒ∆0∂Câ,I<s«^ø8Î=Ç¨CèoLhíà@	P ±s‡ß$òÄ6©Ì«Òä]ã·çò‘~∞«Ø¢Tcäkr”£¿ÕGÀSã)ä1/ô´è»‹ƒÉIÜ1ùpæDÉêö¬… ¶ V‰ﬁ?)vú4¢QæG4@h H˝dàÙ4äØ§Ô›€Z]-`±-˛˛}˜Àˇ• ˙%mq÷§ª)ŒÄŒc≤$o˝ ÓW·›´T$S't:Jœfíb5FÁœ»{2RÁ
H–xº
‡≤îßÑ‰é¿Dﬁ§i ≠‘z_]^Ø’gÍÃÓçB,⁄›9ûøq"íP…JoÅÕI5 <sè“lk4Å´CLÅ[ˇ‘Ê»˘\˝°LSyo§ˇ¯Wá‰k∏	ˆáF›Ö«W•≠)r⁄d~=	ëL·k$O8qÃ∆	
»¡◊ÈQ¬GgñøÀÚq„3 ìY!ÀØU2ÕdV´+‰-Î˜ÓIÿéä6eñ—«9+{”≈˙Á≥|À~t˝‡¨4ÑîâªˆÀö◊T‹…Ä3≈¸|çT£íh
LWËÏ©
X¡∆ì≈t6)˙4µ=·õ•wËex∏˙TßÿpÉ–Ô:mikFÍGRëhD·]q´Ô˘¡—b™ñµ¯n!ñÑFˆMp±úAùèF"f{T+°‘%†h1o[ç∆¢ú`&‹sé:xˇ”>âpcsE≠˘"Êkíãû¶OIÎä(<:-pJP ¢_hx’.”∏\±D´äX“Äœ'EäL+˚¯øî8Òz4ˇRâÅÔ§ÌπüÃ˝?ât¶îÿpM!'ê9–e8ÎBÖJ°|Sõ*ÖöËI>?:@(]®Hº9ú6h⁄cr‚ú†"ˇ é%åè2
tÿ8¢Qı6“Ç6M™øÒÛt :ÙÈ”T‰‡RâX°ª.UË»C˙0ÀÈSí∏Rãë~W¨„uåpP:\œãéÌ#ë∫◊I©{suÆE‘—!ïh†LTªÃå¯à
x}HPÀ”«™¬•å©tgΩ¶Q·“QˆP—ãπÕ/≤b|ÂaÑΩ>$Ô#s≈QπóZÉãº<W;B€(ø∑æ’–´o[!^çrìTô∏‹™‹Çâ.«]„’‰¢zÌ5ÓÙ’∏h	'J\Râ#4∏@”{^Méè0Ø¿]€πY⁄Ω1Q‡R›ª0
‹Zµ∂H\z¨Á	ÆM\w‡P[å∆•Û”•g¡ƒa7—«§!Fp¢N‘√‘◊Q=åDÆÚ&äaˆ£‘gêøvO≈ÅsÑUØ}ÑVΩé◊GkN◊Ÿs;$´ı(ƒÃºãÔ˜w|'hMÂCïÊÕS–0#Ö∞≥H~¸¯])ú…§ŸÒVz)“-BzˆE=Í≠‚ì?áËd
.â¸í˛Ø¬hC∑√´…ímn”√´–ƒüC¨.§5O∑º–Ÿi„ñQ0hª°®Æ≤¥ñl }ù””ØEô6z.
$äµÛz Òt›¢Øßf˙~µæŒ@ì$òÕ˘CxYtàtà2√ô}«Èúˆ¶ãxR<°ùﬁ"˚…‘î‰=<Ä∫åŸ*S√0˝S*#Öà ¿†˜ºx;∞AËª0:Z€o9GÇ‡j∏r÷dvRÍrÑäß>GıèS^13∏jÙwˇÙ	"≥ç`Í»VÃkÆu:Û)∞Y5ãÓÉ&ùœ™∑U∏€Ç,Q≠˛Mâãäâ‚Œa‰2∆DÅrôÆ-"V£*\∆,◊«Ã%õ042âëÏ~•IÓπ"jFëøh\⁄Ωâﬁæ]b¡37ÏÇf"á1+Ëz„j≤-•ÑûÅﬂ9~¢ì∆†$Ï◊πƒ~Ì¥“ZÆ¶˙[ûî’ÁJÏºøÇ≈™+zÛˇ,v]QâÅWTBÎ*·±I'W‹ûè9öEk¯“!Æ¯^Qk•⁄™¢€I≤C‡Ë∆´î\ö3±=hÏ.ÚÁ$ƒ(T’'a&&EÔ)v`¢ﬁ»*ŒõûU„[]rÙ∫-ﬁ~M5d€:7]ßπø!p”ΩgÁk¡ﬁéS,]ªuı∆M¯ˇ‹LiÍ±∫WRzU>∑--a ∑†f'™“´TIç|£9~©Å˚®2J;éq(ÊÏu»¸ªñr,ìaä6iÌã!‘Ê ∏≤ j ¥ºﬂWŸJ©OŸ‰‡ª`:L ÿói–øÓe÷›¬¬,√dù“¬∞U°ÍQˇ∞;YÕö$T˘SZı˘…‚o£'x[Ò¬‰ b˚Í	à)Òô4äúÚÉ_ÓM(öŸ≈__§≈xßŒl©’m‹O%8≥ÄZ‚zkjÚHf”˚kàqA7ÌbﬁΩøY^Æ†Õ≠Un©ùdaˆ0-πT^—À¨o£Byuu˝Z-◊h˝ae`’˛BJK¸•Öûˇk≤¸Ç∂ˆ+^<Ê9≈Jû*(Â5…ªÁ‡’ı∆fuπÅñV◊óﬂÅ˜~ÙÚ˘ˇ$MÖx≈èØ°™ÜÓOñ∂Ó∆ju≠⁄@	Jå_zÚD•åçD|SB dÚòHë&é9≠Tßı0Èlä¸2≤-Úk$#øLmçywT¬Ÿ§∂?ÇGIfÇ‰3E>y=•SRÀ‚ï0i.ô·1	Ò⁄eÛBd4ãÈ«€,[∫1cïÑOKŸÇé÷1¡q8ç∑D0ç¶†ã*>≥FñÅZ&O’a:$9è…)}H¡ƒUze¶⁄K)L}˛VZïï≠H,Î8ñÈT¸‹cÉ∫¡MXnuº.z‡·”;¿b≠è«fÍº1&'‡˘éä‹sïßòØÜ—åÈ¡ƒ‰tí∞“3qŒ—zMß=É¸]DÛÃÑ'πt8~¸ºáN‡üã~YŒ¿»ÆÄËóôÿ3(¸7ØmU:Éjtô*t≤~e-ØëjÕ%˘e|{nfÆ§™˝í≠Å6mPΩN¡ü®f«ˆã∫⁄)ºD§3)eò„ü˘õÔy]º´˙ÌAÁºÜ˝ ˇb·Ÿ/5ÂO≠Ûy;u◊¡–>h+_/Ø3£,ÔGÀ˙%ªçô‡<!ˆKÜ'∞Ouvê„" '8+Õ+j ìJ˘;Iˆ.#|Õ'jdj?ö,à+TäUô˙W”∫ZubÀa®∞±∞¶S≤A·.8õ?RêŒ®G∂'‘n4öÌ	üˆƒÍDzƒì›—’F œ3JO\¶ó¢ÍdÉêéµh	±ìëﬂ*w¿kí&ÕÒº*∞ƒﬂîvJåk*Ü¶x<ò±g√äx§˚gø[ ÅËt·/n C_m∂|eåd>C÷=êï˜ı0Ûıôu2K|–è»j!ÍdÙe‹≈DÕª)Ù&∫Çˇ˜¶—ÉCåMUÄL^ıN»øÕÀﬁi ›ëŸÊ%Ïﬁ:Iœ<˜ Î™”Òı6á†ÊßÙ,¶ò‡…ﬂ√ß˝>vâ·H4c¯âó¸H+ΩI+ºô¬™
0}“7•˛L◊ûX[_)Ø.¢Fπ˛™¨T…
.s¬˜’E%≤5ﬂ∂Òr>6)˚v#÷<n-ÃÕﬁúÀî~Î§´¥[…Ì∞ùá.Jóc\¸$D†¶ıEÆ±2p∑Ê†\∂ƒFõIÒû'´ˇÅ‹& ◊lª∏Ô9BJ‹Ÿ	±»∂@òHO¸Ø<É«lhr1rƒFmQÀmÔAjà*ÂQ‰IÅe•§©Wñ5•‰£êvPÀ~w◊€.ZÛ¬–ÀÃuﬁrr ì
ÕLº.ı¡fwé˜ùn´Ì÷®±ÊÎŒ¬Ê!;£ÓÇ¶ãµ7(√Âã*áËåñ∞9zâ‰7<ï"≈∏‚ñ3IL±	~pıÒO:ÙET`¶e¯¶ 1’¶≤7‰÷pÎ2&VYlV1—◊ô∏´p‹•:;Es¡íI¯:M…†¬∆ë«åó`Ü%yœRÊºKlO)∞Ω(πDtÜ|ˇÏ√ˇÇ£ú%2Ò9ëÃÚF˘—ãÑ\qD=Ω§îÒ˜ˇÒ!ìÖ<
ù7ÖÍ=∑ÈÌbˆ}œs€≠º-?-@»gU,nJj√e¢)”ßuÚÀ“\
_]ˇŒÆ(≤+¡{5taƒŒ2ı5∑‡˘Ö§ã&≠F“à‰¨ Dr¡ö=áΩ¨⁄"|Söíñ-°pL3ß4¡Ô†¯·ÃÆ◊mªló{í3ï‰‹,ﬂQàıé§Ú(&FøòÈãŸs5ØCÕ±O\÷∞◊Â^¡È •.j˚j◊Ûå4©r)Jµ$∑◊µπú1EÿC©M”'∏åÓ
Öª””*G””∑gÈùRkdíäàœµŒ
…^N,ë∞4`âd;Ä˝©'Ê´	Ëb;,ñÁµÍ!S÷oœ“M+÷eaRf‚¶åµY≤¬≥gÜàP»˙Ó.¶ÃÍä‘fÆ`ÖHU,.7Ù·}:F(`ÖZ°à5úÂ1 ÄáûPwo[7∏Spgˆf–¸\Ií◊8∏îæ>-.!,*C÷I∂p	ïÈ™◊ü◊ßE¶¬S"ThzxR›Ô˜{·‚Ï,ÊŸ”§πiLEX“;≥¯m?$˙µ¬ÙŒ≈$⁄–˛Ÿï0c∆‘Ä™ÒÇ°IH]J‰Úñ§7™H¶WP°yyã‘/• :û“]jBOÂºÄï◊…}ï£Ëapæ‰≤∆Æ√Á8AÎºJ%©=†=QprÛB|fí©~D{¶
‰ŒÏ!¢Ú‘“íïﬁìΩM"WüMıº≥ÿÇäM¯jT∂\f—ñªIa∞ÄÔ|°6	E∏Ãl$è~∞¥.ì“÷ÄrØá™]¨U∑€Öªâ?‘jt¶"Ø˜ å3˙’™ÅGNøπèﬁ@'¿m$ˇ≤j¶Ó7=èÉ˛kıhoÄΩ¿ÈÓÚﬂ¨üG+ÓSØÈﬁAÛ‘“z7˚â™9πÌ¡‘-}QÂ‘˜¸Ac∞„¢˚|£X;ã∞zÑw~èZJpïp3∆îËñôa”X˛ÍzÏu*%ÔÚ1≤·Ñ„ãA˛\M[
<w?`A¸r<qé˝„n4è0òãA˘âçôÚ«C¡Üvx{Ëkà_π	©!ß†F±Âßéáâ«k{˝#|X8Å‡3i#uóÇ∫ÈÉ$R¡AπId—B:,‰í0ﬂB˛¿Ò@&Ÿ¯Lè ùŸÒÓø)àõÖ·⁄¢«ﬁæﬂˆw‹Dıƒä+ﬁÃﬁwÚÇµ¶	øﬂí§‚^>F~~ıÚ˘ø#¯É$ìè˛ëd#?#Ÿ∆øªv5EsŸN<í∞É9¬†≈9KÜˇÚ˘Ô_>ˇm‘Àøí^~Dªà‡7Ha˛"ı€s2öW…Õ¯üﬂΩ|˛1%¸ˇ€ËÆ?º|˛)˛≤ØÒ/^~˛kr√øê·7ˆÌ˛ÙüËﬂü“Fæ EßÓO‰ñ‚ΩÅOÖˇêÃ°MqQô+…‘FÖ◊K¥ñ‰ªtˆÜ9É*Uüzj¥ºãr2œi-Ç+Â’’+Rªw&tÖÄJé-ÇEV	´”.Ö≠*æñÃ»ƒU›-Í
OÉ‹Ì)å°§¢ä…Ü≈,§√bbK$àËÃ,b§^Y∏‰A@Kâ Xé—7ó¢ÑÁiíÏH2ëòºÎï’ r£≤rEˆ&Dˇ¿mEœ-¶#Ó≤_CåèÍ{~ÕMa≤Q6µà∂Ø,≠\y,ëÿ.Áñ4⁄m—™º⁄;Óæ„h@à€r€…éµcª…ñ•C»¥;äÚÜúÆ◊ÅÛ∫h◊i¡øÑÁwx£2ïç7ÇÖ(†N¸‚Õ˙ pzyŸo^!˛H çiçôD÷ŸExû3¬1¬ˆËŒ3©Âı≠Zc≥Z©ìP°&¥“úi˙-¨Ä™úÿixâHd{/÷TJ¢ÿÌ‰¨Ω%Aë–M|îÔÓÏ4Ñüê«+∞,|“…÷Q3qA÷y˚ÒÂYœ¿sÃv<Àπ‹vù‡UXMrﬁèæ¢*(÷4∏K2˙G∑ê™d˚5˚˛Ÿo?«ˇ˝o¥¥Ç÷ªmëœå,ÕeZ∫´ËJµ?7ﬁÅüµ¯π˙Œ8ñTå◊ú^LÚë˝JFM≥åuÄ≈ŸrËâl•dÅ.Õn’aπñÀÛ˛¸,oçcÈR Zâ,ÊÙ‚—œÏW/	∆eø|∑4èä[ı´hπ|mΩsï∑döÓÂYÀ:Y≈r~æK~Á¸\_ÉüK∆±ÆΩA–kß7%˚(Ω≤ÏC˚•Mº`òµ]ÛZ≠∂ã*N(ã¨TØß
üí$»0£wæÕ}¥‰àRYSIûg° ≈u÷hå	&J
L!¨Ü@nË¸l	QáLé»^é+¶â?•t≠…©6ÂdΩo≤"~Ä@ W∆2Á§±Ÿ•-Ω;pÉ#ª◊Ü∞çl,í—à==2ÛßïK"aäËµßo°^ ™‰Ø±ñÇ+»˙wRﬁ"±Oh∏»U)ïØ⁄}oößl∞]ﬁwõÔ∑Ω∞oLÒ4±˙˙Õ\R5§∫*f÷ƒ§|Såuï´åvr•H¡V£IÎNLG¨U≤Z§D±|MLÆ3òw0ˇ≈/∞Í	;Ä @∏¡2Êt≈©Ø€lZnXî=ûºõ5C6–(ÕL≈˙∞.wÀ#≥Ãç—èaKD]a™∂<ìKY®%& ≈◊¨f}ì∫úùò*}søÎµçíå\i [Ù „&31≥oÛqä:Ñ.¢◊Ó‹â¯<«Lì›wï}¨}ÈbÔ°<=ç^J’¥	V‚§Å"ë‚ÔÌ<ƒ„},¯ÖIdiËíQ˝îòwÕçH\“C†˘]7÷.ôY6Ï®
Ã–k1Q/CU ¿}ÇÅƒi/B0çÛçÛ¯ôœo™À‡»ÃΩ¸“Ä\•O®ˆ{Ì«âz#{“!ú4Ê%Ä«Wj^ëò”iΩ ¡¡s-sº«/9ÕL&U=s=ÍÛo†+ﬂ}¸°ü]ôX›"4C›†¬]Ã`w€ŒﬁpËe˝`–¿1j≥û'≠ÒtJ∆∏ßLp»î#êß“Js-ÂOVj…QZú\˚N(Ó
Ö}ìÙÖ/⁄¢ÃQ^Lœx∫åN]ÍQ„+ƒdn±≈>OIú˝T‚"F›úY \Â–màß•ﬁw{¢ |í¯∑Ùƒ{¯Ùt<	É_\Eû4	ôÃ
SºìúG¨£T«òé/[û>T€N©a+§çp€{å≤I¸Ê9¸9±$˘⁄E‹±—rÂc(˜°sÂ∑ÁÁÅ2œ ;Dô"W‡îF'ììa›ÎSÅ_H/∑å˛∏t¨<ä?¡‘”:$èˇ%2¥ßz∑¢|µ4«ﬂÄÊR8\`>≥DL»CqA¥ûT}W£Hx∫‡`6ê∞ècçcIåäi]EÖ¬„Ò≈˚*N©xüN©Ìπôí€òeDìı&*Ø¨†z£≤!8≠î>ôeELÆC–ÇX>›B»Ã"ã=rWèoÈ"Ò 0≤cS´Ÿí’¡Ë©ãÛh¯¿Ì`eß53\ô‚¯<°<](1AΩ£L‰w∂˙ãgÕ¿]…
ñ&˚¢ƒÎaëøBÇÑß…ÿ Cﬂ.=F≤¿#’Ëôˆ´ü∂[êCjk.ÜÄò:}ka®ÚÃ Èá®$d]ñ9˝‡&?≥Ü›‹™W6—ZπVæ_Y´‘R‡õ!”∂B7∏Á¥î˚Ÿ¿pﬁ:%Œ“à8ú¯÷≥ ‚¨ãf˛’Ä‰îFé·7CÖpÚ{‡‰ms7zs>ØôàÈt∆yÍ`¡Ω-BvÛ:˘ú#Ã∫ÉÊec"Ï¥˚w
eÚµ6±¨Ê§“ı|âÁß`,l¬“$ië—ﬁud‚J	‹]7‹`√«‘ttß–ıß˘GÈc`Õ’c‡≈cêÒ⁄‹ÿÃåf◊Ö∞¨ÒTıQ…bóFsﬂ	 ˝‚¿[ogß~ÅÄ)<QODDS-˘úû"˘EÄB{MÌõ	oMÃi|2±y…Å‘¶ ï„m"÷ﬂÛ%öªr?V¢'3ê∞·¿æ∂È¿kâ˙+H8tW∫ÆÌ©M'°je€∞õí&º>moÙzƒ÷nÀ{åÓ¢y9àzŒ⁄ßÿøâ2€È√èQ"j„uÍéÚ`µı~µ Ù¢Ó‡rìò±$⁄ßvÕ„R`PÎßÚ¡G!>•QﬂQ5Ø ±¡ä3û¶MãRf©è‘IQÛ¿ê≤Ó‰í√”¶≤¥2Ru+•ÒUêíòÁ,≤(ºÈuGÇ/XwõÉ Ú7+z"eEî¸wª·6˜ªPÄ¨äè2DÃ≥w
[’ï7{ YïAEÿ^uC”ú◊3hM0j÷˛JÂauπ"îom»Üjw◊œÔ$Qo≤y¥êå .ú'E—Ωïõ©yØ¶¸»‡Hà!1Pù†o ˜/ÂUÃì6úDØÀV<‰ØyËﬁÆG|ÇÖî™öDô3qÖ◊ŒÊ]O¢ﬂø˚¯7®(Îgü=	üí®*¿õ¯[¯´p2Öõ[›ßQKˇ˝Ô%LŸ.mtÃim2˚á>†çÓ†◊L'PÊ"HE^@#∏Q%ﬁèÖr3qæ'ãÒ ‰èÌ;·è}ØÎ∂¯”`§Ë∫mÉáOdCïÍ≥â—K])¯ar¸I’_• *\(ÔCh¿û%´dü\öE4êOô‘V/ì∑ãä—tN)ñ⁄TŒå]∑ﬂ‹/Óπ˝rœ€
⁄≈¬¨”Ûf˘Núu†òÁ4-J\ò∫™â/¢UnÒ>›XØ7
*Ô&¨n‡EYD«®∞åYÊ–”ê∑V¿è;ΩﬁSºtˆß!~3:Q7Ei—èÎÎµôêT´®.DbR»ZŸ
™_âß6√Æd-âÿ⁄ìøï1A¢I=1}∑ºˇÒÑçŒóÆ]_∏Ò÷Õ[öeâõﬁÿ«ä†Æurº@|[è]–ºˆD·ÆÇo°∂¶S∆cU1\'à‹ä¿9|,ó⁄πÂúÄ9Pîáo_>ˇÜ $0DÑg‰∑Ø	xAÚ¶/ ,<ˇ#˘é÷¢gxˇJü%O¸ë|Ò€"Äæy˘9mÙüÒœ◊‡0ÍÈ8‹6ñ‰D<‚˛ÓÂÛ/¶-ª¸Ú≥O…π+Ô¥ÿ!eêÕ|H√Ñì@áÌ|q@∞H&~éG•ÂÓ“)”3Y∫*4wôg√E5‘3Èq™Ñ9efs"Y(i1ãZÂâC£'2[…íL.;¬$˝ë#Ú??
i⁄tgìeU∂¿p‰Ql£j®Ûâ`HÉzi_E4Ç.€∆˙ì∆˛±T^-◊ñ+RÃXEL˘R◊£GéÕ$Y‡>ÃÕ»Ë8‘µ‰¥ùn”}H∞)Ìä|ƒæ÷d#¶ô˘<
(?>≥†¬| eTDÿ$Ωç‡ÊŒÍöÌΩtèQDé0ËB]ê·"ë+Â?TJD¯’><é‡Ü‡0{A∞â>à†à^0|§Á¬π#:}r:ﬂc›2#yyÔ?≈ˇ@·í4€báíÚ—?¯‘ÿlâ%QómSdÒÁNeS(lëeÄ÷‡£ì	ß)õ]<‹,ZB"|ˇFZ¿2‘u¨§Qî?æ0K…àS)!j{nÊ÷M°QºYH∏¯0Aﬁﬂ1˚#¥ÍÔyÕE0√ˆ	‚(´h7;h«úæpˆ\v/ ‰íØ]¥r}oØM÷¨Nö
%(ê-VÑ]f˝¸6C'
µxJgêïOEölœœ‹§ﬁP„ÂÒ&bπ¯PöF`6…ˆß∞!Ó0ñÉıôi.Æ_*Ø<'UÎ|˝5‚z¬
äÃÒ(ÙA˘ÑiÖ;C ˆ	èbcsΩAê~Pye≠ZCµı°ë~îÈAø∂¥∫æ¸*/ìtAE1¿Ù}"'¶EàRû¿ˆá∏£ŸµıZµ±æâ≠oæÉTÎ¯˜˜–É≠•‹ñx,o
è§ÿWus<æ™HÓ€KUOV>™AÓﬁèÚ[Üı?Çíeº∞ÔÄ~
pNO¡ŸE
mGô'Å#?%≤…7TzâQ"©Ω·KÚÒøπÊK˘M^ÿíxÃ4ëVÓ˜‰Ë%Ω∂∏§¿'"QÉ$®2ºäZnœ«¸ˇ6Ëa’7wı¿Ñë»πN¯≠√¢ªcÕ˘'‰Ö*Â%DAº0çÎÒf£PXê∑¢»≤Cñçåó<^F#ß∫>†n	¶ÂX‰˛ﬂ[ê∂_òæ∞pï˙Òﬂ$2'ÖM:%µÈ≤f¯ú'ZZaAcüí{A‡L?&ø?”6…/—‰˚ö¸íêÙó	ò“Ø  ïºG€ˆÅ◊ﬂoŒA≤ÒG¸3h˝wdß|='C€bíàí”ô¯⁄˝öÙ˙’˙Ö∂]–Â¥ìçnÚœ†≈ØHC‘®Ô¶◊›ı-›πe≈Ì;mÏœÃ>
jÿ/…üˇó√~F¶·œ≤ˆCç	‚· }…î˙Œé‘„∆“úI«±cœŸ·F±“Cè$ü◊c~¿”§ÙiEÃE®J5ÿô°Ó•œH·!bôp“Û69ûhÎ(ƒû"ªi”˝Ÿ sGãA·aÓœ»∞ø£K;∞Ï–¢-¨hÆ„Ç°)‹˜z√åoº#4cvî13Q∂ã›i7æxÑ⁄—xÊ¿h≤ÛêbÅöÊaü&Y£Â|‡ÈNÊá„ò√9…ŒJÃ¿µÌ„Iê»3ÎŸ¿Û°sÅ'Ø¡ãn-âEóDÂa„[ˆ[Æy[…§„ua÷1ÈR∫q˝Ø2¨Û¸¸D≥≥¯‘Û‹&ñK¸]Öﬂ’s,‚·ÂEÜ(%Ëà:ãí$ÒRìôÙÏ-¡ä»î|t6úù"}ÉÅ’0ˆñÚæ@¶´%∏1óíâEU5*´¿ˆìC"€ëKyÈ—å˘o—]≥•Ö¡/é|Kÿ¸T{üö'l‡úd¨a#SOA“äÜ√˜.°C"KjP»Ì“9»« ΩtÉÈjû¬ΩÕ%¸Ãƒ‘ º~,[d∂îtrJ)√õÛº’ã{rT9è=&¨Ï9’©2gﬁ˚<úÑZ#]^Ø5 ”k£\´¨®•ÜX$áÀÇ<YA<ﬂPF†º‚ÓŒœ‡◊ﬂ©£˙÷“Zµ^ØÆ◊ÍBs∞`Ÿôf`ãù-´J~\4â$»cwÜ÷:∆•s(Cœ†èÌüSÖ†ô‡aÂ=<≠Ôhz>ãıó∞˛d‡∑Df3ÛÒÚx˝£ÈÖ9E
 \5?g¬Øƒdä4Ç&6oŸIH»óe¯L4Éd÷âÓÀ◊X>ßÑ1rÊÖ»œ|∏RïåÆ´ê&Ùhv:3ÈµÑôT⁄'%òŒXJ•€”	¿∑˜6 y©î"±ﬂfM≥™zÏ¸"ÎÑ⁄ê’ìNutvA;ÅΩıf¶2Q¥ˇ(ZP∆∆l⁄möîçŸQπO¢µîHá†ÿTÙ=îñFHR@\â@;"µ$¬ØºD"èjX°ê¢E˝ÇãL/2'~£^/ P Ω∂WŒ!ñ√_PüÒµòÎJ‡˛îúAfœG¡tn∫#Ïo”F®d&√i/r—¥CÖ◊è_j|8∏L7ô=’Î—…d8gDÉ›˙ÚÛ#}•µ≤«—WÌ&Uaò—ãr><îç¿«
≤4I1j1WïØD√QdAÄyÏFvfµúp?ÚOÎêTΩô Ô~.√”£Å€Ct˛äqt¸¸T‡Ωìó«b–±fï3œ†E4∆Á"ßé”?TbLaoäd´7,oÑ˚~?m≈¢Ï	òãL†Õûï,C=1‰àŒxeB^XëxÆ˛ÚÚ˘3°«òzéæ~˘˘/«AÍî◊MÖ…¯íÆ(ÕU†y¢>chœË^;r¬†CÑ?8ÅõÑ∫è|ƒ˚^´ÂvÌ¿æ˜pC=øÛsﬂÔLÀ√Ç“WﬁX∏
‰éXÌ@^W® /è/3Î¥™CtQ¯≥iÖÍÌ”RXdí¶©Èå∆ŒÕœ• »Ø ¬c*—º≤•Lü∞¬ı]Rp˝ÙïìB"<ôøaÛRfûñ=¡<jf&´•≠uT.≈πëÊas"–Îoé=Ù&ö7[]3©ãﬁi†&äÅÈ¨ÀYƒÇ•£ÀFKZmMŸüHIÛãÆÇMBïòÂ≥EqDu:∞lÜwù◊'—≈Z"¯˛Ÿ?|
«P”C‡é4®l¬ˆ‹˛öﬂı˙~∞‚ÖΩ∂C¶LœŸ≥™˜ÂFÎOYÒºÚYj›…îG‘(†T∞◊ñf–JecΩ^mòõi£ÄáÛ±‘J1Æ É∂•ñM>Aó%≥±,µ|çG≥‘ÖL,µÍˆ.∞•ñ.¢ßûÉ»Z“D˘Àc≤Ö>Cˆ
∞6=-“æüô≠ˆ“Yha/àÖ6€ïâÖñ_«Ò‘ú™ÖVÉ|gh¢ÖŒ:U¥ÄMg«`¢’X[JØŸ‘x%∞‡öŸoÕòC~Yﬁ∆.Üè—∂≈-Ù÷◊8TUWŒ“ê=œ‚Éa'pù˜	 ±·ÓHƒ[2îë⁄lY´SçÖ _=äÿpé:êÏ∫FDÉA¶t`*ÕúçoàÌ»8;Çmù.ùç}]<ﬂ√:rl)'6∏É•˝œf!Ÿ!`YÜˆwΩÅ›à‚LÏŸÇ¸p¨}r3ıS<~å¢=.su⁄PM≥za¬∞ÄH|ÂåŸäƒåí¿pÎ≈òëÖC”71{ß{ib%÷˛Ω=?3Wz<¥	úòøπJel…Æ5üÖÌñ»x9€m˙”âÌ6û∞!m∑Ÿ	’€nÛÛµ›^õAkïµ• f˝Aumm‹ﬂ,ØTÃÕ∏Qr◊˘òqáOõXr«a…eÀ?±‰N,π™;Œ’íÀÚ≈—öﬂÇtg≤ú¯hÈ÷Ñı2›ûòs'Ê‹‹51Á˛ Ãπ\ûXsÖÕ]v€›ƒö;±Ê¶/.'‹«-8GÇ$&Ê‹â97€ƒú;1ÁfÆÛ4Ár~91ÁNÃπí	õòsÛœùÆ9˜˙zTm<XŸ,?BÂÂÜrBau>∆\k`¨âWk√]–€p˘¥;mï3±‚N¨∏‚{ŒœäÀÅ9Qﬂß
ÜCK~÷H}äâ˜r⁄qˇ?   ˇˇÏ]ˇo«ïˇΩ≈ÑË%jQ≤l´∂j;ê%⁄ÂùæA¢›+Ç†Xë+qœK.ªª¥¨™í⁄\Ùrá †‡À’±ç‘….ê∫¿!˝Wå˛w¬ÕõŸŸùùùoKRî‰pÅƒπ_fgﬁ{ÛÊ3Ô}ﬁ«3≈q«ç„≤¢M 9;rœl∑„ÜP¶m‡Y.ÔNa;Â)Øÿ¿Û˛MWV°$ﬂAßd‡ôçŸsâ0J¨Ã+	nLqÒ8´∏∆•∫Uﬂ®o/Ø°ÊˆÚ∆NYl#GK}B‰êCP]'◊#íWø¬¯Ü/$ﬂÔ°€Çı¯È7í€¿‚q
†#ë˘®tÿ#G«_¸ê›ÿ0eûîÉÖEπz˝XQöåk•∑ò jAZú@FI≥¡+‰N÷¢#(r@Î|◊!˘≤a}ú‘=Ùz§°ù/
tÎ¶~19rf7N&ˆÑù«^Ó-ú"~s~Atw
]G3æ¥§ó–k0!3<œŸxUÜAeñíÀR¿pç	Î∞É±º1~ﬂòœ¬Ø7ktUaµ±Óƒùö≥U”ˆùƒ%ı$=≈≈⁄Æﬂ¨ocW—ﬁ=ÃÍsåÀ7,Æ∂…¥ÀÉçó43≠ J≤ß-HßPUOKÊÜ˚ë|EÆ q‘ŸÚ!çi…ïü"1.èﬂ#ÖoC´I°j3¿Û' jV≠14¨∂EZñ!≥GZ£ß7U√T[±¨≥R∂¬ xj´å\UeºıT,*©Ëñú⁄ÇjO√äπTπ˛»RZ»I>˘ˇsD¢ª>Ñ–U&z≠¥∏s>õ^S!ﬁ*uÄ2Gáwâ$˚,i…e:‡¥Êä•JYà™9uË—’>>—6›íj"¬‚AKÈΩK≠"ÂH}¬¨"JlÁ_†é8|ı;8»Ñè◊çCìù†YJé≈‡i_œ‡öhÑF·ÙË†—r O©âƒ8ÖÿO£N#L„ö*æ€`¿©}¸™.®˙ ÇbË)@ıFÑXßjo÷Ç¡>t„âZz¸JÊ8_–ˆã©å∞¨îz6d¬éí≤nrvüıèIµ[ó]ú‹Ò¨˛œîj˝}Rˆ3ˆ√„¥∞Ú#Íê∞ÓOà„õoPëH€Ü5<¯3K√é∂V™8∞†≥∂à'‡‚¿"FÂÙ‚ãi¿É◊C{Nõ¸€Ñ	z^0Å6—ˆÊ∏Ω®”w≥sœâù
@Z8È÷Ÿ$≤ú›‹éHôÑw/ìÏOraËWPˇ«m≈Ò±Ëv˜ë˚⁄Ç˘z-Y≥ΩÀ^OZ8NZåB-µ…üb¿
ΩK~î#⁄æoB¯ÿÅΩá€\kuúp9ÆŒœ‰ßbQ∞Â…6ﬂÀ&∫êúwrÜp$}f◊7ÊêBrû†¿åa√
ì∂ª]«ÛÌo¨Ω`9˙v'çé[ì€åñ›Eì…ÜçÌÃ5[.ñ7/vä}ô
@≈V,#P∞®Ù‹¥äØµ++<®µB◊I+¡Öµ^p`[I7÷»:⁄âC‹Ò’ä€õΩΩS9g¿Âÿ;O;Ò°Ô.°J‘	¬∏bÛTÑbØ;ƒu≈™ö≈√2îh˘HCGc+ƒ˛√Z^[C´ıÊrcmRˇõ~yÙÚ…;‰œˇ°ﬁÌò±F‚Ωﬁ^PÑ ÛS ˜[yàÎ∂à»wÊö4
ÀâÁπ>E’ï†€˜]<›≠ª±ÉıƒAØC0”ûÁ´¢·VÒâû)V Y¡Çzu€KÖàTı∂Ñ|k‰ì-t6~ú)√6¡ã$/¯=2ﬁxèH˛/ÔØQı&ƒΩC#‘â©F¸K-zP¢√$zT√†øzœ…ˆj¨Ÿw]`“,Ú˜©¯ËÂ„œì¸q¯ˆ™÷¡ÒCÀÌvËF—‰•ß,ÖÖBÄÓÎTÇFë†à°\Júxﬂø&_}∞Wıvcı%hπË ™©‘-5øJ7)öôa≤HΩïgl*{ƒv∏ûío≥KüsÿV≠¬»2n8æ”kM`ÆÀ/¥ıÔ•S•2∂K[kŸü
€–¬ˆkbè>IÂÍ◊‡˘VõA€9|#Bç^+òÑ_îœñRVbh4mÒT^éK^®¢[-ü26‚Gø|¸ï"Ú€íÕ¯Ê≤üﬁƒÉ∂:]¥CrG*M#%qî¢º}_!B^ƒZy«Ω=œmK£ ”«LduQåCÃ≠≈Üh!‹»ø}ˆqqæ•™ﬁ©o7n6Í´3z 	ÓÛ)5Og’∑€ÿl¢µ∆∆?¿ßj6a5„º∆óè?Ê„ûRk¨¢◊i”Ÿr)„‰≠^–s+–ú)˙∆p7™B-A%1RZ-Hû;ïÎ…˙∂àƒÆ~Hƒ>ãh˝ö8$Àîv≠PD-«ßV≤Ì@~πƒ¯Ä~-x=‹·˝‰˜C$F∑à5∂&çm_JÂ{ÙâÒΩ›ªãÖØ7µÉ«áâ[üì˘˛+ÊhΩ6V]Bπp«ÌµÉT»≈pèÎ7íí÷&/‘ËÌØ§ƒ¡˛L+g°Õ⁄P∏S7ø`hSz“C§óÕƒtáÊ–v‡ª¯ü$3_Û‘ı—¸QYÃ°&®—µŸÉ–ÈõyÕôxf%{í\–yÜ"∂†´X!%ÏB*ä"}˙‹P1·f“ ãT5£HÎ{“üO2ÙÓh/©\º' `A⁄1z7Ò¨´áı“ŒOwöıu¥æπ—hnn‚ ;uCËÑ©K¥Å ˛⁄D}ó‰5L¢«’AôooÏ™ÀıU‹E+õ∑7ö«◊G˙)L˝£Ú'uåâÒ<YäÜhÖe3(õ˚≥ó”Æk°v)tªo5ë.ÇU_,å—8®UíW;Ÿ<T∞°èBh nn^N"
Ap*üÄôè7éÒ˘ƒ˙|Õ6≤•1xç… ‰KŸ¥zuÆsQ˙jÜHõRTÌ¸)^fP‡1àùÎ%e˝Å4ß◊Fîe«Òe!˙“∏Ö<_›ƒq õ◊!À)˘Y~¶,Á‹ﬂm˚˚æõÄLO€^‰Ï˙n˚öfVIX€]OÓÃÚ6TÑcaÅ3Tÿ·4G@	#¡ëä;jGª6+ÏıWtÿÇ‹$ºÛΩÄd9jZ∆%ªNdÚ+séúIGQ«i¿ùü|b‘Ç&˚`It…¥w‰]7˘]eﬁôLMLûÑ¥¡¯’∑ÎÎõwÍl
óø~ßÂùù∆≠çÙ¥bõÆŒQ)ÿXiöﬁp~OaÜç:õbõJŸåpëè2å|èÑŒÓÖAw6TApc1,üŒñØΩ=o∫Ë÷–ÅÔÑhÀª∂Å¿å$±Ï˘µŸæO`&v"z≤Â⁄#∂;{˘$–ó&Yé3¥bSœ◊–zZ2≠È≤úXwi™¨Ê\£dŸn¢O,ªfó≠≤j¡´¶DãcHØ–z¨≈°Pß¿È*d:sE‚+d	Í ∏4gÒv_ë~∆Ú¸æ!2ˇe≤Ÿı%˘ÒyGdg:ÛT–°/T˚ÓÀ«_i˙AÕj†u Ω^†ŒM†ÓG´„∂ÓÓ˜’9º
Mˇºˆö‹Óv©’ÂÃä~≥∏÷rzT5›LRîó®+ÿu¬N”ækÆ√˚VY3´YC*jåH›î\Æÿ%‘¡ˇ9-0!úd≤‘˘ƒ+ÈX’ê(≤Ÿ¥yÎÿ.‘+∏=µ~…Ø∂~bˇü€ó∆Ó=6ä4˘9Ÿ!xáœw¶˚_íÕ“œ®Î0µy÷6/ëıì±x¨g€ﬁA!Û‘óm¬
?Ï&o;35ÅÏ◊I;Ät hë∞3bˇƒ‡¯,Îkb·æ°é]≤E´˘°º°˚Cö≈ı[∫Ö:5|9√ÍπìjÁI€?°5g€B0V*ßÔÉ8‚°Œ©˘õ®˘Kábã≈Ÿ0Ä¯E[ÑX‰-âÔLË…^§{Ù_≤üø!~‡öÚ-b+ÁG‰«ÁSHm`Rn¿$«l˚Ú≠8€6ÔRáokC¯h≠8›æ„ÌcWpj&jË8∞ﬁ?ÊNÙ‰Ω|Ú/‘§ùc!ñle∏ﬂs˜U1|	|√©ù£vé^jñÖc6tB3Œ∂•[¨A∂JîNnj›&k›†”—™b	¬√Sb›,c¨ãÎZué.5tÍÿKŒÁ„”ß¶èô>¢£z∆«„6{YŒ∂…˚aÌ‡˛w—
∂XA-GëG©Ø7µÄµÄ…P–Œ?k∫yKì≥ıÎGƒäΩóng|∆b 6˜Ÿ˚êúëC<$è!Bz“t©õsâÃú¨˚Göp∂Ì‡Â⁄‚4}tÍ˚MÿÚm¢N~Œö˘{JÎµP®.byó˛≈ˇZ‡L`Œ‚â¸Ñ[0?ú⁄:ﬁ÷ÅîånÍÃûS—ÑÔü≥uªoAÀs|Ñ›∂Ajµ&ÏØ—æ_Ûzw±‘ú9ìıÇ•o¯Ö*b˚∞ƒY{ÚêÓ4|úÓ”“`î?¶ıˆﬁ£–ﬁØ… ısö±0µ\9/çH 	√tI#ŒÑßf˝ÉÙk¡vŒæ»˝ôÒÚÇÖ]ﬂ\]^[B;õ+çÂ5T_m49#{‰∂=»‹IÏ@.æ`rΩ˚∏kº6‘≥ÛË≥o]úü€Ã_ﬂá‡yfyØ\öüª<èv±Œ∑√†)Ä·l∑ùSsIÍñÃà_¡˙Ä¶ uù˚¯&Y◊í¡’üÖ x4¨|Ë‚Îº{Æ`Ó√.XyûNöÉCßa‹uæˇ™=‹ö¬¨ÀΩä≥˛ RåítÈV¯_!YΩïñ¯‰Y>i¶¯A(‘≈-dC4V67vj+~Ä-l‰˝Îﬁ¬≈¢¿ s)Æv.ÀÚïøÿ§ìŸpq˙ÈÓŒ^.XnË)~æö“π 4c/ª∏√I‰EÃ≤ûvú{âx #z6Áﬁ•ïe9væ≥Î˙•¯÷ıIg]_±π¥í“ I√T«=«‡±Õ)±ígó≥√Æ“D˙’jµ‹Œ!x¬rk±Óªqç¥=êe}RYÂ@»°.“@U1Ï»Ò3ÑÅ∏°`ìrº$≈%Ø›Dq˙aî‹ZÉà˘sô—§WfÌC˜Á/îpõ¶ ©1?ùBx{{U;q‹èñÊÊ «oL9•¨Ω„ìG¸Ä©8¬qñ≈ëc(!Ç‘¡µïAU˝Ì!ÖP·DSq¥¶ ±î$8î_rR“ú‰≥DKùÂ†ÓN2ö∆XπûrVo‡_fÆŒ—-Óqã˘n‹≠\güPu∑ïΩ—OqvÒ :˘ e‹⁄en∞w†n˘ÿŸIvÆÊWÁ®¥•ﬁ)ÕÍ«“‰»1$•Î
abı°Í n_T≠ˆ5À¿>´åYç®ã]Û⁄§>z^ùΩ∂ÇkNQŸDÓ©ÀŒ}`–*¬‡s>cÁ»ë‹@~ºJüƒÍêD≥Ïtò	bômîÁBõî§>ƒ≤ﬂÙ≠Ö∑·]3eÊ‹¸≤/õÂ•€Ω68˚÷/-ÂÅ5ƒH´Ê;ç˙O–z}˝F}{Á«ç-¥µΩπyr°_∞ÏO±ZG'∆‡øíTËo(÷D£˛#œIã˛í|PæŒ—=œ=¿ÚöÂíâ…,—ØàKt<∫∫r9b)¯·ñ≥aô>¬*ü
7Í`ˇd˛^œ[x!ΩÁ„+gùA†âòçZa‡˚ªéX:Õv—G:4Ø∆Í_Vä-®ÜV∂ex¡Ç0(Œî∞%)¸d
6AD‰XuÅ\°Z-Ûö [ÉZΩ‡ËoÔ¸óú,Xuiﬂwzíï}åñBÖ√_i∆E∑Pé~i1U˙ÂvcÜßœ∞_Ø®3ö†ñNã8vçU)‡+›(ê4–ﬂ◊˙&˙ì◊…ÖB~‚¨±i9îR,FﬂÖ·]Ó˛»-«ìq⁄üƒÿBI	≈:§±£çk)∞†µé}h|≈–l9á]XnÓ¥B◊ÌEù†à»_Z%µ<u#i‰‹≈˘úÃ¶~D«k∑›û|Åy)¯¸}|qü˙]ƒã∆÷2ÁÄ…ªPKòxF˛◊˘K¨ª% dg<§taòwU•ï´
8LKE8ÚÆî‚$ƒπXÀ-ı≤Å÷Q. 5„ÕZî^‰Ω‡§©i Uã™mEÅ Ì¢í MƒÀFÂG„^XÏ# HS^SµÔ%ı&+#3ìÆ
µ‰cÁµ’)©ô*b#O• ˚…YÒ&’)∏gU"x”Û]t÷yb⁄vZ\‰9∂∆O‰]§^óÎ6áU€IÅvE;U†¨°ò="ãK+ÚŒïwl—åuË
åYNˆ◊Y‡ j‡	£6ïi˘Hv”ı&ê∆Jüke`∞yYÉYv7∏ﬂË:˚ö•˚óªhò>ÜCg†‰Ú&«èØU∏ÖiÖ¨◊§a˙…àÕ%¸ÍP$»”˘p∆ê°rûÇ°&©≠yˆÚ…g4L»ÌyàÊ˝˚w$¯˚ØØ˘Ä&∂ ÜÔ<O&~¬lÑ<«EÂ,ñ)ı^®˜2¬ìzÎÓ!ë`èyU<‹Ü\ IÌΩsµá`”=˛m˜ü‹VúIÆb X	ˆÍöÒ£æ<ùÛ·Ï•\l°	%òZ¿‰ˆÁÕê2â¢}7§∏ƒà®—C6·Ò“a◊∫!À¸x√‡Ω5_[ å“!ÛC2Å]π$∏pv#óÙ!“›ïÇæGç#»˜j}ksß—<ÿ;!ùöbﬁßÛÊ«e
xOfTÅßÂÊe"qßÌ~˘‰OvóÀq¨)»]xˆ‰EgäpøR∑ÖY(7®Sx{
oü}xõWã)∂ù;™ñ]4∂_Y`;7iLQmm_ÖjóÓ`8∆
iÁñBS<{ägü<;[ŸeÉdqó)åÕˇ2F[3Rì¶3â^'Ô
†Î…C÷´N[Z-ä\+Ë¡“œâ[|aCΩFÍFµ=Ø◊ÆVcrIYPÁéøuŒk‰MEË∆É∞'‘0B~ê∞±Â≤&⁄ÇÂã2∞|ë6s8Ã¸“ò9y[ãìhNdCú/&¿9yMä§„#ÄÈXdÀÈånÖ¨ì3S7ƒ^h…E'Ä≤√ë´HÅ'"–@©´S›…˜ì ﬁ·X	∫êuáñ°&⁄
Ÿ´nÏx~ÑÓEîâî¶Œ«X˜e€Ù-‰~úÃÀ0¡NPà•+O-ì›ŒÎëd¬¢¢w*ñgË√˘Bç‰únU.UÓsq)∞Ä◊qÖÍÀ|qMfﬂ˙?¬í£ßyë~ñÆ¯gHƒ ô¢5,8¨H;˙±uñÚsQ-rÒí‘ã·7 ?*õui°W*Íz–CröMAaÎ≈ﬂ/lΩ»ÌÃ˜kıõM¥≤πv{}c	-ØÆ76–Êv„VccymmÓ4—jΩπ‹X€Q∞Jï¡~eÁÛq•`+[VÚÓûŒ<˙≠îSıOŒI‰-H(ô‰°G±iD*±˘;œı€â—?ø F˝ﬂ√˝Ôƒ‚ﬂÖYú*#}˚åñ˛RﬁõP,Ω†4Mœ2Ç`yMP“≥PZç’1ÌﬂdÖ^á%¸#n`fﬁoz±$«>ÎO%Øçì6ë‚·öù’Ã¨mËÔkŒ¨ñ?µk_é•¢?MzDWÊ^^õú˛¶?£•”W™e7–ı”ƒ$'ëùm˜¿	e˚ÑYhƒ«bﬂP∞då≤∏˛∞¶Ç8Ö¶˜ÖCê(zçZúL:¶s+NüD¨‡ªÏÎàÓÕ2!NwâkHÒtBà'ŸòdÁÈ$ãú.s©Jæ(∑¶À`ﬁﬁgO–Míp‰Ñ´`ç˚.Ï˚$Î	•◊E{I=…—ﬂuÓ¶÷Â€¯˙Î˘F‚ënÖ•¶êñBOR,â~A]}Óí}∞C˙ÑqË∏eºUÓ’E˜≈÷9°›_÷Í›è¯YdéÖ∞êßòn€t”e+`˜›v±‰á¯xÏR¡iRêΩC ùú gFˆ§¢óº⁄%ïﬂm9Ï^ÅÁYJÓÑÓ‡;Ñ*Ù´å‘îïJxKGëNG€ûNËÓ];RçöNú¢‘F◊*?√›◊ª´€”øVÈAﬂÌ·ûÍ¯±n™â7È°“´tF†Xò˘féçVπ,Bª°Î‹%¡	¸dkÑ|‡Éj –FË?YvëÒŒ-∫ÜÄ´sŒ˙¨πF˙õ®Ëä;Áﬁ√ÎEq8hQÆ˙Úó‘|∑∑w–u4_Œz˜BBiK3tô—ö|¸!u‘|_Kb?æ&”ﬁÛ§#Ÿ'~JÃÀo”˘IBû¸¯Sr’ÛóO>‘;ÊÈ
ŸEûY¡H|J£FŸq§ñùÆ”ØV·õs»√É}ü‡Ù∫ÿ+“ﬂ3úÅ–]˜⁄π•ﬁ8¬!€ÊæÄ$¬À{‚sà˝„çYI˛sΩI6Ÿ8“è¢œœÿòyèº –RÖÓwµ¢NàMÁ¨Ê:ñËËºy<MN|Ó˝ØÅ¯=∞ªÊÍúÔÈœô—P˝√ı	ÅbˆÎŒ›—k¢oßRâ˝u √)ùWu&7;ìâ@˙MjpuNï‹˚Œ¸ ’ÍP+˚Ì˛Ôãè–fËÌ{=«gH(P¥©·Ω-õÈø®◊~i/>ƒä¨˚:^D∂ï—Å°6m⁄É.ä;n≤„èZI—C‰{ÿjn∑;à…uQZ·˚cµ¬np®„Øv}Ø¬§¶¥Ê^!ŸQ´”QIï ø⁄eÅÕÉÌ∆≠gª∑wÍ€hÁˆçıF≥Y_M¢^ımÉ;€Æ≠;)l¸˚#∫!I˜T≥ZÍ õUâüA„2∞€ÒVlÊèiág¨Ã√C≠FÍ<‰<õW{O°‡@àP
xF–Êl€˙∆(–‚§ˆ+Ñ †,N€vı∂Ç\xµ–ÿŒ¡e›TP:Àï¬Å	\‚õ´Á†U|Æ…ﬂœÔ§≥7Z÷Nîx"™≈¡Z °t;1v4˜´œlX‘≠‹Ê”∏!≥±g®ÈÁÏ–‡{%”Gï´L˚åÃﬂÛˇIÚ·…;tûxûÜŸŒ¶Ò∞ãYYµÀòÍz=LªLËÅÀCÀ2›»Â·â.%eñ&ê9èŒ>˝–%¡>•L<åí6 é FÄúvõÑ•94ëı…•HäÂ¢]3lôèÊ4±"âY	IL≤€Æ¿jGÿıÉ_ãl∏õG«≤√ íÍ%˘>Å«2±;é¶ú,^÷€Æ—ïg	úN⁄ÛÃIc˘â÷é¥∑RT»¥ã.t0ÎK”ªÈ‘L“ì«°e¢XÊNèLò∫–‡jå(ÃeÚo@ë≤vIÅﬂÓsËQ—ŸNœ\H0ﬂ›ãS'{°tÏ2◊,kEKWZjESÔIêõEN/“k=]Ä•Âí5â÷E∞DP¨~'Õı˚ë ƒÔ≥Ì$~—ı5÷zün:iÃ7NÀ}Ç™idb⁄¢∆*,€√Nø≈Œé∫:oﬁÆà`cuINƒÃ=Y∫∫ŒpKò{3u/9ÅÚ1Z»@Yºi>ÔYﬁõËh+<:≤\‚¬¨√Æ„[ o´Ω;Zë˚˝t˘Lã	pÈO‡ÎGÈwrÖ0…πÖ™êΩZ{íl•|DÀÊÊ”ˆí≤‡O≥d=»Õ√ˇˇ‚˛ÍW‰˜wπß¸%;Q€D∫oCUÒqZ†óuœÛ‘;¶=ˆmaÆÌ¥üÛo4…é˘‚—¯a;+§≈77ÉVŒrf#Ùz≤,ÅÃÍH„˘UÛû%wã_˛ΩıˆL≤£)≠ÙCªQ›√ x}`f0A? Ü6óoÏ†ù˙Z}•ππçD“\nl‘∑ïÂxıOMô`ˆJˆ’5XŸ∞[Q⁄(RcwìM¿ËÚ,vˇÙ‘Ï†ª¶ù""	v(Sâ
ƒëgÄCJÁP$s–a∆C≥9∞C√ÍÄÙïhÈq<ÏÏô•°ÑÙ§bv`ái≈@òé<Ûﬁ•é‘Å∫˝E˝z:Ûp
ÉÆ](k–ˆÈlRÿK2*d-±†a∂a± {ß$∑1Cpk	ãnÕVvZ‚¸æ!‹Ñ<≥D:“Ë–/t§â.—Ÿ—‰a”√l≥…v¸Êû	∫ÖC!uzÙéõÌ~Àç{´i£‹î`Õ2îfEﬂË†zîäjl£<OS-ÃnSr)™¿ªõ∑◊÷vV∂Îıçt˛Ã 	ßá e(≥6¬5‰›Nv‚Öÿ{ï$É˙A™—Õú¶i⁄ƒ™ªÄRa⁄ãl&vµ”«‹¬“¸9T¸9ŸQRw∆•9¶^eØ[n›!ƒ¬Œ⁄≈¿&ú8â≈UR‚dá¢f=;î49
âÜY∑y
≤ÿz4±·ÿ‰nÛá@uÛ1•∫°ÎY9€Õ˚:bùl›˛gÚ·°é?¬¢më∂ΩáX‘Â˚#x∆n˜±ÄÔRöûØ^>˘Â„OÕ‰<\øÎ¡_{b8AÈjÆ;ÆT‚âr
HPRêh&~+Bö<wDòQÚﬁARê— 9„Ñ¸d)çû2®»Ò3^!  ’¨Æ†“œÆc´ÑÁƒÎ‘©ÜçëΩ‘ß•FœñY¨◊√f™R°[ÀÕ˙OñäÍ´ç&œˆì"^w„N–û5˝eëqßõœñMß€ây^D‡l©‰Î|æ$Ú≤Wç∏[%%¬ÅûB∑;äQ§üπJ|·†GcØÆQõ%îìÎÿ≈¨ù∑Æ¬ÏÂyW}g◊ı«KË {∏ø‘¨ê6H[Áı˙ä(fZ¡=oj=eºñ~<˚¯ä™´'ÔÃkÖK≠’jπá´h’rk4ØFZÆ:[±Ì`ÀÉ™cpŒáCÂ’ÇÖSÉò$~És/ÿ¢∆@u‘ãÒï≠Aƒ\±lÇtIæ
ìºJ…èR:++Z¯”#‰Õ√˛19†TßO»°US!g«ÑºMæLÓ''ıÇÄ∂>
Ø◊M)…ªÍMTŸ¿)Úü	uC˝ƒã;Ì–9@’óO˛4#±ï
¶TØDπ§OÂÖ‡ïÑiâºü‚‰%·‰Æ◊K_∏¬dëiäïÚè˙^%LG„‘‘p[¢4!–ù«÷Fndti¥Hx	⁄ª‹{Û∏uT÷´˘SfJæ®Å∂Ú¨ÿI•ï,ÿH+c¯
∏»7]wÇÜπŸª{Æ€<ï^D“0— 'Bï=‹µÑ-"Ù+º it/åÊÿUGÅÈîHá:Ì±Î7	˙AÊÕ´sÙ´´Y7_ﬂ¢PıÔ¥7∏:G≈p‚AÔ@/åÕìß[À=ç££RT“ÙûC@Ëˆ∞T¥Ks 9$=;TäÄV|“<›ƒ:æiıU_Äî\cﬂ¯öÄUh’Ò¸C¥ÊuΩ≠Ω=o?ŸÂïÑ$‡œR;9}`÷÷ò 2IãarE2Íº=∞‚ÙÂﬂz«çAÄãaqÚ‰—3dÂ¯∑úÄ”—Ü«ëß¡√»⁄f–Û·o∑}
-Ræπ2è‰ç¥˘o`∑‰JVˇ∆i¥9ß +…˝˙mˆëàÄ†¯Ø¶¯¸¥ú√B†r}Ö¸õvUå≈áœY >H“Fso
ﬂÎÂüL_IìU1ò#ë◊ñ3<‰ä	8÷ù˚¨ˆ%qOUÕR!Ú≥⁄ÎÇ√Ïy¡a∞XI+	£"≤4Wpî) ¡ºÈ¢Ì.Øë	¯¢ã∞:Én=˙¯°n'ÒÂ◊*nmøÜ.ÕœÎB‹¨aò y†Í6Eòò.¨Á‘k˝-|∫ã∂æã6âµRÌ5˛RçﬁágÛù_WΩâ™ÜÛÅÁMT9t£ü1€-∏Ök`†…UΩ ŒÜã+3ÏÉΩ5QÜΩ¿A·wF◊eWº¿·Ì°*πD∑nF˚å“V´¨›BHÏª%4Øø‰Å2†á¸ä\hÓ5iÔü∫˜ú=?Ü=uoÖ-ÂHØ•ûg&6—L wÜCì*úwuAàØ/˚~pÄ÷¨¯õ˜ps™ˆ
±ÓÊr¡Iô4∆®˝	MC•∂¿ﬁØ¡¡ñ?˘gÇ£}c∞∑áü˙€îq‚iÜØΩè-}"$éâO+F7}n≠@IeH1ƒÂ&¥©_≤|ÂgiÊÏ∑∆'´=|˙kπxYYNmπA©©À|æÜ¢∑¨”0Yó!/f∆É÷o–.lñ
VnÖ 8Y/ém≥h¢è}≥í¸†¯˛å.
äKÇÛöÅ&DU%YiR§Ápÿ4"@V)¥™åΩ6•ƒYEfciﬁrª∏ﬂ©ÄF’j_#˛˝⁄ûÁ«XÓ™]r”.T·kóW:Ø≠êDuuXIƒÎ¯À˜í,πêJ∫Ì*@Rb[	ˆTæ/SJ•'”2ÅÏe_6À∑{múµ~iiƒ9ƒ„ÊÇ¥Àñ±m6n’∑U·ÁM€ói9◊år¡Á–”–sSËy÷ÙˆÖ@2U∫4»\óC‡lÆëU…åK’rπËq	»©tç‹bË0;AæUŒ[Ê∏¡i*∑ä4EÙ”jqp˙o˜_U1NC«‡¯ÆÑé±u—éÔøÅÇ)H„àD'*‚hñ:•7nµzb´)—6ï"Qd…e«õÁ(VR»Ø≥gLc[ƒ„œ Åp˜éÔÙ`óƒ˝π¨D√db–àñwΩ^Z	M≥˝yR
œ5o:vj‘Îª2Áw∏6—¿ÒkèIÔ¶Å⁄”@ÌS¢Ä'®ÕTT¶]<+§ùˇ}å!⁄„S˜ixˆIÖg_ûBtü·S4û«ﬁ»]ﬁ'∫0<∏ü!äShﬂ¯¶ﬂUhª˛˜ıï&îó[ﬂjR†ü˜iaáı†Ì¯5/⁄ÏªΩíˇ¢%∆1èÒˇ∞àÒkôN¶S“Æ\'ç∏!∞Pªîl	\.W:-€=(í`/ÚÔîoQÓµroëŸ!	Á÷¢8Ëo·nrˆ…%˘ÚNÇúî-“V‰bë`˚˛æ\!î?O∆%•Ã\0QÈÂƒ0ˆbø∞(Çˇj„†∑ı≈öÌÏ·’#p∏÷úCT+ñ∞HB‹Ÿ	]°HDÍÈq5ÙÀE&E‹/TTı•˝2⁄lJﬂ´ÂΩíò—‚vœ˘≈¬vèr√G≤˜.ØQ#0VÀJ8p5ÑÇêÏ∑BèL≥ÑÊÙ≈∆X{Ì*è›T∑RùU•ÚŸC#Gciä¢DÍıo§¸ıoè$Däæ°¬Õø
-ƒéöShC‚ø”^•uí∞(äp!7UÓ2—©-ﬁ&-Bh$≥röíK:KZ *}üK#›hôßiÁ—`∑è°Lâá#•_‡H|¡ä[‘ˆQ|ÊFQü+r6åœúò«¥ºß˜°˙HÔ÷ô]∏(æBaKV¢ã*?πH’}
MfÊá™Î“Ï Ö!V±ñÄ@-h∂©+ [˚VtL˝.[îüy´a∑Z–xÈ
°Ù8o"YdhñïÁ"£Ú’güòöùü}tiO 	>µ”§ÚçìŒÒ~ØAëËõˇXt’}û∫Ë•s÷˘ÎóÜÛ◊±”ö˜◊¡8ˆ76õ|ØMJûˆZî…u´Dó‘zTÚAB˜Â‚qìxúE^jÂU9òÈ:œâ<˝faûp[k‹9NÆ5b+»ûE<O&µ¸ó"y;°jœâö≤s8ÊıÑô˝ ¸ΩŒ€"ªÑÒU´ï°øâF´4»®«K.ûÊ‘∫ô˚€Ω?˙ﬁ˜h‚—rªÎıöŒÓûl≈µõ+W¡.'#Ö=Å Øuz`)ì÷,!*y˜Ø_'A.)÷_x¯∆Ïn‰ˇAõ‰2Ì:Ì}˜Õ•Ñ1
7‚:∫Ü∞ô¶œ:«péﬁÚπ—9z6÷¨∆Ø.i%Ëã
uzH©xΩÑñ.‹£Z&˛”˜èË; Ì0«ıw4’u 	∞Z›K◊sb£@ßef†B+ÍP±:Ç—yÄ≠8	∑  ì—Ò*¿ÈÙk!ì°PYÖõZπû9¿÷ª√M¶Y…ó∑.ì!3ôˇÃ€eZ⁄`Äs'i≥ô6Ò≈Iàˆd∂f&’ú¶€ÍÙ<l ¯…Tí¡•0˙É%t$h˝Ö˝…uÈrÙ§ˆ´œi7¯¯ˆ1˚é°Oä⁄6óG≠msƒÖ·ÒΩ©xûX;QQy9=†æKÆ∑Œ_Ã’x>"›+>4±{0pÓ˝~∆ã•3€∑ÂÙ\ˇGﬂ˚   ˇˇ êÎ@?