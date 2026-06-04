"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Wallet, PieChart, History, TrendingUp, DollarSign, Activity, Coins, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import GlassCard from "@/components/dashboard/GlassCard";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAllAssetsStatus, useUnifiedTrades } from "@/hooks/useDashboardData";

// SAKTI GRANULAR DEBUG TOOLTIP
function DebugTooltip({ endpoint, fields, isNull }: { endpoint: string, fields: string[], isNull: boolean }) {
   return (
      <div className="absolute top-4 right-6 z-50 group">
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

export default function PortfolioPage() {
   const { allStatus, vault, totalNetPnl, dailyTarget, cashBalance } = useAllAssetsStatus();
   const { trades } = useUnifiedTrades();
   const [mounted, setMounted] = useState(false);

   useEffect(() => { setMounted(true); }, []);

   const tradeList = Array.isArray(trades) ? trades : [];
   const totalTrades = tradeList.length;
   const profitableTrades = tradeList.filter((t: any) => t.pnl > 0).length;
   const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;

   const detectedCoins = Object.keys(allStatus || {});
   const activePositions = detectedCoins.filter(c => Math.abs((allStatus[c]?.btc_holdings || 0) - 0.5) > 0.00000001).length;

   if (!mounted) return <div className="h-screen w-full bg-[#020617]" />;

   return (
      // SAKTI FIX 1: Set tinggi root container setinggi viewport murni h-screen penuh
      <div className="flex h-screen bg-[#020617] font-sans selection:bg-sky-500/20 overflow-hidden">
         <Sidebar />

         {/* SAKTI FIX 2: Kembalikan overflow-y-auto di level main agar seluruh page luar bisa discroll normal kebawah */}
         <main className="flex-1 flex flex-col p-12 md:p-20 relative h-full overflow-y-auto no-scrollbar">
            <div className="fixed top-1/4 left-1/4 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
            <div className="fixed bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" style={{ animationDelay: '-5s' }} />

            {/* SAKTI FIX 3: Lepas h-full dan ganti dengan space-y-16 natural agar page luar bisa melar menggelinding */}
            <div className="mx-auto max-w-[1800px] w-full relative z-10 space-y-16 pb-20">

               {/* HEADER */}
               <header className="flex justify-between items-end shrink-0">
                  <div className="space-y-2">
                     <div className="flex items-center gap-4 text-sky-500 mb-3">
                        <PieChart className="w-10 h-10" />
                        <h1 className="text-5xl font-black tracking-tighter uppercase text-white">Universal <span className="text-sky-400">Audit</span></h1>
                     </div>
                     <p className="text-slate-500 font-light text-xl italic leading-none tracking-wide">Multi-colony performance analytics and realized gain verification.</p>
                  </div>
                  <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 px-8 py-6 rounded-[32px] shadow-2xl flex items-center gap-6 relative group shrink-0">
                     <DebugTooltip endpoint="GET /api/all_status" fields={['total_net_pnl']} isNull={totalNetPnl === undefined} />
                     <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500 border border-emerald-500/20"><Activity className="w-6 h-6" /></div>
                     <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] leading-none mb-2">Net Aggregate Gain</p>
                        <p className={`text-2xl font-black tracking-tighter ${(totalNetPnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                           {(totalNetPnl ?? 0) >= 0 ? '+' : ''}Rp {Math.abs(totalNetPnl ?? 0).toLocaleString('id-ID')}
                        </p>
                     </div>
                  </div>
               </header>

               {/* KPI SECTION */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-10 shrink-0">
                  <GlassCard className="p-12 bg-gradient-to-br from-white/[0.03] to-sky-500/[0.01] flex flex-col justify-center relative overflow-hidden group border-white/10 shadow-2xl" delay={0.1}>
                     <DebugTooltip endpoint="GET /api/all_status" fields={['total_cash']} isNull={cashBalance === undefined} />
                     <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl group-hover:bg-sky-500/10 transition-all duration-1000" />
                     <div className="flex items-center gap-4 mb-10 opacity-50 relative z-10"><Wallet className="w-6 h-6 text-sky-400" /><h3 className="font-black text-[10px] uppercase tracking-[0.4em]">Operational Reserve</h3></div>
                     <h2 className="text-5xl font-black tracking-tighter mb-8 relative z-10 text-white">
                        Rp {(cashBalance ?? 0).toLocaleString('id-ID')}
                     </h2>
                     <div className="text-[10px] font-black uppercase tracking-widest relative z-10 text-slate-500">
                        NETWORK LIQUIDITY POOL ACTIVE
                     </div>
                  </GlassCard>

                  <GlassCard className="p-12 border-white/5 shadow-xl flex flex-col justify-center bg-white/[0.01] backdrop-blur-3xl h-full relative group" delay={0.15}>
                     <DebugTooltip endpoint="GET /api/status" fields={['winrate']} isNull={trades === undefined || tradeList.length === 0} />
                     <div className="flex items-center gap-4 mb-10 text-emerald-500 opacity-60"><TrendingUp className="w-6 h-6" /><h3 className="font-black text-[10px] uppercase tracking-[0.4em]">Success Probability</h3></div>
                     <h2 className="text-5xl font-black tracking-tighter text-white mb-6">
                        {winRate.toFixed(1)}<span className="text-3xl text-slate-700 ml-1">%</span>
                     </h2>
                     <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <span className="text-emerald-500">{profitableTrades} EXECUTIONS</span> / {totalTrades} TOTAL SYNAPSES
                     </div>
                  </GlassCard>

                  <GlassCard className="p-12 border-white/5 shadow-xl flex flex-col justify-center bg-white/[0.01] backdrop-blur-3xl h-full relative group" delay={0.2}>
                     <DebugTooltip endpoint="GET /api/all_status" fields={['assets.*.btc_holdings']} isNull={allStatus === undefined || Object.keys(allStatus).length === 0} />
                     <div className="flex items-center gap-4 mb-10 text-purple-500 opacity-60"><Coins className="w-6 h-6" /><h3 className="font-black text-[10px] uppercase tracking-[0.4em]">Active Node Exposure</h3></div>
                     <h2 className="text-5xl font-black text-white tracking-tighter mb-10">{activePositions} <span className="text-2xl text-slate-800 ml-2 font-bold uppercase tracking-widest leading-none">Deployed</span></h2>
                     <div className="flex gap-3">
                        {detectedCoins.length === 0 ? (
                           <div className="text-[9px] font-bold text-slate-600 uppercase animate-pulse italic">Scanning for active colonies...</div>
                        ) : detectedCoins.map(c => {
                           const isDeployed = Math.abs((allStatus?.[c]?.btc_holdings || 0) - 0.5) > 0.00000001;
                           return (
                              <div key={c} className={`flex-1 py-2 rounded-xl text-[10px] font-black text-center uppercase tracking-widest border transition-all ${isDeployed ? 'bg-purple-500/10 border-purple-500/20 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'bg-white/[0.02] border-white/5 text-slate-700'}`}>
                                 {c}
                              </div>
                           );
                        })}
                     </div>
                  </GlassCard>
               </div>

               {/* LOWER SECTION: LEDGER VS RIGHT INFOS */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">

                  {/* Transaction Ledger WITH ABSOLUTE INTERNAL SCROLL */}
                  <GlassCard className="lg:col-span-2 p-10 border-white/5 shadow-2xl h-[600px] flex flex-col relative group overflow-auto" delay={0.3}>
                     <DebugTooltip endpoint="GET /api/persistent_trades" fields={['time', 'coin', 'type', 'pnl']} isNull={tradeList.length === 0} />

                     {/* Header Row (Fixed size) */}
                     <div className="flex items-center gap-4 mb-8 border-b border-white/5 pb-4 shrink-0">
                        <History className="w-6 h-6 text-sky-500 opacity-60" />
                        <h3 className="font-black text-white uppercase tracking-[0.4em] text-xs">Universal Transaction Ledger</h3>
                     </div>

                     {/* HEADER KOLOM GRID MURNI */}
                     <div className="grid grid-cols-4 text-[10px] font-black text-slate-700 uppercase tracking-[0.3em] px-6 pb-3 shrink-0">
                        <div>Temporal Sync</div>
                        <div className="text-center">Asset Colony</div>
                        <div className="text-center">Execution</div>
                        <div className="text-right">Realized Performance</div>
                     </div>

                     {/* SCROLLABLE LIST CONTAINER (LINE 136 - SEKARANG PASTI JALAN SCROLL INTERNALNYA) */}
                     <div className="flex-1 overflow-y-auto pr-2 space-y-3 min-h-0 custom-scrollbar">
                        <AnimatePresence>
                           {tradeList.map((t: any, i: number) => {
                              const isLong = t?.type?.includes('LONG') || t?.type?.includes('BUY');
                              return (
                                 // SAKTI REVISE 4: Bantai dan bersihkan total tag <td> hantu sisa table kemarin!
                                 <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={i}
                                    className="grid grid-cols-4 items-center bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-2xl p-5 transition-all group"
                                 >
                                    {/* Kolom 1: Waktu */}
                                    <div className="font-mono text-[10px] text-slate-600 pl-4">
                                       {t?.time ? new Date(t.time).toLocaleString('id-ID') : '00:00:00'}
                                    </div>
                                    {/* Kolom 2: Koin */}
                                    <div className="text-center text-white font-black tracking-tight text-sm">
                                       {t?.coin}/IDR
                                    </div>
                                    {/* Kolom 3: Protokol */}
                                    <div className="text-center">
                                       <span className={`px-5 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-lg ${isLong ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                                          {t?.type ? t.type.replace('_', ' ') : 'STANDBY'}
                                       </span>
                                    </div>
                                    {/* Kolom 4: Performance Realized */}
                                    <div className={`text-right pr-4 text-sm font-black ${t?.pnl > 0 ? 'text-emerald-400' : t?.pnl < 0 ? 'text-rose-400' : 'text-slate-700'}`}>
                                       {t?.pnl !== 0 && t?.pnl !== undefined ? (
                                          `${t.pnl > 0 ? '+' : ''}Rp ${Math.abs(t.pnl).toLocaleString('id-ID')}`
                                       ) : (
                                          <span className="animate-pulse flex items-center justify-end gap-2 text-sky-500"><div className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_8px_#38bdf8]" />EXECUTING</span>
                                       )}
                                    </div>
                                 </motion.div>
                              );
                           })}
                        </AnimatePresence>
                        {tradeList.length === 0 && (
                           <div className="py-24 text-center text-slate-700 italic text-sm font-black uppercase tracking-[0.4em] animate-pulse">Scanning portfolio history...</div>
                        )}
                     </div>
                  </GlassCard>

                  {/* RIGHT CONTROLS: Kunci tinggi h-[600px] dengan gap-6 agar membagi ruang 50:50 horisontal semetris */}
                  <div className="flex flex-col gap-6 h-[600px]">
                     <GlassCard className="p-10 border-amber-500/10 bg-gradient-to-br from-slate-900 to-amber-950/20 shadow-2xl flex flex-col justify-center text-center gap-6 relative group h-[calc(50%-12px)] overflow-hidden" delay={0.4}>
                        <DebugTooltip endpoint="GET /api/all_status" fields={['vault']} isNull={vault === undefined} />
                        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-500 border border-amber-500/20 shrink-0"><Lock className="w-7 h-7" /></div>
                        <div className="space-y-2 flex-1 flex flex-col justify-center">
                           <h4 className="font-black text-amber-500 uppercase tracking-[0.4em] text-[10px]">Secured Capital</h4>
                           <p className="text-[10px] text-slate-500 leading-relaxed font-medium uppercase tracking-widest px-4">
                              Fixed Modal Retention: 100k IDR for reinvestment. All profit surplus isolated daily.
                           </p>
                        </div>
                        <div className="pt-4 border-t border-white/5 shrink-0">
                           <p className="text-[9px] font-black text-slate-700 uppercase mb-1 tracking-[0.3em]">Vault Liquidity</p>
                           <h2 className="text-3xl font-black text-amber-500 tracking-tighter tabular-nums">Rp {(vault ?? 0).toLocaleString('id-ID')}</h2>
                        </div>
                     </GlassCard>

                     {/* SAKTI FIX GLASS CARD UTAMA: Sekarang dia dapet animasi transisi penuh karena pake GlassCard murni! */}
                     <GlassCard className="p-10 rounded-[40px] bg-slate-950 text-white shadow-2xl flex flex-col justify-between relative overflow-hidden group border border-white/5 h-[calc(50%-12px)]" delay={0.45}>
                        <DebugTooltip endpoint="GET /api/all_status" fields={['total_cash']} isNull={cashBalance === undefined} />
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl group-hover:bg-sky-500/20 transition-all duration-1000" />
                        <div className="flex items-center gap-3 opacity-40 relative z-10 shrink-0"><DollarSign className="w-5 h-5 text-sky-400" />
                           <h3 className="font-black text-[9px] uppercase tracking-[0.5em]">Command Hub</h3></div>
                        <div className="relative z-10 flex-1 flex flex-col justify-center">
                           <p className="text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest">Available Liquidity</p>
                           <h2 className="text-4xl font-black tracking-tighter tabular-nums">Rp {(cashBalance ?? 0).toLocaleString('id-ID')}</h2>
                        </div>
                        <button className="w-full py-4 rounded-[20px] bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase text-[9px] tracking-[0.4em] transition-all relative z-10 backdrop-blur-3xl shadow-2xl shrink-0">Initialize Withdrawal</button>
                     </GlassCard>
                  </div>

               </div>

            </div>
         </main>

         <style jsx global>{`
        /* SAKTI CUSTOM SCROLLBAR BARU */
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.2); }
        
        @font-face { font-family: 'Outfit'; src: url('https://cdn.jsdelivr.net/font/outfit/Outfit-Black.woff2'); }
        @font-face { font-family: 'Inter'; src: url('https://cdn.woff2'); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      </div>
   );
}