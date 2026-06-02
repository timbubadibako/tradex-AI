"use client";

import { motion } from "framer-motion";
import { ShieldCheck, AlertCircle, Zap, Activity, Info, Save, Power } from "lucide-react";
import { useState, useEffect } from "react";
import GlassCard from "@/components/dashboard/GlassCard";
import Sidebar from "@/components/dashboard/Sidebar";
import useSWR from "swr";
import { getApiUrl } from "@/lib/constants";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SafetyPage() {
  const { data: safety, mutate } = useSWR(`${getApiUrl()}/api/safety`, fetcher);
  const [sl, setSl] = useState(1.5);
  const [tp, setTp] = useState(2.5);

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

  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-sky-50 via-white to-sky-100 font-sans selection:bg-sky-100">
      <Sidebar />
      <main className="flex-1 flex flex-col p-12 md:p-20 overflow-y-auto no-scrollbar">
        <div className="mx-auto max-w-[1200px] w-full space-y-12">
          
          <header className="space-y-2">
             <div className="flex items-center gap-3 text-sky-500 mb-2">
                <ShieldCheck className="w-8 h-8" />
                <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-900">AI Safety & Risk</h1>
             </div>
             <p className="text-slate-400 font-medium text-lg">Guardrails and emergency protocols for the Zenith Super-Brain.</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
             
             {/* Risk Management Form */}
             <GlassCard className="p-10 border-white shadow-xl" delay={0.1}>
                <div className="flex items-center gap-3 mb-8">
                   <Activity className="w-6 h-6 text-sky-500" />
                   <h3 className="font-black text-slate-800 uppercase tracking-widest">Volatility Guard (ATR)</h3>
                </div>
                
                <div className="space-y-8">
                   <div className="space-y-4">
                      <div className="flex justify-between items-end">
                         <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Stop Loss Multiplier</label>
                         <span className="text-xl font-black text-rose-500">{sl}x ATR</span>
                      </div>
                      <input 
                        type="range" min="1" max="5" step="0.1" 
                        value={sl} onChange={(e) => setSl(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-500"
                      />
                      <p className="text-[10px] text-slate-400 italic">Batas toleransi kerugian berdasarkan rata-rata fluktuasi harga.</p>
                   </div>

                   <div className="space-y-4">
                      <div className="flex justify-between items-end">
                         <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Take Profit Multiplier</label>
                         <span className="text-xl font-black text-emerald-500">{tp}x ATR</span>
                      </div>
                      <input 
                        type="range" min="1" max="10" step="0.1" 
                        value={tp} onChange={(e) => setTp(parseFloat(e.target.value))}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-500"
                      />
                      <p className="text-[10px] text-slate-400 italic">Target profit otomatis yang menyesuaikan dengan volatilitas pasar.</p>
                   </div>

                   <button 
                     onClick={handleUpdate}
                     className="w-full py-5 rounded-[24px] bg-slate-900 text-white font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-sky-600 transition-all flex items-center justify-center gap-3"
                   >
                      <Save className="w-5 h-5" /> Update Guardrails
                   </button>
                </div>
             </GlassCard>

             {/* Emergency Protocol */}
             <div className="space-y-8">
                <GlassCard className="p-10 border-rose-100 bg-rose-50/20 shadow-xl" delay={0.2}>
                   <div className="flex items-center gap-3 mb-6 text-rose-600">
                      <AlertCircle className="w-7 h-7" />
                      <h3 className="font-black uppercase tracking-widest">Emergency Protocol</h3>
                   </div>
                   <p className="text-slate-600 font-medium mb-8 leading-relaxed">
                      If you detect abnormal market behavior or API instability, trigger the protocol below. 
                      This will liquidate **all active positions** into IDR and pause AI execution.
                   </p>
                   <button 
                     onClick={handlePanic}
                     disabled={safety?.emergency_stop}
                     className={`w-full py-6 rounded-[32px] font-black uppercase tracking-[0.3em] shadow-2xl transition-all flex items-center justify-center gap-4 ${safety?.emergency_stop ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-rose-500 text-white hover:bg-rose-600 active:scale-95'}`}
                   >
                      <Power className="w-6 h-6" /> {safety?.emergency_stop ? 'System Paused' : 'PANIC SELL ALL'}
                   </button>
                </GlassCard>

                <div className="p-8 rounded-[40px] bg-sky-500/5 border border-sky-100 flex items-start gap-5">
                   <div className="p-3 bg-white rounded-2xl shadow-sm text-sky-500 shrink-0"><Info className="w-6 h-6" /></div>
                   <div>
                      <h4 className="font-black text-slate-800 uppercase text-xs mb-2">Automated SL/TP Info</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                         Zenith uses **Dynamic Volatility Exit**. Unlike static percentages, ATR-based exits breathe with the market. 
                         Higher multipliers allow the AI more room to run during high-trend periods.
                      </p>
                   </div>
                </div>
             </div>

          </div>
        </div>
      </main>
    </div>
  );
}
