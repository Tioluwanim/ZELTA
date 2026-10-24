export const naira = (n: number | null | undefined) =>
  n == null || Number.isNaN(n) ? "Unknown" : `₦${Math.round(n).toLocaleString("en-NG")}`;
export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
export const titleCase = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
export const kobo = (m: { minor: number } | null | undefined) => (m == null ? "Unknown" : naira(m.minor / 100));
export const longDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" }) : "Unknown";
