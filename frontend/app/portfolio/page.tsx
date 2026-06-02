"use client";

import { motion } from "framer-motion";
import { Wallet, PieChart, History, TrendingUp, TrendingDown, ArrowRightLeft, DollarSign, Activity } from "lucide-react";
import { useState } from "react";
import GlassCard from "@/components/dashboard/GlassCard";
import Sidebar from "@/components/dashboard/Sidebar";
import { useBotStatus, useTradeHistory } from "@/hooks/useDashboardData";

export default function PortfolioPage() {
  const { status } = useBotStatus();
  const { trades } = useTradeHistory();

  // Statistics calculation
  const totalTrades = trades.length;
  const profitableTrades = trades.filter((t: any) => t.pnl > 0).length;
  const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
  const totalPnL = trades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);

  return (
    <div className="flex min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-sky-50 via-white to-sky-100 font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col p-8 md:p-16">
        <div className="mx-auto max-w-[1400px] w-full space-y-12">
          
          <header className="flex justify-between items-end">
             <div className="space-y-2">
                <div className="flex items-center gap-3 text-sky-500 mb-2">
                   <PieChart className="w-8 h-8" />
                   <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-900">Portfolio & Growth</h1>
                </div>
                <p className="text-slate-400 font-medium text-lg">Detailed performance analytics and realized gain audit.</p>
             </div>
             <div className="bg-white/60 backdrop-blur-xl border border-white px-6 py-4 rounded-3xl shadow-sm flex items-center gap-4">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600"><Activity className="w-5 h-5" /></div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Live Profit</p>
                   <p className={`text-lg font-black tracking-tight ${totalPnL >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                     {totalPnL >= 0 ? '+' : '-'}Rp {Math.abs(totalPnL).toLocaleString('id-ID')}
                   </p>
                </div>
             </div>
          </header>

          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
             <GlassCard className="p-6 border-white shadow-sm flex items-center gap-5" delay={0.1}>
                <div className="p-3 bg-sky-500/10 rounded-2xl text-sky-500"><Wallet className="w-6 h-6" /></div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Equity</p>
                   <p className="text-lg font-black text-slate-900">Rp {(status?.equity ?? 0).toLocaleString('id-ID')}</p>
                </div>
             </GlassCard>
             <GlassCard className="p-6 border-white shadow-sm flex items-center gap-5" delay={0.15}>
                <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><TrendingUp className="w-6 h-6" /></div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Win Rate</p>
                   <p className="text-lg font-black text-slate-900">{winRate.toFixed(1)}%</p>
                </div>
             </GlassCard>
             <GlassCard className="p-6 border-white shadow-sm flex items-center gap-5" delay={0.2}>
                <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-500"><History className="w-6 h-6" /></div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Trades</p>
                   <p className="text-lg font-black text-slate-900">{totalTrades}</p>
                </div>
             </GlassCard>
             <GlassCard className="p-6 border-white shadow-sm flex items-center gap-5" delay={0.25}>
                <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500"><ArrowRightLeft className="w-6 h-6" /></div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Success Ratio</p>
                   <p className="text-lg font-black text-slate-900">{profitableTrades}/{totalTrades}</p>
                </div>
             </GlassCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Transaction Ledger (Table) */}
             <GlassCard className="lg:col-span-2 p-8 border-white shadow-xl min-h-[600px] flex flex-col" delay={0.3}>
                <div className="flex items-center gap-3 mb-8">
                   <History className="w-6 h-6 text-sky-500" />
                   <h3 className="font-black text-slate-800 uppercase tracking-widest">Transaction Ledger</h3>
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar">
                   <table className="w-full text-left border-separate border-spacing-y-3">
                      <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                         <tr>
                            <th className="pb-4 pl-6">Time</th>
                            <th className="pb-4">Asset</th>
                            <th className="pb-4">Type</th>
                            <th className="pb-4 text-right pr-6">PnL Realized</th>
                         </tr>
                      </thead>
                      <tbody className="text-slate-600 font-bold">
                         {trades.map((t: any, i: number) => (
                            <tr key={i} className="group transition-all hover:scale-[1.01]">
                               <td className="py-4 pl-6 bg-slate-50/50 rounded-l-2xl border-y border-l border-white/60 font-mono text-[10px] text-slate-400">{new Date(t.time).toLocaleString('id-ID')}</td>
                               <td className="py-4 bg-slate-50/50 border-y border-white/60 text-slate-800 font-black">{t.coin}/IDR</td>
                               <td className="py-4 bg-slate-50/50 border-y border-white/60">
                                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase shadow-sm ${t.type.includes('LONG') ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>{t.type.replace('_',' ')}</span>
                               </td>
                               <td className={`py-4 pr-6 text-right rounded-r-2xl bg-slate-50/50 border-y border-r border-white/60 text-xs font-black ${t.pnl > 0 ? 'text-emerald-500' : t.pnl < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                  {t.pnl !== 0 ? `${t.pnl > 0 ? '+' : ''}Rp ${Math.abs(t.pnl).toLocaleString('id-ID')}` : 'CLOSED'}
                               </td>
                            </tr>
                         ))}
                         {trades.length === 0 && (
                            <tr><td colSpan={4} className="py-20 text-center text-slate-300 italic">No historical trades detected yet.</td></tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </GlassCard>

             {/* Right: Portfolio Allocation or Growth Chart placeholder */}
             <div className="space-y-8">
                <GlassCard className="p-8 border-white shadow-xl flex flex-col justify-center text-center gap-6" delay={0.4}>
                   <div className="w-24 h-24 bg-sky-500/10 rounded-full flex items-center justify-center mx-auto text-sky-500"><TrendingUp className="w-10 h-10" /></div>
                   <div>
                      <h4 className="font-black text-slate-800 uppercase tracking-widest text-sm mb-2">Growth Analysis</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                         Your portfolio is exhibiting **Healthy Momentum**. The Zenith brain is successfully capturing trend deviations.
                      </p>
                   </div>
                   <div className="pt-6 border-t border-slate-100 flex flex-col gap-2">
                      <div className="flex justify-between text-[10px] font-black uppercase text-slate-400"><span>Target ROI</span><span>15.0%</span></div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-white">
                         <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (status?.profit_pct || 0) * 5)}%` }} className="h-full bg-sky-500 shadow-lg shadow-sky-200" />
                      </div>
                   </div>
                </GlassCard>

                <div className="p-8 rounded-[40px] bg-slate-900 text-white shadow-2xl space-y-6">
                   <div className="flex items-center gap-3 opacity-60"><DollarSign className="w-5 h-5" /><h3 className="font-black text-[10px] uppercase tracking-widest">Liquid Reserve</h3></div>
                   <div>
                      <p className="text-[10px] font-bold opacity-40 uppercase mb-1">Available IDR</p>
                      <h2 className="text-2xl font-black tracking-tighter">Rp {(status?.balance_idr ?? 0).toLocaleString('id-ID')}</h2>
                   </div>
                   <button className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black uppercase text-[10px] tracking-widest transition-all">Withdrawal Hub</button>
                </div>
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}
