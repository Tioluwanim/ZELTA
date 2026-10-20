export const API_URL = (process.env.API_URL ?? "").replace(/\/$/, "");
/** Sample-data mode: no backend, no login. Always labelled in the UI. */
export const DEMO = process.env.DEMO === "1";

export const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY ?? "",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.FIREBASE_PROJECT_ID ?? "",
  appId: process.env.FIREBASE_APP_ID ?? "",
};
