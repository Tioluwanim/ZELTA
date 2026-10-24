import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["192.168.137.1"],

  // Map existing Vercel variables to browser-accessible names.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_API_URL ?? "",
    NEXT_PUBLIC_DEV_BEARER: process.env.NEXT_DEV_BEARER ?? "",
    NEXT_PUBLIC_DEMO: process.env.NEXT_DEMO ?? "0",

    NEXT_PUBLIC_FIREBASE_API_KEY:
      process.env.NEXT_FIREBASE_API_KEY ?? "",

    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.NEXT_FIREBASE_AUTH_DOMAIN ?? "",

    NEXT_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.NEXT_FIREBASE_PROJECT_ID ?? "",

    NEXT_PUBLIC_FIREBASE_APP_ID:
      process.env.NEXT_FIREBASE_APP_ID ?? "",
  },
};

export default nextConfig;
