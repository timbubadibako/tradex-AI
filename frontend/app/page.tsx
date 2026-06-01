"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, Wallet, BarChart3, History, BrainCircuit, Clock, AlertCircle, 
  TrendingUp, TrendingDown, LayoutDashboard, Target, Zap, ShieldCheck, Settings, PieChart, Info
} from "lucide-react";
import { useState } from "react";
import GlassCard from "@/components/dashboard/GlassCard";
import TradingChart from "@/components/dashboard/TradingChart";
import Sidebar from "@/components/dashboard/Sidebar";
import Navbar from "@/components/dashboard/Navbar";
import { useBotStatus, useMarketData, useTradeHistory } from "@/hooks/useDashboardData";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [showFullLogs, setShowFullLogs] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false); // State untuk loading pindah TF
  const [loadingStep, setLoadingLoadingStep] = useState(0); // Tahapan pesan loading
  const { status, isError: statusError, isLoading: statusLoading } = useBotStatus();
  const { marketData, prediction, predictionHistory, isError: marketError, isLoading: marketLoading } = useMarketData();
  const { trades, isError: tradesError } = useTradeHistory();

  const isLoading = statusLoading || marketLoading;
  const isDisconnected = statusError || marketError || tradesError;
   
  const loadingMessages = ["Memuat data timeframe...",
    "Menganalisis pola AI...",
    "Sinkronisasi data neural...",
    "Segera selesai..."];
  

  const handleTimeframeSwitch = async (tf: string) => {
    if (status?.tf === tf) return;
    setIsSwitching(true);
    setLoadingLoadingStep(0);
    
    // Jalankan sequence pesan loading (total 5 detik)
    const interval = setInterval(() => {
        setLoadingLoadingStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 1200);

    try {
      await fetch(`http://localhost:8000/api/set_timeframe?tf=${tf}`, { method: 'POST' });
      // Kunci loading tepat di 5 detik agar user merasa prosesnya "lengkap"
      setTimeout(() => {
        clearInterval(interval);
        setIsSwitching(false);
      }, 10000);
    } catch (e) {
      clearInterval(interval);
      setIsSwitching(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "Dashboard":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pb-20">
            {/* Left: Main Chart & AI Analysis */}
            <div className="lg:col-span-3 space-y-6">
              <GlassCard className="min-h-[550px]" delay={0.1}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-500/10 rounded-xl">
                      <BarChart3 className="w-5 h-5 text-sky-500" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Market Intelligence</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{status?.coin || 'BTC'}/IDR · LIVE</p>
                    </div>
                  </div>
                  <div className="flex bg-slate-100/50 p-1 rounded-xl border border-white/50">
                    {['1h', '5m'].map(tf => (
                      <button 
                        key={tf} 
                        onClick={() => handleTimeframeSwitch(tf)}
                        disabled={isSwitching}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${status?.tf === tf ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'} ${isSwitching ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="relative">
                  {/* Skeleton / Loading Overlay untuk Chart */}
                  <AnimatePresence>
                    {(isLoading || isSwitching) && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-20 bg-white/60 backdrop-blur-md flex items-center justify-center rounded-3xl border border-white"
                      >
                        <div className="flex flex-col items-center gap-6">
                           <div className="relative w-16 h-16">
                              <div className="absolute inset-0 border-4 border-sky-100 rounded-full" />
                              <div className="absolute inset-0 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
                           </div>
                           <div className="text-center space-y-1">
                              <p className="text-xs font-black text-slate-800 uppercase tracking-[0.2em] animate-pulse">
                                 {loadingMessages[loadingStep]}
                              </p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">Please standby...</p>
                           </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <TradingChart 
                    data={marketData} 
                    prediction={prediction} 
                    predictionHistory={predictionHistory} 
                  />
                </div>

                {/* AI Sniper Console */}
                {prediction && (
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 rounded-[32px] bg-sky-500/5 border border-sky-100/50 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-white">
                        <Target className="w-6 h-6 text-sky-500" />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Sniper Projection (1H)</p>
                        <p className="text-lg font-black text-slate-800 tracking-tight">
                          Rp {(prediction.price ?? 0).toLocaleString('id-ID')} 
                          <span className={`ml-2 text-xs font-bold ${prediction.change_pct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            ({prediction.change_pct >= 0 ? '+' : ''}{(prediction.change_pct ?? 0).toFixed(2)}%)
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="p-6 rounded-[32px] bg-white/40 border border-white flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center ${prediction.signal === 'BUY' ? 'bg-emerald-100 text-emerald-600' : prediction.signal === 'SELL' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
                            <Zap className="w-5 h-5 fill-current" />
                         </div>
                         <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Signal Confidence</p>
                            <p className="text-sm font-black text-slate-700">{(prediction.confidence * 100).toFixed(1)}% · {prediction.signal}</p>
                         </div>
                      </div>
                      <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${prediction.confidence > 0.7 ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {prediction.confidence > 0.7 ? 'High Precision' : 'Low Confidence'}
                      </div>
                    </div>
                  </div>
                )}
              </GlassCard>

              {/* Trade Logs - Full Width below Chart */}
              <GlassCard className={`flex flex-col transition-all duration-500 ease-in-out ${showFullLogs ? 'max-h-[800px]' : 'max-h-[350px]'}`} delay={0.4}>
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-white/10 backdrop-blur-sm z-10 pb-2">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-sky-500" />
                    <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">Execution Registry</h3>
                  </div>
                  <button 
                    onClick={() => setShowFullLogs(!showFullLogs)}
                    className="text-[9px] font-black text-sky-500 uppercase tracking-widest hover:underline"
                  >
                    {showFullLogs ? 'Hide Ledger' : 'View Ledger'}
                  </button>
                </div>
                <div className="overflow-y-auto no-scrollbar flex-1">
                  <table className="w-full text-left border-separate border-spacing-y-2">
                    <tbody className="text-slate-600 font-bold">
                      {trades.length === 0 && (
                        <tr><td className="py-12 text-center text-slate-300 italic text-xs underline decoration-sky-100 underline-offset-8">Waiting for AI Execution...</td></tr>
                      )}
                      {trades.map((trade: any, i: number) => (
                        <tr key={i} className="group transition-all hover:scale-[1.01]">
                          <td className="py-4 pl-5 font-mono text-[9px] text-slate-400 bg-white/40 rounded-l-2xl border-y border-l border-white/60">{new Date(trade.time).toLocaleTimeString('id-ID')}</td>
                          <td className="py-4 bg-white/40 border-y border-white/60">
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase shadow-sm ${trade.type.includes('BUY') || trade.type.includes('LONG') ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                              {trade.type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-4 bg-white/40 border-y border-white/60 text-xs text-slate-800">Rp {trade.price.toLocaleString('id-ID')}</td>
                          <td className={`py-4 pr-5 text-right rounded-r-2xl bg-white/40 border-y border-r border-white/60 text-[10px] ${trade.pnl > 0 ? 'text-emerald-500' : trade.pnl < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                            {trade.pnl !== 0 ? `${trade.pnl > 0 ? '+' : ''}Rp ${Math.abs(trade.pnl).toLocaleString('id-ID')}` : 'EXECUTING'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>

            {/* Right: Quant Metrics & Wallet */}
            <div className="space-y-6">
              {/* Wallet Card */}
              <GlassCard className="bg-gradient-to-br from-sky-500 to-sky-600 border-none text-white shadow-2xl shadow-sky-200" delay={0.2}>
                <div className="flex items-center justify-between mb-8 opacity-80">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    <h3 className="font-black text-[9px] uppercase tracking-[0.2em]">Live Assets</h3>
                  </div>
                  <Info className="w-3 h-3" />
                </div>
                <div className="space-y-6">
                  <div>
                    <p className="text-[9px] font-bold opacity-60 uppercase tracking-[0.2em] mb-1">Total Equity</p>
                    <h2 className="text-2xl font-black tracking-tighter">Rp {(status?.equity ?? 0).toLocaleString('id-ID')}</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                    <div>
                      <p className="text-[8px] font-bold opacity-60 uppercase mb-1">IDR Liquid</p>
                      <p className="text-xs font-black">Rp {(status?.balance_idr ?? 0).toLocaleString('id-ID')}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold opacity-60 uppercase mb-1">BTC Assets</p>
                      <p className="text-xs font-black">{(status?.btc_holdings ?? 0).toFixed(4)} BTC</p>
                    </div>
                  </div>
                </div>
              </GlassCard>

              {/* Order Book Imbalance Card */}
              <GlassCard delay={0.3} className="border-sky-100">
                <div className="flex items-center gap-2 mb-6">
                  <Activity className="w-5 h-5 text-sky-500" />
                  <h3 className="font-black text-[9px] uppercase tracking-[0.2em] text-slate-800">Liquidity Power</h3>
                </div>
                   <div className="space-y-6">
                   <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                      <span className={(status?.obi ?? 0) > 0 ? "text-emerald-500" : "text-slate-400"}>Bids (Buying)</span>
                      <span className={(status?.obi ?? 0) < 0 ? "text-rose-500" : "text-slate-400"}>Asks (Selling)</span>
                   </div>
                   <div className="relative h-4 w-full bg-slate-100 rounded-full flex overflow-hidden border border-white shadow-inner">
                      {/* Green Part (Bids) */}
                      <motion.div 
                        animate={{ 
                            width: `${50 + (status?.obi ?? 0) * 50}%`,
                            backgroundColor: (status?.obi ?? 0) > 0.05 ? '#10b981' : '#e2e8f0' 
                        }}
                        className="h-full transition-colors duration-500 shadow-[inset_-2px_0_4px_rgba(0,0,0,0.05)]" 
                      />
                      {/* Red Part (Asks) */}
                      <motion.div 
                        animate={{ 
                            backgroundColor: (status?.obi ?? 0) < -0.05 ? '#f43f5e' : '#e2e8f0' 
                        }}
                        className="h-full flex-1 transition-colors duration-500" 
                      />
                      {/* Center Marker */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/60 z-10" />
                   </div>
                   <div className="text-center">
                      <p className="text-xl font-black text-slate-800">{(status?.obi ?? 0).toFixed(2)}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {status?.obi > 0.1 ? 'Strong Buying Wall' : status?.obi < -0.1 ? 'Heavy Selling Wall' : 'Balanced Market'}
                      </p>
                   </div>
                </div>
              </GlassCard>

              {/* AI Brain Card */}
              <GlassCard delay={0.4} className="bg-amber-50/20">
                <div className="flex items-center gap-2 mb-6 text-amber-600">
                  <BrainCircuit className="w-5 h-5" />
                  <h3 className="font-black text-[9px] uppercase tracking-[0.2em]">Brain Health</h3>
                </div>
                <div className="space-y-5">
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Error Rate</p>
                        <p className="text-lg font-black text-slate-800">{(status?.error_rate ?? 0).toFixed(2)}%</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Trend Sync</p>
                        <p className="text-[10px] font-black text-sky-600 uppercase">{prediction?.macro || 'NEUTRAL'}</p>
                      </div>
                   </div>
                   <div className="pt-4 border-t border-slate-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Manual Intervention</p>
                      <div className="grid grid-cols-2 gap-2">
                        <button className="py-3 rounded-xl bg-emerald-500 text-white font-black text-[9px] uppercase shadow-lg shadow-emerald-100 active:scale-95 transition-all">Buy</button>
                        <button className="py-3 rounded-xl bg-rose-500 text-white font-black text-[9px] uppercase shadow-lg shadow-rose-100 active:scale-95 transition-all">Sell</button>
                      </div>
                   </div>
                </div>
              </GlassCard>
            </div>
          </div>
        );
      default:
        return (
          <GlassCard className="h-[600px] flex items-center justify-center border-dashed border-sky-200">
            <div className="text-center">
              <PieChart className="w-16 h-16 text-sky-200 mx-auto mb-4" />
              <h2 className="text-2xl font-black text-slate-800">{activeTab} Section</h2>
              <p className="text-slate-400 font-medium italic">Advanced features for {activeTab} coming soon.</p>
            </div>
          </GlassCard>
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-sky-50 via-white to-sky-100 font-sans">
      <Sidebar onTabChange={setActiveTab} activeTab={activeTab} />

      <main className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto no-scrollbar">
        <div className="mx-auto max-w-7xl w-full space-y-6">
          <Navbar />
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
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
