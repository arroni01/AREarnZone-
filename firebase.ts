import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import firebaseConfig from "./firebase-applet-config.json";
import {
  isSupabaseConfigured,
  fetchSupabaseCollection,
  saveSupabaseDocument,
  deleteSupabaseDocument,
  listenToSupabaseCollection,
  listenToSupabaseDocument
} from "./supabase";

// Use strict authDomain for Firebase project 'arearnzone'
const getResolvedFirebaseConfig = () => {
  const config = { ...firebaseConfig };
  config.authDomain = "arearnzone.firebaseapp.com";
  return config;
};

// Initialize Firebase App & Auth strictly for Authentication
const app = initializeApp(getResolvedFirebaseConfig());
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface DatabaseErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

// Quota tracking stubs for compatibility (no Firebase Database involved)
export const getIsQuotaExceeded = () => false;
export const setIsQuotaExceeded = (_val: boolean) => {};
export function clearAllSubscriptions() {}

export function isQuotaError(_error: any): boolean {
  return false;
}

export function isOfflineError(_error: any): boolean {
  return false;
}

export function handleDatabaseError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: DatabaseErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('Database Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Generic function to fetch all documents from Supabase collection
 */
export async function fetchCollection<T>(collectionName: string): Promise<T[]> {
  if (isSupabaseConfigured) {
    const supabaseData = await fetchSupabaseCollection<T>(collectionName);
    if (supabaseData !== null) {
      return supabaseData;
    }
  }
  return [];
}

/**
 * Generic function to save a document to Supabase collection
 */
export async function saveDocument(collectionName: string, docId: string, data: any): Promise<void> {
  if (isSupabaseConfigured) {
    const currentUid = auth.currentUser?.uid;
    await saveSupabaseDocument(collectionName, docId, data, currentUid);
  }
}

/**
 * Generic function to delete a document from Supabase collection
 */
export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  if (isSupabaseConfigured) {
    await deleteSupabaseDocument(collectionName, docId);
  }
}

/**
 * Sync initial local data to Supabase database if collection is empty
 */
export async function uploadInitialDataIfEmpty(collectionName: string, localData: any[], idKey: string = "id"): Promise<boolean> {
  if (isSupabaseConfigured && localData && localData.length > 0) {
    const existing = await fetchSupabaseCollection(collectionName);
    if (!existing || existing.length === 0) {
      console.log(`Supabase table ${collectionName} is empty. Uploading initial data...`);
      for (const item of localData) {
        const docId = item[idKey];
        if (docId) {
          await saveSupabaseDocument(collectionName, String(docId), item, auth.currentUser?.uid);
        }
      }
      return true;
    }
  }
  return false;
}

/**
 * Check if a specific single config doc exists in Supabase, if not write initial config
 */
export async function uploadConfigIfEmpty(collectionName: string, docId: string, localConfig: any): Promise<{ data: any; existed: boolean }> {
  if (isSupabaseConfigured && localConfig) {
    const existing = await fetchSupabaseCollection(collectionName);
    const found = existing?.find((item: any) => item.id === docId);
    if (found) {
      return { data: found, existed: true };
    }
    await saveSupabaseDocument(collectionName, docId, localConfig, auth.currentUser?.uid);
    return { data: localConfig, existed: false };
  }
  return { data: localConfig, existed: true };
}

/**
 * Set up a real-time listener for a collection in Supabase
 */
export function listenToCollection<T>(collectionName: string, callback: (data: T[]) => void) {
  if (isSupabaseConfigured) {
    return listenToSupabaseCollection<T>(collectionName, callback);
  }
  return () => {};
}

/**
 * Set up a real-time listener for a single document in Supabase
 */
export function listenToDocument<T>(collectionName: string, docId: string, callback: (data: T | null) => void) {
  if (isSupabaseConfigured) {
    return listenToSupabaseDocument<T>(collectionName, docId, callback);
  }
  return () => {};
}
