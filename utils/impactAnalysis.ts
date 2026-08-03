/**
 * AREarnZone - Non-Breaking Development Mode
 * Impact and Dependency Analysis Framework
 * Covers 17 Core System Modules
 */

export enum RiskLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL"
}

export interface ModuleImpact {
  moduleId: string;
  moduleName: string;
  directDependencies: string[];
  indirectDependencies: string[];
  criticalInvariants: string[];
  mandatoryRegressionTests: string[];
}

export interface ImpactAnalysisResult {
  featureName: string;
  targetModuleId: string;
  riskLevel: RiskLevel;
  affectedModules: string[];
  invariantsToCheck: string[];
  requiredTestSuites: string[];
  nonBreakingStrategy: string[];
  safeToProceed: boolean;
}

export const AREARNZONE_SYSTEM_MODULES: Record<string, ModuleImpact> = {
  auth_module: {
    moduleId: "auth_module",
    moduleName: "Authentication",
    directDependencies: ["dashboard_module", "wallet_module", "admin_panel_module"],
    indirectDependencies: ["cpa_control_module", "membership_module", "referral_module"],
    criticalInvariants: [
      "User UID must be non-empty string and mapped to Firebase Auth",
      "OTP verification tokens must expire after 10 minutes",
      "User profile documents must be created or merged without overwriting existing balances"
    ],
    mandatoryRegressionTests: ["AuthFlow", "OTPVerification", "ProfileSync"]
  },
  google_signin_module: {
    moduleId: "google_signin_module",
    moduleName: "Google Sign-In",
    directDependencies: ["auth_module", "dashboard_module"],
    indirectDependencies: ["wallet_module", "referral_module"],
    criticalInvariants: [
      "Google Sign-In popup message handler must receive GOOGLE_AUTH_SUCCESS from origin",
      "OAuth state parameter must be validated against cross-site attack"
    ],
    mandatoryRegressionTests: ["GoogleOAuthPopup", "OAuthStateValidation"]
  },
  dashboard_module: {
    moduleId: "dashboard_module",
    moduleName: "Dashboard",
    directDependencies: ["auth_module", "membership_module"],
    indirectDependencies: ["wallet_module", "cpa_control_module", "referral_module"],
    criticalInvariants: [
      "User balance, withdrawable balance, and pending balance must sum cleanly without NaN",
      "Daily tasks counter must respect membership tier limits",
      "Real-time snapshot listener must recover gracefully if quota or offline errors occur"
    ],
    mandatoryRegressionTests: ["DashboardBalanceCalculation", "TaskLimitEnforcement", "RealtimeSnapshotFallback"]
  },
  tasks_module: {
    moduleId: "tasks_module",
    moduleName: "Tasks",
    directDependencies: ["dashboard_module", "pending_proof_module"],
    indirectDependencies: ["membership_module", "referral_module"],
    criticalInvariants: [
      "Daily completed tasks counter must reset daily",
      "Task submission must require valid link or proof attachment"
    ],
    mandatoryRegressionTests: ["TaskSubmissionValidation", "DailyCounterReset"]
  },
  wallet_module: {
    moduleId: "wallet_module",
    moduleName: "Wallet",
    directDependencies: ["auth_module", "payment_gateways_module", "dashboard_module"],
    indirectDependencies: ["membership_module", "admin_panel_module"],
    criticalInvariants: [
      "Deposit requests must store user ID, payment method, transaction ID, and amount",
      "Approved deposits must credit account balance immediately"
    ],
    mandatoryRegressionTests: ["WalletDepositSync", "LedgerBalanceCredit"]
  },
  withdraw_module: {
    moduleId: "withdraw_module",
    moduleName: "Withdraw",
    directDependencies: ["auth_module", "wallet_module", "dashboard_module"],
    indirectDependencies: ["payment_gateways_module", "admin_panel_module"],
    criticalInvariants: [
      "Withdraw request amount must not exceed available user balance",
      "Minimum withdrawal threshold (e.g. 50 BDT) must be strictly enforced",
      "Pending withdrawals must freeze corresponding balance to prevent double-spending"
    ],
    mandatoryRegressionTests: ["WithdrawBalanceCheck", "MinimumThresholdValidation", "DoubleSpendPrevention"]
  },
  membership_module: {
    moduleId: "membership_module",
    moduleName: "Membership",
    directDependencies: ["dashboard_module", "wallet_module"],
    indirectDependencies: ["referral_module", "admin_panel_module"],
    criticalInvariants: [
      "Membership tier (Free, Bronze, Silver, Gold, VIP) determines daily task earning cap",
      "Upgrade request must deduct balance or require admin deposit approval"
    ],
    mandatoryRegressionTests: ["MembershipTierLimits", "UpgradeRequestProcessing"]
  },
  referral_module: {
    moduleId: "referral_module",
    moduleName: "Referral",
    directDependencies: ["auth_module", "dashboard_module", "wallet_module"],
    indirectDependencies: ["admin_panel_module"],
    criticalInvariants: [
      "Referral code must be uniquely derived or assigned to each user",
      "Multi-level referral commission math must credit referrers upon task/CPA events"
    ],
    mandatoryRegressionTests: ["ReferralCodeGeneration", "CommissionMath"]
  },
  pending_proof_module: {
    moduleId: "pending_proof_module",
    moduleName: "Pending Proof",
    directDependencies: ["tasks_module", "admin_panel_module"],
    indirectDependencies: ["dashboard_module", "notifications_module"],
    criticalInvariants: [
      "Task proof submissions must remain in pending state until admin review",
      "Approved proof must credit reward amount to user balance"
    ],
    mandatoryRegressionTests: ["PendingProofQueue", "ProofApprovalCredit"]
  },
  payment_proof_module: {
    moduleId: "payment_proof_module",
    moduleName: "Payment Proof",
    directDependencies: ["wallet_module", "withdraw_module", "admin_panel_module"],
    indirectDependencies: ["payment_gateways_module"],
    criticalInvariants: [
      "Deposit transaction proofs must store transaction ID and receipt URL",
      "Withdrawal payment proof receipt must be attached upon payout completion"
    ],
    mandatoryRegressionTests: ["PaymentProofRecord", "ReceiptAttachment"]
  },
  cpa_control_module: {
    moduleId: "cpa_control_module",
    moduleName: "CPA Control Center",
    directDependencies: ["dashboard_module", "wallet_module", "admin_panel_module"],
    indirectDependencies: ["auth_module", "referral_module"],
    criticalInvariants: [
      "CPA Postback URL endpoint /api/cpa/postback must handle subid, offer_id, and payout correctly",
      "Duplicate conversion callbacks with same conversion/transaction ID must be rejected",
      "Auto-approve CPA networks must instantly credit user account balance"
    ],
    mandatoryRegressionTests: ["CPANetworkFeedParse", "PostbackEndpointValidation", "DuplicateConversionGuard"]
  },
  telegram_bot_module: {
    moduleId: "telegram_bot_module",
    moduleName: "Telegram Bot",
    directDependencies: ["auth_module", "hq_settings_module"],
    indirectDependencies: ["notifications_module"],
    criticalInvariants: [
      "Telegram bot token and handle must persist across server restarts",
      "Telegram verification code lookup must match user phone number"
    ],
    mandatoryRegressionTests: ["TelegramBotConfigPersistence", "VerificationCodeLookup"]
  },
  smtp_email_module: {
    moduleId: "smtp_email_module",
    moduleName: "SMTP Email",
    directDependencies: ["auth_module", "hq_settings_module"],
    indirectDependencies: ["notifications_module"],
    criticalInvariants: [
      "SMTP server credentials must be sanitized (strip spaces) and persisted",
      "Daily email quota counter must reset every day"
    ],
    mandatoryRegressionTests: ["SMTPConfigSanitization", "EmailQuotaReset"]
  },
  notifications_module: {
    moduleId: "notifications_module",
    moduleName: "Notifications",
    directDependencies: ["auth_module", "admin_panel_module"],
    indirectDependencies: ["telegram_bot_module", "smtp_email_module"],
    criticalInvariants: [
      "System notifications must deliver real-time messages to target users",
      "Broadcast notifications must be logged in notifications history"
    ],
    mandatoryRegressionTests: ["NotificationDelivery", "BroadcastLogging"]
  },
  payment_gateways_module: {
    moduleId: "payment_gateways_module",
    moduleName: "Payment Gateways",
    directDependencies: ["wallet_module", "withdraw_module", "hq_settings_module"],
    indirectDependencies: ["admin_panel_module"],
    criticalInvariants: [
      "bKash, Nagad, Rocket, and Crypto gateway parameters must retain active numbers and fees",
      "Gateway minimum deposit and withdrawal limits must be enforced"
    ],
    mandatoryRegressionTests: ["GatewayParameterSync", "GatewayLimitGuard"]
  },
  admin_panel_module: {
    moduleId: "admin_panel_module",
    moduleName: "Admin Panel",
    directDependencies: ["auth_module", "hq_settings_module"],
    indirectDependencies: ["cpa_control_module", "wallet_module", "withdraw_module"],
    criticalInvariants: [
      "Admin panel routes and mutation APIs must require admin role verification",
      "Admin actions must be audited in administrative logs"
    ],
    mandatoryRegressionTests: ["AdminAuthorizationCheck", "AuditTrailLogging"]
  },
  hq_settings_module: {
    moduleId: "hq_settings_module",
    moduleName: "HQ Settings",
    directDependencies: ["admin_panel_module", "telegram_bot_module", "smtp_email_module"],
    indirectDependencies: ["payment_gateways_module", "cpa_control_module"],
    criticalInvariants: [
      "HQ settings, bot tokens, CPA storage, and security rules must persist across deployments",
      "System configuration changes must be backed up before overwrite"
    ],
    mandatoryRegressionTests: ["HQConfigPersistence", "BackupIntegrity"]
  }
};

