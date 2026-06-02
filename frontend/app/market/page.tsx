"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, BarChart3, History as HistoryIcon, BrainCircuit, Target, Zap, ChevronDown, CheckCircle2, XCircle, ShieldCheck, Wallet, AlertTriangle
} from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import GlassCard from "@/components/dashboard/GlassCard";
import TradingChart from "@/components/dashboard/TradingChart";
import Sidebar from "@/components/dashboard/Sidebar";
import { useBotStatus, useMarketData, useTradeHistory } from "@/hooks/useDashboardData";
import { useSearchParams } from "next/navigation";
import { getApiUrl } from "@/lib/constants";

function MarketContent() {
  const searchParams = useSearchParams();
  const [isSwitching, setIsSwitching] = useState(false);
  const [loadingStep, setLoadingLoadingStep] = useState(0);
  const [showCoinMenu, setShowCoinMenu] = useState(false);

  const { status, isError: statusError, isLoading: statusLoading } = useBotStatus();
  const { marketData, prediction, predictionHistory, isError: marketError, isLoading: marketLoading } = useMarketData();
  const { trades, isError: tradesError } = useTradeHistory();

  const isLoading = statusLoading || marketLoading;
  const loadingMessages = ["Initializing Neural Nodes...", "Analyzing Market Delta...", "Finalizing Sync..."];

  const isConflict = (prediction?.signal === 'BUY' && (status?.obi ?? 0) < 0) || (prediction?.signal === 'SELL' && (status?.obi ?? 0) > 0);

  useEffect(() => {
    const coin = searchParams.get('coin');
    const tf = searchParams.get('tf');
    const sync = async () => {
      if (coin && coin !== status?.coin) await fetch(`${getApiUrl()}/api/set_coin?coin=${coin}`, { method: 'POST' });
      if (tf && tf !== status?.tf) await fetch(`${getApiUrl()}/api/set_timeframe?tf=${tf}`, { method: 'POST' });
    };
    sync();
  }, [searchParams]);

  const handleCoinSwitch = async (coin: string) => {
    setIsSwitching(true); setShowCoinMenu(false); setLoadingLoadingStep(0);
    const interval = setInterval(() => setLoadingLoadingStep(p => (p < 2 ? p + 1 : p)), 1000);
    await fetch(`${getApiUrl()}/api/set_coin?coin=${coin}`, { method: 'POST' });
    setTimeout(() => { clearInterval(interval); setIsSwitching(false); }, 4000);
  };

  const handleTimeframeSwitch = async (tf: string) => {
    setIsSwitching(true);
    await fetch(`${getApiUrl()}/api/set_timeframe?tf=${tf}`, { method: 'POST' });
    setTimeout(() => setIsSwitching(false), 2000);
  };

  return (
    <div className="flex flex-col gap-10 pb-32">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <GlassCard className="lg:col-span-3 flex flex-col p-10 border-white shadow-xl relative min-h-[700px] bg-white/80" delay={0.1}>
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-sky-500/10 rounded-[24px] text-sky-500 shadow-sm"><BarChart3 className="w-8 h-8" /></div>
              <div className="relative">
                <button onClick={() => setShowCoinMenu(!showCoinMenu)} className="flex items-center gap-3 group">
                  <h2 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">{status?.coin || 'BTC'}/IDR</h2>
                  <ChevronDown className={`w-7 h-7 text-slate-300 group-hover:text-sky-500 transition-transform duration-500 ${showCoinMenu ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showCoinMenu && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute left-0 mt-6 w-64 bg-white/95 backdrop-blur-3xl border border-white/60 shadow-2xl rounded-[32px] z-50 p-2">
                      {['BTC', 'ETH', 'SOL'].map(c => (
                        <button key={c} onClick={() => handleCoinSwitch(c)} className={`w-full text-left px-6 py-4 rounded-2xl text-base font-black uppercase transition-all ${status?.coin === c ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>{c}/IDR</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="hidden sm:flex items-center gap-3 bg-emerald-500/10 px-5 py-2 rounded-full border border-emerald-500/20 shadow-sm">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest leading-none">Intelligence Live</span>
              </div>
            </div>
            <div className="flex bg-slate-100/50 p-2 rounded-[24px] border border-white/50 h-fit">
              {['1h', '5m'].map(tf => (
                <button key={tf} onClick={() => handleTimeframeSwitch(tf)} disabled={isSwitching} className={`px-10 py-3 rounded-[18px] text-sm font-black uppercase transition-all duration-300 ${status?.tf === tf ? 'bg-white text-sky-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}>{tf}</button>
              ))}
            </div>
          </div>
          <div className="relative flex-1 min-h-[400px] bg-white/5 rounded-[40px] overflow-hidden border border-white/40">
            <AnimatePresence>
              {(isLoading || isSwitching) && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 bg-white/80 backdrop-blur-2xl flex items-center justify-center border border-white">
                  <div className="flex flex-col items-center gap-6">
                    <div className="w-16 h-12 flex gap-1.5 items-end">
                      {[0, 1, 2].map(i => (
                        <motion.div key={i} animate={{ height: [15, 50, 15] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }} className="w-2.5 bg-sky-500 rounded-full" />
                      ))}
                    </div>
                    <p className="text-xs font-black text-slate-800 uppercase tracking-[0.4em] animate-pulse">{loadingMessages[loadingStep]}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <TradingChart data={marketData} prediction={prediction} predictionHistory={predictionHistory} />
          </div>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-7 rounded-[40px] bg-white/60 border border-white shadow-sm flex items-center gap-6">
              <div className="p-4 bg-sky-50 rounded-3xl"><Target className="w-8 h-8 text-sky-500" /></div>
              <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Sniper Projection</p><p className="text-xl font-black text-slate-900 tracking-tight">Rp {(prediction?.price ?? 0).toLocaleString('id-ID')}</p></div>
            </div>
            <div className="p-7 rounded-[40px] bg-white/60 border border-white shadow-sm flex items-center gap-6">
              <div className="p-4 bg-emerald-50 rounded-3xl"><Zap className={`w-8 h-8 ${prediction?.confidence > 0.7 ? 'text-emerald-500' : 'text-amber-500'}`} /></div>
              <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Signal Conviction</p><p className="text-xl font-black text-slate-900 tracking-tight">{(prediction?.confidence * 100).toFixed(1)}% · {prediction?.signal}</p></div>
            </div>
            <div className="p-7 rounded-[40px] bg-white/60 border border-white shadow-sm flex items-center gap-6">
              <div className="p-4 bg-purple-50 rounded-3xl"><BrainCircuit className="w-8 h-8 text-purple-500" /></div>
              <div><p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Neural Status</p><p className="text-sm font-black text-slate-900 uppercase">{(status?.error_rate ?? 0).toFixed(2)}% MAPE · <span className={prediction?.macro === 'BULLISH' ? 'text-emerald-500' : 'text-rose-500'}>{prediction?.macro}</span></p></div>
            </div>
          </div>
        </GlassCard>
        <div className="flex flex-col gap-6">
          <GlassCard className="bg-gradient-to-br from-sky-500 to-sky-600 border-none text-white shadow-2xl p-8 flex flex-col justify-center min-h-[220px]" delay={0.2}>
            <div className="flex items-center gap-3 mb-6 opacity-80"><Wallet className="w-5 h-5" /><h3 className="font-black text-xs uppercase tracking-widest">Portfolio Assets</h3></div>
            <div className="space-y-6">
              <div><p className="text-[11px] font-bold opacity-70 uppercase mb-2 leading-none">Total Equity</p><h2 className="text-3xl font-black tracking-tighter leading-none">Rp {(status?.equity ?? 0).toLocaleString('id-ID')}</h2></div>
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/20 text-xs font-black">
                <div><p className="opacity-70 mb-2 uppercase">IDR Balance</p><p>Rp {(status?.balance_idr ?? 0).toLocaleString('id-ID')}</p></div>
                <div><p className="opacity-70 mb-2 uppercase">{status?.coin} Assets</p><p>{(status?.btc_holdings ?? 0).toFixed(4)}</p></div>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="border-white p-8 flex flex-col justify-center min-h-[260px] shadow-lg bg-white/80" delay={0.25}>
            <div className="flex items-center gap-3 mb-5 text-emerald-500"><Activity className="w-5 h-5" /><h3 className="font-black text-xs uppercase tracking-widest text-slate-800">Performance</h3></div>
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div><p className="text-xs font-black text-slate-400 uppercase mb-2">Growth</p><p className={`text-2xl font-black ${status?.profit_pct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{status?.profit_pct >= 0 ? '+' : ''}{(status?.profit_pct ?? 0).toFixed(2)}%</p></div>
              <div><p className="text-xs font-black text-slate-400 uppercase mb-2">Win Rate</p><p className="text-2xl font-black text-slate-800">{(status?.winrate ?? 0).toFixed(1)}%</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-8">
              <button onClick={() => fetch(`${getApiUrl()}/api/manual_buy`, { method: 'POST' })} className="py-4 rounded-[20px] bg-emerald-500 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-100 active:scale-95 transition-all">Buy</button>
              <button onClick={() => fetch(`${getApiUrl()}/api/manual_sell`, { method: 'POST' })} className="py-4 rounded-[20px] bg-rose-500 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-rose-100 active:scale-95 transition-all">Sell</button>
            </div>
          </GlassCard>
          <GlassCard className="bg-slate-50/20 border-white p-8 flex flex-col justify-center min-h-[220px] shadow-sm bg-white/80" delay={0.3}>
            <div className="flex items-center gap-3 mb-6 text-sky-600"><ShieldCheck className="w-6 h-6" /><h3 className="font-black text-xs uppercase tracking-widest">Logic Pipeline</h3></div>
            <div className="space-y-4">
              {[
                { label: 'Macro Consensus', ok: prediction?.macro !== 'NEUTRAL' },
                { label: 'WOBI Strength', ok: Math.abs(status?.obi ?? 0) > 0.1 },
                { label: 'Confidence Threshold', ok: (prediction?.confidence ?? 0) > 0.7 }
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between px-6 py-4 rounded-[24px] bg-white border border-slate-100 shadow-sm">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                  {item.ok ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <XCircle className="w-6 h-6 text-slate-200" />}
                </div>
              ))}
              {isConflict && (
                <div className="mt-4 p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-4 animate-pulse">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-tight">Signal Conflict Detected</span>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <GlassCard className="lg:col-span-3 flex flex-col border-white p-10 shadow-lg bg-white/80" delay={0.4}>
          <div className="flex items-center justify-between mb-8 sticky top-0 bg-white/10 z-10 backdrop-blur-sm">
            <div className="flex items-center gap-4"><HistoryIcon className="w-7 h-7 text-sky-500" /><h3 className="font-black text-slate-800 text-base uppercase tracking-[0.2em]">Execution Ledger</h3></div>
            <span className="text-xs font-black text-slate-400 uppercase bg-slate-50 px-6 py-2.5 rounded-full border border-slate-100 shadow-sm tracking-widest leading-none">Live Data Stream</span>
          </div>
          <div className="bg-white/40 rounded-[40px] border border-white p-6">
            <table className="w-full text-left border-separate border-spacing-y-4">
              <tbody className="text-slate-600 font-bold">
                {trades.length === 0 ? <tr><td className="py-24 text-center text-slate-300 italic text-base uppercase tracking-[0.3em] animate-pulse">Scanning market signals...</td></tr> : trades.map((t: any, i: number) => (
                  <tr key={i} className="transition-all hover:translate-x-3 group cursor-default">
                    <td className="py-5 pl-8 font-mono text-sm text-slate-400 bg-white rounded-l-[32px] border-y border-l border-slate-50">{new Date(t.time).toLocaleTimeString('id-ID')}</td>
                    <td className="py-5 bg-white border-y border-slate-50">
                      <span className={`px-6 py-2 rounded-2xl text-xs font-black uppercase shadow-lg ${t.type.includes('LONG') ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-rose-500 text-white shadow-rose-100'}`}>{t.type.replace('_', ' ')}</span>
                    </td>
                    <td className="py-5 bg-white border-y border-slate-50 text-xl text-slate-900 font-black tracking-tighter italic">Rp {t.price.toLocaleString('id-ID')}</td>
                    <td className={`py-5 pr-8 text-right rounded-r-[32px] bg-white border-y border-r border-slate-50 text-base font-black ${t.pnl > 0 ? 'text-emerald-500' : t.pnl < 0 ? 'text-rose-500' : 'text-slate-400'}`}>{t.pnl !== 0 ? `${t.pnl > 0 ? '+' : ''}Rp ${Math.abs(t.pnl).toLocaleString('id-ID')}` : 'EXECUTING'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
        <GlassCard className="flex flex-col border-white shadow-lg p-10 bg-white/80" delay={0.5}>
          <div className="flex items-center gap-4 mb-8 text-slate-800"><Activity className="w-7 h-7 text-sky-500" /><h3 className="font-black text-xs uppercase tracking-[0.2em]">Liquidity Power</h3></div>
          <div className="flex-1 flex flex-col justify-center space-y-10 px-2">
            <div className="flex justify-between text-xs font-black uppercase tracking-widest">
              <span className={(status?.obi ?? 0) > 0.05 ? "text-emerald-500" : "text-slate-300"}>Bids Depth</span>
              <span className={(status?.obi ?? 0) < -0.05 ? "text-rose-500" : "text-slate-300"}>Asks Depth</span>
            </div>
            <div className="relative h-7 w-full bg-slate-100 rounded-full flex overflow-hidden border-2 border-white shadow-inner">
              <motion.div animate={{ width: `${50 + (status?.obi ?? 0) * 50}%`, backgroundColor: (status?.obi ?? 0) > 0.05 ? '#10b981' : '#e2e8f0' }} className="h-full transition-colors duration-500" />
              <motion.div animate={{ backgroundColor: (status?.obi ?? 0) < -0.05 ? '#f43f5e' : '#e2e8f0' }} className="h-full flex-1 transition-colors duration-500" />
              <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white z-10 shadow-sm" />
            </div>
            <div className="text-center leading-none pt-4">
              <p className="text-6xl font-black text-slate-900 tracking-tighter">{(status?.obi ?? 0).toFixed(2)}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-5">Market Sentiment Index</p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

export default function MarketPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-sky-50 via-white to-sky-100 font-sans selection:bg-sky-100">
      <Sidebar />
      <main className="flex-1 flex flex-col p-12 md:p-20 overflow-y-auto no-scrollbar">
        <div className="mx-auto max-w-[1700px] w-full min-h-0">
          <Suspense fallback={<div className="h-screen flex items-center justify-center text-sky-500 font-black uppercase tracking-widest animate-pulse">Initializing Market Engine...</div>}>
            <MarketContent />
          </Suspense>
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
