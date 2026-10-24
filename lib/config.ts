export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? ""
).replace(/\/$/, "");

/** Sample-data mode: no backend, no login. */
export const DEMO = process.env.NEXT_PUBLIC_DEMO === "1";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

/** Local integration testing only: send this as the Bearer token and skip sign-in. Honoured only when API_URL points at this machine. */
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(API_URL);
export const DEV_BEARER = LOCAL ? (process.env.NEXT_PUBLIC_DEV_BEARER ?? "") : "";
