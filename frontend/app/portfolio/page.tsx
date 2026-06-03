"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Wallet, PieChart, History, TrendingUp, ArrowRightLeft, DollarSign, Activity, Coins, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import GlassCard from "@/components/dashboard/GlassCard";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAllAssetsStatus, useUnifiedTrades } from "@/hooks/useDashboardData";

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

export default function PortfolioPage() {
  const { allStatus, vault, totalNetPnl, dailyTarget, cashBalance } = useAllAssetsStatus();
  const { trades } = useUnifiedTrades();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Statistics calculation based on real data (no hardcoding)
  const tradeList = Array.isArray(trades) ? trades : [];
  const totalTrades = tradeList.length;
  const profitableTrades = tradeList.filter((t: any) => t.pnl > 0).length;
  const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
  
  // DYNAMIC ASSET LIST from API
  const detectedCoins = Object.keys(allStatus || {});
  const activePositions = detectedCoins.filter(c => Math.abs((allStatus[c]?.btc_holdings || 0) - 0.5) > 0.00000001).length;

  if (!mounted) return <div className="h-screen w-full bg-[#020617]" />;

  return (
    <div className="flex h-screen overflow-hidden bg-[#020617] font-sans selection:bg-sky-500/20">
      <Sidebar />
      <main className="flex-1 flex flex-col p-12 md:p-20 overflow-y-auto no-scrollbar relative">
        <div className="mx-auto max-w-[1800px] w-full space-y-16 relative z-10">
          
          <header className="flex justify-between items-end">
             <div className="space-y-2">
                <div className="flex items-center gap-4 text-sky-500 mb-3">
                   <PieChart className="w-10 h-10" />
                   <h1 className="text-5xl font-black tracking-tighter uppercase text-white">Universal <span className="text-sky-400">Audit</span></h1>
                </div>
                <p className="text-slate-500 font-light text-xl italic leading-none tracking-wide">Multi-colony performance analytics and realized gain verification.</p>
             </div>
             <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 px-8 py-6 rounded-[32px] shadow-2xl flex items-center gap-6 relative group">
                <DebugTooltip endpoint="GET /api/all_status" fields={['total_net_pnl']} isNull={totalNetPnl === 0} />
                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500 border border-emerald-500/20"><Activity className="w-6 h-6" /></div>
                <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] leading-none mb-2">Net Aggregate Gain</p>
                   <p className={`text-2xl font-black tracking-tighter ${totalNetPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                     {totalNetPnl >= 0 ? '+' : ''}Rp {Math.abs(totalNetPnl).toLocaleString('id-ID')}
                   </p>
                </div>
             </div>
          </header>

          {/* KPI SECTION */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
             <GlassCard className="p-12 bg-gradient-to-br from-white/[0.03] to-sky-500/[0.01] flex flex-col justify-center relative overflow-hidden group border-white/10 shadow-2xl" delay={0.1}>
                <DebugTooltip endpoint="GET /api/all_status" fields={['total_cash']} isNull={cashBalance === 0} />
                <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl group-hover:bg-sky-500/10 transition-all duration-1000" />
                <div className="flex items-center gap-4 mb-10 opacity-50 relative z-10"><Wallet className="w-6 h-6 text-sky-400" /><h3 className="font-black text-[10px] uppercase tracking-[0.4em]">Operational Reserve</h3></div>
                <h2 className="text-5xl font-black tracking-tighter mb-8 relative z-10 text-white">
                   Rp {cashBalance.toLocaleString('id-ID')}
                </h2>
                <div className="text-[10px] font-black uppercase tracking-widest relative z-10 text-slate-500">
                   NETWORK LIQUIDITY POOL ACTIVE
                </div>
             </GlassCard>

             <GlassCard className="p-12 border-white/5 shadow-xl flex flex-col justify-center bg-white/[0.01] backdrop-blur-3xl h-full relative group" delay={0.15}>
                <DebugTooltip endpoint="GET /api/status" fields={['winrate']} isNull={winRate === 0} />
                <div className="flex items-center gap-4 mb-10 text-emerald-500 opacity-60"><TrendingUp className="w-6 h-6" /><h3 className="font-black text-[10px] uppercase tracking-[0.4em]">Success Probability</h3></div>
                <h2 className="text-5xl font-black tracking-tighter text-white mb-6">
                   {winRate.toFixed(1)}<span className="text-3xl text-slate-700 ml-1">%</span>
                </h2>
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
                   <span className="text-emerald-500">{profitableTrades} EXECUTIONS</span> / {totalTrades} TOTAL SYNAPSES
                </div>
             </GlassCard>

             <GlassCard className="p-12 border-white/5 shadow-xl flex flex-col justify-center bg-white/[0.01] backdrop-blur-3xl h-full relative group" delay={0.2}>
                <DebugTooltip endpoint="GET /api/all_status" fields={['assets.*.btc_holdings']} isNull={activePositions === 0} />
                <div className="flex items-center gap-4 mb-10 text-purple-500 opacity-60"><Coins className="w-6 h-6" /><h3 className="font-black text-[10px] uppercase tracking-[0.4em]">Active Node Exposure</h3></div>
                <h2 className="text-5xl font-black text-white tracking-tighter mb-10">{activePositions} <span className="text-2xl text-slate-800 ml-2 font-bold uppercase tracking-widest leading-none">Deployed</span></h2>
                <div className="flex gap-3">
                   {detectedCoins.length === 0 ? (
                      <div className="text-[9px] font-bold text-slate-600 uppercase animate-pulse italic">Scanning for active colonies...</div>
                   ) : detectedCoins.map(c => {
                      const isDeployed = Math.abs((allStatus[c]?.btc_holdings || 0) - 0.5) > 0.00000001;
                      return (
                         <div key={c} className={`flex-1 py-2 rounded-xl text-[10px] font-black text-center uppercase tracking-widest border transition-all ${isDeployed ? 'bg-purple-500/10 border-purple-500/20 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]' : 'bg-white/[0.02] border-white/5 text-slate-700'}`}>
                            {c}
                         </div>
                      );
                   })}
                </div>
             </GlassCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
             {/* Transaction Ledger (Table) */}
             <GlassCard className="lg:col-span-2 p-10 border-white/5 shadow-2xl min-h-[650px] flex flex-col relative group" delay={0.3}>
                <DebugTooltip endpoint="GET /api/persistent_trades" fields={['time', 'coin', 'type', 'pnl']} isNull={tradeList.length === 0} />
                <div className="flex items-center gap-4 mb-12 border-b border-white/5 pb-8">
                   <History className="w-7 h-7 text-sky-500 opacity-60" />
                   <h3 className="font-black text-white uppercase tracking-[0.4em] text-sm">Universal Transaction Ledger</h3>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar">
                   <table className="w-full text-left border-separate border-spacing-y-4">
                      <thead>
                         <tr className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">
                            <th className="pb-4 pl-10">Temporal Sync</th>
                            <th className="pb-4">Asset Colony</th>
                            <th className="pb-4">Execution</th>
                            <th className="pb-4 text-right pr-10">Realized Performance</th>
                         </tr>
                      </thead>
                      <tbody className="text-slate-400 font-bold">
                         <AnimatePresence>
                         {tradeList.map((t: any, i: number) => (
                            <motion.tr 
                               initial={{ opacity: 0, y: 10 }}
                               animate={{ opacity: 1, y: 0 }}
                               key={i} 
                               className="group hover:bg-white/[0.01] transition-all"
                            >
                               <td className="py-6 pl-10 bg-white/[0.01] rounded-l-2xl border-y border-l border-white/5 font-mono text-[10px] text-slate-600">{new Date(t.time).toLocaleString('id-ID')}</td>
                               <td className="py-6 bg-white/[0.01] border-y border-white/5 text-white font-black tracking-tight">{t.coin}/IDR</td>
                               <td className="py-6 bg-white/[0.01] border-y border-white/5">
                                  <span className={`px-5 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-lg ${t.type.includes('LONG') || t.type.includes('BUY') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>{t.type.replace('_',' ')}</span>
                               </td>
                               <td className={`py-6 pr-10 text-right rounded-r-2xl bg-white/[0.01] border-y border-r border-white/5 text-sm font-black ${t.pnl > 0 ? 'text-emerald-400' : t.pnl < 0 ? 'text-rose-400' : 'text-slate-700'}`}>
                                  {t.pnl !== 0 ? `${t.pnl > 0 ? '+' : ''}Rp ${Math.abs(t.pnl).toLocaleString('id-ID')}` : <span className="animate-pulse flex items-center justify-end gap-2 text-sky-500"><div className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_8px_#38bdf8]" />EXECUTING</span>}
                               </td>
                            </motion.tr>
                         ))}
                         </AnimatePresence>
                         {tradeList.length === 0 && (
                            <tr><td colSpan={4} className="py-32 text-center text-slate-700 italic text-sm font-black uppercase tracking-[0.4em] animate-pulse">Scanning portfolio history...</td></tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </GlassCard>

             <div className="space-y-10 flex flex-col h-full">
                <GlassCard className="p-12 border-amber-500/10 bg-gradient-to-br from-slate-900 to-amber-950/20 shadow-2xl flex flex-col justify-center text-center gap-10 relative group" delay={0.4}>
                   <DebugTooltip endpoint="GET /api/all_status" fields={['vault']} isNull={vault === 0} />
                   <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.05)] border border-amber-500/20"><Lock className="w-10 h-10" /></div>
                   <div className="space-y-4">
                      <h4 className="font-black text-amber-500 uppercase tracking-[0.4em] text-xs">Secured Capital</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium uppercase tracking-widest px-6">
                         30% Profit harvest automatically isolated from neural execution nodes.
                      </p>
                   </div>
                   <div className="pt-10 border-t border-white/5">
                      <p className="text-[10px] font-black text-slate-700 uppercase mb-3 tracking-[0.3em]">Vault Liquidity</p>
                      <h2 className="text-5xl font-black text-amber-500 tracking-tighter">Rp {vault.toLocaleString('id-ID')}</h2>
                   </div>
                </GlassCard>

                <div className="p-12 rounded-[40px] bg-slate-950 text-white shadow-2xl space-y-10 flex-1 flex flex-col justify-center relative overflow-hidden group border border-white/5">
                   <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl group-hover:bg-sky-500/20 transition-all duration-1000" />
                   <div className="flex items-center gap-4 opacity-40 relative z-10"><DollarSign className="w-6 h-6 text-sky-400" /><h3 className="font-black text-[10px] uppercase tracking-[0.5em]">Command Hub</h3></div>
                   <div className="relative z-10">
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Available Liquidity</p>
                      <h2 className="text-5xl font-black tracking-tighter">Rp {cashBalance.toLocaleString('id-ID')}</h2>
                   </div>
                   <button className="w-full py-6 mt-6 rounded-[24px] bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase text-[10px] tracking-[0.4em] transition-all relative z-10 backdrop-blur-3xl shadow-2xl shadow-sky-500/5">Initialize Withdrawal</button>
                </div>
             </div>
          </div>

        </div>
      </main>
      
      <style jsx global>{`
        @font-face { font-family: 'Outfit'; src: url('https://cdn.jsdelivr.net/font/outfit/Outfit-Black.woff2'); }
        @font-face { font-family: 'Inter'; src: url('https://cdn.jsdelivr.net/font/inter/Inter-Regular.woff2'); }
      `}</style>
    </div>
  );
}
