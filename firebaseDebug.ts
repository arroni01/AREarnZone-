import firebaseConfig from "./firebase-applet-config.json";
import { auth, googleProvider } from "./firebase";

export function logFirebaseDebugSequence(): void {
  console.group("[Firebase Initialization & Auth Debug Sequence]");
  console.log("1. Raw Firebase Config from JSON:", firebaseConfig);
  console.log("2. Auth instance initialized:", auth);
  console.log("2a. Auth App instance:", auth?.app);
  console.log("2b. Auth App options:", auth?.app?.options);
  console.log("2c. Auth currentUser:", auth?.currentUser);

  console.log("3. Exported googleProvider instance:", googleProvider);
  console.groupEnd();
}
