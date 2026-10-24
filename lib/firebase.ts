import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { firebaseConfig } from "./config";

export function firebaseReady(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}
let app: FirebaseApp | null = null;
export function auth(): Auth {
  if (!firebaseReady()) throw new Error("Sign-in is not configured. Set the NEXT_FIREBASE_* variables.");
  app ??= getApps()[0] ?? initializeApp(firebaseConfig);
  return getAuth(app);
}
