import { auth, googleProvider } from "./firebase";

export function runAuthDiagnostics(): void {
  console.group("[Auth Diagnostics Check]");
  console.log("1. auth instance:", auth);
  console.log("1a. auth constructor name:", auth?.constructor?.name);
  console.log("1b. auth.app connected:", auth?.app);
  console.log("1c. auth.app name:", auth?.app?.name);
  console.log("1d. auth.currentUser:", auth?.currentUser);

  console.log("2. googleProvider instance:", googleProvider);
  console.log("2a. googleProvider constructor name:", googleProvider?.constructor?.name);
  console.log("2b. googleProvider providerId:", googleProvider?.providerId);
  console.groupEnd();
}
