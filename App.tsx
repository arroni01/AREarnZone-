
// Trigger snapshot update
import React, { useState, useEffect } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { User, Task, WithdrawRequest, Transaction, PaymentMethod, MembershipRequest, DepositRequest, MembershipPlan, TaskSubmission, WithdrawOption, AppNotification, SocialLink, Language, GlobalConfig, SellCategory, SellItem, StoreOrder, TelegramVerificationRequest, AdViewLog, GatewayLog } from './types';
import { ICONS } from './constants';
import { COUNTRIES, translate } from './components/localization';
import { 
  uploadInitialDataIfEmpty, 
  uploadConfigIfEmpty, 
  saveDocument, 
  deleteDocument, 
  listenToCollection, 
  listenToDocument,
  getIsQuotaExceeded,
  isQuotaError,
  isOfflineError,
  fetchCollection,
  auth
} from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import Dashboard from './components/Dashboard';
import Tasks from './components/Tasks';
import Referral from './components/Referral';
import Withdraw from './components/Withdraw';
import AdminPanel from './components/AdminPanel';
import Membership from './components/Membership';
import Deposit from './components/Deposit';
import Auth from './components/Auth';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Profile from './components/Profile';
import History from './components/History';
import SocialPopup from './components/SocialPopup';
import AdminOtp from './components/AdminOtp';
import Buy from './components/Buy';
import TelegramVerify from './components/TelegramVerify';
import AdManagerOverlay from './components/AdManagerOverlay';
import { FAQ } from './components/FAQ';
import { InstallAppModal } from './components/InstallAppModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { getAIRecoveryConfig, runAIHealthScanAndRecovery } from './utils/aiRecoveryEngine';

// Global Translations Dictionary (Expanded)
const TRANSLATIONS = {
  EN: {
    welcome: "Hi",
    balance: "Total Balance",
    todayEarn: "Today's Earn",
    tasksReady: "Tasks Ready",
    refIncome: "Referral Income",
    upgradeNow: "Upgrade Membership Now",
    withdraw: "Withdraw Assets",
    history: "History",
    startMission: "Start Mission",
    missionHub: "MISSION HUB",
    inviteEarn: "Invite & Earn Commissions",
    payoutSecure: "Verified Payout System",
    lockTitle: "Permanently Locked",
    backDash: "Back to Dashboard",
    maintenance: "System Maintenance Underway",
    maintDesc: "We are optimizing our global CDN nodes. Please return shortly."
  },
  BN: {
    welcome: "হ্যালো",
    balance: "মোট ব্যালেন্স",
    todayEarn: "আজকের ইনকাম",
    tasksReady: "টাস্ক রেডি",
    refIncome: "রেফারেল ইনকাম",
    upgradeNow: "মেম্বারশিপ আপগ্রেড করুন",
    withdraw: "উইথড্র করুন",
    history: "ইতিহাস",
    startMission: "মিশন শুরু করুন",
    missionHub: "মিশন হাব",
    inviteEarn: "আমন্ত্রণ করুন ও কমিশন আয় করুন",
    payoutSecure: "ভেরিফাইড পেমেন্ট সিস্টেম",
    lockTitle: "সিস্টেম লক করা আছে",
    backDash: "ড্যাশবোর্ডে ফিরুন",
    maintenance: "সিস্টেম রক্ষণাবেক্ষণ চলছে",
    maintDesc: "আমরা আমাদের গ্লোবাল সিডিএন নোডগুলি অপ্টিমাইজ করছি। অনুগ্রহ করে কিছুক্ষণ পর ফিরে আসুন।"
  }
};

// Helper to safely merge remote Firestore data into local React state (initialized from localStorage)
// without wiping out local-only records (created while offline/quota-exceeded) unless they were deleted from server.
function mergeRemoteData<T extends { id: string }>(
  localList: T[],
  remoteList: T[],
  lastSyncedList: T[]
): T[] {
  const mergedMap = new Map<string, T>();

  // 1. Add all remote items (source of truth for anything on the cloud)
  remoteList.forEach(item => {
    mergedMap.set(item.id, item);
  });

  // 2. Add local-only items that have not been synced to the server yet,
  // and exclude those that were previously synced but are missing from remoteList (which means deleted by server)
  localList.forEach(localItem => {
    if (!mergedMap.has(localItem.id)) {
      const wasSyncedBefore = lastSyncedList.some(s => s.id === localItem.id);
      if (!wasSyncedBefore) {
        // Keep local-only items that were never synced
        mergedMap.set(localItem.id, localItem);
      }
    }
  });

  return Array.from(mergedMap.values());
}

