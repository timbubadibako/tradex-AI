"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
   Activity, Wallet, BrainCircuit, Target, Zap, Clock, History as HistoryIcon
} from "lucide-react";
import { useState, useEffect } from "react";
import GlassCard from "@/components/dashboard/GlassCard";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAllAssetsStatus, useEventLog, useBotStatus, useMarketData, useUnifiedTrades, useNeuralCheckpoints } from "@/hooks/useDashboardData";
import Link from "next/link";

export default function OverviewDashboard() {
   const { allStatus, totalNetPnl, dailyTarget, manualConfig, cashBalance } = useAllAssetsStatus();
   const { status } = useBotStatus();
   const { marketData, prediction } = useMarketData();
   const { trades } = useUnifiedTrades();
   const { checkpoints } = useNeuralCheckpoints();
   const { events } = useEventLog();
   
   const [prevStatus, setPrevStatus] = useState<any>({});
   const [pulses, setPulses] = useState<Record<string, boolean>>({});

   const coins = ['BTC', 'ETH', 'SOL'];
   const currentPrice = marketData && marketData.length > 0 ? marketData[marketData.length - 1].close : 0;
   const predictedPrice = prediction?.price ?? 0;
   const targetGapIdr = predictedPrice > 0 && currentPrice > 0 ? predictedPrice - currentPrice : 0;
   const targetGapPct = currentPrice > 0 ? (targetGapIdr / currentPrice) * 100 : 0;

   const avgMape = Object.values(allStatus || {}).reduce((sum: number, s: any) => sum + (((s?.mape_1h || 0) + (s?.mape_5m || 0)) / 2), 0) / (coins.length || 1);
   const activePositionsCount = Object.values(allStatus || {}).filter((s: any) => Math.abs((s?.btc_holdings || 0) - 0.5) > 0.00000001).length;

   useEffect(() => {
      const newPulses: Record<string, boolean> = {};
      let changed = false;

      coins.forEach(c => {
         if (allStatus[c] && prevStatus[c]) {
            if (allStatus[c].net_pnl !== prevStatus[c].net_pnl || allStatus[c].obi !== prevStatus[c].obi) {
               newPulses[c] = true;
               changed = true;
            }
         }
      });

      if (changed) {
         setPulses(newPulses);
         setPrevStatus(allStatus);
         const timer = setTimeout(() => setPulses({}), 300);
         return () => clearTimeout(timer);
      }
   }, [allStatus]);

   // COMBINE EVENTS AND CHECKPOINTS FOR FEED
   const combinedFeed = [
      ...(Array.isArray(events) ? events.map(e => ({ ...e, feedType: 'EVENT' })) : []),
      ...(Array.isArray(checkpoints) ? checkpoints.map(c => ({ 
         time: c.created_at, 
         message: `Model Evolved! ${c.coin} ${c.timeframe} Accuracy: ${c.new_mape.toFixed(2)}%`, 
         type: 'RECORD',
         feedType: 'CHECKPOINT'
      })) : [])
   ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 20);

   const renderDashboard = () => (
      <div className="flex flex-col gap-10 pb-32">

         {/* HEADER SECTION: FINANCIAL SNAPSHOT */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Sniper Projection (Card 1) */}
            <GlassCard className="bg-gradient-to-br from-slate-800 to-slate-900 border-none text-white p-10 shadow-2xl h-full flex flex-col justify-center relative overflow-hidden group" delay={0.1}>
               <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl group-hover:bg-sky-500/20 transition-all duration-700" />
               <div className="flex items-center gap-3 mb-8 opacity-80 relative z-10"><Target className="w-6 h-6 text-sky-400" /><h3 className="font-black text-xs uppercase tracking-widest leading-none">Sniper Projection</h3></div>
               <h2 className="text-4xl lg:text-5xl font-black tracking-tighter leading-none mb-6 relative z-10">
                  Rp {predictedPrice > 0 ? Math.round(predictedPrice).toLocaleString('id-ID') : (0).toLocaleString('id-ID')}
               </h2>
               <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest relative z-10">
                  <span className={`px-3 py-1 rounded-full bg-white/10 ${targetGapIdr >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                     {targetGapIdr >= 0 ? '+' : ''}{targetGapPct.toFixed(2)}% GAP
                  </span>
                  <span className="text-slate-400">TARGET: {status?.coin || 'BTC'}</span>
               </div>
            </GlassCard>

            <GlassCard className="p-10 border-white shadow-xl flex flex-col justify-center bg-white/80 backdrop-blur-xl h-full" delay={0.15}>
               <div className="flex items-center gap-3 mb-8 text-emerald-500"><Activity className="w-6 h-6" /><h3 className="font-black text-xs uppercase tracking-widest leading-none">Daily Profit</h3></div>
               <div className="flex items-end gap-3 mb-2">
                  <h2 className={`text-4xl lg:text-5xl font-black tracking-tighter leading-none ${totalNetPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                     {totalNetPnl >= 0 ? '+' : '-'}Rp {Math.abs(totalNetPnl || 0).toLocaleString('id-ID')}
                  </h2>
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mt-4">
                  Target: <span className="text-slate-800">Rp {dailyTarget.toLocaleString('id-ID')}</span> / Day
               </p>
            </GlassCard>

            <GlassCard className="p-10 border-white shadow-xl flex flex-col justify-center bg-white/80 backdrop-blur-xl h-full" delay={0.2}>
               <div className="flex items-center gap-3 mb-8 text-purple-500"><BrainCircuit className="w-6 h-6" /><h3 className="font-black text-xs uppercase tracking-widest leading-none">Neural Health</h3></div>
               <div className="flex items-end gap-3 mb-6">
                  <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-none">{(avgMape || 0).toFixed(2)}%</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1 leading-none tracking-widest">Avg Error (MAPE)</p>
               </div>
               <div className="flex gap-1.5 items-end h-8">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                     <motion.div key={i} animate={{ height: [12, 32, 16, 28, 12] }} transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.1 }} className="flex-1 bg-sky-400/40 rounded-full border border-sky-400/10" />
                  ))}
               </div>
            </GlassCard>
         </div>

         {/* CENTER SECTION: 6-MODEL MAPE GRID & TIMELINE FEED */}
         <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">

            {/* Left: 6-Model Precision Matrix (3/4) */}
            <div className="lg:col-span-3 space-y-8">
               <div className="flex items-center justify-between px-4">
                  <div className="flex flex-col gap-1">
                     <h3 className="font-black text-slate-800 text-sm uppercase tracking-[0.3em]">Neural Precision Matrix</h3>
                     <p className="text-[10px] font-bold text-slate-400 uppercase">Neural Performance Tracking</p>
                  </div>
                  <Link href="/safety">
                     <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm hover:shadow-md ${manualConfig?.active ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                        {manualConfig?.active ? 'Manual Override Active' : 'Safety Protocol: Strict'}
                     </span>
                  </Link>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {coins.map((coin, idx) => {
                     const data = allStatus[coin] || {};
                     const isPulsing = pulses[coin];
                     
                     // Dynamic Gap Calculations
                     const cp = data.current_price || 0;
                     const p1 = data.pred_price_1h || 0;
                     const p5 = data.pred_price_5m || 0;
                     const gapIdr1h = p1 > 0 && cp > 0 ? p1 - cp : 0;
                     const gapPct1h = cp > 0 ? (gapIdr1h / cp) * 100 : 0;
                     const gapIdr5m = p5 > 0 && cp > 0 ? p5 - cp : 0;
                     const gapPct5m = cp > 0 ? (gapIdr5m / cp) * 100 : 0;

                     return (
                        <div key={coin} className="flex flex-col gap-8">
                           {/* 1H Model Card */}
                           <Link href={`/market?coin=${coin}&tf=1h`} className="flex-1 flex flex-col">
                              <GlassCard className="p-8 border-white shadow-md hover:shadow-2xl transition-all duration-300 group cursor-pointer bg-white/70 h-full flex flex-col" delay={0.2 + idx * 0.1}>
                                 <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-slate-50 text-sky-500 rounded-2xl group-hover:bg-sky-500 group-hover:text-white transition-all shadow-sm"><Target className="w-6 h-6" /></div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">1H MACRO</span>
                                 </div>
                                 <h4 className="text-3xl font-black text-slate-900 mb-3 tracking-tighter uppercase">{coin}<span className="text-slate-400 text-xl">/IDR</span></h4>
                                 <div className="flex items-center gap-3 mb-6">
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-white">
                                       <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(10, 100 - (data.mape_1h || 0) * 10)}%` }} className="h-full bg-sky-500 shadow-sm shadow-sky-100" />
                                    </div>
                                    <span className="text-sm font-black text-sky-600">{(data.mape_1h || 0).toFixed(2)}%</span>
                                 </div>

                                 <motion.div
                                    animate={isPulsing ? { scale: [1, 1.02, 1], backgroundColor: ['rgba(248,250,252,0.5)', 'rgba(224,242,254,0.8)', 'rgba(248,250,252,0.5)'] } : {}}
                                    className="mb-6 flex flex-col gap-1 bg-slate-50/50 p-4 rounded-2xl border border-white/60 transition-colors"
                                 >
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Price Gap (Target)</span>
                                    <div className="flex items-center gap-2">
                                       <span className={`text-sm font-black ${gapIdr1h >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                          {gapIdr1h >= 0 ? '+' : '-'}Rp {Math.abs(gapIdr1h).toLocaleString('id-ID')}
                                       </span>
                                       <span className="text-[10px] font-bold text-slate-400">({gapPct1h.toFixed(2)}%)</span>
                                    </div>
                                 </motion.div>

                                 <p className="mt-auto text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-sky-500 transition-colors flex items-center gap-2">Analyze Pattern →</p>
                              </GlassCard>
                           </Link>

                           {/* 5M Model Card */}
                           <Link href={`/market?coin=${coin}&tf=5m`} className="flex-1 flex flex-col">
                              <GlassCard className="p-8 border-white shadow-md hover:shadow-2xl transition-all duration-300 group cursor-pointer bg-white/70 h-full flex flex-col" delay={0.3 + idx * 0.1}>
                                 <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-slate-50 text-emerald-500 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm"><Zap className="w-6 h-6" /></div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">5M MICRO</span>
                                 </div>
                                 <h4 className="text-3xl font-black text-slate-900 mb-3 tracking-tighter uppercase">{coin}<span className="text-slate-400 text-xl">/IDR</span></h4>
                                 <div className="flex items-center gap-3 mb-6">
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-white">
                                       <motion.div initial={{ width: 0 }} animate={{ width: `${Math.max(10, 100 - (data.mape_5m || 0) * 10)}%` }} className="h-full bg-emerald-500 shadow-sm shadow-emerald-100" />
                                    </div>
                                    <span className="text-sm font-black text-emerald-600">{(data.mape_5m || 0).toFixed(2)}%</span>
                                 </div>

                                 <motion.div
                                    animate={isPulsing ? { scale: [1, 1.02, 1], backgroundColor: ['rgba(248,250,252,0.5)', 'rgba(236,253,245,0.8)', 'rgba(248,250,252,0.5)'] } : {}}
                                    className="mb-6 flex flex-col gap-1 bg-slate-50/50 p-4 rounded-2xl border border-white/60 transition-colors"
                                 >
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Price Gap (Target)</span>
                                    <div className="flex items-center gap-2">
                                       <span className={`text-sm font-black ${gapIdr5m >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                          {gapIdr5m >= 0 ? '+' : '-'}Rp {Math.abs(gapIdr5m).toLocaleString('id-ID')}
                                       </span>
                                       <span className="text-[10px] font-bold text-slate-400">({gapPct5m.toFixed(2)}%)</span>
                                    </div>
                                 </motion.div>

                                 <p className="mt-auto text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-emerald-500 transition-colors flex items-center gap-2">Engage Scalper →</p>
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
                  <Clock className="w-6 h-6 text-sky-500" />
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-[0.3em]">Learning Feed</h3>
               </div>
               <GlassCard className="flex-1 flex flex-col p-8 min-h-[400px] border-white/80 shadow-xl overflow-hidden bg-white/90 backdrop-blur-xl" delay={0.4}>
                  <div className="space-y-0 max-h-[680px] overflow-y-auto no-scrollbar relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:via-slate-200 before:to-transparent">
                     {combinedFeed.length === 0 ? (
                        <div className="py-24 text-center text-slate-300 italic text-[10px] font-black uppercase tracking-[0.2em] relative z-10 bg-white/50 backdrop-blur-sm w-fit mx-auto px-6 py-3 rounded-full border border-white">Waiting for neural breakthroughs...</div>
                     ) : combinedFeed.map((ev: any, i: number) => (
                        <div key={i} className="relative flex items-center justify-between group py-4">
                           <div className={`flex items-center justify-center w-6 h-6 rounded-full border-4 border-white shrink-0 shadow-sm relative z-10 ${ev.type === 'ERROR' || ev.type === 'WARNING' ? 'bg-amber-500' : ev.type === 'RECORD' ? 'bg-emerald-500' : 'bg-sky-500'}`}>
                              <div className="w-1.5 h-1.5 bg-white rounded-full" />
                           </div>
                           <div className="w-[calc(100%-2.5rem)] pl-4">
                              <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/60 border border-slate-100/50 shadow-sm group-hover:bg-white group-hover:shadow-md transition-all">
                                 <div className="flex items-center gap-2 opacity-80">
                                    <HistoryIcon className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{new Date(ev.time).toLocaleTimeString('id-ID')}</span>
                                 </div>
                                 <p className="text-xs font-bold text-slate-700 leading-snug uppercase tracking-tight">{ev.message}</p>
                              </div>
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
      <div className="flex h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-sky-50 via-white to-sky-100 font-sans selection:bg-sky-100">
         <Sidebar />
         <main className="flex-1 flex flex-col p-12 md:p-20 overflow-y-auto no-scrollbar">
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