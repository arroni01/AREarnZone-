
export type UserStatus = 'Verified' | 'Unverified';
export type Language = 'EN' | 'BN' | 'HI' | 'AR' | 'UR';

export interface Ad {
  id: string;
  name: string;
  type: 'Image' | 'Video' | 'Web Link';
  url: string;
  thumbnail?: string;
  isActive: boolean;
  orderNumber: number;
  viewLimit?: number; // Unlimited if 0 or undefined, or holds custom limit
}

export interface WelcomeSettings {
  imageUrl: string;
  durationSeconds: number;
  isEnabled: boolean;
}

export interface GlobalConfig {
  appName: string;
  maintenanceMode: boolean;
  defaultLanguage: Language;
  cdnOptimization: boolean;
  systemNotice: string;
  allowMonitorsDuringMaintenance?: boolean;
  enableEmailOTP?: boolean;
  requireReferralToWithdraw?: boolean;
  enableAdManager?: boolean;
  adIntervalMinutes?: number;
  adSkipSeconds?: number;
  adLinks?: string[];
  adsList?: Ad[];
  adLoginDelaySeconds?: number;
  isSeeded?: boolean;
  welcomeSettings?: WelcomeSettings;
}

export interface MonitorPermissions {
  canApproveMembership: boolean;      // Membership upgrade proofs approval
  canApproveDeposits: boolean;        // User deposit proofs approval
  canApproveTaskSubmissions: boolean; // Task submission proofs approval
  canProcessPayouts: boolean;         // Process/cancel withdrawals
  canManageCampaigns: boolean;        // Add/edit/activate tasks
  canModifyUsers: boolean;            // Modify user balances, suspend, etc.
  canManageStore: boolean;            // Store & custom digital asset directory
  canManagePush: boolean;             // Handle push notifications & global notifications
  canManageSocials: boolean;          // Build/update social linkages
}

export interface User {
  id: string;
  uid: string; // Unique Public Identifier (e.g. ARZ-XXXXXX)
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  balance: number;
  todayIncome: number;
  referralCode: string;
  referralCount: number;
  referredBy?: string;
  status: UserStatus;
  role: 'user' | 'admin';
  isTelegramVerified: boolean;
  hasJoinedTelegramChannel: boolean;
  telegramId?: string;
  telegramUsername?: string;
  telegramVerificationCode?: string;
  telegramPhone?: string;
  ip: string;
  deviceInfo: string;
  isSuspended: boolean;
  createdAt: string;
  // Monitor delegation settings
  isMonitor?: boolean;
  monitorPermissions?: MonitorPermissions;
  // Security & Fraud Protection fields
  securityToken?: string;
  fraudFlags?: string[];
  lastLoginAt?: string;
  lastActive?: string;
  isIPBlocked?: boolean;
  rankHistory?: RankUpgradeRecord[];
}

export interface RankUpgradeRecord {
  id: string;
  fromStatus: string;
  toStatus: string;
  completedTargetTitle: string;
  completedTargetId: string;
  date: string;
}

export interface Task {
  id: string;
  title: string;
  reward: number;
  type: 'App Install' | 'Link Open' | 'Watch & Earn' | 'Social' | 'Telegram' | '1 Device= 1 Task';
  description: string;
  instructions: string[];
  youtubeLink?: string;
  isActive: boolean;
}

export interface TaskSubmission {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  taskTitle: string;
  reward: number;
  screenshots: string[];
  textProof?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  securityHash?: string; // For fake task detection (Screenshot Validation Hash)
  clientIp?: string; // Tracking IP at submission time
  telegramIdUsed?: string; // Verified Telegram User ID used for the task
  aiAuditLog?: string; // AI dynamic tracking and audit log
  aiVerified?: boolean; // Flag if AI has verified user-specific ID matching
  approvedById?: string;
  approvedByName?: string;
  approvedStatus?: 'approved' | 'rejected';
  approvedAt?: string;
  deviceFingerprint?: string;
  rejectionNote?: string;
}

export interface WithdrawOption {
  id: string;
  label: string;
  amount: number | 'all';
  feeType: 'flat' | 'percent';
  feeValue: number;
  minRequired: number;
  isActive: boolean;
}

