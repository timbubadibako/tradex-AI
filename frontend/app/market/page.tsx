"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, BarChart3, History as HistoryIcon, BrainCircuit, Target, Zap, ChevronDown, CheckCircle2, XCircle, ShieldCheck, Wallet, AlertTriangle, ShieldAlert
} from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import GlassCard from "@/components/dashboard/GlassCard";
import TradingChart from "@/components/dashboard/TradingChart";
import OrderBookIndicator from "@/components/dashboard/OrderBookIndicator";
import Sidebar from "@/components/dashboard/Sidebar";
import { useBotStatus, useMarketData, useUnifiedTrades } from "@/hooks/useDashboardData";
import { useSearchParams } from "next/navigation";
import { getApiUrl } from "@/lib/constants";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

function MarketContent() {
  const searchParams = useSearchParams();
  const [isSwitching, setIsSwitching] = useState(false);
  const [loadingStep, setLoadingLoadingStep] = useState(0);
  const [showCoinMenu, setShowCoinMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState<'coin' | 'global'>('coin');

  const { status, isLoading: statusLoading } = useBotStatus();
  const { marketData, prediction, predictionHistory, isLoading: marketLoading } = useMarketData();
  const { trades } = useUnifiedTrades();

  const isLoading = statusLoading || marketLoading;
  const loadingMessages = ["Initializing Neural Nodes...", "Analyzing Market Delta...", "Finalizing Sync..."];

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
  const isMacroOk = status?.prediction?.macro !== 'NEUTRAL' && Boolean(status?.prediction?.macro);
  const isTfAligned = status?.prediction?.signal === 'BUY' || status?.prediction?.signal === 'SELL';
  const isWobiOk = Math.abs(status?.obi ?? 0) > 0.05;
  const isConfOk = confidenceValue > 0.6;

  const isConflict = (status?.prediction?.macro === 'BULLISH' && status?.prediction?.micro === 'SELL') ||
    (status?.prediction?.macro === 'BEARISH' && status?.prediction?.micro === 'BUY');

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
      } catch (err) { }
    };
    sync();
  }, [searchParams, status?.coin, status?.tf]);

  if (!mounted) return <div className="h-screen w-full bg-[#020617] animate-pulse" />;

  const handleCoinSwitch = async (coin: string) => {
    setIsSwitching(true); setShowCoinMenu(false); setLoadingLoadingStep(0);
    const interval = setInterval(() => setLoadingLoadingStep(p => (p < 2 ? p + 1 : p)), 1000);
    try { await fetch(`${getApiUrl()}/api/set_coin?coin=${coin}`, { method: 'POST' }); } catch (err) { }
    setTimeout(() => { clearInterval(interval); setIsSwitching(false); }, 4000);
  };

  const handleTimeframeSwitch = async (tf: string) => {
    setIsSwitching(true);
    try { await fetch(`${getApiUrl()}/api/set_timeframe?tf=${tf}`, { method: 'POST' }); } catch (err) { }
    setTimeout(() => setIsSwitching(false), 2000);
  };

  return (
    <div className="flex flex-col gap-12 pb-32 animate-in fade-in duration-700">

      {/* TOP ROW: CORE AI INSIGHTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

        {/* Project Asset Target (Rebranded) */}
        <GlassCard className="bg-gradient-to-br from-white/[0.03] to-sky-500/[0.01] p-12 border-white/10 shadow-2xl h-full flex flex-col justify-center relative overflow-hidden group" delay={0.1}>
          <DebugTooltip endpoint="GET /api/chart" fields={['prediction.price']} isNull={predictedPrice === 0} />
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl group-hover:bg-sky-500/20 transition-all duration-700" />
          <div className="flex items-center gap-3 mb-10 opacity-50 relative z-10"><Target className="w-6 h-6 text-sky-400" /><h3 className="font-black text-[10px] uppercase tracking-[0.4em]">Projected Asset Target</h3></div>
          <h2 className="text-5xl font-black tracking-tighter mb-8 relative z-10 text-white">Rp {predictedPrice > 0 ? Math.round(predictedPrice).toLocaleString('id-ID') : 0}</h2>
          <div className="flex items-center gap-4 relative z-10">
            <span className={`px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest ${targetGapIdr >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {sign}{targetGapPct.toFixed(2)}% GAP
            </span>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none">TARGET: {status?.coin || 'BTC'} Node</span>
          </div>
        </GlassCard>

        {/* Signal Conviction */}
        <GlassCard className="p-12 border-white/5 shadow-xl flex flex-col justify-center bg-white/[0.01] backdrop-blur-3xl h-full relative group" delay={0.15}>
          <DebugTooltip endpoint="GET /api/status" fields={['prediction.confidence', 'prediction.signal']} isNull={prediction?.confidence === undefined} />
          <div className="flex items-center gap-3 mb-10 opacity-50"><Zap className="w-6 h-6 text-emerald-500" /><h3 className="font-black text-[10px] uppercase tracking-[0.4em]">Neural Conviction</h3></div>
          <div className="flex items-end gap-3 mb-4">
            <h2 className={`text-5xl font-black tracking-tighter ${prediction?.signal === 'BUY' ? 'text-emerald-400' : prediction?.signal === 'SELL' ? 'text-rose-400' : 'text-white'}`}>
              {(confidenceValue * 100).toFixed(1)}% <span className="text-xl opacity-30 ml-4 font-bold tracking-normal">· {prediction?.signal || 'WAITING'}</span>
            </h2>
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-4">
            <motion.div initial={{ width: 0 }} animate={{ width: `${confidenceValue * 100}%` }} className={`h-full ${prediction?.signal === 'BUY' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : prediction?.signal === 'SELL' ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]' : 'bg-sky-500'}`} />
          </div>
        </GlassCard>

        {/* Neural Status */}
        <GlassCard className="p-12 border-white/5 shadow-xl flex flex-col justify-center bg-white/[0.01] backdrop-blur-3xl h-full relative group" delay={0.2}>
          <DebugTooltip endpoint="GET /api/status" fields={['error_rate']} isNull={status?.error_rate === undefined} />
          <div className="flex items-center gap-3 mb-10 opacity-50"><BrainCircuit className="w-6 h-6 text-purple-500" /><h3 className="font-black text-[10px] uppercase tracking-[0.4em]">Node Stability</h3></div>
          <div className="flex items-end gap-3 mb-10">
            <h2 className="text-5xl font-black text-white tracking-tighter">{errorRateValue.toFixed(2)}%</h2>
            <p className="text-[10px] font-black text-slate-600 uppercase mb-2 tracking-widest leading-none">MAPE Deviation</p>
          </div>
          <div className="flex gap-1.5 items-end h-8">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
              <motion.div key={i} animate={{ height: [12, 32, 16, 28, 12] }} transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.1 }} className="flex-1 bg-sky-500/20 rounded-full border border-sky-500/5" />
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* MAIN CHART AREA */}
        {/* MAIN CHART AREA */}
        {/* MAIN CHART AREA */}
        <GlassCard className="lg:col-span-3 flex flex-col p-8 border-white/5 shadow-2xl relative h-[900px] bg-white/[0.005]" delay={0.2}>

          {/* Header Row (Fixed Height 60px) */}
          <div className="flex items-center justify-between mb-8 h-[60px] shrink-0">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/[0.02] text-slate-400 rounded-xl border border-white/5"><BarChart3 className="w-5 h-5" /></div>
              <div className="relative">
                <button onClick={() => setShowCoinMenu(!showCoinMenu)} className="flex items-center gap-3 group">
                  <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none">{currentCoin}<span className="text-slate-700 text-xl ml-1">/IDR</span></h2>
                  <ChevronDown className={`w-4 h-4 text-slate-600 group-hover:text-sky-400 transition-transform duration-500 ${showCoinMenu ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {showCoinMenu && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute left-0 mt-6 w-64 bg-[#0f172a]/95 backdrop-blur-3xl border border-white/10 shadow-2xl rounded-2xl z-50 p-2">
                      {['BTC', 'ETH', 'SOL'].map(c => (
                        <button key={c} onClick={() => handleCoinSwitch(c)} className={`w-full text-left px-6 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${status?.coin === c ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'text-slate-500 hover:bg-white/5'}`}>{c}/IDR Node</button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="flex bg-white/[0.02] p-1.5 rounded-xl border border-white/5 h-fit gap-2">
              {['1h', '5m'].map(tf => (
                <button key={tf} onClick={() => handleTimeframeSwitch(tf)} disabled={isSwitching} className={`px-8 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all tracking-widest ${status?.tf === tf ? 'bg-white/10 text-sky-400 shadow-xl border border-white/10' : 'text-slate-600 hover:text-slate-400'}`}>{tf}</button>
              ))}
            </div>
          </div>

          {/* BOKS PENAMPUNG UTAMA: Kita paksa tingginya absolut h-[740px] biar gak bisa nyusut kolaps! */}
          <div className="w-full h-[740px] bg-black/20 rounded-[32px] overflow-hidden border border-white/5 p-4 flex flex-col gap-4 group/chart">
            <DebugTooltip endpoint="GET /api/chart" fields={['ohlcv', 'prediction_history']} isNull={marketData.length === 0} />
            <AnimatePresence>
              {(isLoading || isSwitching) && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 bg-[#020617]/80 backdrop-blur-2xl flex items-center justify-center border border-white/5">
                  <div className="flex flex-col items-center gap-8 ">
                    <div className="w-20 h-16 flex gap-2 items-end">
                      {[0, 1, 2].map(i => (
                        <motion.div key={i} animate={{ height: [20, 60, 20] }} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }} className="w-3 bg-sky-500 rounded-full shadow-[0_0_15px_#38bdf8]" />
                      ))}
                    </div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] animate-pulse">{loadingMessages[loadingStep]}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* RASIO 75: AREA CHART UTAMA */}
            {/* Mengunci tinggi h-[75%] murni dari total tinggi 740px boks penampung hitam */}
            <div className="w-full h-[75%] min-h-0">
              <TradingChart
                data={marketData || []}
                prediction={prediction}
                predictionHistory={predictionHistory || []}
                trades={tradeList.filter(t => t?.coin === currentCoin)}
              />
            </div>

            {/* RASIO 25: AREA OBI AKTIF */}
            {/* Menggunakan h-[25%] murni, dikurangi sedikit gap padding, overflow-hidden dibuang agar glow/shadow gak kepotong */}
            <div className="w-full h-[calc(25%-16px)] shrink-0 rounded-2xl border border-white/5">
              <OrderBookIndicator obi={status?.obi || 0} />
            </div>
          </div>

        </GlassCard>

        {/* RIGHT SIDEBAR */}
        {/* SAKTI KUNCI SIDEBAR: Samakan tinggi h-[900px] dengan Main Chart Area */}
        <div className="flex flex-col gap-10 h-[900px]">

          {/* CARD 1: ASSET INTELLIGENCE */}
          {/* SAKTI REVISE: Buang flex-1, ganti pake kalkulasi tinggi 50% absolut */}
          <GlassCard className="bg-white/[0.01] border-white/5 shadow-xl p-10 flex flex-col h-[calc(50%-20px)] relative group overflow-hidden" delay={0.25}>
            <DebugTooltip endpoint="GET /api/status" fields={['balance_idr', 'btc_holdings', 'net_pnl', 'winrate']} isNull={status?.btc_holdings === undefined} />
            <div className="flex items-center gap-4 mb-8 text-sky-500 opacity-60 shrink-0">
              <Wallet className="w-6 h-6" />
              <h3 className="font-black text-[10px] uppercase tracking-[0.4em] leading-none">Asset Intelligence</h3>
            </div>
            {/* flex-1 di dalam memastikan content internal membagi sisa ruang secara vertical */}
            <div className="flex flex-col justify-between flex-1 min-h-0">
              <div>
                <p className="text-[9px] font-black text-slate-600 uppercase mb-2 tracking-widest leading-none">Realized Performance ({currentCoin})</p>
                <h2 className={`text-4xl font-black tracking-tighter leading-none ${(status?.net_pnl ?? 0) >= 0 ? 'text-white' : 'text-rose-500'}`}>
                  {status?.net_pnl >= 0 ? '+' : ''}Rp {(status?.net_pnl ?? 0).toLocaleString('id-ID')}
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-white/5">
                <div>
                  <p className="text-[9px] font-black text-slate-600 uppercase mb-2 tracking-widest">Holdings</p>
                  <p className="text-base font-black text-slate-200 tabular-nums">{(status?.btc_holdings ?? holdingsCoin).toFixed(4)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-600 uppercase mb-2 tracking-widest">Success Rate</p>
                  <p className="text-base font-black text-emerald-400">{winRate.toFixed(1)}%</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <button onClick={() => fetch(`${getApiUrl()}/api/manual_buy`, { method: 'POST' })} className="py-4 rounded-2xl bg-emerald-500 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all hover:bg-emerald-600">Execute Buy</button>
                <button onClick={() => fetch(`${getApiUrl()}/api/manual_sell`, { method: 'POST' })} className="py-4 rounded-2xl bg-rose-500 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-rose-500/20 active:scale-95 transition-all hover:bg-rose-600">Execute Sell</button>
              </div>
            </div>
          </GlassCard>

          {/* CARD 2: NEURAL FILTERS */}
          {/* SAKTI REVISE: Buang flex-1, ganti pake kalkulasi tinggi 50% absolut */}
          <GlassCard className="bg-white/[0.01] border-white/5 shadow-xl p-10 flex flex-col h-[calc(50%-20px)] relative group overflow-hidden" delay={0.3}>
            <DebugTooltip endpoint="GET /api/status" fields={['prediction.macro', 'prediction.micro', 'obi']} isNull={!status?.prediction?.macro} />
            <div className="flex items-center gap-4 mb-8 text-slate-500 opacity-60 shrink-0">
              <ShieldCheck className="w-6 h-6" />
              <h3 className="font-black text-[10px] uppercase tracking-[0.4em] leading-none">Neural Filters</h3>
            </div>
            {/* justify-between di bawah memaksa list item filter membagi ruang secara vertikal seimbang */}
            <div className="space-y-3 flex-1 flex flex-col justify-between min-h-0">
              {[
                { label: 'Macro Consensus', ok: isMacroOk, err: false },
                { label: 'Order Flow Imbalance', ok: isWobiOk, err: false },
                { label: 'Confidence Threshold', ok: isConfOk, err: false },
                { label: 'Signal Integrity', ok: !isConflict, err: isConflict }
              ].map(item => (
                <div key={item.label} className={`flex items-center justify-between px-6 py-4 rounded-2xl border transition-all flex-1 ${item.err ? 'bg-rose-500/5 border-rose-500/30' : item.ok ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-white/[0.01] border-white/5'}`}>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${item.err ? 'text-rose-400' : item.ok ? 'text-emerald-400' : 'text-slate-700'}`}>{item.label}</span>
                  {item.err ? (
                    <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                      <ShieldAlert className="w-5 h-5 text-rose-500" />
                    </motion.div>
                  ) : item.ok ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                  ) : (
                    <XCircle className="w-5 h-5 text-slate-800" />
                  )}
                </div>
              ))}
            </div>
          </GlassCard>

        </div>
      </div>

      {/* FULL WIDTH EXECUTION LEDGER WITH ABSOLUTE INTERNAL LIST SCROLL */}
      {/* SAKTI REVISE: Kunci tinggi mati h-[500px], padatkan padding jadi p-8, dan paksa overflow-hidden */}
      <GlassCard className="flex flex-col border-white/5 p-8 shadow-2xl bg-white/[0.005] relative group h-[500px] overflow-auto" delay={0.4}>
        <DebugTooltip endpoint="GET /api/unified_trades" fields={['timestamp', 'coin', 'type', 'price', 'pnl']} isNull={tradeList.length === 0} />

        {/* Header Row (Fixed Size - shrink-0) */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <HistoryIcon className="w-6 h-6 text-sky-500 opacity-60" />
            <h3 className="font-black text-white text-sm uppercase tracking-[0.4em]">Real-time Execution Ledger</h3>
          </div>
          <div className="flex bg-white/[0.02] p-1 rounded-xl border border-white/10 gap-1 shrink-0">
            <button onClick={() => setLedgerFilter('coin')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${ledgerFilter === 'coin' ? 'bg-white/10 text-white shadow-2xl border border-white/10' : 'text-slate-600 hover:text-slate-400'}`}>Current Node</button>
            <button onClick={() => setLedgerFilter('global')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${ledgerFilter === 'global' ? 'bg-white/10 text-white shadow-2xl border border-white/10' : 'text-slate-600 hover:text-slate-400'}`}>Universal Ledger</button>
          </div>
        </div>

        {/* HEADER KOLOM REVISI: Menggunakan Grid Row Sticky nempel di atas list */}
        <div className="grid grid-cols-5 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] px-6 pb-3 border-b border-white/5 shrink-0 mb-4">
          <div className="pl-6">Temporal Identifier</div>
          <div className="text-center">Neural Node</div>
          <div>Execution Protocol</div>
          <div>Spot Price</div>
          <div className="text-right pr-6">Realized PnL</div>
        </div>

        {/* SCROLLABLE LIST CONTAINER: Div flex list ini dijamin 100% meluncur lancar jaya murni pas discroll! */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 min-h-0 custom-scrollbar">
          {filteredTrades.length === 0 ? (
            <div className="py-24 text-center text-slate-700 italic text-sm uppercase tracking-[0.4em] animate-pulse">
              Scanning market synapses...
            </div>
          ) : (
            (Array.isArray(filteredTrades) ? filteredTrades : []).map((t: any, i: number) => {
              if (!t) return null;
              const isClose = t.type?.startsWith('CLOSE');
              const isLong = t.type?.includes('LONG');
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={i}
                  className={`grid grid-cols-5 items-center bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-2xl p-4 transition-all group px-6 ${isClose ? 'bg-white/[0.003]' : ''}`}
                >
                  {/* Kolom 1: Temporal Identifier */}
                  <div className="flex flex-col font-mono">
                    <span className="text-xs text-slate-300">
                      {t.time ? new Date(t.time).toLocaleTimeString('id-ID') : '00:00:00'}
                    </span>
                    <span className="text-[8px] font-black text-slate-700 mt-0.5 uppercase tracking-widest">
                      ID_EXP_{t.id ? t.id.slice(0, 8) : i}
                    </span>
                  </div>

                  {/* Kolom 2: Neural Node */}
                  <div className="text-center">
                    <span className="px-4 py-1.5 rounded-lg bg-white/5 text-[10px] font-black text-white border border-white/10 tracking-widest">
                      {t.coin}/IDR
                    </span>
                  </div>

                  {/* Kolom 3: Execution Protocol */}
                  <div>
                    <span className={`px-5 py-1.5 rounded-lg text-[9px] font-black uppercase shadow-lg inline-block tracking-wider ${isLong ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                      {t.type ? t.type.replace('_', ' ') : 'STANDBY'}
                    </span>
                  </div>

                  {/* Kolom 4: Spot Price */}
                  <div className="text-xl text-white font-black tracking-tighter italic">
                    {(t.price || 0).toLocaleString('id-ID')}
                  </div>

                  {/* Kolom 5: Realized PnL */}
                  <div className={`text-right font-black ${t.pnl > 0 ? 'text-emerald-400' : t.pnl < 0 ? 'text-rose-400' : 'text-slate-600'}`}>
                    {t.pnl !== 0 && t.pnl ? (
                      <div className="flex flex-col items-end">
                        <span className="text-sm tracking-tight">{t.pnl > 0 ? '+' : ''}Rp {Math.abs(t.pnl).toLocaleString('id-ID')}</span>
                        <span className="text-[7px] font-bold opacity-30 uppercase tracking-widest mt-0.5">SYNAPSE FINALIZED</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2 text-sky-400 animate-pulse">
                        <div className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_10px_#38bdf8]" />
                        <span className="text-[9px] uppercase tracking-widest font-black">Executing</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </GlassCard>
    </div>
  );
}

export default function MarketPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-[#020617] font-sans selection:bg-sky-500/20">
      <Sidebar />
      <main className="flex-1 flex flex-col p-12 md:p-20 overflow-y-auto no-scrollbar relative">
        <div className="mx-auto max-w-[1800px] w-full min-h-0 relative z-10">
          <Suspense fallback={<div className="h-screen flex items-center justify-center text-sky-400 font-black uppercase tracking-[0.5em] animate-pulse">Synchronizing Market Synapses...</div>}>
            <MarketContent />
          </Suspense>
        </div>
      </main>
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @font-face { font-family: 'Outfit'; src: url('https://cdn.jsdelivr.net/font/outfit/Outfit-Black.woff2'); }
        @font-face { font-family: 'Inter'; src: url('https://cdn.jsdelivr.net/font/inter/Inter-Regular.woff2'); }
      `}</style>
    </div>
  );
}
