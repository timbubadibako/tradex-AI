"use client";

import { motion } from "framer-motion";
import { ShieldCheck, AlertCircle, Zap, Activity, Info, Save, Power } from "lucide-react";
import { useState, useEffect } from "react";
import GlassCard from "@/components/dashboard/GlassCard";
import Sidebar from "@/components/dashboard/Sidebar";
import ControlCenter from "@/components/dashboard/ControlCenter";
import { useAllAssetsStatus } from "@/hooks/useDashboardData";
import useSWR from "swr";
import { getApiUrl } from "@/lib/constants";

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

export default function SafetyPage() {
  const { manualConfig, dailyTarget, allStatus } = useAllAssetsStatus();
  const { data: safety, mutate } = useSWR(`${getApiUrl()}/api/safety`, fetcher);
  const [sl, setSl] = useState(1.5);
  const [tp, setTp] = useState(2.5);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (safety) {
        setSl(safety.sl_atr_mult);
        setTp(safety.tp_atr_mult);
    }
  }, [safety]);

  const handleUpdate = async () => {
    await fetch(`${getApiUrl()}/api/update_safety?sl=${sl}&tp=${tp}`, { method: 'POST' });
    mutate();
    alert("Safety parameters updated successfully.");
  };

  const handlePanic = async () => {
    if (confirm("EMERGENCY: This will liquidate ALL positions immediately. Are you sure?")) {
        await fetch(`${getApiUrl()}/api/panic_sell`, { method: 'POST' });
        mutate();
    }
  };

  const activeExposure = Object.keys(allStatus || {}).filter(c => Math.abs((allStatus[c]?.btc_holdings || 0) - 0.5) > 0.00000001);

  if (!mounted) return <div className="h-screen w-full bg-[#020617]" />;

  return (
    <div className="flex h-screen overflow-hidden bg-[#020617] font-sans selection:bg-sky-500/20">
      <Sidebar />
      <main className="flex-1 flex flex-col p-12 md:p-20 overflow-y-auto no-scrollbar relative">
        <div className="mx-auto max-w-[1800px] w-full space-y-12 relative z-10">
          
          <header className="space-y-2">
             <div className="flex items-center gap-4 text-sky-500 mb-3">
                <ShieldCheck className="w-10 h-10" />
                <h1 className="text-5xl font-black tracking-tighter uppercase text-white">Neural <span className="text-sky-400">Safeguards</span></h1>
             </div>
             <p className="text-slate-500 font-light text-xl italic tracking-tight leading-none">Guardrails and emergency protocols for the Zenith Super-Brain.</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
             
             <div className="space-y-16">
                {/* Manual Override Control */}
                <div className="relative group">
                   <DebugTooltip endpoint="GET /api/all_status" fields={['manual_config', 'daily_target']} isNull={!manualConfig} />
                   <ControlCenter currentConfig={manualConfig} dailyTarget={dailyTarget} />
                </div>

                {/* Risk Management Form */}
                <GlassCard className="p-12 border-white/5 shadow-2xl bg-white/[0.01] relative group" delay={0.1}>
                   <DebugTooltip endpoint="GET /api/safety" fields={['sl_atr_mult', 'tp_atr_mult']} isNull={!safety} />
                   <div className="flex items-center gap-4 mb-10 opacity-40">
                      <Activity className="w-7 h-7 text-sky-500" />
                      <h3 className="font-black text-white uppercase tracking-[0.4em] text-xs leading-none">Volatility Guard (ATR)</h3>
                   </div>
                   
                   <div className="space-y-12">
                      <div className="space-y-6">
                         <div className="flex justify-between items-end">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Stop Loss Multiplier</label>
                            <span className="text-3xl font-black text-rose-500 tracking-tighter">{sl}x <span className="text-sm opacity-30 ml-1 uppercase">ATR</span></span>
                         </div>
                         <input 
                           type="range" min="1" max="5" step="0.1" 
                           value={sl} onChange={(e) => setSl(parseFloat(e.target.value))}
                           className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:accent-sky-400 transition-all shadow-inner"
                         />
                         <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest leading-loose">Dynamic loss tolerance mapped to asset volatility cycles.</p>
                      </div>

                      <div className="space-y-6">
                         <div className="flex justify-between items-end">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Take Profit Multiplier</label>
                            <span className="text-3xl font-black text-emerald-500 tracking-tighter">{tp}x <span className="text-sm opacity-30 ml-1 uppercase">ATR</span></span>
                         </div>
                         <input 
                           type="range" min="1" max="10" step="0.1" 
                           value={tp} onChange={(e) => setTp(parseFloat(e.target.value))}
                           className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:accent-sky-400 transition-all shadow-inner"
                         />
                         <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest leading-loose">Automated exit scalability based on micro-trend momentum.</p>
                      </div>

                      <button 
                        onClick={handleUpdate}
                        className="w-full py-6 rounded-2xl bg-white/[0.03] border border-white/5 text-white font-black uppercase tracking-[0.3em] text-[10px] shadow-2xl hover:bg-sky-500 transition-all flex items-center justify-center gap-4"
                      >
                         <Save className="w-5 h-5" /> Deploy Strategic Guardrails
                      </button>
                   </div>
                </GlassCard>
             </div>

             {/* Emergency Protocol */}
             <div className="space-y-10 flex flex-col h-full">
                <GlassCard className="p-12 border-none bg-gradient-to-br from-slate-950 to-rose-950/20 text-white shadow-2xl flex-1 flex flex-col justify-center relative overflow-hidden group" delay={0.2}>
                   <DebugTooltip endpoint="GET /api/all_status" fields={['assets.*.btc_holdings']} isNull={activeExposure.length === 0} />
                   <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-rose-500/[0.03] rounded-full blur-[80px] group-hover:bg-rose-500/[0.06] transition-all duration-1000" />
                   <div className="flex items-center gap-4 mb-10 text-rose-500 opacity-60 relative z-10">
                      <AlertCircle className="w-8 h-8" />
                      <h3 className="font-black uppercase tracking-[0.5em] text-xs">Emergency Protocol</h3>
                   </div>
                   
                   <div className="mb-12 relative z-10 bg-rose-500/5 border border-rose-500/10 p-8 rounded-3xl flex items-center justify-between shadow-2xl backdrop-blur-xl">
                      <div className="flex flex-col gap-2">
                         <span className="text-[10px] font-black text-rose-300/40 uppercase tracking-[0.3em]">Neural Exposure</span>
                         <span className="text-3xl font-black tracking-tighter">{activeExposure.length} <span className="text-sm opacity-30 ml-2 font-bold uppercase tracking-widest">Nodes Active</span></span>
                      </div>
                      <div className="flex gap-3">
                         {activeExposure.length === 0 ? (
                            <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">No Active Risk</span>
                         ) : activeExposure.map(c => (
                            <span key={c} className="px-4 py-2 bg-rose-500/10 text-rose-400 text-[10px] font-black uppercase rounded-xl border border-rose-500/20 shadow-lg">{c}</span>
                         ))}
                      </div>
                   </div>

                   <p className="text-slate-400 font-medium mb-12 leading-relaxed relative z-10 text-lg uppercase tracking-tight">
                      Trigger tactical liquidation of **all neural positions** into operational IDR liquidity and freeze the engine synapses immediately.
                   </p>
                   <button 
                     onClick={handlePanic}
                     disabled={safety?.emergency_stop}
                     className={`w-full py-8 rounded-[32px] font-black uppercase tracking-[0.4em] text-xs shadow-2xl transition-all flex items-center justify-center gap-6 relative z-10 ${safety?.emergency_stop ? 'bg-slate-900 text-slate-700 cursor-not-allowed border border-white/5' : 'bg-rose-500 text-white hover:bg-rose-600 border border-rose-400 shadow-rose-500/20'}`}
                   >
                      <Power className="w-7 h-7" /> {safety?.emergency_stop ? 'Neural Engine Frozen' : 'Panic Sell All Nodes'}
                   </button>
                </GlassCard>

                <div className="p-10 rounded-[48px] bg-white/[0.005] border border-white/5 shadow-2xl flex items-start gap-8 group hover:bg-white/[0.01] transition-all">
                   <div className="p-4 bg-sky-500/10 rounded-[28px] text-sky-400 border border-sky-500/20 group-hover:scale-110 transition-transform"><Info className="w-8 h-8" /></div>
                   <div>
                      <h4 className="font-black text-white uppercase text-xs mb-3 tracking-[0.3em]">Tactical SL/TP Execution</h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed font-medium uppercase tracking-widest">
                         Zenith implements **Dynamic Volatility Synapses**. Unlike static logic, ATR-based exits breathe with the market sequence. 
                         Higher multipliers provide AI room for tactical trend capture during volatility spikes.
                      </p>
                   </div>
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
