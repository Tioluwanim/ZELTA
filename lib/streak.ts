"use client";
import { useEffect, useSyncExternalStore } from "react";
// Check-in streak: counts days the user opened ZELTA. Stored on this device only. It never involves moving money.
const KEY = "zelta.checkins";
const ASKED = "zelta.asked";
const day = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function readDays(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
export function streakLength(days: string[]): number {
  const set = new Set(days);
  let n = 0;
  const d = new Date();
  if (!set.has(day(d))) d.setDate(d.getDate() - 1);
  while (set.has(day(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function record() {
  const days = new Set(readDays());
  if (days.has(day())) return;
  days.add(day());
  try { localStorage.setItem(KEY, JSON.stringify([...days].sort().slice(-60))); } catch { /* storage blocked */ }
  emit();
}
export function markAsked() {
  try { localStorage.setItem(ASKED, "1"); } catch { /* storage blocked */ }
  emit();
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const snapshot = () => { try { return `${localStorage.getItem(KEY) ?? "[]"}|${localStorage.getItem(ASKED) ?? ""}`; } catch { return "[]|"; } };

/** Records today's check-in once and returns the current streak and whether the user has asked the coach. */
export function useCheckIn(): { streak: number; asked: boolean } {
  const snap = useSyncExternalStore(subscribe, snapshot, () => "[]|");
  useEffect(() => { record(); }, []);
  const [days, asked] = snap.split("|");
  let parsed: string[] = [];
  try { parsed = JSON.parse(days); } catch { /* ignore */ }
  return { streak: streakLength(parsed), asked: asked === "1" };
}
