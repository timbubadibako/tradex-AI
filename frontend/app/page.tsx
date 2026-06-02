"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, Wallet, BarChart3, BrainCircuit, Target, Zap, Clock, ArrowUpRight, ArrowDownRight, History, ShieldCheck, CheckCircle2, XCircle, AlertTriangle
} from "lucide-react";
import { useState } from "react";
import GlassCard from "@/components/dashboard/GlassCard";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAllAssetsStatus, useEventLog } from "@/hooks/useDashboardData";
import Link from "next/link";

export default function OverviewDashboard() {
  const { allStatus, isLoading: statusLoading } = useAllAssetsStatus();
  const { events, isLoading: eventsLoading } = useEventLog();

  const coins = ['BTC', 'ETH', 'SOL'];
  
  const totalEquity = Object.values(allStatus).reduce((sum: number, s: any) => sum + (s.equity || 0), 0);
  const avgMape = Object.values(allStatus).reduce((sum: number, s: any) => sum + ((s.mape_1h + s.mape_5m) / 2 || 0), 0) / (coins.length || 1);

  const renderDashboard = () => (
    <div className="flex flex-col gap-10 pb-32">
      
      {/* HEADER SECTION: GLOBAL SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <GlassCard className="bg-gradient-to-br from-sky-500 to-sky-600 border-none text-white p-10 shadow-2xl" delay={0.1}>
            <div className="flex items-center gap-3 mb-8 opacity-80"><Wallet className="w-6 h-6" /><h3 className="font-black text-xs uppercase tracking-widest leading-none">Global Assets</h3></div>
            <p className="text-xs font-bold opacity-70 uppercase mb-2 leading-none">Total Pooled Equity</p>
            <h2 className="text-5xl font-black tracking-tighter leading-none">Rp {(totalEquity || 0).toLocaleString('id-ID')}</h2>
            <div className="mt-8 flex items-center gap-2 text-sky-100 bg-white/10 w-fit px-4 py-2 rounded-full border border-white/10 shadow-sm">
               <ArrowUpRight className="w-4 h-4 text-emerald-300" />
               <span className="text-[10px] font-black uppercase tracking-widest">+2.4% Neural Growth</span>
            </div>
         </GlassCard>

         <GlassCard className="p-10 border-white shadow-xl flex flex-col justify-center bg-white/80" delay={0.15}>
            <div className="flex items-center gap-3 mb-8 text-purple-500"><BrainCircuit className="w-8 h-8" /><h3 className="font-black text-xs uppercase tracking-widest leading-none">Neural Health</h3></div>
            <p className="text-xs font-black text-slate-400 uppercase mb-2 leading-none">Aggregated System Error</p>
            <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">{(avgMape || 0).toFixed(2)}% <span className="text-sm font-bold text-slate-400">MAPE</span></h2>
            <div className="mt-6 flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
               System Integrity: Optimal
            </div>
         </GlassCard>

         <GlassCard className="p-10 border-white shadow-xl flex flex-col justify-center bg-white/80" delay={0.2}>
            <div className="flex items-center gap-3 mb-8 text-emerald-500"><Activity className="w-8 h-8" /><h3 className="font-black text-xs uppercase tracking-widest leading-none">Factory Activity</h3></div>
            <div className="flex items-end gap-3 mb-6">
                <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">6</h2>
                <p className="text-sm font-black text-slate-400 uppercase mb-1 leading-none tracking-widest">Active Neural Workers</p>
            </div>
            <div className="flex gap-1.5 items-end h-10">
                {[0,1,2,3,4,5,6,7,8,9].map(i => (
                    <motion.div key={i} animate={{ height: [15, 40, 20, 35, 15] }} transition={{ repeat: Infinity, duration: 1.5, delay: i*0.1 }} className="flex-1 bg-emerald-400/40 rounded-full border border-emerald-400/10" />
                ))}
            </div>
         </GlassCard>
      </div>

      {/* CENTER SECTION: 6-MODEL MAPE GRID & TIMELINE FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        
        {/* Left: 6-Model Precision Matrix (3/4) */}
        <div className="lg:col-span-3 space-y-8">
          <div className="flex items-center justify-between px-4">
             <h3 className="font-black text-slate-800 text-sm uppercase tracking-[0.3em]">Neural Precision Matrix</h3>
             <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest">Across All Timeframes</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {coins.map((coin, idx) => {
              const data = allStatus[coin] || {};
              return (
                <div key={coin} className="flex flex-col gap-10">
                   {/* 1H Model Card */}
                   <Link href={`/market?coin=${coin}&tf=1h`}>
                     <GlassCard className="p-8 border-white shadow-sm hover:shadow-2xl transition-all group cursor-pointer bg-white/70" delay={0.2 + idx * 0.1}>
                        <div className="flex justify-between items-start mb-6">
                           <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-sky-500 group-hover:text-white transition-all shadow-sm"><Target className="w-7 h-7" /></div>
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">1H MACRO</span>
                        </div>
                        <h4 className="text-3xl font-black text-slate-900 mb-3 tracking-tighter uppercase">{coin}/IDR</h4>
                        <div className="flex items-center gap-3 mb-6">
                           <div className="flex-1 h-2 bg-slate-100/50 rounded-full overflow-hidden border border-white">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(10, 100 - (data.mape_1h || 0) * 10)}%` }} className="h-full bg-sky-500 shadow-sm shadow-sky-100" />
                           </div>
                           <span className="text-sm font-black text-sky-600">{(data.mape_1h || 0).toFixed(2)}%</span>
                        </div>
                        
                        <div className="mb-6 flex items-center justify-between bg-white/40 p-3 rounded-2xl border border-white/60 shadow-inner">
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live Gap</span>
                           <div className="flex items-center gap-2">
                              <span className={`text-xs font-black ${data.gap_idr_1h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                 {data.gap_idr_1h >= 0 ? '+' : '-'}Rp {Math.abs(data.gap_idr_1h || 0).toLocaleString('id-ID')}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">({(data.gap_pct_1h || 0).toFixed(2)}%)</span>
                           </div>
                        </div>

                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-sky-500 transition-colors flex items-center gap-2">Analyze Market Patterns →</p>
                     </GlassCard>
                   </Link>

                   {/* 5M Model Card */}
                   <Link href={`/market?coin=${coin}&tf=5m`}>
                     <GlassCard className="p-8 border-white shadow-sm hover:shadow-2xl transition-all group cursor-pointer bg-white/70" delay={0.3 + idx * 0.1}>
                        <div className="flex justify-between items-start mb-6">
                           <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm"><Zap className="w-7 h-7" /></div>
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">5M MICRO</span>
                        </div>
                        <h4 className="text-3xl font-black text-slate-900 mb-3 tracking-tighter uppercase">{coin}/IDR</h4>
                        <div className="flex items-center gap-3 mb-6">
                           <div className="flex-1 h-2 bg-slate-100/50 rounded-full overflow-hidden border border-white">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(10, 100 - (data.mape_5m || 0) * 10)}%` }} className="h-full bg-emerald-500 shadow-sm shadow-emerald-100" />
                           </div>
                           <span className="text-sm font-black text-emerald-600">{(data.mape_5m || 0).toFixed(2)}%</span>
                        </div>

                        <div className="mb-6 flex items-center justify-between bg-white/40 p-3 rounded-2xl border border-white/60 shadow-inner">
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live Gap</span>
                           <div className="flex items-center gap-2">
                              <span className={`text-xs font-black ${data.gap_idr_5m >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                 {data.gap_idr_5m >= 0 ? '+' : '-'}Rp {Math.abs(data.gap_idr_5m || 0).toLocaleString('id-ID')}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">({(data.gap_pct_5m || 0).toFixed(2)}%)</span>
                           </div>
                        </div>

                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-emerald-500 transition-colors flex items-center gap-2">Start Scalping Engine →</p>
                     </GlassCard>
                   </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Evolutionary Timeline Feed (1/4) */}
        <div className="space-y-6">
           <div className="flex items-center gap-3 px-4">
              <Clock className="w-7 h-7 text-sky-500" />
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-[0.3em]">Learning Feed</h3>
           </div>
           <GlassCard className="flex-1 flex flex-col min-h-[500px] border-white/80 shadow-xl overflow-hidden bg-white/90" delay={0.4}>
              <div className="space-y-10 overflow-y-auto no-scrollbar max-h-[670px] p-6">
                 {events.length === 0 ? (
                    <div className="py-24 text-center text-slate-300 italic text-sm uppercase tracking-[0.2em]">Waiting for neural breakthroughs...</div>
                 ) : events.map((ev: any, i: number) => (
                    <div key={i} className="relative pl-10 border-l-2 border-slate-100 pb-2 group">
                       <div className="absolute -left-[11px] top-0 w-5 h-5 rounded-full bg-white border-4 border-sky-500 shadow-md group-hover:scale-125 transition-transform duration-300" />
                       <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2 opacity-60">
                             <History className="w-3.5 h-3.5" />
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{new Date(ev.time).toLocaleTimeString('id-ID')}</span>
                          </div>
                          <p className="text-sm font-black text-slate-800 leading-tight tracking-tight uppercase">{ev.message}</p>
                          {ev.type === 'RECORD' && (
                             <div className="mt-2 inline-flex items-center gap-2 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 w-fit shadow-sm">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">Knowledge Optimized</span>
                             </div>
                          )}
                       </div>
                    </div>
                 ))}
              </div>
           </GlassCard>
        </div>
      </div>

    </div>
  );

  return (
    <div className="flex min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-sky-50 via-white to-sky-100 font-sans selection:bg-sky-100">
      <Sidebar />
      <main className="flex-1 flex flex-col p-12 md:p-20">
        <div className="mx-auto max-w-[1800px] w-full">
          <AnimatePresence mode="wait">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.3 }}>
              {renderDashboard()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @font-face { font-family: 'Geist'; src: url('https://cdn.jsdelivr.net/font/geist/Geist-Black.woff2'); }
      `}</style>
    </div>
  );
}
