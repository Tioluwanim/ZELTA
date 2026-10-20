"use client";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Briefcase, LayoutDashboard, MessageCircle, Route, User } from "lucide-react";
import Zel from "@/components/Zel";
import { Button, Notice, Skeleton } from "@/components/ui";
import { ProfileCtx } from "@/components/ProfileContext";
import { api } from "@/lib/api";
import { DEMO } from "@/lib/config";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/useApi";

const TABS = [
  { href: "/path", label: "Path", Icon: Route },
  { href: "/twin", label: "Twin", Icon: LayoutDashboard },
  { href: "/coach", label: "Coach", Icon: MessageCircle },
  { href: "/earn", label: "Earn", Icon: Briefcase },
  { href: "/me", label: "Me", Icon: User },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const profile = useApi(() => api.profile(), [user?.email]);
  useEffect(() => { if (ready && !user) router.replace("/auth"); }, [ready, user, router]);
  const needsOnboarding = profile.data && !profile.data.preferences.primary_goal;
  useEffect(() => { if (needsOnboarding) router.replace("/onboarding"); }, [needsOnboarding, router]);

  if (!ready || !user || profile.loading) {
    return <main className="mx-auto max-w-xl space-y-4 p-6"><Skeleton className="h-24" /><Skeleton className="h-64" /></main>;
  }
  if (profile.error || !profile.data) {
    return <main className="mx-auto max-w-xl p-6"><Notice title="Can't load your account" action={<Button onClick={profile.reload}>Try again</Button>}>{profile.error}</Notice></main>;
  }
  return (
    <ProfileCtx.Provider value={{ profile: profile.data, refresh: profile.reload }}>
      <div className="mx-auto flex min-h-dvh max-w-6xl">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-2 border-r-2 border-line p-5 md:flex">
          <div className="mb-4 flex items-center gap-2"><Zel size={44} /><span className="font-display text-2xl font-bold text-indigo">ZELTA</span></div>
          {TABS.map(({ href, label, Icon }) => {
            const on = pathname.startsWith(href);
            return <Link key={href} href={href} aria-current={on ? "page" : undefined}
              className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 font-display text-lg font-semibold ${on ? "bg-indigo-tint text-indigo ring-2 ring-indigo/30" : "text-soft hover:bg-line/50"}`}><Icon size={22} />{label}</Link>;
          })}
        </aside>
        <div className="min-w-0 flex-1 pb-28 md:pb-10" style={{ "--top": DEMO ? "2.25rem" : "0px" } as React.CSSProperties}>
          {DEMO && <p className="bg-danfo-tint px-4 py-2 text-center text-sm font-semibold">Sample data. Nothing here is your real money.</p>}
          {children}
        </div>
      </div>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t-2 border-line bg-paper px-2 pb-[env(safe-area-inset-bottom)] md:hidden">
        {TABS.map(({ href, label, Icon }) => {
          const on = pathname.startsWith(href);
          return <Link key={href} href={href} aria-current={on ? "page" : undefined}
            className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-bold ${on ? "text-indigo" : "text-soft"}`}>
            <span className={`grid h-9 w-12 place-items-center rounded-xl ${on ? "bg-indigo-tint" : ""}`}><Icon size={22} /></span>{label}</Link>;
        })}
      </nav>
    </ProfileCtx.Provider>
  );
}
