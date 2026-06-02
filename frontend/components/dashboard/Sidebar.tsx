"use client";

import { Home, BarChart2, PieChart, Settings, ShieldCheck, LogOut, Zap, Bell, User, ChevronLeft, Database, History as HistoryIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEventLog } from "@/hooks/useDashboardData";

const menuItems = [
  { icon: Home, label: "Dashboard", href: "/" },
  { icon: BarChart2, label: "Market", href: "/market" },
  { icon: PieChart, label: "Portfolio", href: "/portfolio" },
  { icon: ShieldCheck, label: "AI Safety", href: "/safety" },
  { icon: Database, label: "Management", href: "/bot-management" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const pathname = usePathname();
  const { events } = useEventLog();

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isCollapsed ? 100 : 280 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="hidden lg:flex flex-col h-screen sticky top-0 z-[100] p-6 pr-0"
    >
      <div className="flex flex-col h-full bg-white/80 backdrop-blur-3xl border border-white rounded-l-[40px] rounded-r-[10px] shadow-2xl shadow-sky-100/40 relative">
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-0 top-24 w-6 h-12 bg-white border border-slate-100 rounded-l-xl flex items-center justify-center text-slate-400 hover:text-sky-500 transition-all z-20 shadow-sm"
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform duration-500", isCollapsed && "rotate-180")} />
        </button>

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

        <div className="mt-auto pt-6 border-t border-slate-50 px-3 pb-8 space-y-2 text-[9px] font-black uppercase tracking-widest relative">
            <button 
                onClick={() => setShowNotifs(!showNotifs)}
                className={cn(
                "w-full flex items-center rounded-[20px] text-slate-400 hover:text-sky-500 hover:bg-slate-50 transition-all",
                isCollapsed ? "justify-center py-4" : "gap-4 px-4 py-4",
                showNotifs && "bg-slate-50 text-sky-500"
            )}>
                <div className="relative">
                    <Bell className="w-5 h-5 shrink-0" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-white" />
                </div>
                {!isCollapsed && <span>Alert Center</span>}
            </button>

            {/* Alert Center Popover */}
            <AnimatePresence>
                {showNotifs && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full left-4 mb-4 w-[340px] bg-white/90 backdrop-blur-2xl border border-white shadow-2xl rounded-[32px] z-50 p-6 overflow-hidden"
                    >
                        <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">System Audit Feed</h4>
                            <span className="text-[9px] font-bold text-slate-400">Live Logs</span>
                        </div>
                        <div className="space-y-0 max-h-80 overflow-y-auto no-scrollbar pr-1 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                            {events.length === 0 ? (
                                <p className="text-[10px] text-slate-300 italic text-center py-10 uppercase tracking-widest relative z-10 bg-white/50 backdrop-blur-sm w-fit mx-auto px-4 rounded-full">No activity detected</p>
                            ) : events.slice().reverse().map((ev: any, i: number) => (
                                <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                    <div className={`flex items-center justify-center w-6 h-6 rounded-full border-4 border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm relative z-10 ${ev.type === 'ERROR' || ev.type === 'WARNING' ? 'bg-amber-500' : ev.type === 'RECORD' ? 'bg-emerald-500' : 'bg-sky-500'}`}>
                                        <div className="w-1 h-1 bg-white rounded-full" />
                                    </div>
                                    <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] py-3 pl-4 md:pl-0 md:group-odd:pr-4 md:group-even:pl-4">
                                        <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-white/60 border border-slate-100/50 shadow-sm group-hover:bg-white group-hover:shadow-md transition-all">
                                            <div className="flex items-center gap-2">
                                                <HistoryIcon className="w-3 h-3 text-slate-400" />
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{new Date(ev.time).toLocaleTimeString('id-ID')}</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-700 leading-snug uppercase tracking-tight break-words">{ev.message}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

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