export interface WithdrawRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  method: string;
  accountNumber: string;
  fee: number;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  approvedById?: string;
  approvedByName?: string;
  approvedStatus?: 'approved' | 'rejected';
  approvedAt?: string;
  rejectionNote?: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  number: string;
  isActive: boolean;
  type: string; 
  feeType: 'flat' | 'percent';
  feeValue: number;
  minWithdraw: number;
  category: 'membership' | 'withdraw';
  dailyLimitType?: 'unlimited' | 'custom';
  dailyLimitAmount?: number;
  graceLimitAmount?: number;
  manualResetTimestamp?: string;
  status?: 'Active' | 'Disabled' | 'Unavailable' | 'Unlimited';
  isLimitExceeded?: boolean;
  todayAmount?: number;
}

export interface GatewayLog {
  id: string;
  gatewayId: string;
  gatewayName: string;
  category: 'membership' | 'withdraw';
  dateStr: string;
  totalAmount: number;
  totalCount: number;
  limitAmount: number | 'unlimited';
  graceAmount?: number;
  limitHitTime?: string;
  autoDisableTime?: string;
  autoResetTime?: string;
}

export interface MembershipRequest {
  id: string;
  userId: string;
  userName: string;
  planName: string;
  amount: number;
  method: string;
  transactionId: string;
  screenshot?: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  approvedById?: string;
  approvedByName?: string;
  approvedStatus?: 'approved' | 'rejected';
  approvedAt?: string;
  rejectionNote?: string;
}

export interface DepositRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  method: string;
  transactionId: string;
  screenshot?: string;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  approvedById?: string;
  approvedByName?: string;
  approvedStatus?: 'approved' | 'rejected';
  approvedAt?: string;
  rejectionNote?: string;
}

export interface SellCategory {
  id: string;
  name: string;
}

export interface SellItem {
  id: string;
  title: string;
  category: string; // ID or Name of SellCategory
  price: number;
  description: string;
  details: string; // The sensitive info delivered to buyer (eg. gmail/password / channel access details)
  status: 'available' | 'sold';
  soldTo?: string; // userId of buyer
  soldDate?: string;
  createdAt: string;
  purchaseLimit?: number; // Maximum limit of purchases allowed
  purchasedCount?: number; // Times bought so far
  enableSD?: boolean; // Submit Details (SD) option ON/OFF
}

export interface StoreOrder {
  id: string;
  itemId: string;
  itemTitle: string;
  itemPrice: number;
  userId: string;
  userName: string;
  userEmail: string;
  submitDetails: string; // ID details or info
  submitLink?: string; // Optional link
  screenshot?: string; // Optional Base64 uploaded screenshot
  status: 'pending' | 'completed';
  submittedAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'Task' | 'Referral' | 'Withdraw' | 'Membership' | 'Adjustment' | 'Deposit' | 'Purchase';
  amount: number;
  date: string;
  description: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  validityDays: number;
  referralBonus: number;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'task' | 'payment' | 'announcement';
  date: string;
  isRead: boolean;
}

export interface SocialLink {
  id: string;
  name: string;
  url: string;
  type: 'Telegram' | 'Facebook' | 'Youtube' | 'Other';
  isActive: boolean;
}

export interface TelegramVerificationRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  telegramUsername: string;
  telegramId: string;
  telegramPhone?: string;
  verificationCode: string;
  screenshot?: string; // Bio or bot verification code submission screenshot
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
}

export interface AdViewLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  adLink: string;
  viewedAt: string; // ISO Date String
}

export interface ReferralTarget {
  id: string;
  title: string;
  targetRole: 'user' | 'monitor' | 'all';
  assignedToIds?: string[]; // Specific user/monitor IDs
  periodType: 'daily' | 'weekly' | 'monthly'; // দৈনিক, সাপ্তাহিক, মাসিক
  referralGoal: number;
  bonusReward: number;
  createdAt: string;
  isActive: boolean;
}

export interface TargetHistory {
  id: string;
  targetId: string;
  targetTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  periodType: 'daily' | 'weekly' | 'monthly';
  periodId: string; // "2026-07-13", "2026-07" etc.
  referralGoal: number;
  referralsAchieved: number;
  bonusReward: number;
  completedAt: string;
  status: 'completed';
}

