import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  disableNetwork,
  enableNetwork,
  setLogLevel
} from "firebase/firestore";

// Config parsed from firebase-applet-config.json
const firebaseConfig = {
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY || "",
  authDomain: "braided-ward-dn50x.firebaseapp.com",
  projectId: "braided-ward-dn50x",
  storageBucket: "braided-ward-dn50x.firebasestorage.app",
  messagingSenderId: "818768496606",
  appId: "1:818768496606:web:61f0d3cf89753d48bf3f4f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Silence internal Firestore SDK console errors (including quota limits and backoff warning messages)
try {
  setLogLevel("silent");
} catch (e) {
  // ignore
}

// Initialize Firestore using the named database specified in firebase-applet-config.json
export const db = getFirestore(app, "ai-studio-arearnzone-df957101-7e6d-40da-a7e8-4788e5723989");

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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

const QUOTA_EXCEEDED_KEY = "arez_firestore_quota_exceeded_timestamp";

// Global flag to track if Firestore write/read quota is exhausted
let isQuotaExceeded = (() => {
  try {
    const tsStr = typeof window !== 'undefined' ? localStorage.getItem(QUOTA_EXCEEDED_KEY) : null;
    if (tsStr) {
      const ts = parseInt(tsStr, 10);
      const now = Date.now();
      // Quota reset happens daily, so let's cache this status for 12 hours to avoid backend spamming
      if (now - ts < 12 * 60 * 60 * 1000) {
        console.warn("[Firestore Safe-Guard] Detected stored quota-exhaustion timestamp from last 12 hours. Engaging local sandbox mode immediately.");
        return true;
      } else {
        localStorage.removeItem(QUOTA_EXCEEDED_KEY);
      }
    }
  } catch (e) {
    // ignore
  }
  return false;
})();

// If quota is already marked as exceeded on startup, disable network immediately
if (isQuotaExceeded) {
  disableNetwork(db).catch(err => {
    console.error("[Firestore Safe-Guard] Error auto-disabling firestore network on startup:", err);
  });
}

// Global tracker for active subscription unsubscribes
const activeSubscriptions = new Set<() => void>();

export function clearAllSubscriptions() {
  console.log(`[Firestore Safe-Guard] Cleaning up and unsubscribing all ${activeSubscriptions.size} active listeners due to quota limit.`);
  activeSubscriptions.forEach(unsub => {
    try {
      unsub();
    } catch (e) {
      // ignore
    }
  });
  activeSubscriptions.clear();
}

export const getIsQuotaExceeded = () => isQuotaExceeded;
export const setIsQuotaExceeded = (val: boolean) => {
  isQuotaExceeded = val;
  if (val) {
    try {
      localStorage.setItem(QUOTA_EXCEEDED_KEY, Date.now().toString());
    } catch (e) {}
    try {
      disableNetwork(db).catch(err => {
        console.error("[Firestore Safe-Guard] Error disabling firestore network:", err);
      });
    } catch (e) {}
    clearAllSubscriptions();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("arez_quota_exceeded_detected"));
    }
  } else {
    try {
      localStorage.removeItem(QUOTA_EXCEEDED_KEY);
    } catch (e) {}
    try {
      enableNetwork(db).catch(err => {
        console.error("[Firestore Safe-Guard] Error enabling firestore network:", err);
      });
    } catch (e) {}
  }
};

if (typeof window !== "undefined") {
  window.addEventListener("arez_quota_exceeded_detected", () => {
    setIsQuotaExceeded(true);
  });
}

export function isQuotaError(error: any): boolean {
  const msg = String(error?.message || error || '').toLowerCase();
  return (
    msg.includes("quota") ||
    msg.includes("exhausted") ||
    msg.includes("resource-exhausted") ||
    msg.includes("limit exceeded") ||
    msg.includes("code=resource-exhausted")
  );
}

/**
 * Handle and re-throw Firestore permission errors as JSON strings
 * to assist automated platform diagnostics.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  if (isQuotaError(error)) {
    setIsQuotaExceeded(true);
    console.warn(`[Firestore Safe-Guard] Quota exceeded on ${operationType} at path ${path}. Switched to high-performance local sandbox mode.`);
  }
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Generic function to fetch all documents from a Firestore collection
 */
export async function fetchCollection<T>(collectionName: string): Promise<T[]> {
  if (isQuotaExceeded) return [];
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
  } catch (error) {
    if (isQuotaError(error)) {
      setIsQuotaExceeded(true);
      console.warn(`[Firestore Safe-Guard] Quota limit detected during fetchCollection of ${collectionName}. Falling back.`);
      return [];
    }
    handleFirestoreError(error, OperationType.LIST, collectionName);
  }
}

/**
 * Generic function to save a document to a Firestore collection
 */
export async function saveDocument(collectionName: string, docId: string, data: any): Promise<void> {
  if (isQuotaExceeded) return;
  try {
    const docRef = doc(db, collectionName, docId);
    // Sanitize data to remove any undefined values which Firestore doesn't support
    const sanitizedData = JSON.parse(JSON.stringify(data, (key, value) => {
      return value === undefined ? null : value;
    }));
    await setDoc(docRef, sanitizedData, { merge: true });
  } catch (error) {
    if (isQuotaError(error)) {
      setIsQuotaExceeded(true);
      console.warn(`[Firestore Safe-Guard] Quota limit detected during saveDocument of ${collectionName}/${docId}. Falling back.`);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${docId}`);
  }
}

/**
 * Generic function to delete a document from a Firestore collection
 */
export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  if (isQuotaExceeded) return;
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    if (isQuotaError(error)) {
      setIsQuotaExceeded(true);
      console.warn(`[Firestore Safe-Guard] Quota limit detected during deleteDocument of ${collectionName}/${docId}. Falling back.`);
      return;
    }
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${docId}`);
  }
}

