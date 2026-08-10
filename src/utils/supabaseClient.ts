// src/utils/supabaseClient.ts
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
  getEnvVar('VITE_SUPABASE_URL') ||
  getEnvVar('SUPABASE_URL') ||
  'https://uzmhfphwclvpwiiouqak.supabase.co';

export const SUPABASE_SERVICE_ROLE_KEY =
  getEnvVar('SUPABASE_SERVICE_ROLE_KEY') ||
  getEnvVar('VITE_SUPABASE_SERVICE_ROLE_KEY') ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6bWhmfGh3Y2x2cHdpaW91cWFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE3NzgxNCwiZXhwIjoyMDgwNzUzODE0fQ.iANv2qozykC4MR6fzP3cP5RWNvFx1KBOayZk-wfegtk';

export const SUPABASE_KEY =
  getEnvVar('SUPABASE_SERVICE_ROLE_KEY') ||
  getEnvVar('VITE_SUPABASE_SERVICE_ROLE_KEY') ||
  SUPABASE_SERVICE_ROLE_KEY ||
  getEnvVar('VITE_SUPABASE_ANON_KEY') ||
  getEnvVar('SUPABASE_ANON_KEY') ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6bWhmfGh3Y2x2cHdpaW91cWFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE3NzgxNCwiZXhwIjoyMDgwNzUzODE0fQ.iANv2qozykC4MR6fzP3cP5RWNvFx1KBOayZk-wfegtk';

export const SUPABASE_ANON_KEY = SUPABASE_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

/**
 * Single Source of Truth Supabase Client Instance
 */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Map collection names to Supabase PostgreSQL table names
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
  try {
    const { data, error } = await supabase.from('settings').select('*').limit(1);

    if (error && (error.code === '42P01' || error.code === 'PGRST205')) {
      return {
        success: true,
        message: 'Connected to Supabase PostgreSQL successfully!',
        details: error,
      };
    }

    if (error && error.code !== 'PGRST116') {
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
 * 100% SUPABASE USER DATA PERSISTENCE & CROSS-DEVICE SYNC APIS
 */

/**
 * Fetch a complete user profile by User ID (uid) or email directly from Supabase
 */
export async function getUserByUid(uidOrEmailOrId: string): Promise<any | null> {
  if (!uidOrEmailOrId) return null;

  try {
    // 1. Try search by firebase_uid or uid
    const { data: uidMatch, error: uidErr } = await supabase
      .from('users')
      .select('*')
      .or(`firebase_uid.eq.${uidOrEmailOrId},id.eq.${uidOrEmailOrId}`)
      .limit(1);

    if (!uidErr && uidMatch && uidMatch.length > 0) {
      const row = uidMatch[0];
      return row.raw_data || row.data ? { ...(row.raw_data || row.data), id: row.id } : row;
    }

    // 2. Try search by email if it looks like an email
    if (uidOrEmailOrId.includes('@')) {
      const { data: emailMatch, error: emailErr } = await supabase
        .from('users')
        .select('*')
        .ilike('email', uidOrEmailOrId)
        .limit(1);

      if (!emailErr && emailMatch && emailMatch.length > 0) {
        const row = emailMatch[0];
        return row.raw_data || row.data ? { ...(row.raw_data || row.data), id: row.id } : row;
      }
    }

    return null;
  } catch (err) {
    console.error('[Supabase Client] Error fetching user by UID:', err);
    return null;
  }
}

/**
 * Permanently save/update user profile in Supabase tied strictly to user's unique UID
 */
export async function saveUserProfile(user: any): Promise<boolean> {
  if (!user || (!user.id && !user.uid)) return false;

  const docId = user.id || user.uid;
  const uid = user.uid || user.id;

  try {
    const payload = {
      id: docId,
      firebase_uid: uid,
      email: user.email ? String(user.email).toLowerCase() : null,
      name: user.name || null,
      status: user.status || 'Unverified',
      role: user.role || 'user',
      balance: user.balance !== undefined ? Number(user.balance) : 0,
      updated_at: new Date().toISOString(),
      raw_data: user,
    };

    const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase Client] Error saving user profile:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Supabase Client] Exception saving user profile:', err);
    return false;
  }
}

/**
 * Fetch all user transactions by UID directly from Supabase
 */
export async function getUserTransactions(uid: string): Promise<any[]> {
  if (!uid) return [];

  try {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .or(`firebase_uid.eq.${uid},user_id.eq.${uid}`);

    if (error || !data) return [];

    return data.map((row) => (row.raw_data || row.data ? { ...(row.raw_data || row.data), id: row.id } : row));
  } catch (err) {
    console.error('[Supabase Client] Error fetching transactions:', err);
    return [];
  }
}

/**
 * Fetch user task submissions by UID directly from Supabase
 */
export async function getUserSubmissions(uid: string): Promise<any[]> {
  if (!uid) return [];

  try {
    const { data, error } = await supabase
      .from('task_submissions')
      .select('*')
      .or(`firebase_uid.eq.${uid},user_id.eq.${uid}`);

    if (error || !data) return [];

    return data.map((row) => (row.raw_data || row.data ? { ...(row.raw_data || row.data), id: row.id } : row));
  } catch (err) {
    console.error('[Supabase Client] Error fetching submissions:', err);
    return [];
  }
}

