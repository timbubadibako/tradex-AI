"use client";

import { Home, BarChart2, PieChart, Settings, ShieldCheck, LogOut, Zap, Bell, User, ChevronLeft, Database, History as HistoryIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEventLog, useNeuralCheckpoints } from "@/hooks/useDashboardData";
import { toggleApiNode, getCurrentNode } from "@/lib/constants";

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
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { events } = useEventLog();
  const { checkpoints } = useNeuralCheckpoints();
  const currentNode = getCurrentNode();

  const combinedFeed = [
    ...(Array.isArray(events) ? events.map(e => ({ ...e, feedType: 'EVENT' })) : []),
    ...(Array.isArray(checkpoints) ? checkpoints.map(c => ({ 
       time: c.created_at, 
       message: `Evolution! ${c.coin} ${c.timeframe} MAPE: ${c.new_mape.toFixed(2)}%`, 
       type: 'RECORD',
       feedType: 'CHECKPOINT'
    })) : [])
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-72 h-screen" />;

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isCollapsed ? 100 : 320 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="hidden lg:flex flex-col h-screen sticky top-0 z-[100] p-6 pr-0"
    >
      <div className="flex flex-col h-full bg-[#010413]/80 backdrop-blur-3xl border border-white/5 rounded-2xl shadow-2xl relative">
        
        {/* Glow Effect inside Sidebar */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-0 top-24 w-6 h-12 bg-white/5 border-y border-l border-white/10 rounded-l-xl flex items-center justify-center text-slate-500 hover:text-sky-400 transition-all z-[200]"
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform duration-500", isCollapsed && "rotate-180")} />
        </button>

        <div className={cn("flex items-center gap-3 px-8 pt-12 mb-16", isCollapsed && "px-0 justify-center")}>
          <div className="w-12 h-12 rounded-2xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
            <Zap className="w-7 h-7 text-white fill-white" />
          </div>
          {!isCollapsed && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="font-black text-white leading-none tracking-tighter text-2xl uppercase">Zenith <span className="text-sky-400">AI</span></h2>
              <p className="text-[9px] font-black text-slate-500 tracking-[0.3em] uppercase">Predictive Engine</p>
            </motion.div>
          )}
        </div>

        {/* Node Switcher Toggle */}
        <div className={cn("px-6 mb-12", isCollapsed ? "flex justify-center" : "")}>
          <div className={cn(
            "p-1.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-1",
            isCollapsed ? "w-fit" : "w-full"
          )}>
            <button 
              onClick={() => toggleApiNode('LOCAL')}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all tracking-widest",
                currentNode === 'LOCAL' ? "bg-white/10 text-sky-400 shadow-xl border border-white/10" : "text-slate-600 hover:text-slate-400"
              )}
            >
              {isCollapsed ? 'L' : 'Local'}
            </button>
            <button 
              onClick={() => toggleApiNode('CLOUD')}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all tracking-widest",
                currentNode === 'CLOUD' ? "bg-white/10 text-emerald-400 shadow-xl border border-white/10" : "text-slate-600 hover:text-slate-400"
              )}
            >
              {isCollapsed ? 'C' : 'Cloud'}
            </button>
          </div>
        </div>

        <div className={cn("mb-12 px-8 flex items-center gap-4", isCollapsed && "px-0 justify-center")}>
            <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center shadow-xl overflow-hidden">
                    <User className="w-6 h-6 text-slate-500" />
                </div>
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#010413]" />
            </div>
            {!isCollapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1.5">Master Trader</p>
                    <p className="text-sm font-black text-white truncate tracking-tight uppercase">Jrilym</p>
                </motion.div>
            )}
        </div>

        <nav className="flex-1 space-y-3 px-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "w-full flex items-center transition-all duration-400 rounded-xl group relative",
                  isCollapsed ? "justify-center py-5" : "gap-5 px-6 py-5",
                  isActive 
                    ? "bg-white/[0.04] text-white border border-white/5 shadow-2xl" 
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                {isActive && <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-6 bg-sky-400 rounded-r-full" />}
                <item.icon className={cn("w-5 h-5 shrink-0 transition-transform", isActive ? "text-sky-400 scale-110" : "group-hover:text-sky-400 group-hover:scale-110")} />
                {!isCollapsed && <span className="text-[13px] font-bold tracking-tight uppercase">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5 px-4 pb-10 space-y-3 relative">
            <button 
                onClick={() => setShowNotifs(!showNotifs)}
                className={cn(
                "w-full flex items-center rounded-xl text-slate-500 hover:text-sky-400 transition-all relative z-[150]",
                isCollapsed ? "justify-center py-5" : "gap-5 px-6 py-5",
                showNotifs && "bg-white/[0.02] text-sky-400"
            )}>
                <div className="relative">
                    <Bell className="w-5 h-5 shrink-0" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" />
                </div>
                {!isCollapsed && <span className="text-[11px] font-black uppercase tracking-widest">Alert Center</span>}
            </button>

            {/* Alert Center Popover (Dark Glass) */}
            <AnimatePresence>
                {showNotifs && (
                    <motion.div 
                        initial={{ opacity: 0, x: 20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        className="fixed left-[320px] bottom-10 w-[420px] bg-[#020617]/95 backdrop-blur-3xl border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.8)] rounded-3xl z-[300] p-10 overflow-hidden"
                    >
                        <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-6">
                            <h4 className="text-[12px] font-black text-white uppercase tracking-[0.4em]">Neural Core Logs</h4>
                            <span className="flex items-center gap-2 text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em]">
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Sync
                            </span>
                        </div>
                        <div className="space-y-8 max-h-[500px] overflow-y-auto no-scrollbar pr-2">
                            {combinedFeed.length === 0 ? (
                                <p className="text-[10px] text-slate-700 italic text-center py-32 uppercase tracking-[0.3em]">Waiting for neural synapse activity...</p>
                            ) : combinedFeed.map((ev: any, i: number) => (
                                <div key={i} className="flex flex-col gap-3 p-6 rounded-2xl bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] transition-all group/log">
                                    <div className="flex items-center justify-between opacity-30 group-hover/log:opacity-100 transition-opacity">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]", ev.type === 'ERROR' ? 'text-rose-500 bg-rose-500' : 'text-emerald-500 bg-emerald-500')} />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{new Date(ev.time).toLocaleTimeString('id-ID')}</span>
                                        </div>
                                        <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest">{ev.feedType}</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-300 leading-relaxed uppercase tracking-tight">{ev.message}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button className={cn(
                "w-full flex items-center text-slate-600 hover:text-rose-500 transition-all rounded-xl",
                isCollapsed ? "justify-center py-5" : "gap-5 px-6 py-5"
            )}>
                <LogOut className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span className="text-[11px] font-black uppercase tracking-widest">System Logout</span>}
            </button>
        </div>
      </div>
    </motion.aside>
  );
}
