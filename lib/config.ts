export const API_URL = (process.env.NEXT_API_URL ?? "").replace(/\/$/, "");
/** Sample-data mode: no backend, no login. Always labelled in the UI. */
export const DEMO = process.env.NEXT_DEMO === "1";

export const firebaseConfig = {
  apiKey: process.env.NEXT_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_FIREBASE_PROJECT_ID ?? "",
  appId: process.env.NEXT_FIREBASE_APP_ID ?? "",
};