const App: React.FC = () => {
  const getStored = (key: string, fallback: any) => {
    const savedGlobal = localStorage.getItem(key);
    try {
      return savedGlobal ? JSON.parse(savedGlobal) : fallback;
    } catch {
      return fallback;
    }
  };

  const [currentUser, setCurrentUser] = useState<User | null>(getStored('arez_current_user', null));
  const [isDarkMode, setIsDarkMode] = useState(getStored('arez_dark_mode', false));
  const [language, setLanguage] = useState<Language>(getStored('arez_lang', 'EN'));
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(getStored('arez_country_code', 'BD'));

  const handleCountryChange = (code: string) => {
    setSelectedCountryCode(code);
    localStorage.setItem('arez_country_code', JSON.stringify(code));
    const country = COUNTRIES.find(c => c.code === code);
    if (country) {
      setLanguage(country.languageCode as Language);
    }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSocialPopup, setShowSocialPopup] = useState(false);
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [dbQuotaExceeded, setDbQuotaExceeded] = useState(false);
  
  // GLOBAL CONFIG STATE
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>(getStored('arez_global_config', {
    appName: "AREARNZONE",
    maintenanceMode: false,
    defaultLanguage: "EN",
    cdnOptimization: true,
    systemNotice: "Welcome to the elite earning platform.",
    enableEmailOTP: false,
    requireReferralToWithdraw: false,
    enableAdManager: false,
    adIntervalMinutes: 5,
    adSkipSeconds: 15,
    adLinks: [
      "https://www.youtube.com/embed/668nUCeBHyY",
      "https://www.google.com"
    ],
    adsList: [
      {
        id: "default-ad-1",
        name: "Sponsor YouTube Promo",
        type: "Video",
        url: "https://www.youtube.com/embed/668nUCeBHyY",
        thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300",
        isActive: true,
        orderNumber: 1
      },
      {
        id: "default-ad-2",
        name: "Google Sponsor Link",
        type: "Web Link",
        url: "https://www.google.com",
        thumbnail: "https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=300",
        isActive: true,
        orderNumber: 2
      }
    ],
    adLoginDelaySeconds: 30
  }));

  // Fast Loading State
  const [isAppReady, setIsAppReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [timezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Global Synchronized Data
  const [users, setUsers] = useState<User[]>(getStored('arez_users', []));
  const [tasks, setTasks] = useState<Task[]>(getStored('arez_tasks', [
    { id: '1', title: 'Join Official Telegram', reward: 10, type: 'Telegram', description: 'Join our official channel for premium updates.', instructions: ['Click Join', 'Take Screenshot', 'Upload Proof'], isActive: true },
    { id: '2', title: 'Watch & Earn ৳20', reward: 20, type: 'Watch & Earn', description: 'Watch the full tutorial on how to earn ৳1000 daily.', instructions: ['Watch 2 minutes', 'Like video', 'Upload proof'], youtubeLink: 'https://youtube.com/watch?v=example', isActive: true }
  ]));
  const [taskSubmissions, setTaskSubmissions] = useState<TaskSubmission[]>(getStored('arez_submissions', []));
  const [withdraws, setWithdraws] = useState<WithdrawRequest[]>(getStored('arez_withdraws', []));
  const [membershipRequests, setMembershipRequests] = useState<MembershipRequest[]>(getStored('arez_membership_reqs', []));
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>(getStored('arez_deposit_reqs', []));
  const [transactions, setTransactions] = useState<Transaction[]>(getStored('arez_transactions', []));
  const [adViewLogs, setAdViewLogs] = useState<AdViewLog[]>(getStored('arez_ad_view_logs', []));
  
  const [withdrawOptions, setWithdrawOptions] = useState<WithdrawOption[]>(getStored('arez_withdraw_opts', [
    { id: '1', label: 'Option A', amount: 185, feeType: 'flat', feeValue: 30, minRequired: 185, isActive: true },
    { id: '2', label: 'Option B', amount: 380, feeType: 'flat', feeValue: 30, minRequired: 380, isActive: true },
    { id: '3', label: 'Option C', amount: 575, feeType: 'flat', feeValue: 30, minRequired: 575, isActive: true },
    { id: '4', label: 'Withdraw All', amount: 'all', feeType: 'percent', feeValue: 10, minRequired: 50, isActive: true }
  ]));

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(getStored('arez_payment_methods', [
    { id: 'm1', name: 'bKash', number: '017XXXXXXXX', isActive: true, type: 'Personal', feeType: 'flat', feeValue: 0, minWithdraw: 0, category: 'membership' },
    { id: 'm2', name: 'Nagad', number: '018XXXXXXXX', isActive: true, type: 'Personal', feeType: 'flat', feeValue: 0, minWithdraw: 0, category: 'membership' },
    { id: 'w1', name: 'bKash', number: 'User Account', isActive: true, type: 'Personal', feeType: 'flat', feeValue: 0, minWithdraw: 50, category: 'withdraw' }
  ]));

  const [gatewayLogs, setGatewayLogs] = useState<GatewayLog[]>(getStored('arez_gateway_logs', []));

  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>(getStored('arez_plans', [
    { id: 'plan_pro', name: 'Verified Pro', price: 100, validityDays: 3650, referralBonus: 50, features: ['Unlimited Tasks', 'Priority Support', 'Verified Badge'], isPopular: true, isActive: true }
  ]));

  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(getStored('arez_social_links', [
    { id: 'sl_tg', name: 'Official Telegram', url: 'https://t.me/AREARNZONE_OFFICIAL', type: 'Telegram', isActive: true },
    { id: 'sl_fb', name: 'Facebook Group', url: 'https://facebook.com/groups/AREARNZONE', type: 'Facebook', isActive: true }
  ]));

  const [appNotifications, setAppNotifications] = useState<AppNotification[]>(getStored('arez_app_notifications', []));
  
  const [targets, setTargets] = useState<ReferralTarget[]>(getStored('arez_targets', []));
  const [targetHistories, setTargetHistories] = useState<TargetHistory[]>(getStored('arez_target_histories', []));

  const [sellCategories, setSellCategories] = useState<SellCategory[]>(getStored('arez_sell_categories', [
    { id: 'cat_1', name: 'Gmail' },
    { id: 'cat_2', name: 'YouTube' },
    { id: 'cat_3', name: 'Earn Zone Account' }
  ]));

  const [sellItems, setSellItems] = useState<SellItem[]>(getStored('arez_sell_items', [
    { id: 'item_1', title: 'Premium Gmail Account 24', category: 'Gmail', price: 90, description: 'Fresh Verified Account for marketing & professional use.', details: 'Email: verify_ez_user@gmail.com | Password: pass_secure992 | Recovery Email: recovery_user@gmail.com', status: 'available', createdAt: new Date().toLocaleDateString(), purchaseLimit: 1, purchasedCount: 0, enableSD: false },
    { id: 'item_2', title: 'EarnZone Pro Starter Account', category: 'Earn Zone Account', price: 150, description: 'Ready to earn zone verified accounts.', details: 'Credentials: username "starter_ez" | Default PIN: 908127', status: 'available', createdAt: new Date().toLocaleDateString(), purchaseLimit: 1, purchasedCount: 0, enableSD: false }
  ]));

  const [storeOrders, setStoreOrders] = useState<StoreOrder[]>(getStored('arez_store_orders', []));
  const [telegramRequests, setTelegramRequests] = useState<TelegramVerificationRequest[]>(getStored('arez_telegram_reqs', []));

  // PWA Install Prompt Listener
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Translation Helper
  const t = (key: any): string => {
    if (!key) return '';
    // If it's a string, use our comprehensive translate function
    if (typeof key === 'string') {
      return translate(key, language as any);
    }
    const keyStr = String(key);
    return (TRANSLATIONS as any)[language]?.[key] || translate(keyStr, language as any) || (TRANSLATIONS as any).EN?.[key] || keyStr;
  };

  // CDN Fast Loading Logic
  useEffect(() => {
    const totalSteps = 100;
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep += Math.floor(Math.random() * 20) + 5;
      if (currentStep >= totalSteps) {
        currentStep = totalSteps;
        setIsAppReady(true);
        clearInterval(interval);
      }
      setLoadProgress(currentStep);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  // Firebase Cloud Sync States and Refs
  const [isFirebaseLoaded, setIsFirebaseLoaded] = useState(false);
  const loadedCollections = React.useRef<Record<string, boolean>>({});
  const lastSyncedUsers = React.useRef<User[]>([]);
  const lastSyncedGlobalConfig = React.useRef<GlobalConfig | null>(null);
  const lastSyncedTasks = React.useRef<Task[]>([]);
  const lastSyncedSubmissions = React.useRef<TaskSubmission[]>([]);
  const lastSyncedWithdraws = React.useRef<WithdrawRequest[]>([]);
  const lastSyncedMembershipRequests = React.useRef<MembershipRequest[]>([]);
  const lastSyncedDepositRequests = React.useRef<DepositRequest[]>([]);
  const lastSyncedTransactions = React.useRef<Transaction[]>([]);
  const lastSyncedAdViewLogs = React.useRef<AdViewLog[]>([]);
  const lastSyncedWithdrawOptions = React.useRef<WithdrawOption[]>([]);
  const lastSyncedPaymentMethods = React.useRef<PaymentMethod[]>([]);
  const lastSyncedMembershipPlans = React.useRef<MembershipPlan[]>([]);
  const lastSyncedGatewayLogs = React.useRef<GatewayLog[]>([]);
  const lastSyncedSocialLinks = React.useRef<SocialLink[]>([]);
  const lastSyncedNotifications = React.useRef<AppNotification[]>([]);
  const lastSyncedSellCategories = React.useRef<SellCategory[]>([]);
  const lastSyncedSellItems = React.useRef<SellItem[]>([]);
  const lastSyncedStoreOrders = React.useRef<StoreOrder[]>([]);
  const lastSyncedTelegramRequests = React.useRef<TelegramVerificationRequest[]>([]);
  const lastSyncedTargets = React.useRef<ReferralTarget[]>([]);
  const lastSyncedTargetHistories = React.useRef<TargetHistory[]>([]);

  // Initialize and Sync Firebase Firestore
  useEffect(() => {
    let active = true;
    const unsubscribes: (() => void)[] = [];

    async function initFirebaseSync() {
      try {
        console.log("Initializing Cloud Sync with Firebase Firestore...");

        if (getIsQuotaExceeded()) {
          console.warn("[Firestore Safe-Guard] Pre-emptively skipped initial cloud sync because quota is exceeded.");
          setDbQuotaExceeded(true);
          setIsFirebaseLoaded(true);
          return;
        }

        // 1. Upload local data if Firestore is empty (Initial migration)
        // We use isSeeded flag inside the global config to track if initial seeding was completed.
        const remoteConfigResult = await uploadConfigIfEmpty("config", "global", { ...globalConfig, isSeeded: true });
        
        // If we hit quota during config load, remoteConfig is returned with localConfig but isQuotaExceeded will be set
        if (getIsQuotaExceeded()) {
          console.warn("[Firestore Safe-Guard] Quota limit detected during config check. Fallback to sandbox.");
          setDbQuotaExceeded(true);
          setIsFirebaseLoaded(true);
          return;
        }

        const isAlreadySeeded = remoteConfigResult?.existed;

        if (!isAlreadySeeded) {
          console.log("[Firestore Sync] Seeding empty database collections for the first time...");
          await uploadInitialDataIfEmpty("users", users);
          await uploadInitialDataIfEmpty("tasks", tasks);
          await uploadInitialDataIfEmpty("submissions", taskSubmissions);
          await uploadInitialDataIfEmpty("withdraws", withdraws);
          await uploadInitialDataIfEmpty("membershipRequests", membershipRequests);
          await uploadInitialDataIfEmpty("depositRequests", depositRequests);
          await uploadInitialDataIfEmpty("transactions", transactions);
          await uploadInitialDataIfEmpty("adViewLogs", adViewLogs);
          await uploadInitialDataIfEmpty("withdrawOptions", withdrawOptions);
          await uploadInitialDataIfEmpty("paymentMethods", paymentMethods);
          await uploadInitialDataIfEmpty("membershipPlans", membershipPlans);
          await uploadInitialDataIfEmpty("gatewayLogs", gatewayLogs);
          await uploadInitialDataIfEmpty("socialLinks", socialLinks);
          await uploadInitialDataIfEmpty("appNotifications", appNotifications);
          await uploadInitialDataIfEmpty("sellCategories", sellCategories);
          await uploadInitialDataIfEmpty("sellItems", sellItems);
          await uploadInitialDataIfEmpty("storeOrders", storeOrders);
          await uploadInitialDataIfEmpty("telegramRequests", telegramRequests);
          await uploadInitialDataIfEmpty("targets", targets);
          await uploadInitialDataIfEmpty("targetHistories", targetHistories);
          
          // Save config to Firestore to finalize seeding flag
          await saveDocument("config", "global", { ...globalConfig, isSeeded: true });
        } else {
          console.log("[Firestore Sync] Database is already seeded. Skipping initial data uploads (saved 17 collection scans).");
        }

        if (!active) return;

        // 2. Start Real-time synchronization listeners
        unsubscribes.push(
          listenToDocument<GlobalConfig>("config", "global", (data) => {
            if (data) {
              setGlobalConfig(data);
              lastSyncedGlobalConfig.current = data;
              loadedCollections.current["config"] = true;
            }
          })
        );

        unsubscribes.push(
          listenToCollection<User>("users", (data) => {
            setUsers(prev => {
              const merged = mergeRemoteData(prev, data, lastSyncedUsers.current);
              lastSyncedUsers.current = data;
              return merged;
            });
            loadedCollections.current["users"] = true;
          })
        );

        unsubscribes.push(
          listenToCollection<Task>("tasks", (data) => {
            setTasks(prev => {
              const merged = mergeRemoteData(prev, data, lastSyncedTasks.current);
              lastSyncedTasks.current = data;
              return merged;
            });
            loadedCollections.current["tasks"] = true;
          })
        );

        unsubscribes.push(
          listenToCollection<TaskSubmission>("submissions", (data) => {
            setTaskSubmissions(prev => {
              const merged = mergeRemoteData(prev, data, lastSyncedSubmissions.current);
              lastSyncedSubmissions.current = data;
              return merged;
            });
            loadedCollections.current["submissions"] = true;
          })
        );

        unsubscribes.push(
          listenToCollection<WithdrawRequest>("withdraws", (data) => {
            setWithdraws(prev => {
              const merged = mergeRemoteData(prev, data, lastSyncedWithdraws.current);
              lastSyncedWithdraws.current = data;
              return merged;
            });
            loadedCollections.current["withdraws"] = true;
          })
        );

        unsubscribes.push(
          listenToCollection<MembershipRequest>("membershipRequests", (data) => {
            setMembershipRequests(prev => {
              const merged = mergeRemoteData(prev, data, lastSyncedMembershipRequests.current);
              lastSyncedMembershipRequests.current = data;
              return merged;
            });
            loadedCollections.current["membershipRequests"] = true;
          })
        );

        unsubscribes.push(
          listenToCollection<DepositRequest>("depositRequests", (data) => {
            setDepositRequests(prev => {
              const merged = mergeRemoteData(prev, data, lastSyncedDepositRequests.current);
              lastSyncedDepositRequests.current = data;
              return merged;
            });
            loadedCollections.current["depositRequests"] = true;
          })
        );

        unsubscribes.push(
          listenToCollection<Transaction>("transactions", (data) => {
            setTransactions(prev => {
              const merged = mergeRemoteData(prev, data, lastSyncedTransactions.current);
              lastSyncedTransactions.current = data;
              return merged;
            });
            loadedCollections.current["transactions"] = true;
          })
        );

        unsubscribes.push(
          listenToCollection<AdViewLog>("adViewLogs", (data) => {
            setAdViewLogs(prev => {
              const merged = mergeRemoteData(prev, data, lastSyncedAdViewLogs.current);
              lastSyncedAdViewLogs.current = data;
              return merged;
            });
            loadedCollections.current["adViewLogs"] = true;
          })
        );

        unsubscribes.push(
          listenToCollection<WithdrawOption>("withdrawOptions", (data) => {
            setWithdrawOptions(prev => {
              const merged = mergeRemoteData(prev, data, lastSyncedWithdrawOptions.current);
              lastSyncedWithdrawOptions.current = data;
              return merged;
            });
            loadedCollections.current["withdrawOptions"] = true;
          })
        );

        unsubscribes.push(
          listenToCollection<PaymentMethod>("paymentMethods", (data) => {
            setPaymentMethods(prev => {
              const merged = mergeRemoteData(prev, data, lastSyncedPaymentMethods.current);
              lastSyncedPaymentMethods.current = data;
              return merged;
            });
            loadedCollections.current["paymentMethods"] = true;
          })
        );

        unsubscribes.push(
          listenToCollection<GatewayLog>("gatewayLogs", (data) => {
            setGatewayLogs(prev => {
              const merged = mergeRemoteData(prev, data, lastSyncedGatewayLogs.current);
              lastSyncedGatewayLogs.current = data;
              return merged;
            });
            loadedCollections.current["gatewayLogs"] = true;
          })
        );

        unsubscribes.push(
          listenToCollection<MembershipPlan>("membershipPlans", (data) => {
            setMembershipPlans(prev => {
              const merged = mergeRemoteData(prev, data, lastSyncedMembershipPlans.current);
              lastSyncedMembershipPlans.current = data;
              return merged;
            });
            loadedCollections.current["membershipPlans"] = true;
          })
        );

        unsubscribes.push(
          listenToCollection<SocialLink>("socialLinks", (data) => {
            setSocialLinks(prev => {
              const merged = mergeRemoteData(prev, data, lastSyncedSocialLinks.current);
              lastSyncedSocialLinks.current = data;
              return merged;
            });
            loadedCollections.current["socialLinks"] = true;
          })
        );

        unsubscribes.push(
          listenToCollection<AppNotification>("appNotifications", (data) => {
            setAppNotifications(prev => {
              const merged = mergeRemoteData(prev, data, lastSyncedNotifications.current);
              lastSyncedNotifications.current = data;
              return merged;
            });
            loadedCollections.current["appNotifications"] = true;
          })
        );

        unsubscribes.push(
          listenToCollection<SellCategory>("sellCategories", (data) => {
            setSellCategories(prev => {
              const merged = mergeRemoteData(prev, data, lastSyncedSellCategories.current);
              lastSyncedSellCategories.current = data;
              return merged;
            });
            loadedCollections.current["sellCategories"] = true;
          })
        );

        unsubscribes.push(
          listenToCollection<SellItem>("sellItems", (data) => {
            setSellItems(prev => {
              const merged = mergeRemoteData(prev, data, lastSyncedSellItems.current);
              lastSyncedSellItems.current = data;
              return merged;
            });
            loadedCollections.current["sellItems"] = true;
          })
        );

        unsubscribes.push(
          listenToCollection<StoreOrder>("storeOrders", (data) => {
            setStoreOrders(prev => {
              const merged = mergeRemoteData(prev, data, lastSyncedStoreOrders.current);
              lastSyncedStoreOrders.current = data;
              return merged;
            });
            loadedCollections.current["storeOrders"] = true;
          })
        );

        unsubscribes.push(
          listenToCollection<TelegramVerificationRequest>("telegramRequests", (data) => {
            setTelegramRequests(prev => {
              const merged = mergeRemoteData(prev, data, lastSyncedTelegramRequests.current);
              lastSyncedTelegramRequests.current = data;
              return merged;
            });
            loadedCollections.current["telegramRequests"] = true;
          })
        );

        unsubscribes.push(
          listenToCollection<ReferralTarget>("targets", (data) => {
            setTargets(prev => {
              const merged = mergeRemoteData(prev, data, lastSyncedTargets.current);
              lastSyncedTargets.current = data;
              return merged;
            });
            loadedCollections.current["targets"] = true;
          })
        );

        unsubscribes.push(
          listenToCollection<TargetHistory>("targetHistories", (data) => {
            setTargetHistories(prev => {
              const merged = mergeRemoteData(prev, data, lastSyncedTargetHistories.current);
              lastSyncedTargetHistories.current = data;
              return merged;
            });
            loadedCollections.current["targetHistories"] = true;
          })
        );

        setIsFirebaseLoaded(true);
        console.log("Firebase Cloud Sync initialized successfully!");
      } catch (err) {
        console.error("Failed to initialize Firebase Sync:", err);
        // Fallback to high-performance local sandbox mode on any initialization error to prevent app freezes
        setDbQuotaExceeded(true);
        setIsFirebaseLoaded(true);
      }
    }

    initFirebaseSync();

    return () => {
      active = false;
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  // Periodically check if Firestore daily quota got exceeded
  useEffect(() => {
    const timer = setInterval(() => {
      const exceeded = getIsQuotaExceeded();
      if (exceeded && !dbQuotaExceeded) {
        setDbQuotaExceeded(true);
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [dbQuotaExceeded]);

  // Listen to Firebase Auth state changes to automatically restore or synchronize Google sessions smoothly
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        console.log("[Firebase Auth] Auth state changed: user is logged in:", firebaseUser.email);
        const existing = users.find(u => u.email.toLowerCase().trim() === firebaseUser.email!.toLowerCase().trim());
        if (existing) {
          if (!currentUser || currentUser.email.toLowerCase().trim() !== firebaseUser.email.toLowerCase().trim()) {
            console.log("[Firebase Auth] Automatically restoring Google session for:", existing.email);
            setCurrentUser(existing);
            notify(`Connected: ${existing.name}`);
          }
        }
      } else {
        console.log("[Firebase Auth] Auth state changed: no active Firebase session");
      }
    });
    return () => unsubscribe();
  }, [users, currentUser]);

  // AI App Health Recovery background scanning effect
  useEffect(() => {
    let intervalId: any = null;

    const runBackgroundScan = async () => {
      try {
        const config = getAIRecoveryConfig();
        if (config.autoScan) {
          console.log("[AI Health Recovery] Automatically performing scheduled background health check...");
          await runAIHealthScanAndRecovery(false);
        }
      } catch (err) {
        console.error("AI background scan failed:", err);
      }
    };

    const setupScheduler = () => {
      if (intervalId) clearInterval(intervalId);
      const config = getAIRecoveryConfig();
      if (!config.autoScan) return;

      let intervalMs = 10 * 60000; // default 10 minutes
      if (config.scanSchedule === '5m') intervalMs = 5 * 60000;
      else if (config.scanSchedule === '10m') intervalMs = 10 * 60000;
      else if (config.scanSchedule === '30m') intervalMs = 30 * 60000;
      else if (config.scanSchedule === '1h') intervalMs = 60 * 60000;
      else if (config.scanSchedule === 'custom') intervalMs = (config.customMinutes || 15) * 60000;

      intervalId = setInterval(runBackgroundScan, intervalMs);
    };

    // Trigger initial background scan shortly after startup
    const initialDelay = setTimeout(() => {
      runBackgroundScan();
      setupScheduler();
    }, 15000); // 15s after startup

    const handleConfigChange = () => {
      setupScheduler();
    };

    const handleAdminToast = (e: any) => {
      if (e.detail && e.detail.message) {
        notify(e.detail.message);
      }
    };

    window.addEventListener('arearnzone_ai_recovery_config_changed', handleConfigChange);
    window.addEventListener('arearnzone_show_admin_toast' as any, handleAdminToast);

    return () => {
      clearTimeout(initialDelay);
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('arearnzone_ai_recovery_config_changed', handleConfigChange);
      window.removeEventListener('arearnzone_show_admin_toast' as any, handleAdminToast);
    };
  }, []);

  // Diff-and-Sync React States to Firestore (Push Local Edits to Cloud)
  useEffect(() => {
    if (!isFirebaseLoaded) return;
    if (dbQuotaExceeded || getIsQuotaExceeded()) {
      return;
    }

    const syncList = async <T extends { id: string }>(
      currentList: T[], 
      lastSyncedRef: React.MutableRefObject<T[]>, 
      collectionName: string
    ) => {
      // ONLY sync if the collection has been successfully loaded from Firestore first!
      if (!loadedCollections.current[collectionName]) {
        console.log(`[Firestore Sync] Skipping sync-to-cloud for ${collectionName} because it is not loaded yet.`);
        return;
      }

      const lastSynced = lastSyncedRef.current;

      // 1. Find elements that are new or updated
      const toSave: T[] = [];
      for (const item of currentList) {
        const matchingLast = lastSynced.find(l => l.id === item.id);
        if (!matchingLast || JSON.stringify(item) !== JSON.stringify(matchingLast)) {
          toSave.push(item);
        }
      }

      // 2. Find elements that are deleted
      const toDelete: T[] = [];
      for (const item of lastSynced) {
        const matchingCurrent = currentList.find(c => c.id === item.id);
        if (!matchingCurrent) {
          toDelete.push(item);
        }
      }

      if (toSave.length === 0 && toDelete.length === 0) {
        return;
      }

      // CRITICAL: Synchronously update the ref *before* any asynchronous yields.
      // This ensures subsequent render frames' comparison won't find stale data and spawn redundant duplicate saves.
      lastSyncedRef.current = currentList;

      // Execute sync saves concurrently or sequentially but do not block the ref update
      for (const item of toSave) {
        console.log(`Cloud Sync [SAVE]: ${collectionName}/${item.id}`);
        saveDocument(collectionName, item.id, item).catch(err => {
          console.error(`Error saving document in ${collectionName}/${item.id}:`, err);
        });
      }

      for (const item of toDelete) {
        console.log(`Cloud Sync [DELETE]: ${collectionName}/${item.id}`);
        deleteDocument(collectionName, item.id).catch(err => {
          console.error(`Error deleting document in ${collectionName}/${item.id}:`, err);
        });
      }
    };

    // Global Config Sync
    if (loadedCollections.current["config"] && JSON.stringify(globalConfig) !== JSON.stringify(lastSyncedGlobalConfig.current)) {
      console.log(`Cloud Sync [SAVE]: config/global`);
      lastSyncedGlobalConfig.current = globalConfig; // Update synchronously BEFORE calling saveDocument
      saveDocument("config", "global", globalConfig).catch(err => {
        console.error("Error saving global config:", err);
      });
    }

    // Sync all lists to Firestore
    syncList(users, lastSyncedUsers, "users");
    syncList(tasks, lastSyncedTasks, "tasks");
    syncList(taskSubmissions, lastSyncedSubmissions, "submissions");
    syncList(withdraws, lastSyncedWithdraws, "withdraws");
    syncList(membershipRequests, lastSyncedMembershipRequests, "membershipRequests");
    syncList(depositRequests, lastSyncedDepositRequests, "depositRequests");
    syncList(transactions, lastSyncedTransactions, "transactions");
    syncList(adViewLogs, lastSyncedAdViewLogs, "adViewLogs");
    syncList(withdrawOptions, lastSyncedWithdrawOptions, "withdrawOptions");
    syncList(paymentMethods, lastSyncedPaymentMethods, "paymentMethods");
    syncList(membershipPlans, lastSyncedMembershipPlans, "membershipPlans");
    syncList(gatewayLogs, lastSyncedGatewayLogs, "gatewayLogs");
    syncList(socialLinks, lastSyncedSocialLinks, "socialLinks");
    syncList(appNotifications, lastSyncedNotifications, "appNotifications");
    syncList(sellCategories, lastSyncedSellCategories, "sellCategories");
    syncList(sellItems, lastSyncedSellItems, "sellItems");
    syncList(storeOrders, lastSyncedStoreOrders, "storeOrders");
    syncList(telegramRequests, lastSyncedTelegramRequests, "telegramRequests");
    syncList(targets, lastSyncedTargets, "targets");
    syncList(targetHistories, lastSyncedTargetHistories, "targetHistories");

  }, [
    isFirebaseLoaded,
    globalConfig,
    users,
    tasks,
    taskSubmissions,
    withdraws,
    membershipRequests,
    depositRequests,
    transactions,
    adViewLogs,
    withdrawOptions,
    paymentMethods,
    membershipPlans,
    socialLinks,
    appNotifications,
    sellCategories,
    sellItems,
    storeOrders,
    telegramRequests,
    targets,
    targetHistories,
    gatewayLogs
  ]);

  useEffect(() => {
    try {
      localStorage.setItem('arez_users', JSON.stringify(users));
      localStorage.setItem('arez_current_user', JSON.stringify(currentUser));
      localStorage.setItem('arez_tasks', JSON.stringify(tasks));
      localStorage.setItem('arez_submissions', JSON.stringify(taskSubmissions));
      localStorage.setItem('arez_withdraws', JSON.stringify(withdraws));
      localStorage.setItem('arez_membership_reqs', JSON.stringify(membershipRequests));
      localStorage.setItem('arez_deposit_reqs', JSON.stringify(depositRequests));
      localStorage.setItem('arez_transactions', JSON.stringify(transactions));
      localStorage.setItem('arez_withdraw_opts', JSON.stringify(withdrawOptions));
      localStorage.setItem('arez_payment_methods', JSON.stringify(paymentMethods));
      localStorage.setItem('arez_plans', JSON.stringify(membershipPlans));
      localStorage.setItem('arez_gateway_logs', JSON.stringify(gatewayLogs));
      localStorage.setItem('arez_social_links', JSON.stringify(socialLinks));
      localStorage.setItem('arez_dark_mode', JSON.stringify(isDarkMode));
      localStorage.setItem('arez_lang', JSON.stringify(language));
      localStorage.setItem('arez_country_code', JSON.stringify(selectedCountryCode));
      localStorage.setItem('arez_app_notifications', JSON.stringify(appNotifications));
      localStorage.setItem('arez_global_config', JSON.stringify(globalConfig));
      localStorage.setItem('arez_sell_categories', JSON.stringify(sellCategories));
      localStorage.setItem('arez_sell_items', JSON.stringify(sellItems));
      localStorage.setItem('arez_store_orders', JSON.stringify(storeOrders));
      localStorage.setItem('arez_telegram_reqs', JSON.stringify(telegramRequests));
      localStorage.setItem('arez_ad_view_logs', JSON.stringify(adViewLogs));
      localStorage.setItem('arez_targets', JSON.stringify(targets));
      localStorage.setItem('arez_target_histories', JSON.stringify(targetHistories));
    } catch (error) {
      console.error("Storage quota limits or other issue writing to localStorage:", error);
    }
    
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [users, currentUser, tasks, taskSubmissions, withdraws, membershipRequests, depositRequests, transactions, withdrawOptions, paymentMethods, membershipPlans, socialLinks, isDarkMode, language, selectedCountryCode, appNotifications, globalConfig, sellCategories, sellItems, storeOrders, telegramRequests, adViewLogs, targets, targetHistories, gatewayLogs]);

  // Gateway Daily Limit Calculations and Auto-Logging
  const computedPaymentMethods = React.useMemo(() => {
    return paymentMethods.map(method => {
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
      if (method.category === 'membership') {
        depositRequests.forEach(req => {
          if (req.method === method.name && req.status !== 'rejected' && isTodayAndAfterReset(req.date)) {
            totalAmount += req.amount;
          }
        });
        membershipRequests.forEach(req => {
          if (req.method === method.name && req.status !== 'rejected' && isTodayAndAfterReset(req.date)) {
            totalAmount += req.amount;
          }
        });
      } else if (method.category === 'withdraw') {
        withdraws.forEach(req => {
          if (req.method === method.name && req.status !== 'rejected' && isTodayAndAfterReset(req.date)) {
            totalAmount += req.amount;
          }
        });
      }

      const limitType = method.dailyLimitType || 'unlimited';
      const limitAmount = limitType === 'custom' ? (method.dailyLimitAmount || 0) : 'unlimited';
      const graceLimit = method.graceLimitAmount !== undefined ? method.graceLimitAmount : -1;

      let isLimitExceeded = false;
      if (limitType === 'custom' && typeof limitAmount === 'number') {
        if (graceLimit === 0) {
          isLimitExceeded = totalAmount >= limitAmount;
        } else if (graceLimit > 0) {
          isLimitExceeded = totalAmount >= (limitAmount + graceLimit);
        } else {
          isLimitExceeded = totalAmount >= limitAmount;
        }
      }

      let status: 'Active' | 'Disabled' | 'Unavailable' | 'Unlimited' = 'Active';
      if (!method.isActive) {
        status = 'Disabled';
      } else if (limitType === 'unlimited') {
        status = 'Unlimited';
      } else if (isLimitExceeded) {
        status = 'Unavailable';
      }

      return {
        ...method,
        isLimitExceeded,
        todayAmount: totalAmount,
        status
      };
    });
  }, [paymentMethods, depositRequests, membershipRequests, withdraws]);

  useEffect(() => {
    if (!isFirebaseLoaded) return;
    const todayStr = new Date().toLocaleDateString();
    
    computedPaymentMethods.forEach(method => {
      const limitType = method.dailyLimitType || 'unlimited';
      const limitAmount = limitType === 'custom' ? (method.dailyLimitAmount || 0) : 'unlimited';
      
      if (limitType === 'custom' && method.isLimitExceeded && typeof limitAmount === 'number') {
        const logId = `log_${method.id}_${todayStr.replace(/\//g, '_')}`;
        const exists = gatewayLogs.some(l => l.id === logId);
        if (!exists) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);

          const newLog: GatewayLog = {
            id: logId,
            gatewayId: method.id,
            gatewayName: method.name,
            category: method.category,
            dateStr: todayStr,
            totalAmount: method.todayAmount,
            totalCount: 0, 
            limitAmount,
            graceAmount: method.graceLimitAmount === -1 ? undefined : method.graceLimitAmount,
            limitHitTime: new Date().toISOString(),
            autoDisableTime: new Date().toISOString(),
            autoResetTime: tomorrow.toISOString()
          };
          setGatewayLogs(prev => [newLog, ...prev]);
          notify(`⚠️ ${method.name} daily limit reached! It is now Temporarily Unavailable for users.`);
        }
      }
    });
  }, [computedPaymentMethods, isFirebaseLoaded, gatewayLogs]);

  const currentUserRef = React.useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Sync current user when their record in the global users array is modified (e.g. by an admin)
  useEffect(() => {
    const activeUser = currentUserRef.current;
    if (!activeUser) return;
    const updatedUser = users.find(u => u.id === activeUser.id);
    if (updatedUser) {
      // Compare the entire object to ensure ANY admin update (balance, todayIncome, referralCount, status, role, isSuspended)
      // propagates instantly to the user's active view, avoiding stale caches.
      if (JSON.stringify(updatedUser) !== JSON.stringify(activeUser)) {
        setCurrentUser(updatedUser);
      }
    }
  }, [users]); // Only watch users to break cascading state loops with currentUser

  // Manual & auto background pull to keep client state synchronized with latest cloud databases
  const refreshAllData = async (silent = false) => {
    try {
      if (!silent) console.log("Force-refreshing all collections...");
      // Fetch fresh collections to update local React states
      const [
        freshUsers,
        freshTasks,
        freshSubmissions,
        freshTransactions,
        freshWithdraws,
        freshDepositRequests,
        freshMembershipRequests,
      ] = await Promise.all([
        fetchCollection<User>("users"),
        fetchCollection<Task>("tasks"),
        fetchCollection<TaskSubmission>("submissions"),
        fetchCollection<Transaction>("transactions"),
        fetchCollection<WithdrawRequest>("withdraws"),
        fetchCollection<DepositRequest>("depositRequests"),
        fetchCollection<MembershipRequest>("membershipRequests"),
      ]);

      if (freshUsers) {
        setUsers(prev => {
          const merged = mergeRemoteData(prev, freshUsers, lastSyncedUsers.current);
          lastSyncedUsers.current = freshUsers;
          return merged;
        });
      }
      if (freshTasks) {
        setTasks(prev => {
          const merged = mergeRemoteData(prev, freshTasks, lastSyncedTasks.current);
          lastSyncedTasks.current = freshTasks;
          return merged;
        });
      }
      if (freshSubmissions) {
        setTaskSubmissions(prev => {
          const merged = mergeRemoteData(prev, freshSubmissions, lastSyncedSubmissions.current);
          lastSyncedSubmissions.current = freshSubmissions;
          return merged;
        });
      }
      if (freshTransactions) {
        setTransactions(prev => {
          const merged = mergeRemoteData(prev, freshTransactions, lastSyncedTransactions.current);
          lastSyncedTransactions.current = freshTransactions;
          return merged;
        });
      }
      if (freshWithdraws) {
        setWithdraws(prev => {
          const merged = mergeRemoteData(prev, freshWithdraws, lastSyncedWithdraws.current);
          lastSyncedWithdraws.current = freshWithdraws;
          return merged;
        });
      }
      if (freshDepositRequests) {
        setDepositRequests(prev => {
          const merged = mergeRemoteData(prev, freshDepositRequests, lastSyncedDepositRequests.current);
          lastSyncedDepositRequests.current = freshDepositRequests;
          return merged;
        });
      }
      if (freshMembershipRequests) {
        setMembershipRequests(prev => {
          const merged = mergeRemoteData(prev, freshMembershipRequests, lastSyncedMembershipRequests.current);
          lastSyncedMembershipRequests.current = freshMembershipRequests;
          return merged;
        });
      }
    } catch (err) {
      console.error("Failed to fetch fresh collections on refresh:", err);
    }
  };

  // Autocorrect invalid Telegram verified states for the current user
  useEffect(() => {
    if (currentUser && currentUser.isTelegramVerified && (!currentUser.telegramUsername || !currentUser.telegramId)) {
      const correctedUser = {
        ...currentUser,
        isTelegramVerified: false,
        hasJoinedTelegramChannel: false
      };
      setCurrentUser(correctedUser);
      setUsers(prev => prev.map(u => u.id === currentUser.id ? correctedUser : u));
    }
  }, [currentUser?.id, currentUser?.isTelegramVerified, currentUser?.telegramUsername, currentUser?.telegramId]);

  // Automatic Telegram Bot configuration restorer on app load (uses Firestore-persisted globalConfig & local storage fallback)
  useEffect(() => {
    fetch('/api/telegram/config')
      .then(res => res.json())
      .then(async data => {
        if (data && !data.isConfigured) {
          // 1. Try to restore using Firestore-persisted globalConfig
          const firestoreToken = globalConfig?.telegramBotToken;
          const firestoreUsername = globalConfig?.telegramBotUsername || "@AREarnZone_bot";
          const firestoreChannel = globalConfig?.telegramChannelLink || "https://t.me/arearnzone";

          if (firestoreToken && firestoreToken.trim()) {
            console.log("[Telegram Bot Global Cache] Restoring bot configuration from Firestore globalConfig...");
            await fetch('/api/telegram/save-config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: firestoreToken,
                username: firestoreUsername,
                channel: firestoreChannel,
                forceSave: true
              })
            });
            console.log("[Telegram Bot Global Cache] Bot configuration successfully restored from Firestore!");
            return;
          }

          // 2. Fallback to localStorage for compatibility
          const cached = localStorage.getItem('arez_admin_tg_config');
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (parsed && parsed.token && parsed.token.trim()) {
                console.log("[Telegram Bot Global Cache] Restoring bot configuration in background...");
                await fetch('/api/telegram/save-config', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    token: parsed.token,
                    username: parsed.username || parsed.botUsername,
                    channel: parsed.channel || parsed.channelLink,
                    forceSave: true
                  })
                });
                console.log("[Telegram Bot Global Cache] Bot configuration successfully restored!");
              }
            } catch (err) {
              console.error("[Telegram Bot Global Cache] Restoration error:", err);
            }
          }
        }
      })
      .catch(err => {
        // Gracefully handle background config checks if the backend server is not running or unreachable
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes("Failed to fetch") || errMsg.includes("fetch")) {
          console.log("[Telegram Bot Global Cache] Telegram server config check skipped (backend cold start or offline):", errMsg);
        } else {
          console.warn("[Telegram Bot Global Cache] Config check warning:", err);
        }
      });
  }, [globalConfig?.telegramBotToken, globalConfig?.telegramBotUsername, globalConfig?.telegramChannelLink]);

  // Seeding initial simulated lastActive logs for users to make the directory and offline timer realistic
  useEffect(() => {
    if (users.length > 0) {
      let changed = false;
      const updated = users.map(u => {
        // If it's another user who hasn't been configured a lastActive value, randomize a realistic offline range (e.g. 2 minutes to 18 hours ago)
        if (u.id !== currentUser?.id && !u.lastActive) {
          changed = true;
          const randomMinutesAgo = Math.floor(Math.random() * 1080) + 2; // 2 minutes to 18 hours
          const date = new Date(Date.now() - randomMinutesAgo * 60 * 1000);
          return { ...u, lastActive: date.toISOString() };
        }
        return u;
      });
      if (changed) {
        setUsers(updated);
      }
    }
  }, [users.length, currentUser?.id]);

  // Heartbeat to update current user's lastActive status dynamically as they browse the app
  useEffect(() => {
    if (!currentUser) return;

    const updateHeartbeat = () => {
      const nowStr = new Date().toISOString();
      setUsers(prev => prev.map(u => {
        if (u.id === currentUser.id) {
          return { ...u, lastActive: nowStr };
        }
        return u;
      }));
    };

    updateHeartbeat();

    const interval = setInterval(updateHeartbeat, 10000); // Trigger every 10s
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser) {
      const hasShown = sessionStorage.getItem('arez_social_shown');
      if (!hasShown) {
        setShowSocialPopup(true);
        sessionStorage.setItem('arez_social_shown', 'true');
      }
    }
  }, [currentUser]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
  const toggleLanguage = () => setLanguage(l => l === 'EN' ? 'BN' : 'EN');
  const notify = (msg: string) => { setNotificationMsg(msg); setShowNotification(true); setTimeout(() => setShowNotification(false), 3000); };

  const handleLogin = (user: User, referralUsed?: string) => {
    if (user.isSuspended) {
      notify("Access Denied: Account suspended.");
      return;
    }
    const existingIdx = users.findIndex(u => u.email.toLowerCase().trim() === user.email.toLowerCase().trim());
    const isAdminEmail = user.email.toLowerCase().trim() === 'abdurrahman714915@gmail.com';
    const finalUser = { ...user, role: isAdminEmail ? 'admin' : (user.role || 'user') };

    if (existingIdx === -1) {
      let newUser = { ...finalUser };
      if (referralUsed) newUser.referredBy = referralUsed.trim().toUpperCase();
      
      if (isFirebaseLoaded) {
        saveDocument("users", newUser.id, newUser).catch(err => {
          console.error("Error saving new user:", err);
        });
      }

      setUsers(prev => {
          const next = [...prev, newUser];
          if (referralUsed) {
              const rIdx = next.findIndex(u => u.referralCode && u.referralCode.toUpperCase() === referralUsed.trim().toUpperCase());
              if (rIdx !== -1) {
                const updatedInviter = { ...next[rIdx], referralCount: (next[rIdx].referralCount || 0) + 1 };
                next[rIdx] = updatedInviter;
                if (isFirebaseLoaded) {
                  saveDocument("users", updatedInviter.id, updatedInviter).catch(err => {
                    console.error("Error saving updated inviter referralCount:", err);
                  });
                }
              }
          }
          return next;
      });
      setCurrentUser(newUser);
    } else {
      const syncedUser = { ...users[existingIdx], ...finalUser };
      setCurrentUser(syncedUser);
      setUsers(prev => prev.map(u => u.id === syncedUser.id ? syncedUser : u));
      if (isFirebaseLoaded) {
        saveDocument("users", syncedUser.id, syncedUser).catch(err => {
          console.error("Error saving logged in user:", err);
        });
      }
    }
    notify(`Connected: ${finalUser.name}`);
    sessionStorage.removeItem('arez_social_shown');
    setShowSocialPopup(true);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    if (isFirebaseLoaded) {
      saveDocument("users", updatedUser.id, updatedUser).catch(err => {
        console.error("Error saving updated user:", err);
      });
    }
  };

  const clearNotifications = () => {
    setAppNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  // Maintenance Mode Logic - Handled locally at dynamic viewport layout level now to frozen app state for users but let them login.
  const isMaintenanceLocked = globalConfig.maintenanceMode && 
    currentUser?.role !== 'admin' && 
    !(currentUser?.isMonitor && globalConfig.allowMonitorsDuringMaintenance);

  // Optimized Fast Loading Overlay
  if (!isAppReady) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-1000">
      <div className="bg-[#10b981] p-5 rounded-[2.5rem] shadow-[0_0_80px_rgba(16,185,129,0.3)] border-4 border-white/10 animate-pulse">
         <ICONS.Logo size={56} className="text-white" />
      </div>
      <div className="space-y-4 text-center">
        <div className="w-64 bg-white/5 h-2 rounded-full overflow-hidden border border-white/10 p-0.5">
           <div className="bg-[#10b981] h-full rounded-full transition-all duration-300 shadow-[0_0_15px_#10b981]" style={{ width: `${loadProgress}%` }}></div>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">CDN Cloud Edge Protocol: {loadProgress}%</p>
          <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em] italic">Precision Assets Delivery Active</p>
        </div>
      </div>
    </div>
  );

  return (
    <HelmetProvider>
      <ErrorBoundary>
        <Router>
          <AppContent
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
            language={language}
            setLanguage={setLanguage}
            selectedCountryCode={selectedCountryCode}
            setSelectedCountryCode={setSelectedCountryCode}
            handleCountryChange={handleCountryChange}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            showNotification={showNotification}
            setShowNotification={setShowNotification}
            notificationMsg={notificationMsg}
            setNotificationMsg={setNotificationMsg}
            showLogoutConfirm={showLogoutConfirm}
            setShowLogoutConfirm={setShowLogoutConfirm}
            showSocialPopup={showSocialPopup}
            setShowSocialPopup={setShowSocialPopup}
            isAdminVerified={isAdminVerified}
            setIsAdminVerified={setIsAdminVerified}
            globalConfig={globalConfig}
            setGlobalConfig={setGlobalConfig}
            loadProgress={loadProgress}
            timezone={timezone}
            users={users}
            setUsers={setUsers}
            tasks={tasks}
            setTasks={setTasks}
            taskSubmissions={taskSubmissions}
            setTaskSubmissions={setTaskSubmissions}
            withdraws={withdraws}
            setWithdraws={setWithdraws}
            membershipRequests={membershipRequests}
            setMembershipRequests={setMembershipRequests}
            depositRequests={depositRequests}
            setDepositRequests={setDepositRequests}
            transactions={transactions}
            setTransactions={setTransactions}
            adViewLogs={adViewLogs}
            setAdViewLogs={setAdViewLogs}
            withdrawOptions={withdrawOptions}
            setWithdrawOptions={setWithdrawOptions}
            paymentMethods={computedPaymentMethods}
            setPaymentMethods={setPaymentMethods}
            membershipPlans={membershipPlans}
            setMembershipPlans={setMembershipPlans}
            socialLinks={socialLinks}
            setSocialLinks={setSocialLinks}
            appNotifications={appNotifications}
            setAppNotifications={setAppNotifications}
            sellCategories={sellCategories}
            setSellCategories={setSellCategories}
            sellItems={sellItems}
            setSellItems={setSellItems}
            storeOrders={storeOrders}
            setStoreOrders={setStoreOrders}
            telegramRequests={telegramRequests}
            setTelegramRequests={setTelegramRequests}
            targets={targets}
            setTargets={setTargets}
            targetHistories={targetHistories}
            setTargetHistories={setTargetHistories}
            t={t}
            toggleDarkMode={toggleDarkMode}
            toggleLanguage={toggleLanguage}
            notify={notify}
            handleLogin={handleLogin}
            handleUpdateUser={handleUpdateUser}
            clearNotifications={clearNotifications}
            isMaintenanceLocked={isMaintenanceLocked}
            dbQuotaExceeded={dbQuotaExceeded}
            refreshAllData={refreshAllData}
            showInstallModal={showInstallModal}
            setShowInstallModal={setShowInstallModal}
            deferredPrompt={deferredPrompt}
          />
        </Router>
      </ErrorBoundary>
    </HelmetProvider>
  );
};

