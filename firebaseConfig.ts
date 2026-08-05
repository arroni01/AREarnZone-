import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import firebaseConfigJson from "./firebase-applet-config.json";

const getResolvedFirebaseConfig = () => {
  const config = { ...firebaseConfigJson };
  config.authDomain = config.authDomain || "arearnzone.firebaseapp.com";
  return config;
};

export const app = getApps().length > 0 ? getApp() : initializeApp(getResolvedFirebaseConfig());
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export default app;

