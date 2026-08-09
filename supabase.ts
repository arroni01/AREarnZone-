import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Resolve Supabase URL and Key safely across Vite browser runtime and Node runtime
const getEnvVar = (key: string): string => {
  let val = '';
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      val = String(process.env[key]);
    }
  } catch (e) {
    // ignore
  }

  if (!val) {
    try {
      const metaEnv = (new Function('return typeof import.meta !== "undefined" ? import.meta.env : undefined') as () => any)();
      if (metaEnv && metaEnv[key]) {
        val = String(metaEnv[key]);
      }
    } catch (e) {
      // ignore
    }
  }
  return val;
};

export const SUPABASE_URL =
  getEnvVar('VITE_SUPABASE_URL') || getEnvVar('SUPABASE_URL') || 'https://uzmhfphwclvpwiiouqak.supabase.co';

export const SUPABASE_KEY =
  getEnvVar('SUPABASE_SERVICE_ROLE_KEY') ||
  getEnvVar('VITE_SUPABASE_SERVICE_ROLE_KEY') ||
  getEnvVar('VITE_SUPABASE_ANON_KEY') ||
  getEnvVar('SUPABASE_ANON_KEY') ||
  'sb_publishable_stzcP0VjBM_dL7LOsKTCLg_a2CFgbFy';

export const SUPABASE_ANON_KEY = SUPABASE_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

/**
 * Map application collection names to Supabase PostgreSQL table names
 */
export function mapCollectionToTable(collectionName: string): string {
  const map: Record<string, string> = {
    users: 'users',
    tasks: 'tasks',
    submissions: 'task_submissions',
    withdraws: 'withdraw_requests',
    membershipRequests: 'membership_requests',
    depositRequests: 'deposit_requests',
    transactions: 'wallet_transactions',
    adViewLogs: 'ad_view_logs',
    withdrawOptions: 'withdraw_options',
    paymentMethods: 'payment_methods',
    gatewayLogs: 'gateway_logs',
    membershipPlans: 'membership_plans',
    socialLinks: 'social_links',
    appNotifications: 'app_notifications',
    sellCategories: 'sell_categories',
    sellItems: 'sell_items',
    storeOrders: 'store_orders',
    telegramRequests: 'telegram_requests',
    targets: 'referral_targets',
    targetHistories: 'target_histories',
    config: 'settings',
    cpaNetworks: 'cpa_networks',
    cpaConversions: 'cpa_conversions',
    cpaTransactions: 'cpa_transactions',
  };

  return map[collectionName] || collectionName.toLowerCase();
}

/**
 * Test connection to Supabase database
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      success: false,
      message: 'Supabase credentials (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are not set in environment.',
    };
  }

  try {
    // Attempt a simple ping query on settings/config or users
    const { data, error } = await supabase.from('settings').select('*').limit(1);

    if (error && (error.code === '42P01' || error.code === 'PGRST205')) {
      // Table does not exist yet in public schema, but connection to Supabase was authenticated and successful!
      return {
        success: true,
        message: 'Connected to Supabase PostgreSQL successfully! (Ready for table creation).',
        details: error,
      };
    }

    if (error && error.code !== 'PGRST116') {
      // Try fallback ping on any table
      const alt = await supabase.from('users').select('id').limit(1);
      if (alt.error && alt.error.code !== '42P01') {
        return {
          success: false,
          message: `Supabase connection error: ${alt.error.message || error.message}`,
          details: alt.error || error,
        };
      }
    }

    return {
      success: true,
      message: 'Supabase PostgreSQL database connection verified and active.',
      details: data,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to connect to Supabase: ${err?.message || String(err)}`,
      details: err,
    };
  }
}

/**
 * Extract Firebase UID or User ID from data object
 */
export function extractFirebaseUid(data: any, defaultUid?: string): string | null {
  if (defaultUid) return defaultUid;
  if (!data) return null;
  return data.firebase_uid || data.uid || data.userId || data.user_id || (data.id && typeof data.id === 'string' && data.id.length > 10 ? data.id : null);
}

/**
 * Fetch all documents from Supabase table
 */
export async function fetchSupabaseCollection<T>(collectionName: string): Promise<T[] | null> {
  if (!supabase || !isSupabaseConfigured) return null;

  try {
    const tableName = mapCollectionToTable(collectionName);
    const { data, error } = await supabase.from(tableName).select('*');

    if (error) {
      console.warn(`[Supabase] Error fetching ${tableName}:`, error.message);
      return null;
    }

    if (!data) return [];

    return data.map((row) => {
      if (row.raw_data && typeof row.raw_data === 'object') {
        return { ...row.raw_data, id: row.id || row.raw_data.id };
      }
      if (row.data && typeof row.data === 'object') {
        return { ...row.data, id: row.id || row.data.id };
      }
      return row as unknown as T;
    });
  } catch (err) {
    console.warn(`[Supabase] Fetch failed for ${collectionName}:`, err);
    return null;
  }
}

/**
 * Save / Upsert a document into Supabase table
 */
