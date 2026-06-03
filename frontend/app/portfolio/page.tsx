"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Wallet, PieChart, History, TrendingUp, ArrowRightLeft, DollarSign, Activity, Coins, Lock } from "lucide-react";
import { useState } from "react";
import GlassCard from "@/components/dashboard/GlassCard";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAllAssetsStatus, useUnifiedTrades } from "@/hooks/useDashboardData";

export default function PortfolioPage() {
  const { allStatus, vault, totalNetPnl, dailyTarget, cashBalance } = useAllAssetsStatus();
  const { trades } = useUnifiedTrades();

  // Statistics calculation
  const totalTrades = trades.length;
  const profitableTrades = trades.filter((t: any) => t.pnl > 0).length;
  const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
  
  // Calculate total global crypto holdings
  const coins = ['BTC', 'ETH', 'SOL'];
  const activePositions = coins.filter(c => Math.abs((allStatus[c]?.btc_holdings || 0) - 0.5) > 0.00000001).length;

  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-sky-50 via-white to-sky-100 font-sans selection:bg-sky-100">
      <Sidebar />
      <main className="flex-1 flex flex-col p-12 md:p-20 overflow-y-auto no-scrollbar">
        <div className="mx-auto max-w-[1800px] w-full space-y-12">
          
          <header className="flex justify-between items-end">
             <div className="space-y-2">
                <div className="flex items-center gap-3 text-sky-500 mb-2">
                   <PieChart className="w-8 h-8" />
                   <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-900">Global Portfolio</h1>
                </div>
                <p className="text-slate-400 font-medium text-lg">Multi-asset performance analytics and realized gain audit.</p>
             </div>
             <div className="bg-white/60 backdrop-blur-xl border border-white px-6 py-4 rounded-3xl shadow-sm flex items-center gap-4">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600"><Activity className="w-5 h-5" /></div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Net PnL</p>
                   <p className={`text-lg font-black tracking-tight ${totalNetPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                     {totalNetPnl >= 0 ? '+' : '-'}Rp {Math.abs(totalNetPnl).toLocaleString('id-ID')}
                   </p>
                </div>
             </div>
          </header>

          {/* HEADER SECTION: GLOBAL SUMMARY (Replacing the 4-card grid) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {/* Total Equity Card */}
             <GlassCard className="bg-gradient-to-br from-slate-800 to-slate-900 border-none text-white p-10 shadow-2xl h-full flex flex-col justify-center relative overflow-hidden group" delay={0.1}>
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl group-hover:bg-sky-500/20 transition-all duration-700" />
                <div className="flex items-center gap-3 mb-8 opacity-80 relative z-10"><Wallet className="w-6 h-6 text-sky-400" /><h3 className="font-black text-xs uppercase tracking-widest leading-none">Total Pooled Equity</h3></div>
                <h2 className="text-4xl lg:text-5xl font-black tracking-tighter leading-none mb-6 relative z-10">
                   Rp {(status?.equity ?? 0).toLocaleString('id-ID')}
                </h2>
                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest relative z-10 text-slate-400">
                   <span>OPERATIONAL CASH: Rp {(cashBalance ?? 0).toLocaleString('id-ID')}</span>
                </div>
             </GlassCard>

             {/* Global Win Rate Card */}
             <GlassCard className="p-10 border-white shadow-xl flex flex-col justify-center bg-white/80 backdrop-blur-xl h-full" delay={0.15}>
                <div className="flex items-center gap-3 mb-8 text-emerald-500"><TrendingUp className="w-6 h-6" /><h3 className="font-black text-xs uppercase tracking-widest leading-none">Global Win Rate</h3></div>
                <div className="flex items-end gap-3 mb-2">
                   <h2 className="text-4xl lg:text-5xl font-black tracking-tighter leading-none text-slate-900">
                      {winRate.toFixed(1)}<span className="text-3xl text-slate-400">%</span>
                   </h2>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mt-4">
                   <span className="text-emerald-500">{profitableTrades} WINS</span> / {totalTrades} TOTAL EXECUTIONS
                </p>
             </GlassCard>

             {/* Active Positions Card */}
             <GlassCard className="p-10 border-white shadow-xl flex flex-col justify-center bg-white/80 backdrop-blur-xl h-full" delay={0.2}>
                <div className="flex items-center gap-3 mb-8 text-purple-500"><Coins className="w-6 h-6" /><h3 className="font-black text-xs uppercase tracking-widest leading-none">Active Asset Nodes</h3></div>
                <div className="flex items-end gap-3 mb-6">
                   <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-none">{activePositions}</h2>
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-1 leading-none tracking-widest">DEPLOYED</p>
                </div>
                <div className="flex gap-2">
                   {coins.map(c => {
                      const isDeployed = Math.abs((allStatus[c]?.btc_holdings || 0) - 0.5) > 0.00000001;
                      return (
                         <div key={c} className={`flex-1 py-1.5 rounded-md text-[9px] font-black text-center uppercase tracking-widest border transition-all ${isDeployed ? 'bg-purple-500/10 border-purple-500/20 text-purple-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                            {c}
                         </div>
                      );
                   })}
                </div>
             </GlassCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Transaction Ledger (Table) */}
             <GlassCard className="lg:col-span-2 p-8 border-white shadow-xl min-h-[600px] flex flex-col" delay={0.3}>
                <div className="flex items-center gap-3 mb-8">
                   <History className="w-6 h-6 text-sky-500" />
                   <h3 className="font-black text-slate-800 uppercase tracking-widest">Global Transaction Ledger</h3>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar">
                   <table className="w-full text-left border-separate border-spacing-y-3">
                      <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                         <tr>
                            <th className="pb-4 pl-6">Time</th>
                            <th className="pb-4">Asset Node</th>
                            <th className="pb-4">Action</th>
                            <th className="pb-4 text-right pr-6">Realized PnL</th>
                         </tr>
                      </thead>
                      <tbody className="text-slate-600 font-bold">
                         <AnimatePresence>
                         {trades.map((t: any, i: number) => (
                            <motion.tr 
                               initial={{ opacity: 0, y: 10 }}
                               animate={{ opacity: 1, y: 0 }}
                               key={i} 
                               className="group transition-all hover:scale-[1.01]"
                            >
                               <td className="py-4 pl-6 bg-slate-50/50 rounded-l-2xl border-y border-l border-white/60 font-mono text-[10px] text-slate-400">{new Date(t.time).toLocaleString('id-ID')}</td>
                               <td className="py-4 bg-slate-50/50 border-y border-white/60 text-slate-800 font-black">{t.coin}/IDR</td>
                               <td className="py-4 bg-slate-50/50 border-y border-white/60">
                                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase shadow-sm ${t.type.includes('LONG') || t.type.includes('BUY') ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>{t.type.replace('_',' ')}</span>
                               </td>
                               <td className={`py-4 pr-6 text-right rounded-r-2xl bg-slate-50/50 border-y border-r border-white/60 text-xs font-black ${t.pnl > 0 ? 'text-emerald-500' : t.pnl < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                  {t.pnl !== 0 ? `${t.pnl > 0 ? '+' : ''}Rp ${Math.abs(t.pnl).toLocaleString('id-ID')}` : 'EXECUTING'}
                               </td>
                            </motion.tr>
                         ))}
                         </AnimatePresence>
                         {trades.length === 0 && (
                            <tr><td colSpan={4} className="py-20 text-center text-slate-300 italic text-xs font-black uppercase tracking-widest">No historical trades detected yet.</td></tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </GlassCard>

             {/* Right: Portfolio Allocation or Growth Chart placeholder */}
             <div className="space-y-8 flex flex-col h-full">
                <GlassCard className="p-8 border-white shadow-xl flex flex-col justify-center text-center gap-6" delay={0.4}>
                   <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-500"><Lock className="w-10 h-10" /></div>
                   <div>
                      <h4 className="font-black text-slate-800 uppercase tracking-widest text-sm mb-2">The Vault</h4>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                         Accumulated 30% daily profit harvest. Securely isolated from operational trading capital.
                      </p>
                   </div>
                   <div className="pt-6 border-t border-slate-100">
                      <p className="text-[10px] font-bold opacity-40 uppercase mb-1">Total Harvested</p>
                      <h2 className="text-3xl font-black text-amber-500 tracking-tighter">Rp {(vault ?? 0).toLocaleString('id-ID')}</h2>
                   </div>
                </GlassCard>

                <div className="p-8 rounded-[40px] bg-slate-900 text-white shadow-2xl space-y-6 flex-1 flex flex-col justify-end relative overflow-hidden group">
                   <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-sky-500/20 rounded-full blur-3xl group-hover:bg-sky-500/30 transition-all duration-700" />
                   <div className="flex items-center gap-3 opacity-60 relative z-10"><DollarSign className="w-5 h-5" /><h3 className="font-black text-[10px] uppercase tracking-widest">Operational Reserve</h3></div>
                   <div className="relative z-10">
                      <p className="text-[10px] font-bold opacity-40 uppercase mb-1">Available IDR</p>
                      <h2 className="text-4xl font-black tracking-tighter">Rp {(cashBalance ?? 0).toLocaleString('id-ID')}</h2>
                   </div>
                   <button className="w-full py-4 mt-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black uppercase text-[10px] tracking-widest transition-all relative z-10 backdrop-blur-md">Withdrawal Hub</button>
                </div>
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}