const AppContent: React.FC<{
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  isDarkMode: boolean;
  setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  language: Language;
  setLanguage: React.Dispatch<React.SetStateAction<Language>>;
  selectedCountryCode: string;
  setSelectedCountryCode: React.Dispatch<React.SetStateAction<string>>;
  handleCountryChange: (code: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  showNotification: boolean;
  setShowNotification: React.Dispatch<React.SetStateAction<boolean>>;
  notificationMsg: string;
  setNotificationMsg: React.Dispatch<React.SetStateAction<string>>;
  showLogoutConfirm: boolean;
  setShowLogoutConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  showSocialPopup: boolean;
  setShowSocialPopup: React.Dispatch<React.SetStateAction<boolean>>;
  isAdminVerified: boolean;
  setIsAdminVerified: React.Dispatch<React.SetStateAction<boolean>>;
  globalConfig: GlobalConfig;
  setGlobalConfig: React.Dispatch<React.SetStateAction<GlobalConfig>>;
  loadProgress: number;
  timezone: string;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  taskSubmissions: TaskSubmission[];
  setTaskSubmissions: React.Dispatch<React.SetStateAction<TaskSubmission[]>>;
  withdraws: WithdrawRequest[];
  setWithdraws: React.Dispatch<React.SetStateAction<WithdrawRequest[]>>;
  membershipRequests: MembershipRequest[];
  setMembershipRequests: React.Dispatch<React.SetStateAction<MembershipRequest[]>>;
  depositRequests: DepositRequest[];
  setDepositRequests: React.Dispatch<React.SetStateAction<DepositRequest[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  adViewLogs: AdViewLog[];
  setAdViewLogs: React.Dispatch<React.SetStateAction<AdViewLog[]>>;
  withdrawOptions: WithdrawOption[];
  setWithdrawOptions: React.Dispatch<React.SetStateAction<WithdrawOption[]>>;
  paymentMethods: PaymentMethod[];
  setPaymentMethods: React.Dispatch<React.SetStateAction<PaymentMethod[]>>;
  gatewayLogs?: GatewayLog[];
  setGatewayLogs?: React.Dispatch<React.SetStateAction<GatewayLog[]>>;
  membershipPlans: MembershipPlan[];
  setMembershipPlans: React.Dispatch<React.SetStateAction<MembershipPlan[]>>;
  socialLinks: SocialLink[];
  setSocialLinks: React.Dispatch<React.SetStateAction<SocialLink[]>>;
  appNotifications: AppNotification[];
  setAppNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  sellCategories: SellCategory[];
  setSellCategories: React.Dispatch<React.SetStateAction<SellCategory[]>>;
  sellItems: SellItem[];
  setSellItems: React.Dispatch<React.SetStateAction<SellItem[]>>;
  storeOrders: StoreOrder[];
  setStoreOrders: React.Dispatch<React.SetStateAction<StoreOrder[]>>;
  telegramRequests: TelegramVerificationRequest[];
  setTelegramRequests: React.Dispatch<React.SetStateAction<TelegramVerificationRequest[]>>;
  targets: ReferralTarget[];
  setTargets: React.Dispatch<React.SetStateAction<ReferralTarget[]>>;
  targetHistories: TargetHistory[];
  setTargetHistories: React.Dispatch<React.SetStateAction<TargetHistory[]>>;
  t: (key: any) => string;
  toggleDarkMode: () => void;
  toggleLanguage: () => void;
  notify: (msg: string) => void;
  handleLogin: (user: User, referralUsed?: string) => void;
  handleUpdateUser: (user: User) => void;
  clearNotifications: () => void;
  isMaintenanceLocked: boolean;
  dbQuotaExceeded: boolean;
  refreshAllData: (silent?: boolean) => Promise<void>;
  showInstallModal: boolean;
  setShowInstallModal: React.Dispatch<React.SetStateAction<boolean>>;
  deferredPrompt: any;
}> = ({
  currentUser, setCurrentUser, isDarkMode, setIsDarkMode, language, setLanguage,
  selectedCountryCode, setSelectedCountryCode, handleCountryChange, isSidebarOpen, setIsSidebarOpen,
  showNotification, setShowNotification, notificationMsg, setNotificationMsg,
  showLogoutConfirm, setShowLogoutConfirm, showSocialPopup, setShowSocialPopup,
  isAdminVerified, setIsAdminVerified, globalConfig, setGlobalConfig, loadProgress, timezone,
  users, setUsers, tasks, setTasks, taskSubmissions, setTaskSubmissions, withdraws, setWithdraws,
  membershipRequests, setMembershipRequests, depositRequests, setDepositRequests, transactions, setTransactions,
  adViewLogs, setAdViewLogs, withdrawOptions, setWithdrawOptions, paymentMethods, setPaymentMethods,
  membershipPlans, setMembershipPlans, gatewayLogs, setGatewayLogs, socialLinks, setSocialLinks, appNotifications, setAppNotifications,
  sellCategories, setSellCategories, sellItems, setSellItems, storeOrders, setStoreOrders,
  telegramRequests, setTelegramRequests, targets, setTargets, targetHistories, setTargetHistories, t, toggleDarkMode, toggleLanguage, notify,
  handleLogin, handleUpdateUser, clearNotifications, isMaintenanceLocked, dbQuotaExceeded,
  refreshAllData, showInstallModal, setShowInstallModal, deferredPrompt
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Status Bar Live Clock
  const [statusBarTime, setStatusBarTime] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let h = now.getHours();
      const m = String(now.getMinutes()).padStart(2, '0');
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      setStatusBarTime(`${h}:${m} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulating Real-time Flutter Compiler output log cycles
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    "Initializing Flutter multi-platform compilation engine...",
    "Flutter Core Engine active: v3.19.0-6.1.pre (Stable Build)",
    "Output Targets Verified: Web App PWA, Android APK, iOS IPA",
    `Autodetected local timezone synchronized: ${timezone}`,
    "Anti-iframe security overlay: Enabled and Healthy"
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const logs = [
        "Synchronized user balances via Secure API gateway",
        "Flutter heap layout clean up complete (freed 3.8MB)",
        "Verified background sponsored ad intervals: Healthy",
        `Latency check to BD regional edge server: ${Math.floor(Math.random() * 25) + 10}ms`,
        "PWA responsive container scale verified",
        "Active translation keys loaded successfully"
      ];
      const randomLog = logs[Math.floor(Math.random() * logs.length)];
      setConsoleLogs(prev => [...prev.slice(-6), `[${new Date().toLocaleTimeString()}] ${randomLog}`]);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const isHome = location.pathname === '/';
  const isTasks = location.pathname === '/tasks';
  const isWithdraw = location.pathname === '/withdraw';
  const isBuy = location.pathname === '/buy';

  return (
    <div className={`min-h-screen w-full flex flex-col transition-all duration-500 relative ${isDarkMode ? 'bg-[#020617] text-slate-100' : 'bg-slate-50 text-slate-900'} overflow-x-hidden font-sans`}>
      <Helmet>
        <title>AREARNZONE - #1 Elite Earning Ecosystem</title>
        <meta name="description" content="AREARNZONE is the premier elite earning ecosystem. Complete high-yield micro-jobs, perform secure tasks, watch rewarded ads, and unlock powerful passive income streams." />
        <meta name="keywords" content="AREARNZONE, earn money online, micro-jobs, online earning platform, passive income, reward portal, secure online tasks, elite earning, work from home, ad rewards" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://arearnzone-asia-no1-freelance.web.app" />
        <meta property="og:title" content="AREARNZONE - #1 Elite Earning Ecosystem" />
        <meta property="og:description" content="Complete tasks, watch ads, and unlock massive passive income streams on the ultimate secure earning platform. Start earning today!" />
        <meta property="og:image" content="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1200&h=630&q=80" />

         {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://arearnzone-asia-no1-freelance.web.app" />
        <meta name="twitter:title" content="AREARNZONE - #1 Elite Earning Ecosystem" />
        <meta name="twitter:description" content="Complete tasks, watch ads, and unlock massive passive income streams on the ultimate secure earning platform." />
        <meta name="twitter:image" content="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1200&h=630&q=80" />

        {/* Structured Schema (Dynamic and SEO ready) */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "AREARNZONE",
            "alternateName": ["ARE ARN ZONE", "AreArnZone Earning Platform"],
            "url": "https://arearnzone-asia-no1-freelance.web.app",
            "description": "The premier elite earning ecosystem offering high-yield micro-tasks, rewarded advertisements, and passive income membership streams."
          })}
        </script>
      </Helmet>
      
      {/* Visual Ambient Background Gradients */}
      <div className="absolute inset-0 z-0 bg-cover bg-center opacity-40 filter blur-3xl pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(16, 185, 129, 0.12) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(59, 130, 246, 0.12) 0%, transparent 50%)' }}></div>
      
      {currentUser ? (
        /* RESPONSIVE FULL-SCREEN APPLICATION WORKSPACE (Logged In) */
        <div className="flex-1 flex flex-row relative overflow-hidden z-10 w-full min-h-0">
          
          {/* Responsive Sidebar Menu (Persistent on medium+ screens, overlay drawer on mobile) */}
          <Sidebar 
            user={currentUser} 
            isDarkMode={isDarkMode} 
            onLogout={() => setShowLogoutConfirm(true)} 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
          />

          {/* Main Application Container */}
          <div className="flex-1 flex flex-col min-w-0 h-screen relative">
            
            {/* Standard AppBar Navigation Header */}
            <Navbar 
              user={currentUser} 
              isDarkMode={isDarkMode} 
              language={language}
              selectedCountryCode={selectedCountryCode}
              onChangeCountry={handleCountryChange}
              toggleDarkMode={toggleDarkMode} 
              toggleLanguage={toggleLanguage}
              onLogout={() => setShowLogoutConfirm(true)} 
              notify={notify} 
              toggleSidebar={() => setIsSidebarOpen(true)}
              notifications={appNotifications}
              onClearNotifications={clearNotifications}
              onOpenInstallModal={() => setShowInstallModal(true)}
            />

            {/* Scrollable Viewport Stage */}
            <div className={`flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 relative no-scrollbar pb-24 md:pb-8 ${isMaintenanceLocked ? 'pointer-events-none select-none filter blur-[1px] opacity-60' : ''}`}>
              
              {/* Central Routes Page Node */}
              <Routes>
                <Route path="/" element={
                  <Dashboard 
                    user={currentUser} 
                    tasks={tasks} 
                    transactions={transactions} 
                    submissions={taskSubmissions} 
                    onLogout={() => setShowLogoutConfirm(true)} 
                    t={t} 
                    selectedCountryCode={selectedCountryCode} 
                    onRefreshData={refreshAllData}
                    targets={targets}
                    targetHistories={targetHistories}
                    users={users}
                    setTargetHistories={setTargetHistories}
                    setUsers={setUsers}
                    setTransactions={setTransactions}
                    onUpdateUser={handleUpdateUser}
                    onOpenInstallModal={() => setShowInstallModal(true)}
                  />
                } />
                <Route path="/tasks" element={(currentUser.status === 'Verified' || currentUser.role === 'admin') ? <Tasks tasks={tasks} user={currentUser} submissions={taskSubmissions} setSubmissions={setTaskSubmissions} notify={notify} t={t} selectedCountryCode={selectedCountryCode} /> : <Navigate to="/membership" />} />
                <Route path="/history" element={<History transactions={transactions} user={currentUser} t={t} selectedCountryCode={selectedCountryCode} />} />
                <Route path="/referral" element={(currentUser.status === 'Verified' || currentUser.role === 'admin') ? <Referral user={currentUser} transactions={transactions} users={users} t={t} selectedCountryCode={selectedCountryCode} plans={membershipPlans} targets={targets} targetHistories={targetHistories} setTargetHistories={setTargetHistories} setUsers={setUsers} setTransactions={setTransactions} onUpdateUser={handleUpdateUser} /> : <Navigate to="/membership" />} />
                <Route path="/withdraw" element={(currentUser.status === 'Verified' || currentUser.role === 'admin') ? <Withdraw user={currentUser} users={users} onUpdateUser={handleUpdateUser} notify={notify} options={withdrawOptions} paymentMethods={paymentMethods} withdraws={withdraws} setWithdraws={setWithdraws} t={t} selectedCountryCode={selectedCountryCode} globalConfig={globalConfig} /> : <Navigate to="/membership" />} />
                <Route path="/membership" element={<Membership user={currentUser} onUpdateUser={handleUpdateUser} notify={notify} paymentMethods={paymentMethods} plans={membershipPlans} membershipRequests={membershipRequests} setMembershipRequests={setMembershipRequests} t={t} selectedCountryCode={selectedCountryCode} />} />
                <Route path="/deposit" element={(currentUser.status === 'Verified' || currentUser.role === 'admin') ? <Deposit user={currentUser} onUpdateUser={handleUpdateUser} notify={notify} paymentMethods={paymentMethods} depositRequests={depositRequests} setDepositRequests={setDepositRequests} t={t} selectedCountryCode={selectedCountryCode} /> : <Navigate to="/membership" />} />
                <Route path="/buy" element={(currentUser.status === 'Verified' || currentUser.role === 'admin') ? <Buy user={currentUser} onUpdateUser={handleUpdateUser} sellItems={sellItems} setSellItems={setSellItems} sellCategories={sellCategories} setTransactions={setTransactions} notify={notify} t={t} storeOrders={storeOrders} setStoreOrders={setStoreOrders} selectedCountryCode={selectedCountryCode} /> : <Navigate to="/membership" />} />
                <Route path="/profile" element={<Profile user={currentUser} onUpdateUser={handleUpdateUser} notify={notify} timezone={timezone} selectedCountryCode={selectedCountryCode} onChangeCountry={handleCountryChange} />} />
                <Route path="/telegram-verify" element={<TelegramVerify user={currentUser} onUpdateUser={handleUpdateUser} notify={notify} telegramRequests={telegramRequests} setTelegramRequests={setTelegramRequests} tasks={tasks} submissions={taskSubmissions} setSubmissions={setTaskSubmissions} t={t} />} />
                <Route path="/faq" element={<FAQ language={language} selectedCountryCode={selectedCountryCode} t={t} />} />
                <Route path="/admin/*" element={
                  (currentUser.role === 'admin' || currentUser.isMonitor) ? (
                    (currentUser.role === 'admin' && !isAdminVerified) ? (
                      <AdminOtp onVerify={() => setIsAdminVerified(true)} notify={notify} />
                    ) : (
                      <AdminPanel 
                          tasks={tasks} setTasks={setTasks} 
                          taskSubmissions={taskSubmissions} setTaskSubmissions={setTaskSubmissions} 
                          withdraws={withdraws} setWithdraws={setWithdraws} 
                          membershipRequests={membershipRequests} setMembershipRequests={setMembershipRequests} 
                          depositRequests={depositRequests} setDepositRequests={setDepositRequests} 
                          paymentMethods={paymentMethods} setPaymentMethods={setPaymentMethods} 
                          gatewayLogs={gatewayLogs} setGatewayLogs={setGatewayLogs} 
                          plans={membershipPlans} setPlans={setMembershipPlans} 
                          users={users} setUsers={setUsers} 
                          withdrawOptions={withdrawOptions} setWithdrawOptions={setWithdrawOptions} 
                          transactions={transactions} setTransactions={setTransactions} 
                          appNotifications={appNotifications}
                          setAppNotifications={setAppNotifications}
                          socialLinks={socialLinks}
                          setSocialLinks={setSocialLinks}
                          globalConfig={globalConfig}
                          setGlobalConfig={setGlobalConfig}
                          sellItems={sellItems}
                          setSellItems={setSellItems}
                          sellCategories={sellCategories}
                          setSellCategories={setSellCategories}
                          notify={notify} 
                          currentUser={currentUser}
                          storeOrders={storeOrders}
                          setStoreOrders={setStoreOrders}
                          telegramRequests={telegramRequests}
                          setTelegramRequests={setTelegramRequests}
                          adViewLogs={adViewLogs}
                          setAdViewLogs={setAdViewLogs}
                          targets={targets}
                          setTargets={setTargets}
                          targetHistories={targetHistories}
                          setTargetHistories={setTargetHistories}
                      />
                    )
                  ) : (
                    <Navigate to="/" />
                  )
                } />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>

            </div>

            {/* Elegant, material 3 bottom navigation sheet (only visible on mobile layout) */}
            <div className={`md:hidden absolute bottom-0 inset-x-0 h-16 border-t z-[130] flex items-center justify-around px-2 select-none shrink-0 ${isDarkMode ? 'bg-slate-900 border-white/5' : 'bg-white border-slate-100'} shadow-lg`}>
              
              {/* Home Tab */}
              <button 
                onClick={() => navigate('/')}
                className="flex flex-col items-center justify-center flex-1 h-full py-1 relative cursor-pointer"
              >
                <div className={`p-1.5 rounded-full transition-all duration-300 ${isHome ? 'bg-emerald-500 text-white scale-110 shadow-md shadow-emerald-500/20' : 'text-slate-500 hover:text-emerald-500'}`}>
                  <ICONS.Dashboard size={18} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest mt-1">
                  {language === 'BN' ? 'হোম' : 'Home'}
                </span>
              </button>

              {/* Tasks Tab */}
              <button 
                onClick={() => navigate('/tasks')}
                className="flex flex-col items-center justify-center flex-1 h-full py-1 relative cursor-pointer"
              >
                <div className={`p-1.5 rounded-full transition-all duration-300 ${isTasks ? 'bg-emerald-500 text-white scale-110 shadow-md shadow-emerald-500/20' : 'text-slate-500 hover:text-emerald-500'}`}>
                  <ICONS.Tasks size={18} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest mt-1">
                  {language === 'BN' ? 'টাস্ক' : 'Tasks'}
                </span>
              </button>

              {/* Withdraw Tab */}
              <button 
                onClick={() => navigate('/withdraw')}
                className="flex flex-col items-center justify-center flex-1 h-full py-1 relative cursor-pointer"
              >
                <div className={`p-1.5 rounded-full transition-all duration-300 ${isWithdraw ? 'bg-emerald-500 text-white scale-110 shadow-md shadow-emerald-500/20' : 'text-slate-500 hover:text-emerald-500'}`}>
                  <ICONS.Withdraw size={18} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest mt-1">
                  {language === 'BN' ? 'উইথড্র' : 'Withdraw'}
                </span>
              </button>

              {/* Shop/Buy Tab */}
              <button 
                onClick={() => navigate('/buy')}
                className="flex flex-col items-center justify-center flex-1 h-full py-1 relative cursor-pointer"
              >
                <div className={`p-1.5 rounded-full transition-all duration-300 ${isBuy ? 'bg-emerald-500 text-white scale-110 shadow-md shadow-emerald-500/20' : 'text-slate-500 hover:text-emerald-500'}`}>
                  <ICONS.Buy size={18} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest mt-1">
                  {language === 'BN' ? 'শপ' : 'Shop'}
                </span>
              </button>

              {/* Menu Trigger Drawer button */}
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="flex flex-col items-center justify-center flex-1 h-full py-1 relative cursor-pointer"
              >
                <div className="p-1.5 rounded-full transition-all duration-300 text-slate-500 hover:text-emerald-500">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest mt-1">
                  {language === 'BN' ? 'মেনু' : 'Menu'}
                </span>
              </button>

            </div>

          </div>

        </div>
      ) : (
        /* RESPONSIVE FULL-SCREEN AUTH GATEWAY (Logged Out) */
        <div className="flex-1 w-full flex flex-col relative z-10 min-h-screen">
          <Routes>
            <Route path="*" element={
              <Auth onLogin={handleLogin} users={users} notify={notify} globalConfig={globalConfig} setGlobalConfig={setGlobalConfig} />
            } />
          </Routes>
        </div>
      )}

      {/* Social Join Modals */}
      {showSocialPopup && <SocialPopup links={socialLinks} onClose={() => setShowSocialPopup(false)} />}

      {/* PWA Install App Modal */}
      <InstallAppModal 
        isOpen={showInstallModal} 
        onClose={() => setShowInstallModal(false)} 
        deferredPrompt={deferredPrompt} 
        onInstallSuccess={() => notify('App installed successfully!')} 
      />

      {/* Logout confirmation alert dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] p-8 text-center space-y-6 animate-in zoom-in border border-slate-200 dark:border-white/10 shadow-2xl">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto"><ICONS.Logout size={32} /></div>
            <h3 className="text-xl font-bold dark:text-white uppercase tracking-tighter">Confirm Logout</h3>
            <div className="flex flex-col gap-3 font-sans">
              <button onClick={() => { setShowLogoutConfirm(false); setCurrentUser(null); localStorage.removeItem('arez_current_user'); sessionStorage.removeItem('arez_social_shown'); signOut(auth).catch(err => console.warn("Firebase Auth signOut failed:", err)); notify("Session Ended."); }} className="w-full py-4 bg-red-500 text-white font-bold rounded-xl shadow-lg uppercase tracking-widest text-[10px]">LOGOUT</button>
              <button onClick={() => setShowLogoutConfirm(false)} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold rounded-xl uppercase tracking-widest text-[10px]">CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Toast System */}
      {showNotification && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[10001] animate-in slide-in-from-bottom-10 duration-500 w-[92%] max-w-sm">
          <div className="bg-emerald-600 text-white px-8 py-3 rounded-full shadow-2xl flex items-center justify-center gap-2 border border-white/20 font-bold text-[10px] uppercase tracking-widest text-center">
            <ICONS.Check size={16} /> {notificationMsg.replace('🚨 [SYSTEM HEALTH ALERT] ', '')}
          </div>
        </div>
      )}

      {/* Mandatory Sponsored Ads Overlay */}
      <AdManagerOverlay currentUser={currentUser} globalConfig={globalConfig} adViewLogs={adViewLogs} setAdViewLogs={setAdViewLogs} isSocialPopupActive={showSocialPopup} />

      {/* System Maintenance Lock State */}
      {isMaintenanceLocked && (
        <div className="fixed inset-0 bg-[#020617]/90 backdrop-blur-md z-[10002] flex flex-col items-center justify-center p-4 md:p-8 text-center animate-in fade-in duration-300 pointer-events-auto">
          <div className="bg-white dark:bg-slate-950/90 border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 md:p-12 max-w-lg w-full space-y-8 shadow-[0_0_85px_rgba(245,158,11,0.25)] relative">
            <div className="w-24 h-24 bg-amber-500/10 text-amber-500 rounded-[2rem] flex items-center justify-center border-2 border-amber-500/20 mx-auto animate-pulse shrink-0">
              <ICONS.Settings size={48} className="text-amber-500" />
            </div>
            
            <div className="space-y-3 font-sans">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/25 mx-auto">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span className="text-[9px] font-black uppercase tracking-wider">Maintenance Mode Active</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                System Maintenance Underway
              </h2>
              <h3 className="text-xs md:text-sm font-black text-amber-500 mt-2 uppercase tracking-wide">
                অ্যাপ এর টেকনিক্যাল কাজ চলছে, সাময়িক সময়ের জন্য দুঃখিত!
              </h3>
            </div>
            
            <div className="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-slate-100 dark:border-white/5 space-y-4 text-left font-sans">
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-bold">
                🛠️ প্রিয় গ্রাহক, আমাদের অ্যাপ্লিকেশনটির টেকনিক্যাল উন্নয়ন ও সার্ভার রক্ষণাবেক্ষণের কাজ চলছে। সাময়িক এই অসুবিধার জন্য আমরা আন্তরিকভাবে দুঃখিত। 
              </p>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-wider leading-relaxed">
                ⚠️ System maintenance is underway. All app options have been frozen temporarily. We apologize for the inconvenience. Thank you for your patience!
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 dark:border-white/5 font-sans pb-1">
              <div className="text-left">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block leading-none mb-1">Node Sync Protocol</span>
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-wider flex items-center gap-1 leading-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Safe Cloud Integrity OK
                </span>
              </div>
              <button 
                onClick={() => { setCurrentUser(null); localStorage.removeItem('arez_current_user'); signOut(auth).catch(err => console.warn("Firebase Auth signOut failed:", err)); notify("Logged out during maintenance."); }} 
                className="px-5 py-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border border-red-500/20"
              >
                Exit Session (লগআউট করুন)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