export async function saveSupabaseDocument(
  collectionName: string,
  docId: string,
  data: any,
  firebaseUid?: string
): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured) return false;

  try {
    const tableName = mapCollectionToTable(collectionName);
    const uid = extractFirebaseUid(data, firebaseUid);

    const payload: Record<string, any> = {
      id: docId,
      updated_at: new Date().toISOString(),
      raw_data: data,
    };

    if (uid) {
      payload.firebase_uid = uid;
      payload.user_id = uid;
    }

    // Map common structured fields if available
    if (data.status) payload.status = String(data.status);
    if (data.amount !== undefined) payload.amount = Number(data.amount);
    if (data.email) payload.email = String(data.email);
    if (data.name) payload.name = String(data.name);

    const { error } = await supabase.from(tableName).upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn(`[Supabase] Upsert error on ${tableName}/${docId}:`, error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn(`[Supabase] Save failed for ${collectionName}/${docId}:`, err);
    return false;
  }
}

/**
 * Delete a document from Supabase table
 */
export async function deleteSupabaseDocument(collectionName: string, docId: string): Promise<boolean> {
  if (!supabase || !isSupabaseConfigured) return false;

  try {
    const tableName = mapCollectionToTable(collectionName);
    const { error } = await supabase.from(tableName).delete().eq('id', docId);

    if (error) {
      console.warn(`[Supabase] Delete error on ${tableName}/${docId}:`, error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn(`[Supabase] Delete failed for ${collectionName}/${docId}:`, err);
    return false;
  }
}

/**
 * Real-time listener or polling subscription for Supabase collection
 */
export function listenToSupabaseCollection<T>(
  collectionName: string,
  callback: (data: T[]) => void
): () => void {
  if (!supabase || !isSupabaseConfigured) {
    return () => {};
  }

  const tableName = mapCollectionToTable(collectionName);

  // Initial fetch
  fetchSupabaseCollection<T>(collectionName).then((initialData) => {
    if (initialData) {
      callback(initialData);
    }
  });

  // Real-time changes subscription via Supabase channel
  const channel = supabase
    .channel(`public:${tableName}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      async () => {
        const refreshed = await fetchSupabaseCollection<T>(collectionName);
        if (refreshed) {
          callback(refreshed);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Real-time listener for a single document in Supabase
 */
export function listenToSupabaseDocument<T>(
  collectionName: string,
  docId: string,
  callback: (data: T | null) => void
): () => void {
  if (!supabase || !isSupabaseConfigured) {
    return () => {};
  }

  const tableName = mapCollectionToTable(collectionName);

  const channel = supabase
    .channel(`public:${tableName}:${docId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName, filter: `id=eq.${docId}` },
      async (payload) => {
        if (payload.eventType === 'DELETE') {
          callback(null);
        } else if (payload.new) {
          const row = payload.new as any;
          const docData = row.raw_data || row.data || row;
          callback({ ...docData, id: row.id || docData.id } as unknown as T);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * SQL Schema definition for Supabase setup reference & automated table initialization
 */
export const SUPABASE_SQL_SCHEMA = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  firebase_uid TEXT,
  email TEXT,
  name TEXT,
  status TEXT DEFAULT 'Unverified',
  role TEXT DEFAULT 'user',
  balance NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

-- 2. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  title TEXT,
  reward NUMERIC,
  type TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

-- 3. TASK SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.task_submissions (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  user_id TEXT,
  firebase_uid TEXT,
  status TEXT DEFAULT 'pending',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

-- 4. WITHDRAW REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.withdraw_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  firebase_uid TEXT,
  amount NUMERIC,
  status TEXT DEFAULT 'pending',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

-- 5. MEMBERSHIP REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.membership_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  firebase_uid TEXT,
  plan_name TEXT,
  amount NUMERIC,
  status TEXT DEFAULT 'pending',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

-- 6. DEPOSIT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  firebase_uid TEXT,
  amount NUMERIC,
  status TEXT DEFAULT 'pending',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

-- 7. WALLET TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  firebase_uid TEXT,
  type TEXT,
  amount NUMERIC,
  status TEXT DEFAULT 'completed',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

-- 8. APP NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.app_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  firebase_uid TEXT,
  title TEXT,
  message TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

-- 9. SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

-- 10. CPA NETWORKS TABLE
CREATE TABLE IF NOT EXISTS public.cpa_networks (
  id TEXT PRIMARY KEY,
  name TEXT,
  status TEXT DEFAULT 'Active',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

-- 11. CPA CONVERSIONS TABLE
CREATE TABLE IF NOT EXISTS public.cpa_conversions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  firebase_uid TEXT,
  status TEXT DEFAULT 'pending',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

-- 12. AD VIEW LOGS TABLE
CREATE TABLE IF NOT EXISTS public.ad_view_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  firebase_uid TEXT,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB
);

-- 13. INDEXES FOR HIGH PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON public.users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.task_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_withdraws_user_id ON public.withdraw_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.wallet_transactions(user_id);

-- 14. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdraw_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow public read & write access for authenticated app queries
DROP POLICY IF EXISTS "Public access policy" ON public.users;
CREATE POLICY "Public access policy" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public tasks policy" ON public.tasks;
CREATE POLICY "Public tasks policy" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public submissions policy" ON public.task_submissions;
CREATE POLICY "Public submissions policy" ON public.task_submissions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public withdraws policy" ON public.withdraw_requests;
CREATE POLICY "Public withdraws policy" ON public.withdraw_requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public transactions policy" ON public.wallet_transactions;
CREATE POLICY "Public transactions policy" ON public.wallet_transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public settings policy" ON public.settings;
CREATE POLICY "Public settings policy" ON public.settings FOR ALL USING (true) WITH CHECK (true);
`;
