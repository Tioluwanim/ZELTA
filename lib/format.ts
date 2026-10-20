export const naira = (n: number | null | undefined) =>
  n == null || Number.isNaN(n) ? "Unknown" : `₦${Math.round(n).toLocaleString("en-NG")}`;
export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
export const titleCase = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
