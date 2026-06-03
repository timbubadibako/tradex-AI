"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
   Activity, Wallet, BrainCircuit, Target, Zap, Clock, History as HistoryIcon, Lock, ChevronRight
} from "lucide-react";
import { useState, useEffect } from "react";
import GlassCard from "@/components/dashboard/GlassCard";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAllAssetsStatus, useEventLog, useBotStatus, useMarketData, useUnifiedTrades, useNeuralCheckpoints } from "@/hooks/useDashboardData";
import Link from "next/link";

// SAKTI GRANULAR DEBUG TOOLTIP
function DebugTooltip({ endpoint, fields, isNull }: { endpoint: string, fields: string[], isNull: boolean }) {
  return (
    <div className={`absolute top-4 right-6 z-50 group`}>
       {isNull && <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_12px_#f43f5e]" />}
       <div className="absolute right-0 top-6 w-72 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 p-5 rounded-2xl shadow-2xl pointer-events-none text-left translate-y-2 group-hover:translate-y-0">
          <div className="flex items-center gap-2 mb-3">
             <div className="w-1 h-3 bg-sky-500 rounded-full" />
             <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Neural Data Spec</p>
          </div>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Target Endpoint</p>
          <code className="text-[10px] text-sky-400 bg-sky-500/10 px-2 py-1 rounded block mb-4 border border-sky-500/20">{endpoint}</code>
          
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Required Payload Fields</p>
          <div className="flex flex-wrap gap-1.5">
             {fields.map(f => (
                <span key={f} className="text-[8px] font-black text-slate-300 bg-white/5 px-2 py-1 rounded-md border border-white/5">{f}</span>
             ))}
          </div>
       </div>
    </div>
  );
}

export default function OverviewDashboard() {
   const { allStatus, totalNetPnl, dailyTarget, cashBalance, vault } = useAllAssetsStatus();
   const { events } = useEventLog();
   const { checkpoints } = useNeuralCheckpoints();
   
   const [colony, setColony] = useState<'crypto' | 'forex' | 'stocks'>('crypto');
   const [mounted, setMounted] = useState(false);

   useEffect(() => { setMounted(true); }, []);

   const coins = ['BTC', 'ETH', 'SOL'];

   // Combined Evolutionary Feed
   const combinedFeed = [
      ...(Array.isArray(events) ? events.map(e => ({ ...e, feedType: 'EVENT' })) : []),
      ...(Array.isArray(checkpoints) ? checkpoints.map(c => ({ 
         time: c.created_at, 
         message: `Model Evolved! ${c.coin} ${c.timeframe} Accuracy: ${c.new_mape.toFixed(2)}%`, 
         type: 'RECORD',
         feedType: 'CHECKPOINT'
      })) : [])
   ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 15);

   if (!mounted) return <div className="h-screen w-full bg-[#020617]" />;

   return (
      <div className="flex h-screen overflow-hidden bg-[#020617] font-sans selection:bg-sky-500/20">
         <Sidebar />
         
         <main className="flex-1 flex flex-col p-12 md:p-20 overflow-y-auto no-scrollbar relative">
            {/* Stable pulsing blurs behind content area */}
            <div className="fixed top-1/4 left-1/4 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
            <div className="fixed bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" style={{ animationDelay: '-5s' }} />

            <div className="mx-auto max-w-[1800px] w-full space-y-20 relative z-10">

               {/* GLOBAL SUMMARY: COLLECTIVE EQUITY HERO */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <GlassCard className="lg:col-span-2 p-12 bg-gradient-to-br from-white/[0.03] to-sky-500/[0.01] flex flex-col justify-center relative overflow-hidden group border-white/10 shadow-2xl" delay={0.1}>
                     <DebugTooltip endpoint="GET /api/all_status" fields={['total_cash', 'total_net_pnl']} isNull={cashBalance === 0} />
                     <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-sky-500/[0.04] rounded-full blur-[100px] group-hover:bg-sky-500/[0.08] transition-all duration-1000" />
                     <div className="flex items-center gap-4 mb-12 opacity-50 relative z-10">
                        <Wallet className="w-7 h-7 text-sky-400" />
                        <h3 className="font-black text-[11px] uppercase tracking-[0.5em]">Global Collective Equity</h3>
                     </div>
                     <h2 className="text-7xl lg:text-8xl font-black tracking-tighter mb-10 relative z-10 text-white">
                        Rp {(cashBalance + totalNetPnl).toLocaleString('id-ID')}<span className="text-2xl text-slate-700 font-bold ml-6 italic">IDR</span>
                     </h2>
                     <div className="flex items-center gap-12 relative z-10 border-t border-white/5 pt-10 w-fit">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Operational Reserve</span>
                           <span className="text-sky-400 font-black text-2xl tracking-tight">Rp {cashBalance.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="w-px h-12 bg-white/10" />
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Unrealized Growth</span>
                           <span className={`font-black text-2xl tracking-tight ${totalNetPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {totalNetPnl >= 0 ? '+' : ''}Rp {Math.abs(totalNetPnl).toLocaleString('id-ID')}
                           </span>
                        </div>
                     </div>
                  </GlassCard>

                  <GlassCard className="relative p-12 border-amber-500/10 bg-gradient-to-br from-slate-900 to-amber-950/20 flex flex-col justify-center group shadow-2xl" delay={0.2}>
                     <DebugTooltip endpoint="GET /api/all_status" fields={['vault']} isNull={vault === 0} />
                     <div className="flex items-center gap-4 mb-12 opacity-50">
                        <Lock className="w-7 h-7 text-amber-500" />
                        <h3 className="font-black text-[11px] uppercase tracking-[0.5em] text-amber-500/80">Reserved Capital</h3>
                     </div>
                     <h2 className="text-6xl font-black tracking-tighter text-amber-500 mb-6">
                        Rp {vault.toLocaleString('id-ID')}
                     </h2>
                     <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.3em] leading-relaxed">
                        Secured 30% Daily Profit Accumulation &bull; Risk Isolated Assets
                     </p>
                  </GlassCard>
               </div>

               {/* COLONY CONTROL SECTION */}
               <section className="space-y-12">
                  <div className="flex justify-between items-center border-b border-white/5 pb-12">
                     <div className="glass p-2 flex gap-3 w-fit bg-white/[0.01]">
                        {['crypto', 'forex', 'stocks'].map((type: any) => (
                           <button 
                              key={type}
                              onClick={() => setColony(type)}
                              className={`px-14 py-4 rounded-xl font-black text-[11px] transition-all tracking-[0.2em] ${colony === type ? 'bg-white/10 text-white border border-white/10 shadow-2xl scale-[1.03]' : 'text-slate-600 hover:text-slate-400'}`}
                           >
                              {type.toUpperCase()}_NODE
                           </button>
                        ))}
                     </div>
                     <div className="text-right">
                        <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest block mb-2">Global Precision Target</span>
                        <span className="text-2xl font-black text-sky-400 tracking-tighter">Rp {dailyTarget.toLocaleString('id-ID')} <span className="text-xs text-slate-700 opacity-50 uppercase tracking-widest ml-1">/ Day</span></span>
                     </div>
                  </div>

                  <AnimatePresence mode="wait">
                     {colony === 'crypto' ? (
                        <motion.div 
                           key="crypto"
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           exit={{ opacity: 0, y: -10 }}
                           transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
                           className="grid grid-cols-1 lg:grid-cols-4 gap-12"
                        >
                           <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-10">
                              {coins.map((coin, idx) => {
                                 const data = allStatus[coin] || {};
                                 const isPositionActive = Math.abs((data.btc_holdings || 0) - 0.5) > 0.00000001;
                                 
                                 // Granular Dynamic Gap Calculations
                                 const cp = data.current_price || 0;
                                 const p1h = data.pred_price_1h || 0;
                                 const p5m = data.pred_price_5m || 0;
                                 
                                 const gapIdr1h = p1h > 0 && cp > 0 ? p1h - cp : 0;
                                 const gapPct1h = cp > 0 ? (gapIdr1h / cp) * 100 : 0;
                                 
                                 const gapIdr5m = p5m > 0 && cp > 0 ? p5m - cp : 0;
                                 const gapPct5m = cp > 0 ? (gapIdr5m / cp) * 100 : 0;

                                 return (
                                    <Link key={coin} href={`/market?coin=${coin}`}>
                                       <GlassCard 
                                          isActive={isPositionActive}
                                          className="p-12 hover:bg-white/[0.04] transition-all duration-500 cursor-pointer group h-full flex flex-col justify-between relative shadow-xl" 
                                          delay={0.3 + idx * 0.1}
                                       >
                                          <DebugTooltip 
                                             endpoint={`GET /api/all_status`} 
                                             fields={[`assets.${coin}.current_price`, `assets.${coin}.pred_price_1h`, `assets.${coin}.pred_price_5m`, `assets.${coin}.mape_1h`, `assets.${coin}.mape_5m`]} 
                                             isNull={!data.current_price} 
                                          />
                                          <div>
                                             <div className="flex justify-between items-start mb-12">
                                                <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isPositionActive ? 'text-sky-400 flex items-center gap-2' : 'text-slate-700'}`}>
                                                   {isPositionActive && <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse shadow-[0_0_12px_#38bdf8]" />}
                                                   {isPositionActive ? 'TRANSACTION ACTIVE' : 'NODE_STANDBY'}
                                                </span>
                                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Macro / Micro</span>
                                             </div>
                                             <h4 className="text-5xl font-black mb-12 tracking-tighter uppercase text-white leading-none">
                                                {coin}<span className="text-slate-800 text-2xl ml-3 font-bold tracking-tight">/IDR</span>
                                             </h4>
                                          </div>
                                          
                                          <div className="space-y-10">
                                             <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-3">
                                                   <div className="flex justify-between items-center">
                                                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">1H Macro</span>
                                                      <span className="text-[10px] font-black text-sky-400">{(data.mape_1h || 0).toFixed(2)}%</span>
                                                   </div>
                                                   <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                      <motion.div 
                                                         initial={{ width: 0 }} 
                                                         animate={{ width: `${Math.max(5, 100 - (data.mape_1h || 0) * 10)}%` }} 
                                                         className="h-full bg-sky-500 shadow-[0_0_10px_rgba(56,189,248,0.4)]" 
                                                      />
                                                   </div>
                                                </div>
                                                <div className="space-y-3">
                                                   <div className="flex justify-between items-center">
                                                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">5M Micro</span>
                                                      <span className="text-[10px] font-black text-emerald-400">{(data.mape_5m || 0).toFixed(2)}%</span>
                                                   </div>
                                                   <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                      <motion.div 
                                                         initial={{ width: 0 }} 
                                                         animate={{ width: `${Math.max(5, 100 - (data.mape_5m || 0) * 10)}%` }} 
                                                         className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" 
                                                      />
                                                   </div>
                                                </div>
                                             </div>
                                             
                                             <div className="pt-6 border-t border-white/5 space-y-4">
                                                <div className="flex justify-between items-center">
                                                   <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none">1H Projected Gap</span>
                                                   <span className={`${gapIdr1h >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-black text-sm tracking-tighter`}>
                                                      {gapIdr1h >= 0 ? '+' : ''}Rp {Math.abs(gapIdr1h).toLocaleString('id-ID')} <span className="text-[8px] opacity-40 ml-1 font-bold">({gapPct1h.toFixed(2)}%)</span>
                                                   </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                   <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none">5M Projected Gap</span>
                                                   <span className={`${gapIdr5m >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-black text-sm tracking-tighter`}>
                                                      {gapIdr5m >= 0 ? '+' : ''}Rp {Math.abs(gapIdr5m).toLocaleString('id-ID')} <span className="text-[8px] opacity-40 ml-1 font-bold">({gapPct5m.toFixed(2)}%)</span>
                                                   </span>
                                                </div>
                                             </div>
                                          </div>
                                       </GlassCard>
                                    </Link>
                                 );
                              })}
                           </div>

                           {/* Learning Feed (1/4) */}
                           <div className="space-y-10 flex flex-col h-full relative group">
                              <DebugTooltip endpoint="GET /api/events & /api/checkpoints" fields={['message', 'time', 'type']} isNull={combinedFeed.length === 0} />
                              <h3 className="font-black text-[11px] uppercase tracking-[0.5em] text-slate-600 pl-4">Evolution Feed</h3>
                              <GlassCard className="flex-1 p-10 border-white/5 bg-white/[0.005] h-[600px] overflow-y-auto no-scrollbar shadow-2xl" delay={0.6}>
                                 {combinedFeed.length === 0 ? (
                                    <div className="py-32 text-center text-slate-700 italic text-[11px] font-black uppercase tracking-[0.3em] animate-pulse">Waiting for neural matrix synchronization...</div>
                                 ) : (
                                    <div className="space-y-10">
                                       {combinedFeed.map((ev: any, i: number) => (
                                          <div key={i} className={`space-y-3 ${i !== 0 ? 'border-t border-white/5 pt-10' : ''} group/item`}>
                                             <div className="flex items-center justify-between opacity-40 group-hover/item:opacity-100 transition-opacity">
                                                <span className="text-[10px] font-bold text-slate-500 font-mono tracking-tighter">{new Date(ev.time).toLocaleTimeString('id-ID')}</span>
                                                <span className="text-[9px] font-black text-sky-500 tracking-widest uppercase">NODE_LIVE</span>
                                             </div>
                                             <p className="text-xs font-bold leading-relaxed text-slate-300 uppercase tracking-tight group-hover/item:text-white transition-colors">{ev.message}</p>
                                          </div>
                                       ))}
                                    </div>
                                 )}
                              </GlassCard>
                           </div>
                        </motion.div>
                     ) : (
                        <motion.div 
                           key="placeholder"
                           initial={{ opacity: 0, scale: 0.98 }}
                           animate={{ opacity: 1, scale: 1 }}
                           exit={{ opacity: 0, scale: 0.98 }}
                           className="py-48 text-center glass border-dashed border-white/10 bg-white/[0.005] rounded-[32px] relative group overflow-hidden"
                        >
                           <div className="absolute inset-0 bg-rose-500/5 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                           <Lock className="w-16 h-16 text-slate-800 mx-auto mb-10 relative z-10" />
                           <h3 className="text-3xl font-black text-slate-600 uppercase tracking-[0.3em] relative z-10">Neural Node Locked</h3>
                           <p className="text-[11px] font-black text-slate-800 uppercase tracking-[0.5em] mt-3 mb-10 relative z-10">Phase 4 Singularity Required</p>
                           <div className="max-w-sm mx-auto p-6 rounded-2xl border border-white/5 bg-white/[0.01] relative z-10">
                              <p className="text-xs text-slate-600 font-medium leading-relaxed italic">
                                 Colony {colony.toUpperCase()} requires specific API integration adapters and secondary model pre-training before tactical market activation.
                              </p>
                           </div>
                        </motion.div>
                     )}
                  </AnimatePresence>
               </section>
            </div>
         </main>

         <style jsx global>{`
            @font-face { font-family: 'Outfit'; src: url('https://cdn.jsdelivr.net/font/outfit/Outfit-Black.woff2'); }
            @font-face { font-family: 'Inter'; src: url('https://cdn.jsdelivr.net/font/inter/Inter-Regular.woff2'); }
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
         `}</style>
      </div>
   );
}
