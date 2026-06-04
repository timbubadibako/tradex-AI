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
      <main className="flex-1 flex flex-col p-12 md:p-16 overflow-y-auto no-scrollbar relative">
        <div className="fixed top-1/4 left-1/4 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
        <div className="fixed bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" style={{ animationDelay: '-5s' }} />

        <div className="mx-auto max-w-[1400px] w-full space-y-10 relative z-10">
          
          <header className="space-y-1">
             <div className="flex items-center gap-3 text-sky-500 mb-1">
                <ShieldCheck className="w-8 h-8" />
                <h1 className="text-4xl font-black tracking-tighter uppercase text-white">Neural <span className="text-sky-400">Safeguards</span></h1>
             </div>
             <p className="text-slate-500 font-light text-base italic tracking-tight leading-none">Guardrails and emergency protocols for the Zenith Super-Brain.</p>
          </header>

          {/* SAKTI REVISE: Ganti gap-16 raksasa menjadi gap-8 yang proporsional */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
             
             {/* LEFT SECTION: OVERRIDES & VOLATILITY GUARD */}
             <div className="space-y-8">
                {/* Manual Override Control */}
                <div className="relative group">
                   <DebugTooltip endpoint="GET /api/all_status" fields={['manual_config', 'daily_target']} isNull={!manualConfig} />
                   <ControlCenter currentConfig={manualConfig} dailyTarget={dailyTarget} />
                </div>

                {/* Risk Management Form */}
                {/* SAKTI REVISE: Padatkan padding dari p-12 ke p-8 */}
                <GlassCard className="p-8 border-white/5 shadow-2xl bg-white/[0.01] relative group" delay={0.1}>
                   <DebugTooltip endpoint="GET /api/safety" fields={['sl_atr_mult', 'tp_atr_mult']} isNull={!safety} />
                   <div className="flex items-center gap-3 mb-8 opacity-40">
                      <Activity className="w-5 h-5 text-sky-500" />
                      <h3 className="font-black text-white uppercase tracking-[0.4em] text-[10px] leading-none">Volatility Guard (ATR)</h3>
                   </div>
                   
                   <div className="space-y-8">
                      {/* Stop Loss Group */}
                      <div className="space-y-3">
                         <div className="flex justify-between items-end">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Stop Loss Multiplier</label>
                            <span className="text-2xl font-black text-rose-500 tracking-tighter">{sl}x <span className="text-xs opacity-30 ml-0.5 uppercase">ATR</span></span>
                         </div>
                         <input 
                           type="range" min="1" max="5" step="0.1" 
                           value={sl} onChange={(e) => setSl(parseFloat(e.target.value))}
                           className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:accent-sky-400 transition-all shadow-inner"
                         />
                         <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest leading-none">Dynamic loss tolerance mapped to asset volatility cycles.</p>
                      </div>

                      {/* Take Profit Group */}
                      <div className="space-y-3">
                         <div className="flex justify-between items-end">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Take Profit Multiplier</label>
                            <span className="text-2xl font-black text-emerald-500 tracking-tighter">{tp}x <span className="text-xs opacity-30 ml-0.5 uppercase">ATR</span></span>
                         </div>
                         <input 
                           type="range" min="1" max="10" step="0.1" 
                           value={tp} onChange={(e) => setTp(parseFloat(e.target.value))}
                           className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:accent-sky-400 transition-all shadow-inner"
                         />
                         <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest leading-none">Automated exit scalability based on micro-trend momentum.</p>
                      </div>

                      {/* Deploy Button */}
                      <button 
                        onClick={handleUpdate}
                        className="w-full py-4 rounded-xl bg-white/[0.03] border border-white/5 text-white font-black uppercase tracking-[0.3em] text-[9px] shadow-2xl hover:bg-sky-500 transition-all flex items-center justify-center gap-3 mt-4"
                      >
                         <Save className="w-4 h-4" /> Deploy Strategic Guardrails
                      </button>
                   </div>
                </GlassCard>
             </div>

             {/* RIGHT SECTION: EMERGENCY & INFO FEED */}
             <div className="space-y-6 flex flex-col">
                {/* Emergency Protocol Card */}
                {/* SAKTI REVISE: Ganti flex-1 jadi h-fit, padding diturunkan ke p-8 biar tidak makan tempat kabur ke bawah */}
                <GlassCard className="p-8 border-none bg-gradient-to-br from-slate-950 to-rose-950/20 text-white shadow-2xl h-fit relative group overflow-hidden" delay={0.2}>
                   <DebugTooltip endpoint="GET /api/all_status" fields={['assets.*.btc_holdings']} isNull={activeExposure.length === 0} />
                   <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-rose-500/[0.03] rounded-full blur-[80px] group-hover:bg-rose-500/[0.06] transition-all duration-1000" />
                   
                   <div className="flex items-center gap-3 mb-6 text-rose-500 opacity-60 relative z-10">
                      <AlertCircle className="w-6 h-6" />
                      <h3 className="font-black uppercase tracking-[0.5em] text-[10px]">Emergency Protocol</h3>
                   </div>
                   
                   {/* Node Badge Grid */}
                   <div className="mb-6 relative z-10 bg-rose-500/5 border border-rose-500/10 p-5 rounded-2xl flex items-center justify-between shadow-2xl backdrop-blur-xl">
                      <div className="flex flex-col gap-1">
                         <span className="text-[9px] font-black text-rose-300/40 uppercase tracking-[0.3em]">Neural Exposure</span>
                         <span className="text-2xl font-black tracking-tighter">{activeExposure.length} <span className="text-[10px] opacity-30 ml-1 font-bold uppercase tracking-widest">Nodes Active</span></span>
                      </div>
                      <div className="flex flex-wrap gap-2 justify-end max-w-[60%]">
                         {activeExposure.length === 0 ? (
                            <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">No Active Risk</span>
                         ) : activeExposure.map(c => (
                            <span key={c} className="px-3 py-1 bg-rose-500/10 text-rose-400 text-[9px] font-black uppercase rounded-lg border border-rose-500/20 shadow-lg">{c}</span>
                         ))}
                      </div>
                   </div>

                   <p className="text-slate-400 font-medium mb-6 leading-normal relative z-10 text-xs uppercase tracking-wider">
                      Trigger tactical liquidation of **all neural positions** into operational IDR liquidity and freeze the engine synapses immediately.
                   </p>
                   
                   {/* Panic Button */}
                   <button 
                     onClick={handlePanic}
                     disabled={safety?.emergency_stop}
                     className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.4em] text-[10px] shadow-2xl transition-all flex items-center justify-center gap-4 relative z-10 ${safety?.emergency_stop ? 'bg-slate-900 text-slate-700 cursor-not-allowed border border-white/5' : 'bg-rose-500 text-white hover:bg-rose-600 border border-rose-400 shadow-rose-500/20'}`}
                   >
                      <Power className="w-5 h-5" /> {safety?.emergency_stop ? 'Neural Engine Frozen' : 'Panic Sell All Nodes'}
                   </button>
                </GlassCard>

                {/* Tactical Info Footer Card */}
                <div className="p-6 rounded-[32px] bg-white/[0.005] border border-white/5 shadow-2xl flex items-start gap-4 group hover:bg-white/[0.01] transition-all">
                   <div className="p-3 bg-sky-500/10 rounded-2xl text-sky-400 border border-sky-500/20 shrink-0"><Info className="w-5 h-5" /></div>
                   <div>
                      <h4 className="font-black text-white uppercase text-[10px] mb-1.5 tracking-[0.3em]">Tactical SL/TP Execution</h4>
                      <p className="text-[9px] text-slate-600 leading-relaxed font-medium uppercase tracking-widest">
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
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}