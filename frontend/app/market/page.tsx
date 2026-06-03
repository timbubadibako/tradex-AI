"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, History as HistoryIcon, BrainCircuit, Target, Zap, ChevronDown, CheckCircle2, XCircle, ShieldCheck, Wallet, ArrowUpRight, TrendingUp, AlertTriangle, ShieldAlert
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
  const [mounted, setMounted] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState<'coin' | 'global'>('coin');

  const { status, isLoading: statusLoading } = useBotStatus();
  const { marketData, prediction, predictionHistory, isLoading: marketLoading } = useMarketData();
  const { trades } = useTradeHistory();

  const isLoading = statusLoading || marketLoading;
  const loadingMessages = ["Initializing Neural Nodes...", "Analyzing Market Delta...", "Finalizing Sync..."];

  useEffect(() => {
    setMounted(true);
    const coin = searchParams.get('coin');
    const tf = searchParams.get('tf');

    const sync = async () => {
      try {
        if (coin && coin !== status?.coin) {
          await fetch(`${getApiUrl()}/api/set_coin?coin=${coin}`, { method: 'POST' });
        }
        if (tf && tf !== status?.tf) {
          await fetch(`${getApiUrl()}/api/set_timeframe?tf=${tf}`, { method: 'POST' });
        }
      } catch (err) {
        console.error(`[NEXT API ERROR] Failed to synchronize params: ${err}`);
      }
    };
    sync();
  }, [searchParams, status?.coin, status?.tf]);

  if (!mounted) return <div className="h-screen w-full bg-slate-50 animate-pulse" />;

  const handleCoinSwitch = async (coin: string) => {
    setIsSwitching(true);
    setShowCoinMenu(false);
    setLoadingLoadingStep(0);
    const interval = setInterval(() => setLoadingLoadingStep(p => (p < 2 ? p + 1 : p)), 1000);

    try {
      await fetch(`${getApiUrl()}/api/set_coin?coin=${coin}`, { method: 'POST' });
    } catch (err) {
      console.error(err);
    }

    setTimeout(() => {
      clearInterval(interval);
      setIsSwitching(false);
    }, 4000);
  };

  const handleTimeframeSwitch = async (tf: string) => {
    setIsSwitching(true);
    try {
      await fetch(`${getApiUrl()}/api/set_timeframe?tf=${tf}`, { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    setTimeout(() => setIsSwitching(false), 2000);
  };

  const currentCoin = status?.coin || 'BTC';
  const tradeList = Array.isArray(trades) ? trades : [];
  const filteredTrades = ledgerFilter === 'coin'
    ? tradeList.filter(t => t?.coin === currentCoin)
    : tradeList;

  const confidenceValue = prediction?.confidence ?? 0;
  const errorRateValue = status?.error_rate ?? 0;

  const currentPrice = marketData && marketData.length > 0 ? marketData[marketData.length - 1].close : 0;
  const holdingsCoin = status?.btc_holdings ?? 0.5;
  const winRate = status?.winrate ?? 0;

  // KALKULASI PROJECTION GAP
  const predictedPrice = prediction?.price ?? 0;
  const targetGapIdr = predictedPrice - currentPrice;
  const targetGapPct = currentPrice > 0 ? (targetGapIdr / currentPrice) * 100 : 0;
  const sign = targetGapIdr >= 0 ? '+' : '';

  // Pipeline Logic Checking
  const isMacroOk = prediction?.macro !== 'NEUTRAL' && Boolean(prediction?.macro);
  const isTfAligned = prediction?.signal === 'BUY' || prediction?.signal === 'SELL';
  const isWobiOk = Math.abs(status?.obi ?? 0) > 0.1;
  const isConfOk = confidenceValue > 0.7;
  
  // Neural Divergence: 1H Trend vs 5M Signal
  const isConflict = (prediction?.macro === 'BULLISH' && prediction?.micro === 'SELL') || 
                     (prediction?.macro === 'BEARISH' && prediction?.micro === 'BUY');

  return (
    <div className="flex flex-col gap-10 pb-32">

      {/* TOP ROW: CORE AI INSIGHTS (Refined Dashboard Style) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* CARD 1: Sniper Projection */}
        <GlassCard className="bg-gradient-to-br from-slate-800 to-slate-900 border-none text-white p-10 shadow-2xl h-full flex flex-col justify-center relative overflow-hidden group" delay={0.1}>
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl group-hover:bg-sky-500/20 transition-all duration-700" />
          <div className="flex items-center gap-3 mb-8 opacity-80 relative z-10"><Target className="w-6 h-6 text-sky-400" /><h3 className="font-black text-xs uppercase tracking-widest leading-none">Sniper Projection</h3></div>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tighter leading-none mb-6 relative z-10">Rp {(prediction?.price ?? 0).toLocaleString('id-ID')}</h2>
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest relative z-10">
             <span className={`px-3 py-1 rounded-full bg-white/10 ${targetGapIdr >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {sign}{targetGapPct.toFixed(2)}% GAP
             </span>
             <span className="text-slate-400">Targeting {currentCoin} Evolution</span>
          </div>
        </GlassCard>

        {/* CARD 2: Signal Conviction */}
        <GlassCard className="p-10 border-white shadow-xl flex flex-col justify-center bg-white/80 backdrop-blur-xl h-full" delay={0.15}>
           <div className="flex items-center gap-3 mb-8 text-emerald-500"><Zap className="w-6 h-6" /><h3 className="font-black text-xs uppercase tracking-widest leading-none">Signal Conviction</h3></div>
           <div className="flex items-end gap-3 mb-2">
              <h2 className={`text-4xl lg:text-5xl font-black tracking-tighter leading-none ${prediction?.signal === 'BUY' ? 'text-emerald-600' : prediction?.signal === 'SELL' ? 'text-rose-600' : 'text-slate-900'}`}>
                 {(confidenceValue * 100).toFixed(1)}% <span className="text-xl lg:text-2xl opacity-60">· {prediction?.signal || 'WAIT'}</span>
              </h2>
           </div>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mt-4">
              Neural Precision: <span className="text-emerald-600">{winRate.toFixed(1)}% Win Rate</span>
           </p>
        </GlassCard>

        {/* CARD 3: Neural Status */}
        <GlassCard className="p-10 border-white shadow-xl flex flex-col justify-center bg-white/80 backdrop-blur-xl h-full" delay={0.2}>
           <div className="flex items-center gap-3 mb-8 text-purple-500"><BrainCircuit className="w-6 h-6" /><h3 className="font-black text-xs uppercase tracking-widest leading-none">Neural Status</h3></div>
           <div className="flex items-end gap-3 mb-6">
              <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-none">{errorRateValue.toFixed(2)}%</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1 leading-none tracking-widest">MAPE Deviation</p>
           </div>
           <div className="flex gap-1.5 items-end h-8">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                 <motion.div key={i} animate={{ height: [12, 32, 16, 28, 12] }} transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.1 }} className="flex-1 bg-sky-400/40 rounded-full border border-sky-400/10" />
              ))}
           </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">

        {/* MAIN CHART AREA */}
        <GlassCard className="lg:col-span-3 flex flex-col p-6 border-white shadow-2xl relative h-[850px] bg-white/90" delay={0.2}>
          <div className="flex items-center justify-between mb-4 h-[60px] shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 text-slate-800 rounded-xl shadow-sm"><BarChart3 className="w-4 h-4" /></div>
              <div className="relative">
                <button onClick={() => setShowCoinMenu(!showCoinMenu)} className="flex items-center gap-2 group">
                  <h2 className="text-lg font-black text-slate-900 tracking-tighter uppercase leading-none">{currentCoin}/IDR</h2>
                  <ChevronDown className={`w-4 h-4 text-slate-300 group-hover:text-sky-500 transition-transform duration-500 ${showCoinMenu ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showCoinMenu && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute left-0 mt-4 w-56 bg-white/95 backdrop-blur-3xl border border-white/60 shadow-2xl rounded-3xl z-50 p-1">
                      {['BTC', 'ETH', 'SOL'].map(c => (
                        <button key={c} onClick={() => handleCoinSwitch(c)} className={`w-full text-left px-5 py-3 rounded-2xl text-xs font-black uppercase transition-all ${status?.coin === c ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>{c}/IDR</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="flex bg-slate-100/50 p-1 rounded-xl border border-white/50 h-fit">
              {['1h', '5m'].map(tf => (
                <button key={tf} onClick={() => handleTimeframeSwitch(tf)} disabled={isSwitching} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all duration-300 ${status?.tf === tf ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{tf}</button>
              ))}
            </div>
          </div>

          {/* SAKTI FIX: Ubah pembungkus dari 'flex-1' menjadi tinggi absolut 'h-[720px]' agar engine canvas ECharts mengenali dimensi rendering vertikal secara penuh */}
          <div className="relative h-[720px] bg-slate-50/50 rounded-3xl overflow-hidden border border-slate-100 p-2 flex flex-col min-h-0">
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
            <TradingChart
              data={marketData || []}
              prediction={prediction}
              predictionHistory={predictionHistory || []}
              trades={tradeList.filter(t => t?.coin === currentCoin)}
              obi={status?.obi || 0}
            />
          </div>
        </GlassCard>

        {/* RIGHT SIDEBAR: SIZED TO MATCH CHART (850PX) */}
        <div className="flex flex-col gap-10 h-[850px]">
          
          {/* CARD 1: ASSET SNAPSHOT */}
          <GlassCard className="flex-1 bg-white/90 border-white shadow-xl p-8 flex flex-col justify-center" delay={0.25}>
             <div className="flex items-center gap-3 mb-8 text-sky-500 shrink-0"><Wallet className="w-6 h-6" /> <h3 className="font-black text-xs uppercase tracking-widest leading-none">Asset Snapshot</h3></div>
             <div className="space-y-8 flex-1 flex flex-col justify-center">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest leading-none">Net PnL ({currentCoin})</p>
                   <h2 className={`text-3xl font-black tracking-tighter leading-none ${(status?.net_pnl ?? 0) >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                      Rp {(status?.net_pnl ?? 0).toLocaleString('id-ID')}
                   </h2>
                   <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">Real-time Portfolio Contribution</p>
                </div>
                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                   <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Holdings</p>
                      <p className="text-sm font-black text-slate-800 tabular-nums">{(status?.btc_holdings ?? holdingsCoin).toFixed(4)}</p>
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Win Rate</p>
                      <p className="text-sm font-black text-emerald-600">{winRate.toFixed(1)}%</p>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button onClick={() => fetch(`${getApiUrl()}/api/manual_buy`, { method: 'POST' })} className="py-4 rounded-2xl bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 active:scale-95 transition-all">Buy</button>
                  <button onClick={() => fetch(`${getApiUrl()}/api/manual_sell`, { method: 'POST' })} className="py-4 rounded-2xl bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-100 active:scale-95 transition-all">Sell</button>
                </div>
             </div>
          </GlassCard>

          {/* CARD 2: LOGIC PIPELINE (4 PERMANENT NODES) */}
          <GlassCard className="flex-1 bg-white/90 border-white shadow-xl p-8 flex flex-col" delay={0.3}>
            <div className="flex items-center gap-3 mb-8 text-slate-800"><ShieldCheck className="w-6 h-6" /><h3 className="font-black text-xs uppercase tracking-widest leading-none">Logic Pipeline</h3></div>
            <div className="space-y-3">
              {[
                { label: 'Macro Consensus', ok: isMacroOk, err: false },
                { label: 'WOBI Strength', ok: isWobiOk, err: false },
                { label: 'Confidence Threshold', ok: isConfOk, err: false },
                { label: 'Signal Integrity', ok: !isConflict, err: isConflict }
              ].map(item => (
                <div key={item.label} className={`flex items-center justify-between px-5 py-4 rounded-2xl border transition-all ${item.err ? 'bg-rose-50 border-rose-100 shadow-inner' : item.ok ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${item.err ? 'text-rose-600' : item.ok ? 'text-emerald-700' : 'text-slate-400'}`}>{item.label}</span>
                  {item.err ? (
                    <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                        <ShieldAlert className="w-5 h-5 text-rose-500" />
                    </motion.div>
                  ) : item.ok ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-slate-200" />
                  )}
                </div>
              ))}
            </div>
            {isConflict && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-auto p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span className="text-[9px] font-black text-amber-700 uppercase tracking-tight leading-tight">Neural Divergence Detected</span>
              </motion.div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* FULL WIDTH EXECUTION LEDGER */}
      <GlassCard className="flex flex-col border-white p-10 shadow-2xl bg-white/90" delay={0.4}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4"><HistoryIcon className="w-7 h-7 text-sky-500" /><h3 className="font-black text-slate-800 text-base uppercase tracking-[0.2em]">Execution Ledger</h3></div>
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button onClick={() => setLedgerFilter('coin')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${ledgerFilter === 'coin' ? 'bg-white text-sky-600 shadow-md' : 'text-slate-400'}`}>Current Coin</button>
            <button onClick={() => setLedgerFilter('global')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${ledgerFilter === 'global' ? 'bg-white text-sky-600 shadow-md' : 'text-slate-400'}`}>Universal History</button>
          </div>
        </div>
        <div className="bg-slate-50/50 rounded-[40px] border border-slate-100 p-6 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-4 min-w-[1000px]">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="pb-2 pl-8">Time / ID</th>
                  <th className="pb-2 text-center">Asset / TF</th>
                  <th className="pb-2">Action Type</th>
                  <th className="pb-2">Execution Price</th>
                  <th className="pb-2 text-right pr-8">Performance (PnL)</th>
                </tr>
              </thead>
              <tbody className="text-slate-600 font-bold">
                {filteredTrades.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-24 text-center text-slate-300 italic text-base uppercase tracking-[0.3em] animate-pulse">
                      Scanning market signals...
                    </td>
                  </tr>
                ) : (
                  (Array.isArray(filteredTrades) ? filteredTrades : []).map((t: any, i: number) => {
                    if (!t) return null;
                    const isClose = t.type?.startsWith('CLOSE');
                    return (
                      <tr key={i} className={`transition-all hover:bg-white/50 group ${isClose ? 'bg-slate-100/30' : ''}`}>
                        <td className="py-5 pl-8 bg-white rounded-l-[32px] border-y border-l border-slate-100">
                          <div className="flex flex-col">
                            <span className="text-xs font-mono text-slate-400">
                              {t.time ? new Date(t.time).toLocaleTimeString('id-ID') : '00:00:00'}
                            </span>
                            <span className="text-[8px] font-black text-slate-300 mt-1 uppercase tracking-tighter">ID: {t.id || i}</span>
                          </div>
                        </td>
                        <td className="py-5 bg-white border-y border-slate-100 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="px-3 py-1 rounded-lg bg-slate-50 text-[10px] font-black text-slate-800 border border-slate-100">{t.coin}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{t.tf || '5M'}</span>
                          </div>
                        </td>
                        <td className="py-5 bg-white border-y border-slate-100">
                          <span className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase shadow-sm ${t.type?.includes('LONG') ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-rose-500 text-white shadow-rose-100'}`}>
                            {t.type ? t.type.replace('_', ' ') : 'WAIT'}
                          </span>
                        </td>
                        <td className="py-5 bg-white border-y border-slate-100 text-xl text-slate-900 font-black tracking-tighter italic">
                          Rp {(t.price || 0).toLocaleString('id-ID')}
                        </td>
                        <td className={`py-5 pr-8 text-right rounded-r-[32px] bg-white border-y border-r border-slate-100 text-sm font-black ${t.pnl > 0 ? 'text-emerald-500' : t.pnl < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                          {t.pnl !== 0 && t.pnl ? (
                            <div className="flex flex-col items-end">
                              <span>{t.pnl > 0 ? '+' : ''}Rp {Math.abs(t.pnl).toLocaleString('id-ID')}</span>
                              <span className="text-[9px] font-bold opacity-60 uppercase mt-1">TRADE FINALIZED</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2 text-sky-500">
                              <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                              <span className="text-[10px] uppercase">EXECUTING</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

export default function MarketPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-sky-50 via-white to-sky-100 font-sans selection:bg-sky-100">
      <Sidebar />
      <main className="flex-1 flex flex-col p-12 md:p-20 overflow-y-auto no-scrollbar">
        <div className="mx-auto max-w-[1800px] w-full min-h-0">
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
