"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, Wallet, BarChart3, History, BrainCircuit, Clock, AlertCircle, 
  TrendingUp, TrendingDown, LayoutDashboard, Target, Zap, ShieldCheck, Settings, PieChart 
} from "lucide-react";
import { useState } from "react";
import GlassCard from "@/components/dashboard/GlassCard";
import TradingChart from "@/components/dashboard/TradingChart";
import Sidebar from "@/components/dashboard/Sidebar";
import Navbar from "@/components/dashboard/Navbar";
import { useBotStatus, useMarketData, useTradeHistory } from "@/hooks/useDashboardData";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const { status, isError: statusError } = useBotStatus();
  const { marketData, prediction, predictionHistory, isError: marketError } = useMarketData();
  const { trades, isError: tradesError } = useTradeHistory();

  const isDisconnected = statusError || marketError || tradesError;

  // Render Content based on Tab
  const renderContent = () => {
    switch (activeTab) {
      case "Dashboard":
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-8">
            {/* Main Chart Card */}
            <GlassCard className="md:col-span-3 lg:col-span-3" delay={0.1}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-sky-500" />
                  <h3 className="font-bold text-slate-800 tracking-tight text-sm uppercase tracking-[0.1em]">Real-time Market & AI Trace</h3>
                </div>
                <div className="flex bg-slate-100/50 p-1 rounded-xl border border-white/50">
                  <button className="px-5 py-2 rounded-lg text-[10px] font-black uppercase bg-white text-sky-600 shadow-sm">1h</button>
                </div>
              </div>
              
              <TradingChart 
                data={marketData} 
                prediction={prediction} 
                predictionHistory={predictionHistory} 
              />

              {prediction && (
                <div className="mt-8 p-6 rounded-[32px] bg-white/40 border border-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center border border-sky-100">
                      <Target className="w-6 h-6 text-sky-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Target 1h Prediction</p>
                      <p className="text-lg font-black text-slate-800 tracking-tight">
                        Rp {prediction.price.toLocaleString('id-ID')} 
                        <span className={`ml-2 text-xs font-bold ${prediction.change_pct >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          ({prediction.change_pct >= 0 ? '+' : ''}{prediction.change_pct.toFixed(2)}%)
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-sm ${prediction.change_pct >= 0.5 ? 'bg-emerald-500 text-white' : prediction.change_pct <= -0.5 ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {prediction.change_pct >= 0.5 ? 'Signal: Strong Buy' : prediction.change_pct <= -0.5 ? 'Signal: Strong Sell' : 'Signal: Wait'}
                  </div>
                </div>
              )}
            </GlassCard>

            {/* Sidebar Stats */}
            <div className="space-y-6 md:col-span-1">
              <GlassCard className="bg-gradient-to-br from-sky-500 to-sky-600 border-none text-white shadow-2xl shadow-sky-200" delay={0.2}>
                <div className="flex items-center gap-2 mb-8 opacity-80">
                  <Wallet className="w-5 h-5" />
                  <h3 className="font-black text-[10px] uppercase tracking-[0.2em]">Broker Assets</h3>
                </div>
                <div className="space-y-6">
                  <div>
                    <p className="text-[9px] font-bold opacity-60 uppercase tracking-[0.2em] mb-1">IDR Balance</p>
                    <h2 className="text-2xl font-black tracking-tighter">Rp {(status?.balance_idr ?? 0).toLocaleString('id-ID')}</h2>
                  </div>
                  <div className="w-full h-px bg-white/20" />
                  <div>
                    <p className="text-[9px] font-bold opacity-60 uppercase tracking-[0.2em] mb-1">BTC Balance</p>
                    <p className="text-lg font-black tracking-tight">{(status?.btc_holdings ?? 0).toFixed(4)} BTC</p>
                  </div>
                  <div className="pt-2">
                    <p className="text-[9px] font-bold opacity-60 uppercase tracking-[0.2em] mb-1">Total Equity</p>
                    <p className="text-sm font-black italic">Rp {(status?.equity ?? 0).toLocaleString('id-ID')}</p>
                  </div>
                  <div className="pt-2 border-t border-white/10 mt-2">
                    <p className="text-[9px] font-bold opacity-60 uppercase tracking-[0.2em] mb-1">Active Position</p>
                    <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${status?.active_pos ? (status.active_pos === 'LONG' ? 'bg-emerald-300' : 'bg-rose-300') : 'bg-white/20'}`} />
                        <p className="text-sm font-black italic">{status?.active_pos || 'None'}</p>
                    </div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard delay={0.3} className="bg-amber-50/30 border-amber-100">
                <div className="flex items-center gap-2 mb-6 text-amber-600">
                  <BrainCircuit className="w-5 h-5" />
                  <h3 className="font-black text-[10px] uppercase tracking-[0.2em]">Brain Accuracy</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Error Rate (MAPE)</p>
                    <p className="text-2xl font-black text-slate-800 tracking-tighter">
                      {(status?.error_rate ?? 0).toFixed(2)}%
                    </p>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-400 transition-all duration-1000" 
                      style={{ width: `${Math.max(5, 100 - (status?.error_rate || 0) * 10)}%` }} 
                    />
                  </div>
                  <p className="text-[9px] font-medium text-slate-400 italic">Accuracy based on pre-filled history trace.</p>
                </div>
              </GlassCard>

              <GlassCard delay={0.4}>
                <div className="flex items-center gap-2 mb-6 text-emerald-500">
                  <Activity className="w-5 h-5" />
                  <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-800">Performance</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">PnL Growth</p>
                    <p className={`text-xl font-black tracking-tighter ${status?.profit_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {status?.profit_pct >= 0 ? '+' : ''}{(status?.profit_pct ?? 0).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Win Rate</p>
                    <p className="text-xl font-black text-slate-800 tracking-tighter">{(status?.winrate ?? 0).toFixed(1)}%</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-8">
                    <button className="flex flex-col items-center gap-1 py-4 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-100 active:scale-95 transition-all">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-[9px] font-black uppercase">Buy</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 py-4 rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-100 active:scale-95 transition-all">
                      <TrendingDown className="w-4 h-4" />
                      <span className="text-[9px] font-black uppercase">Sell</span>
                    </button>
                </div>
              </GlassCard>
            </div>

            {/* Trade Logs Card - Custom Scroll */}
            <GlassCard className="md:col-span-4 max-h-[400px] flex flex-col" delay={0.5}>
              <div className="flex items-center justify-between mb-8 sticky top-0 bg-white/10 backdrop-blur-sm z-10 pb-4">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-sky-500" />
                  <h3 className="font-bold text-slate-800 tracking-tight uppercase text-xs">Broker Activity Logs</h3>
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-1 rounded-full border border-slate-100">
                  Newest First
                </span>
              </div>
              <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
                <table className="w-full text-left border-separate border-spacing-y-2">
                  <tbody className="text-slate-600 font-bold">
                    {trades.length === 0 && (
                      <tr><td className="py-12 text-center text-slate-300 italic text-xs">No market activity yet...</td></tr>
                    )}
                    {trades.map((trade: any, i: number) => (
                      <tr key={i} className="group transition-all">
                        <td className="py-4 pl-4 font-mono text-[9px] text-slate-400 bg-slate-50/50 rounded-l-2xl">{new Date(trade.time).toLocaleString('id-ID')}</td>
                        <td className="py-4 bg-slate-50/50">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase shadow-sm ${trade.type.includes('BUY') || trade.type.includes('LONG') ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                            {trade.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 bg-slate-50/50 text-xs">Rp {trade.price.toLocaleString('id-ID')}</td>
                        <td className={`py-4 pr-4 text-right rounded-r-2xl bg-slate-50/50 text-[10px] ${trade.pnl > 0 ? 'text-emerald-500' : trade.pnl < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                          {trade.pnl !== 0 ? `${trade.pnl > 0 ? '+' : ''}Rp ${Math.abs(trade.pnl).toLocaleString('id-ID')}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        );
      case "Market":
        return (
          <GlassCard className="h-[600px] flex items-center justify-center border-dashed border-sky-200">
            <div className="text-center">
              <PieChart className="w-16 h-16 text-sky-200 mx-auto mb-4" />
              <h2 className="text-2xl font-black text-slate-800">Global Market Insight</h2>
              <p className="text-slate-400 font-medium italic">Deep analysis for other pairs coming soon.</p>
            </div>
          </GlassCard>
        );
      case "AI Safety":
        return (
          <GlassCard className="h-[600px] p-12 bg-emerald-50/20 border-emerald-100">
             <ShieldCheck className="w-12 h-12 text-emerald-500 mb-6" />
             <h2 className="text-3xl font-black text-slate-800 mb-4">AI Safety & Guardrails</h2>
             <div className="space-y-6 max-w-2xl">
               <div className="p-6 bg-white rounded-3xl border border-emerald-100 shadow-sm">
                  <p className="font-bold text-slate-700 mb-2">Max Drawdown Limit</p>
                  <p className="text-sm text-slate-500">Automatically halts the bot if equity drops by more than 15% in 24 hours.</p>
               </div>
               <div className="p-6 bg-white rounded-3xl border border-emerald-100 shadow-sm">
                  <p className="font-bold text-slate-700 mb-2">Sentiment Filter</p>
                  <p className="text-sm text-slate-500">Blocks high-confidence AI signals if they conflict with extreme negative news sentiment.</p>
               </div>
             </div>
          </GlassCard>
        );
      case "Settings":
        return (
          <GlassCard className="h-[600px] p-12">
             <Settings className="w-12 h-12 text-sky-500 mb-6" />
             <h2 className="text-3xl font-black text-slate-800 mb-8">System Configuration</h2>
             <div className="grid grid-cols-2 gap-8 max-w-4xl font-bold">
               <div className="space-y-4">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest">API Server Port</label>
                  <input type="text" value="8000" disabled className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-500" />
               </div>
               <div className="space-y-4">
                  <label className="text-[10px] text-slate-400 uppercase tracking-widest">Exchange Provider</label>
                  <input type="text" value="Indodax (CCXT)" disabled className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-500" />
               </div>
             </div>
          </GlassCard>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-sky-50 via-white to-sky-100">
      
      {/* Sidebar - Navigation */}
      <Sidebar onTabChange={setActiveTab} activeTab={activeTab} />

      <main className="flex-1 flex flex-col p-4 md:p-8 overflow-y-auto no-scrollbar">
        <div className="mx-auto max-w-7xl w-full space-y-6">
          
          <Navbar />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
      `}</style>
    </div>
  );
}
