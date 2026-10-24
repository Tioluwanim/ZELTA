"use client";
import { createContext, useContext } from "react";
import type { UserProfile } from "@/lib/types";

interface P { profile: UserProfile; refresh: () => void }
export const ProfileCtx = createContext<P | null>(null);
export const useProfile = () => {
  const v = useContext(ProfileCtx);
  if (!v) throw new Error("useProfile outside shell");
  return v;
};
