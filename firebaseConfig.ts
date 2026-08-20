import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, browserLocalPersistence, inMemoryPersistence, setPersistence } from "firebase/auth";
import firebaseConfigJson from "./firebase-applet-config.json";

const getResolvedFirebaseConfig = () => {
  const config = { ...firebaseConfigJson };
  config.authDomain = config.authDomain || "arearnzone.firebaseapp.com";
  return config;
};

export const app = getApps().length > 0 ? getApp() : initializeApp(getResolvedFirebaseConfig());
export const auth = getAuth(app);

// Use robust browser local storage persistence to prevent IndexedDB closing/hidden race conditions
if (typeof window !== "undefined") {
  try {
    setPersistence(auth, browserLocalPersistence).catch(() => {
      setPersistence(auth, inMemoryPersistence).catch(() => {});
    });
  } catch (e) {
    // Non-blocking fallback
  }
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

export default app;


