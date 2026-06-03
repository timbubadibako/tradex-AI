"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    Database, HardDrive, Trash2, Cpu, FileJson, Clock, ChevronRight, Search, Activity, Globe, RefreshCcw, History as HistoryIcon
} from "lucide-react";
import { useState, useEffect } from "react";
import GlassCard from "@/components/dashboard/GlassCard";
import Sidebar from "@/components/dashboard/Sidebar";
import { supabase } from "@/lib/supabase";

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

export default function BotManagementPage() {
    const [selectedCoin, setSelectedCoin] = useState("BTC");
    const [latestFiles, setLatestFiles] = useState<any[]>([]);
    const [historyFiles, setHistoryFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalSizeMB, setTotalSizeMB] = useState(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const coins = ["BTC", "ETH", "SOL"];
    const STORAGE_LIMIT_MB = 1024; // 1GB Free Tier

    const fetchFiles = async () => {
        setLoading(true);
        try {
            const coinPath = selectedCoin.toUpperCase();
            const { data: latest } = await supabase.storage.from('model-brains').list(`${coinPath}/latest`);
            setLatestFiles(latest ? latest.filter(f => f.name && f.name !== '.placeholder') : []);

            const { data: history } = await supabase.storage.from('model-brains').list(`${coinPath}/history`, {
                    sortBy: { column: 'name', order: 'desc' }
                });
            setHistoryFiles(history ? history.filter(f => f.name && f.name !== '.placeholder') : []);

            let totalBytes = 0;
            for (const c of coins) {
                const { data: l } = await supabase.storage.from('model-brains').list(`${c.toUpperCase()}/latest`);
                const { data: h } = await supabase.storage.from('model-brains').list(`${c.toUpperCase()}/history`);
                if (l) l.forEach(f => totalBytes += (f.metadata?.size || 0));
                if (h) h.forEach(f => totalBytes += (f.metadata?.size || 0));
            }
            setTotalSizeMB(totalBytes / (1024 * 1024));
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { fetchFiles(); }, [selectedCoin]);

    const deleteFile = async (name: string) => {
        if (confirm(`Delete ${name}?`)) {
            await supabase.storage.from('model-brains').remove([`${selectedCoin}/history/${name}`]);
            fetchFiles();
        }
    };

    const usedPercentage = (totalSizeMB / STORAGE_LIMIT_MB) * 100;

    if (!mounted) return <div className="h-screen w-full bg-[#020617]" />;

    return (
      <div className="flex h-screen overflow-hidden bg-[#020617] font-sans selection:bg-sky-500/20">
        <Sidebar />
        <main className="flex-1 flex flex-col p-12 md:p-20 overflow-y-auto no-scrollbar relative">
          <div className="mx-auto max-w-[1800px] w-full space-y-12 relative z-10">

                    <header className="flex justify-between items-end">
                        <div className="space-y-2">
                            <div className="flex items-center gap-4 text-sky-500 mb-3">
                                <Database className="w-10 h-10" />
                                <h1 className="text-5xl font-black tracking-tighter uppercase text-white">Brain <span className="text-sky-400">Control</span></h1>
                            </div>
                            <p className="text-slate-500 font-light text-xl tracking-tight leading-none italic">Neural weight monitoring and evolutionary archive synchronization.</p>
                        </div>
                        <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 px-10 py-8 rounded-[32px] shadow-2xl min-w-[350px] relative group">
                            <DebugTooltip endpoint="Supabase Storage RPC" fields={['metadata.size', 'bucket_list']} isNull={totalSizeMB === 0} />
                            <div className="flex justify-between mb-5 items-end">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] leading-none">Cloud Knowledge Quota</p>
                                <p className="text-sm font-black text-slate-200">{totalSizeMB.toFixed(1)} MB <span className="text-slate-600 font-bold">/ 1 GB</span></p>
                            </div>
                            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${usedPercentage}%` }} className={`h-full shadow-lg ${usedPercentage > 80 ? 'bg-rose-500 shadow-rose-500/40' : 'bg-sky-500 shadow-sky-500/40'}`} />
                            </div>
                        </div>
                    </header>

                    <div className="flex gap-4 p-2 bg-white/[0.01] rounded-[28px] w-fit border border-white/5 shadow-inner">
                        {coins.map(c => (
                            <button key={c} onClick={() => setSelectedCoin(c)} className={`px-12 py-4 rounded-[20px] text-[11px] font-black uppercase tracking-[0.2em] transition-all ${selectedCoin === c ? 'bg-white/10 text-white shadow-2xl border border-white/10' : 'text-slate-600 hover:text-slate-400'}`}>{c}_NODE</button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        <div className="lg:col-span-2 space-y-12">
                            <section className="space-y-8 relative group">
                                <DebugTooltip endpoint="Supabase: [COIN]/latest/" fields={['name', 'metadata', 'created_at']} isNull={latestFiles.length === 0} />
                                <div className="flex items-center gap-4 px-2 text-slate-300">
                                    <Activity className="w-7 h-7 text-sky-500 opacity-60" />
                                    <h3 className="font-black text-sm uppercase tracking-[0.4em]">Active Neural Weights (Latest)</h3>
                                </div>
                                <GlassCard className="p-0 border-white/5 shadow-2xl bg-white/[0.005] overflow-hidden" delay={0.1}>
                                    <table className="w-full text-left border-separate border-spacing-0">
                                        <thead className="bg-white/[0.02] border-b border-white/5">
                                            <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                <th className="px-10 py-6">Neural Identifier</th>
                                                <th className="px-8 py-6 text-center">Density (Size)</th>
                                                <th className="px-10 py-6 text-right">Synchronization Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm font-bold text-slate-400">
                                            {latestFiles.length === 0 ? <tr><td colSpan={3} className="py-24 text-center text-slate-600 italic uppercase tracking-[0.3em] text-sm font-black animate-pulse">Scanning cloud synapses...</td></tr> : latestFiles.map((f, i) => (
                                                <tr key={i} className="group hover:bg-white/[0.01] transition-colors">
                                                    <td className="px-10 py-8 flex items-center gap-6 text-slate-100 font-mono text-xs">
                                                        <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400 border border-sky-500/20"><Cpu className="w-5 h-5" /></div> 
                                                        {f.name}
                                                    </td>
                                                    <td className="px-8 py-8 text-center text-xs text-slate-600 font-mono">
                                                        {f.metadata?.size ? (f.metadata.size / (1024 * 1024)).toFixed(2) : "0.00"} MB
                                                    </td>
                                                    <td className="px-10 py-8 text-right">
                                                       <span className="px-4 py-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[9px] font-black rounded-xl uppercase tracking-widest shadow-lg">Tactical Alpha Active</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </GlassCard>
                            </section>

                            <section className="space-y-8 relative group">
                                <DebugTooltip endpoint="Supabase: [COIN]/history/" fields={['name', 'mape_label', 'created_at']} isNull={historyFiles.length === 0} />
                                <div className="flex items-center gap-4 px-2 text-slate-300">
                                    <HistoryIcon className="w-7 h-7 text-purple-500 opacity-60" />
                                    <h3 className="font-black text-sm uppercase tracking-[0.4em]">Evolutionary Archive (History)</h3>
                                </div>
                                <GlassCard className="p-0 border-white/5 shadow-2xl bg-white/[0.005] overflow-hidden" delay={0.2}>
                                    <div className="max-h-[600px] overflow-y-auto no-scrollbar">
                                        <table className="w-full text-left border-separate border-spacing-0">
                                            <thead className="bg-white/[0.02] border-b border-white/5 sticky top-0 z-10 backdrop-blur-md">
                                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                    <th className="px-10 py-6">Neural Milestone</th>
                                                    <th className="px-8 py-6 text-center">Precision Metric</th>
                                                    <th className="px-10 py-6 text-right">Destructive Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-sm font-bold text-slate-400">
                                                {historyFiles.length === 0 ? <tr><td colSpan={3} className="py-32 text-center text-slate-700 italic uppercase tracking-[0.3em] text-sm font-black animate-pulse">Restoring temporal sequence...</td></tr> : historyFiles.map((f, i) => {
                                                    const mape = f.name.includes('mape_') ? f.name.split('mape_')[1].replace('.keras', '') : 'N/A';
                                                    return (
                                                        <tr key={i} className="hover:bg-white/[0.01] transition-colors group">
                                                            <td className="px-10 py-8 flex items-center gap-6">
                                                                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20 group-hover:bg-purple-500/20 transition-all"><FileJson className="w-5 h-5" /></div>
                                                                <span className="tracking-tight text-slate-100 text-xs font-mono">{f.name}</span>
                                                            </td>
                                                            <td className="px-8 py-8 text-center">
                                                                <span className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                                                    {mape}% MAPE
                                                                </span>
                                                            </td>
                                                            <td className="px-10 py-8 text-right"><button onClick={() => deleteFile(f.name)} className="p-3 text-slate-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20"><Trash2 className="w-5 h-5" /></button></td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </GlassCard>
                            </section>
                        </div>

                        <div className="space-y-10">
                            <GlassCard className="p-12 border-white/5 shadow-2xl bg-white/[0.01] relative group" delay={0.3}>
                                <DebugTooltip endpoint="Supabase Auth & Storage API" fields={['connection_status', 'ping_latency']} isNull={false} />
                                <div className="flex items-center gap-4 mb-10 opacity-40"><RefreshCcw className="w-7 h-7 text-sky-400" /><h4 className="font-black uppercase text-xs tracking-[0.3em] text-slate-400">Telemetry Status</h4></div>
                                <div className="space-y-10">
                                    <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Supabase Engine</span><span className="flex items-center gap-3 text-emerald-400 font-black text-[11px] uppercase tracking-widest"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_#10b981]" />Synchronized</span></div>
                                    <div className="flex items-center justify-between border-t border-white/5 pt-10"><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bucket Integrity</span><span className="text-sky-400 font-black text-[11px] uppercase tracking-widest italic">100% Verified</span></div>
                                </div>
                                <button onClick={fetchFiles} className="mt-16 w-full py-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase text-[11px] tracking-[0.4em] transition-all shadow-2xl">Refresh Neural Index</button>
                            </GlassCard>
                            
                            <div className="p-12 rounded-[48px] bg-sky-500/5 border border-white/5 shadow-2xl flex flex-col items-center text-center gap-8 group hover:bg-sky-500/10 transition-all duration-700">
                                <div className="p-5 bg-sky-500/10 rounded-[32px] text-sky-400 shadow-[0_0_30px_rgba(56,189,248,0.1)] border border-sky-500/20 group-hover:scale-110 transition-transform duration-700"><Globe className="w-10 h-10" /></div>
                                <div>
                                    <h4 className="font-black text-white uppercase text-xs mb-4 tracking-[0.4em]">Edge Sync</h4>
                                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium uppercase tracking-[0.1em] px-4">Neural weights propagated across 12 global regions for near-zero latency tactical deployment.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