/**
 * Perform full dependency and impact analysis prior to feature implementation
 */
export function analyzeFeatureImpact(
  featureName: string,
  targetModuleId: string,
  proposedChanges: string[]
): ImpactAnalysisResult {
  const targetModule = AREARNZONE_SYSTEM_MODULES[targetModuleId];

  if (!targetModule) {
    return {
      featureName,
      targetModuleId,
      riskLevel: RiskLevel.CRITICAL,
      affectedModules: Object.keys(AREARNZONE_SYSTEM_MODULES),
      invariantsToCheck: ["Unknown target module - complete system verification required"],
      requiredTestSuites: ["FullSystemRegression"],
      nonBreakingStrategy: ["Perform full regression suite before applying changes"],
      safeToProceed: false
    };
  }

  const affectedModules = Array.from(
    new Set([targetModuleId, ...targetModule.directDependencies, ...targetModule.indirectDependencies])
  );

  let riskLevel = RiskLevel.LOW;
  if (affectedModules.length > 5) {
    riskLevel = RiskLevel.CRITICAL;
  } else if (affectedModules.length > 3) {
    riskLevel = RiskLevel.HIGH;
  } else if (affectedModules.length > 1) {
    riskLevel = RiskLevel.MEDIUM;
  }

  const invariantsToCheck: string[] = [];
  const requiredTestSuites: string[] = [];

  affectedModules.forEach((modId) => {
    const mod = AREARNZONE_SYSTEM_MODULES[modId];
    if (mod) {
      invariantsToCheck.push(...mod.criticalInvariants);
      requiredTestSuites.push(...mod.mandatoryRegressionTests);
    }
  });

  const nonBreakingStrategy = [
    `1. Verify database security rules enforce authentication for ${targetModule.moduleName}.`,
    `2. Keep interface contract backward-compatible for dependent modules: ${targetModule.directDependencies.join(", ")}.`,
    `3. Run automated regression tests on all ${requiredTestSuites.length} mandatory test scenarios.`,
    `4. Validate zero-breaking state across all 17 system modules.`
  ];

  return {
    featureName,
    targetModuleId,
    riskLevel,
    affectedModules,
    invariantsToCheck,
    requiredTestSuites: Array.from(new Set(requiredTestSuites)),
    nonBreakingStrategy,
    safeToProceed: true
  };
}
