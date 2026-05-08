import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import { ZeltaProvider } from "@/context/zeltaContext";
import OnboardingOverlay from "@/components/OnboardingOverlay";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ZeltaProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="flex min-h-screen">

          {/* Desktop left sidebar */}
          <div className="hidden lg:flex w-56 xl:w-60 shrink-0 flex-col border-r border-gray-100 bg-white">
            <div className="sticky top-0 h-screen overflow-y-auto">
              <Sidebar />
            </div>
          </div>

          {/* Main column */}
          <div className="flex flex-1 flex-col min-w-0">
            <DashboardHeader />
            {/* pb-20 on mobile = space above fixed bottom nav */}
            <main className="flex-1 p-4 pb-20 lg:pb-8 lg:p-6">
              {children}
            </main>
          </div>

        </div>

        {/* Mobile bottom bar — rendered once by Sidebar (lg:hidden inside it) */}
        <Sidebar />
        <OnboardingOverlay />

      </div>
    </ZeltaProvider>
  );
}