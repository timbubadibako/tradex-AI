"use client";

import { Home, BarChart2, PieChart, Settings, ShieldCheck, LogOut, Zap, Bell, User, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { icon: Home, label: "Dashboard", href: "/" },
  { icon: BarChart2, label: "Market", href: "/market" },
  { icon: PieChart, label: "Portfolio", href: "/portfolio" },
  { icon: ShieldCheck, label: "AI Safety", href: "/safety" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isCollapsed ? 100 : 280 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="hidden lg:flex flex-col h-screen sticky top-0 z-50 p-6 pr-0"
    >
      <div className="flex flex-col h-full bg-white/80 backdrop-blur-3xl border border-white rounded-l-[40px] rounded-r-[10px] shadow-2xl shadow-sky-100/40 relative overflow-hidden">
        
        {/* Collapse Toggle Button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-0 top-24 w-6 h-12 bg-white border border-slate-100 rounded-l-xl flex items-center justify-center text-slate-400 hover:text-sky-500 transition-all z-20 shadow-sm"
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform duration-500", isCollapsed && "rotate-180")} />
        </button>

        {/* Brand Section */}
        <div className={cn("flex items-center gap-3 px-6 pt-10 mb-12", isCollapsed && "px-0 justify-center")}>
          <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-200 shrink-0">
            <Zap className="w-6 h-6 text-white fill-white" />
          </div>
          {!isCollapsed && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="font-black text-slate-900 leading-none tracking-tighter text-xl uppercase">Tradex</h2>
              <p className="text-[10px] font-black text-sky-500 tracking-[0.2em] uppercase">AI Factory</p>
            </motion.div>
          )}
        </div>

        {/* User Account */}
        <div className={cn("mb-10 px-6 flex items-center gap-4", isCollapsed && "px-0 justify-center")}>
            <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-white flex items-center justify-center shadow-sm overflow-hidden">
                    <User className="w-6 h-6 text-slate-400" />
                </div>
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
            </div>
            {!isCollapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Master Trader</p>
                    <p className="text-sm font-black text-slate-800 truncate tracking-tight uppercase">Jrilym</p>
                </motion.div>
            )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 space-y-2 px-3">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "w-full flex items-center transition-all duration-300 rounded-[20px] group",
                  isCollapsed ? "justify-center py-4" : "gap-4 px-4 py-4",
                  isActive 
                    ? "bg-sky-500 text-white shadow-xl shadow-sky-100" 
                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0 transition-transform", isActive ? "scale-110" : "group-hover:scale-110")} />
                {!isCollapsed && <span className="text-sm font-bold tracking-tight">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="mt-auto pt-6 border-t border-slate-50 px-3 pb-8 space-y-2 text-[9px] font-black uppercase tracking-widest">
            <button className={cn(
                "w-full flex items-center rounded-[20px] text-slate-400 hover:text-sky-500 hover:bg-slate-50 transition-all",
                isCollapsed ? "justify-center py-4" : "gap-4 px-4 py-4"
            )}>
                <div className="relative">
                    <Bell className="w-5 h-5 shrink-0" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-white" />
                </div>
                {!isCollapsed && <span>Alert Center</span>}
            </button>
            <button className={cn(
                "w-full flex items-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all rounded-[20px]",
                isCollapsed ? "justify-center py-4" : "gap-4 px-4 py-4"
            )}>
                <LogOut className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span>System Logout</span>}
            </button>
        </div>
      </div>
    </motion.aside>
  );
}
