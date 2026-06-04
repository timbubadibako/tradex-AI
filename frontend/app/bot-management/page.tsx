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
        // SAKTI REVISE 1: Aktifkan h-screen penuh di container utama agar layout balance
        <div className="flex h-screen overflow-hidden bg-[#020617] font-sans selection:bg-sky-500/20">
            <Sidebar />

            {/* SAKTI REVISE 2: Biarkan main h-auto overflow-auto biar seluruh boks halaman bisa discroll panjang ke bawah */}
            <main className="flex-1 flex flex-col p-12 md:p-16 overflow-y-auto no-scrollbar relative h-auto">
                <div className="mx-auto max-w-[1600px] w-full space-y-10 relative z-10 pb-20">

                    {/* HEADER OVERVIEW */}
                    <header className="flex justify-between items-end shrink-0">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3 text-sky-500 mb-1">
                                <Database className="w-8 h-8" />
                                <h1 className="text-4xl font-black tracking-tighter uppercase text-white">Brain <span className="text-sky-400">Control</span></h1>
                            </div>
                            <p className="text-slate-500 font-light text-base tracking-tight leading-none italic">Neural weight monitoring and evolutionary archive synchronization.</p>
                        </div>
                        {/* SAKTI REVISE: Padatkan padding kuota dari p-10 ke p-6 biar hemat area vertikal */}
                        <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/10 px-6 py-5 rounded-2xl shadow-2xl min-w-[320px] relative group shrink-0">
                            <DebugTooltip endpoint="Supabase Storage RPC" fields={['metadata.size', 'bucket_list']} isNull={totalSizeMB === 0} />
                            <div className="flex justify-between mb-3 items-end">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] leading-none">Cloud Knowledge Quota</p>
                                <p className="text-xs font-black text-slate-200">{totalSizeMB.toFixed(1)} MB <span className="text-slate-600 font-bold">/ 1 GB</span></p>
                            </div>
                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${usedPercentage}%` }} className={`h-full shadow-lg ${usedPercentage > 80 ? 'bg-rose-500 shadow-rose-500/40' : 'bg-sky-500 shadow-sky-500/40'}`} />
                            </div>
                        </div>
                    </header>

                    {/* NODE SELECTION */}
                    <div className="flex gap-2 p-1.5 bg-white/[0.01] rounded-2xl w-fit border border-white/5 shadow-inner shrink-0">
                        {coins.map(c => (
                            <button key={c} onClick={() => setSelectedCoin(c)} className={`px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${selectedCoin === c ? 'bg-white/10 text-white shadow-2xl border border-white/10' : 'text-slate-600 hover:text-slate-400'}`}>{c}_NODE</button>
                        ))}
                    </div>

                    {/* CONTENT GRIDS */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        <div className="lg:col-span-2 space-y-10">

                            {/* ACTIVE NEURAL WEIGHTS SECTION */}
                            <section className="space-y-4 relative group">
                                <DebugTooltip endpoint={`Supabase: ${selectedCoin}/latest/`} fields={['name', 'metadata', 'created_at']} isNull={latestFiles.length === 0} />
                                <div className="flex items-center gap-3 px-1 text-slate-300">
                                    <Activity className="w-5 h-5 text-sky-500 opacity-60" />
                                    <h3 className="font-black text-xs uppercase tracking-[0.4em]">Active Neural Weights (Latest)</h3>
                                </div>
                                <GlassCard className="p-6 border-white/5 shadow-2xl bg-white/[0.005] overflow-hidden" delay={0.1}>

                                    {/* LIST GRID REVISI: Mengganti Table lama biar anti-macet */}
                                    <div className="grid grid-cols-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-3 mb-4 px-4">
                                        <div>Neural Identifier</div>
                                        <div className="text-center">Density (Size)</div>
                                        <div className="text-right">Synchronization Status</div>
                                    </div>

                                    <div className="space-y-3">
                                        {latestFiles.length === 0 ? (
                                            <div className="py-12 text-center text-slate-600 italic uppercase tracking-[0.3em] text-xs font-black animate-pulse">Scanning cloud synapses...</div>
                                        ) : latestFiles.map((f, i) => (
                                            <div key={i} className="grid grid-cols-3 items-center bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 rounded-xl p-4 transition-all group px-4">
                                                <div className="flex items-center gap-4 text-slate-100 font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap">
                                                    <div className="p-2.5 bg-sky-500/10 rounded-lg text-sky-400 border border-sky-500/20 shrink-0"><Cpu className="w-4 h-4" /></div>
                                                    {f.name}
                                                </div>
                                                <div className="text-center text-xs text-slate-600 font-mono">
                                                    {f.metadata?.size ? (f.metadata.size / (1024 * 1024)).toFixed(2) : "0.00"} MB
                                                </div>
                                                <div className="text-right">
                                                    <span className="px-3 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[8px] font-black rounded-lg uppercase tracking-widest shadow-md">Tactical Alpha Active</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </GlassCard>
                            </section>

                            {/* EVOLUTIONARY ARCHIVE SECTION */}
                            <section className="space-y-4 relative group">
                                <DebugTooltip endpoint={`Supabase: ${selectedCoin}/history/`} fields={['name', 'mape_label', 'created_at']} isNull={historyFiles.length === 0} />
                                <div className="flex items-center gap-3 px-1 text-slate-300">
                                    <HistoryIcon className="w-5 h-5 text-purple-500 opacity-60" />
                                    <h3 className="font-black text-xs uppercase tracking-[0.4em]">Evolutionary Archive (History)</h3>
                                </div>
                                <GlassCard className="p-6 border-white/5 shadow-2xl bg-white/[0.005] overflow-hidden" delay={0.2}>

                                    {/* ARCHIVE COLUMN GRID */}
                                    <div className="grid grid-cols-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-3 mb-4 px-4">
                                        <div>Neural Milestone</div>
                                        <div className="text-center">Precision Metric</div>
                                        <div className="text-right">Destructive Action</div>
                                    </div>

                                    {/* SCROLL CONTAINER LIST */}
                                    <div className="max-h-[400px] overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-0">
                                        {historyFiles.length === 0 ? (
                                            <div className="py-16 text-center text-slate-700 italic uppercase tracking-[0.3em] text-xs font-black animate-pulse">Restoring temporal sequence...</div>
                                        ) : historyFiles.map((f, i) => {
                                            const mape = f.name.includes('mape_') ? f.name.split('mape_')[1].replace('.keras', '') : 'N/A';
                                            return (
                                                <div key={i} className="grid grid-cols-3 items-center bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 rounded-xl p-4 transition-all group px-4">
                                                    <div className="flex items-center gap-4 overflow-hidden text-ellipsis whitespace-nowrap">
                                                        <div className="p-2.5 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20 group-hover:bg-purple-500/20 transition-all shrink-0"><FileJson className="w-4 h-4" /></div>
                                                        <span className="tracking-tight text-slate-100 text-xs font-mono overflow-hidden text-ellipsis">{f.name}</span>
                                                    </div>
                                                    <div className="text-center">
                                                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black rounded-lg shadow-md">
                                                            {mape}% MAPE
                                                        </span>
                                                    </div>
                                                    <div className="text-right pl-4">
                                                        <button onClick={() => deleteFile(f.name)} className="p-2 text-slate-700 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all border border-transparent hover:border-rose-500/20"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </GlassCard>
                            </section>
                        </div>

                        {/* RIGHT COLUMN TELEMETRY */}
                        <div className="space-y-6">
                            {/* SAKTI REVISE: Padatkan boks status dari p-12 ke p-8 dan rapikan button margin */}
                            <GlassCard className="p-8 border-white/5 shadow-2xl bg-white/[0.01] relative group h-fit" delay={0.3}>
                                <DebugTooltip endpoint="Supabase Auth & Storage API" fields={['connection_status', 'ping_latency']} isNull={false} />
                                <div className="flex items-center gap-3 mb-6 opacity-40"><RefreshCcw className="w-5 h-5 text-sky-400" /><h4 className="font-black uppercase text-[10px] tracking-[0.3em] text-slate-400">Telemetry Status</h4></div>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Supabase Engine</span><span className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_#10b981]" />Synchronized</span></div>
                                    <div className="flex items-center justify-between border-t border-white/5 pt-6"><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bucket Integrity</span><span className="text-sky-400 font-black text-[10px] uppercase tracking-widest italic">100% Verified</span></div>
                                </div>
                                <button onClick={fetchFiles} className="mt-10 w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase text-[10px] tracking-[0.4em] transition-all shadow-2xl">Refresh Neural Index</button>
                            </GlassCard>
                        </div>
                    </div>
                </div>
            </main>

            <style jsx global>{`
                /* SAKTI SLIM NEON SCROLLBAR */
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(56, 189, 248, 0.2); }

                @font-face { font-family: 'Outfit'; src: url('https://cdn.jsdelivr.net/font/outfit/Outfit-Black.woff2'); }
                @font-face { font-family: 'Inter'; src: url('https://cdn.jsdelivr.net/font/inter/Inter-Regular.woff2'); }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}