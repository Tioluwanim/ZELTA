"use client";
import Link from "next/link";
import {
  Home,
  Wallet,
  Brain,
  Sparkles,
  MessageSquare,
  User,
  History,
} from "lucide-react";
import { usePathname } from "next/navigation";

const navItems = [
  {
    icon: <Home className="stroke-2 lg:stroke-1 size-6" />,
    label: "Home",
    href: "/dashboard",
  },
  {
    icon: <Wallet className="stroke-2 lg:stroke-1 size-6" />,
    label: "Wallet",
    href: "/dashboard/wallet",
  },
  {
    icon: <Brain className="stroke-2 lg:stroke-1 size-6" />,
    label: "Behavioral",
    href: "/dashboard/behavioral",
  },
  {
    icon: <Sparkles className="stroke-2 lg:stroke-1 size-6" />,
    label: "Simulation",
    href: "/dashboard/simulations",
  },
  {
    icon: <MessageSquare className="stroke-2 lg:stroke-1 size-6" />,
    label: "Co-Pilot",
    href: "/dashboard/co-pilot",
  },
  {
    icon: <History className="stroke-2 lg:stroke-1 size-6" />,
    label: "History",
    href: "/dashboard/history",
  },
  {
    icon: <User className="stroke-2 lg:stroke-1 size-6" />,
    label: "Profile",
    href: "/dashboard/profile",
  },
];

export default function Sidebar() {
  const pathName = usePathname();
  // const mobileNavigationWithoutProfileAndHistortyTab = navItems.filter(
  //   (item, index) => index < 5,
  // );
  return (
    <aside className="flex flex-col lg:h-full lg:justify-between lg:p-6 pb-0 fixed left-0 bottom-0 w-full lg:bottom-auto lg:w-64 lg:top-0 overflow-hidden z-1000">
      <div className="">
        <div className="mb-8 px-2 hidden lg:block">
          <p className="text-2xl font-bold text-green-600">ZELTA</p>
          <p className="text-sm text-slate-500">Financial Intelligence</p>
        </div>

        <nav className="lg:space-y-2 flex bg-white lg:bg-transparent justify-center items-center sm:gap-8 md:gap-8 lg:block lg:p-0 p-2  ">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`rounded-2xl px-3 py-3 text-md font-bold transition flex flex-col lg:flex-row gap-2  lg:gap-4 items-center ${pathName === item.href || (item.href !== "/dashboard" && pathName.startsWith(item.href)) ? "bg-[#10b981] text-white" : "hover:bg-gray-100"}     `}
            >
              <span>{item.icon}</span>
              <span className="text-[10px] lg:hidden">{item.label}</span>
              <span className="hidden lg:block text-[15px]">{item.label} </span>
            </Link>
          ))}
        </nav>
      </div>

      <div className=" hidden lg:block rounded-2xl border border-slate-200 bg-green-50 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Dashboard info</p>
        <p className="mt-2 text-slate-600">
          Use the sidebar to switch sections. The right side renders selected
          dashboard content.
        </p>
      </div>
    </aside>
  );
}