/**
 * Sync initial local data to Firestore if Firestore collection is empty
 */
export async function uploadInitialDataIfEmpty(collectionName: string, localData: any[], idKey: string = "id"): Promise<boolean> {
  if (isQuotaExceeded) return false;
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty && localData && localData.length > 0) {
      console.log(`Firestore collection ${collectionName} is empty. Uploading local data...`);
      const batch = writeBatch(db);
      localData.forEach(item => {
        const docId = item[idKey];
        if (docId) {
          const docRef = doc(db, collectionName, String(docId));
          const sanitizedData = JSON.parse(JSON.stringify(item, (key, value) => {
            return value === undefined ? null : value;
          }));
          batch.set(docRef, sanitizedData);
        }
      });
      await batch.commit();
      return true;
    }
    return false;
  } catch (error) {
    if (isQuotaError(error)) {
      setIsQuotaExceeded(true);
      console.warn(`[Firestore Safe-Guard] Quota limit detected during uploadInitialData of ${collectionName}. Falling back.`);
      return false;
    }
    handleFirestoreError(error, OperationType.WRITE, collectionName);
  }
}

/**
 * Check if a specific single config doc exists, if not write initial config
 */
export async function uploadConfigIfEmpty(collectionName: string, docId: string, localConfig: any): Promise<{ data: any; existed: boolean }> {
  if (isQuotaExceeded) return { data: localConfig, existed: true };
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() && localConfig) {
      console.log(`Firestore document ${collectionName}/${docId} is empty. Uploading local config...`);
      const sanitizedConfig = JSON.parse(JSON.stringify(localConfig, (key, value) => {
        return value === undefined ? null : value;
      }));
      await setDoc(docRef, sanitizedConfig);
      return { data: localConfig, existed: false };
    } else if (docSnap.exists()) {
      return { data: docSnap.data(), existed: true };
    }
    return { data: null, existed: false };
  } catch (error) {
    if (isQuotaError(error)) {
      setIsQuotaExceeded(true);
      console.warn(`[Firestore Safe-Guard] Quota limit detected during uploadConfig of ${collectionName}/${docId}. Falling back.`);
      return { data: localConfig, existed: true };
    }
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${docId}`);
  }
}

/**
 * Set up a real-time listener for a Firestore collection
 */
export function listenToCollection<T>(collectionName: string, callback: (data: T[]) => void) {
  if (isQuotaExceeded) {
    return () => {};
  }
  const colRef = collection(db, collectionName);
  
  let actualUnsub: (() => void) | null = null;
  let hasErrored = false;
  
  actualUnsub = onSnapshot(colRef, (snapshot) => {
    const dataList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));
    callback(dataList);
  }, (error) => {
    hasErrored = true;
    if (isQuotaError(error)) {
      setIsQuotaExceeded(true);
      console.warn(`[Firestore Safe-Guard] Quota limit detected during listenToCollection of ${collectionName}. Falling back.`);
      if (actualUnsub) {
        try {
          actualUnsub();
        } catch (e) {}
      }
      return;
    }
    handleFirestoreError(error, OperationType.LIST, collectionName);
  });

  const unsub = () => {
    activeSubscriptions.delete(unsub);
    if (actualUnsub) {
      try {
        actualUnsub();
      } catch (e) {}
    }
  };

  if (hasErrored) {
    if (actualUnsub) {
      try {
        actualUnsub();
      } catch (e) {}
    }
    return () => {};
  }
  
  activeSubscriptions.add(unsub);
  return unsub;
}

/**
 * Set up a real-time listener for a single document
 */
export function listenToDocument<T>(collectionName: string, docId: string, callback: (data: T | null) => void) {
  if (isQuotaExceeded) {
    return () => {};
  }
  const docRef = doc(db, collectionName, docId);
  
  let actualUnsub: (() => void) | null = null;
  let hasErrored = false;
  
  actualUnsub = onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as unknown as T);
    } else {
      callback(null);
    }
  }, (error) => {
    hasErrored = true;
    if (isQuotaError(error)) {
      setIsQuotaExceeded(true);
      console.warn(`[Firestore Safe-Guard] Quota limit detected during listenToDocument of ${collectionName}/${docId}. Falling back.`);
      if (actualUnsub) {
        try {
          actualUnsub();
        } catch (e) {}
      }
      return;
    }
    handleFirestoreError(error, OperationType.GET, `${collectionName}/${docId}`);
  });

  const unsub = () => {
    activeSubscriptions.delete(unsub);
    if (actualUnsub) {
      try {
        actualUnsub();
      } catch (e) {}
    }
  };

  if (hasErrored) {
    if (actualUnsub) {
      try {
        actualUnsub();
      } catch (e) {}
    }
    return () => {};
  }

  activeSubscriptions.add(unsub);
  return unsub;
}