/**
 * Fetch user withdraw requests by UID directly from Supabase
 */
export async function getUserWithdraws(uid: string): Promise<any[]> {
  if (!uid) return [];

  try {
    const { data, error } = await supabase
      .from('withdraw_requests')
      .select('*')
      .or(`firebase_uid.eq.${uid},user_id.eq.${uid}`);

    if (error || !data) return [];

    return data.map((row) => (row.raw_data || row.data ? { ...(row.raw_data || row.data), id: row.id } : row));
  } catch (err) {
    console.error('[Supabase Client] Error fetching withdraws:', err);
    return [];
  }
}

/**
 * Fetch user notifications by UID directly from Supabase
 */
export async function getUserNotifications(uid: string): Promise<any[]> {
  if (!uid) return [];

  try {
    const { data, error } = await supabase
      .from('app_notifications')
      .select('*')
      .or(`firebase_uid.eq.${uid},user_id.eq.${uid},user_id.eq.all`);

    if (error || !data) return [];

    return data.map((row) => (row.raw_data || row.data ? { ...(row.raw_data || row.data), id: row.id } : row));
  } catch (err) {
    console.error('[Supabase Client] Error fetching notifications:', err);
    return [];
  }
}

/**
 * ADMIN & MONITORING LOGS SUPABASE PERSISTENCE
 */

/**
 * Fetch Global Admin Settings from Supabase
 */
export async function getGlobalConfig(): Promise<any | null> {
  try {
    const { data, error } = await supabase.from('settings').select('*').eq('id', 'global').single();
    if (error || !data) return null;
    return data.raw_data || data.data || data;
  } catch (err) {
    console.error('[Supabase Client] Error fetching global config:', err);
    return null;
  }
}

/**
 * Save Global Admin Settings to Supabase (Immune to local wipes)
 */
export async function saveGlobalConfig(config: any): Promise<boolean> {
  try {
    const payload = {
      id: 'global',
      updated_at: new Date().toISOString(),
      raw_data: config,
    };
    const { error } = await supabase.from('settings').upsert(payload, { onConflict: 'id' });
    return !error;
  } catch (err) {
    console.error('[Supabase Client] Error saving global config:', err);
    return false;
  }
}

/**
 * Permanently Log App Monitoring / Gateway event in Supabase
 */
export async function saveMonitoringLog(log: any): Promise<boolean> {
  try {
    const logId = log.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const payload = {
      id: logId,
      user_id: log.userId || log.user_id || 'system',
      firebase_uid: log.firebaseUid || log.user_id || 'system',
      updated_at: new Date().toISOString(),
      raw_data: log,
    };

    const { error } = await supabase.from('gateway_logs').upsert(payload, { onConflict: 'id' });
    return !error;
  } catch (err) {
    console.error('[Supabase Client] Error saving monitoring log:', err);
    return false;
  }
}

/**
 * Fetch all App Monitoring logs from Supabase
 */
export async function getMonitoringLogs(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('gateway_logs').select('*').order('updated_at', { ascending: false });
    if (error || !data) return [];
    return data.map((row) => (row.raw_data || row.data ? { ...(row.raw_data || row.data), id: row.id } : row));
  } catch (err) {
    console.error('[Supabase Client] Error fetching monitoring logs:', err);
    return [];
  }
}

/**
 * GENERIC TABLE CRUD OPERATORS RE-EXPORTED FOR CONVENIENCE
 */

export async function fetchCollection<T>(collectionName: string): Promise<T[]> {
  try {
    const tableName = mapCollectionToTable(collectionName);
    const { data, error } = await supabase.from(tableName).select('*');
    if (error || !data) return [];
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
    console.error(`[Supabase Client] Fetch failed for ${collectionName}:`, err);
    return [];
  }
}

export async function saveDocument(collectionName: string, docId: string, data: any): Promise<boolean> {
  try {
    const tableName = mapCollectionToTable(collectionName);
    const payload: Record<string, any> = {
      id: docId,
      updated_at: new Date().toISOString(),
      raw_data: data,
    };

    if (data.uid || data.firebase_uid || data.userId) {
      const uid = data.uid || data.firebase_uid || data.userId;
      payload.firebase_uid = uid;
      payload.user_id = uid;
    }

    if (data.status) payload.status = String(data.status);
    if (data.amount !== undefined) payload.amount = Number(data.amount);

    const { error } = await supabase.from(tableName).upsert(payload, { onConflict: 'id' });
    return !error;
  } catch (err) {
    console.error(`[Supabase Client] Save document failed for ${collectionName}/${docId}:`, err);
    return false;
  }
}

export async function deleteDocument(collectionName: string, docId: string): Promise<boolean> {
  try {
    const tableName = mapCollectionToTable(collectionName);
    const { error } = await supabase.from(tableName).delete().eq('id', docId);
    return !error;
  } catch (err) {
    console.error(`[Supabase Client] Delete document failed for ${collectionName}/${docId}:`, err);
    return false;
  }
}
