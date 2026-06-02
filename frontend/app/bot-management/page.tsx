"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    Database, HardDrive, Trash2, Cpu, FileJson, Clock, ChevronRight, Search, Activity, Globe, RefreshCcw, History as HistoryIcon
} from "lucide-react";
import { useState, useEffect } from "react";
import GlassCard from "@/components/dashboard/GlassCard";
import Sidebar from "@/components/dashboard/Sidebar";
import { supabase } from "@/lib/supabase";

export default function BotManagement() {
    const [selectedCoin, setSelectedCoin] = useState("BTC");
    const [latestFiles, setLatestFiles] = useState<any[]>([]);
    const [historyFiles, setHistoryFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalSizeMB, setTotalSizeMB] = useState(0);

    const coins = ["BTC", "ETH", "SOL"];
    const STORAGE_LIMIT_MB = 1024; // 1GB Free Tier

    // ==========================================
    // 1. PERBAIKAN LOGIKA FETCH (Aman dari Undefined & Casing)
    // ==========================================
    const fetchFiles = async () => {
        setLoading(true);
        try {
            const coinPath = selectedCoin.toUpperCase();

            // Fetch Active Models
            const { data: latest, error: latestError } = await supabase.storage
                .from('model-brains')
                .list(`${coinPath}/latest`);

            if (latestError) throw latestError;

            // Proteksi ekstra: pastikan data ada dan saring file sampah bawaan system
            const validLatest = latest ? latest.filter(f => f.name && f.name !== '.placeholder' && f.id !== null) : [];
            setLatestFiles(validLatest);

            // Fetch Historical Backups
            const { data: history, error: historyError } = await supabase.storage
                .from('model-brains')
                .list(`${coinPath}/history`, {
                    sortBy: { column: 'name', order: 'desc' }
                });

            if (historyError) throw historyError;
            const validHistory = history ? history.filter(f => f.name && f.name !== '.placeholder' && f.id !== null) : [];
            setHistoryFiles(validHistory);

            // Calculate Global Quota secara aman dengan optional chaining
            let totalBytes = 0;
            for (const c of coins) {
                const { data: lFiles } = await supabase.storage.from('model-brains').list(`${c.toUpperCase()}/latest`);
                const { data: hFiles } = await supabase.storage.from('model-brains').list(`${c.toUpperCase()}/history`);

                if (lFiles) lFiles.forEach(f => totalBytes += (f.metadata?.size || 0));
                if (hFiles) hFiles.forEach(f => totalBytes += (f.metadata?.size || 0));
            }
            setTotalSizeMB(totalBytes / (1024 * 1024));

        } catch (e) {
            console.error("❌ Zenith Storage Sync Error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, [selectedCoin]);

    const deleteFile = async (name: string) => {
        if (confirm(`Delete ${name} permanently?`)) {
            await supabase.storage.from('model-brains').remove([`${selectedCoin}/history/${name}`]);
            fetchFiles();
        }
    };

    const usedPercentage = (totalSizeMB / STORAGE_LIMIT_MB) * 100;

    return (
      <div className="flex h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-sky-50 via-white to-sky-100 font-sans selection:bg-sky-100">
        <Sidebar />
        <main className="flex-1 flex flex-col p-12 md:p-20 overflow-y-auto no-scrollbar">
          <div className="mx-auto max-w-[1400px] w-full space-y-12">

                    <header className="flex justify-between items-end">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 text-sky-500 mb-2">
                                <Database className="w-8 h-8" />
                                <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-900">Brain Management</h1>
                            </div>
                            <p className="text-slate-400 font-medium text-lg tracking-tight">Monitor and purge evolutionary knowledge archives.</p>
                        </div>
                        <div className="bg-white/60 backdrop-blur-xl border border-white px-8 py-5 rounded-[32px] shadow-sm min-w-[300px]">
                            <div className="flex justify-between mb-3 items-end">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Cloud Storage Quota</p>
                                <p className="text-xs font-black text-slate-700">{totalSizeMB.toFixed(1)} MB / 1 GB</p>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${usedPercentage}%` }} className={`h-full ${usedPercentage > 80 ? 'bg-rose-500' : 'bg-sky-500'}`} />
                            </div>
                        </div>
                    </header>

                    <div className="flex gap-4 p-1.5 bg-slate-200/40 rounded-[24px] w-fit border border-white/50">
                        {coins.map(c => (
                            <button key={c} onClick={() => setSelectedCoin(c)} className={`px-8 py-3 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all ${selectedCoin === c ? 'bg-white text-sky-600 shadow-xl' : 'text-slate-500 hover:text-slate-700'}`}>{c} Factory</button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="lg:col-span-2 space-y-10">
                            <section className="space-y-6">
                                <div className="flex items-center gap-2 px-2 text-slate-800">
                                    <Activity className="w-5 h-5 text-sky-500" />
                                    <h3 className="font-black text-xs uppercase tracking-[0.2em]">Active Neural Weights (Latest)</h3>
                                </div>
                                <GlassCard className="p-0 border-white shadow-lg overflow-hidden" delay={0.1}>
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/50 border-b border-slate-100">
                                            <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                <th className="px-8 py-4">File Name</th>
                                                <th className="px-6 py-4">Size</th>
                                                <th className="px-6 py-4">Updated</th>
                                                <th className="px-8 py-4 text-right">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm font-bold text-slate-600">
                                            {latestFiles.length === 0 ? <tr><td colSpan={4} className="py-12 text-center text-slate-300 italic uppercase tracking-widest">Empty cloud node</td></tr> : latestFiles.map((f, i) => (
                                                <tr key={i} className="border-b border-slate-50/50 group">
                                                    <td className="px-8 py-5 flex items-center gap-3">
                                                        <div className="p-2 bg-sky-50 rounded-xl text-sky-500"><Cpu className="w-4 h-4" /></div>
                                                        <span className="tracking-tight">{f.name}</span>
                                                    </td>
                                                    <td className="px-6 py-5 text-xs text-slate-400">
                                                        {f.metadata?.size ? (f.metadata.size / (1024 * 1024)).toFixed(2) : "0.00"} MB
                                                    </td>
                                                    <td className="px-6 py-5 text-[10px] text-slate-400 uppercase">
                                                        {f.created_at || f.updated_at ? new Date(f.created_at || f.updated_at).toLocaleString('id-ID') : 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-5 text-xs text-slate-400">
                                                        {f.metadata?.size ? (f.metadata.size / (1024 * 1024)).toFixed(2) : "0.00"} MB
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </GlassCard>
                            </section>

                            <section className="space-y-6">
                                <div className="flex items-center gap-2 px-2 text-slate-800">
                                    <HistoryIcon className="w-5 h-5 text-purple-500" />
                                    <h3 className="font-black text-xs uppercase tracking-[0.2em]">Evolutionary Archive (History)</h3>
                                </div>
                                <GlassCard className="p-0 border-white shadow-xl overflow-hidden" delay={0.2}>
                                    <div className="max-h-[600px] overflow-y-auto no-scrollbar">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50/50 border-b border-slate-100 sticky top-0 z-10">
                                                <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                    <th className="px-8 py-4">Knowledge Snapshot</th>
                                                    <th className="px-6 py-4">Metrics</th>
                                                    <th className="px-6 py-4">Size</th>
                                                    <th className="px-8 py-4 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-sm font-bold text-slate-600">
                                                {historyFiles.length === 0 ? <tr><td colSpan={4} className="py-20 text-center text-slate-300 italic uppercase tracking-widest">Scanning timeline...</td></tr> : historyFiles.map((f, i) => {
                                                    const parts = f.name.split('_');
                                                    const timestamp = parts[0];
                                                    const timeframe = parts[1] || 'N/A';
                                                    const mape = f.name.includes('mape_') ? f.name.split('mape_')[1].replace('.keras', '') : 'N/A';

                                                    return (
                                                        <tr key={i} className="border-b border-slate-50/50 hover:bg-slate-50/30 transition-colors group">
                                                            <td className="px-8 py-5 flex items-center gap-3">
                                                                <div className="p-2 bg-purple-50 rounded-xl text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-all"><FileJson className="w-4 h-4" /></div>
                                                                <div className="flex flex-col">
                                                                    <span className="tracking-tighter font-black text-slate-800">{timestamp} · <span className="text-sky-500">{timeframe}</span></span>
                                                                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Neural Snapshot</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-5">
                                                                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 text-[10px] font-black rounded-lg">
                                                                    {mape}% MAPE
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-5 text-xs text-slate-400">{(f.metadata.size / 1024 / 1024).toFixed(2)} MB</td>
                                                            <td className="px-8 py-5 text-right"><button onClick={() => deleteFile(f.name)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button></td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </GlassCard>
                            </section>
                        </div>

                        <div className="space-y-8">
                            <GlassCard className="p-8 border-white shadow-xl bg-slate-900 text-white" delay={0.3}>
                                <div className="flex items-center gap-3 mb-6 opacity-60"><RefreshCcw className="w-5 h-5" /><h4 className="font-black uppercase text-[10px] tracking-widest">Connectivity Status</h4></div>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-400 uppercase">Supabase API</span><span className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Operational</span></div>
                                    <div className="flex items-center justify-between border-t border-white/10 pt-6"><span className="text-xs font-bold text-slate-400 uppercase">Bucket Health</span><span className="text-emerald-400 font-black text-[10px] uppercase tracking-widest">100% Sync</span></div>
                                </div>
                                <button onClick={fetchFiles} className="mt-10 w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-black uppercase text-[10px] tracking-widest transition-all">Refresh Index</button>
                            </GlassCard>
                            <div className="p-8 rounded-[40px] bg-sky-500/5 border border-sky-100 flex items-start gap-5"><div className="p-3 bg-white rounded-2xl shadow-sm text-sky-500 shrink-0"><Globe className="w-6 h-6" /></div><div><h4 className="font-black text-slate-800 uppercase text-[10px] mb-2 tracking-widest">Edge Propagation</h4><p className="text-[11px] text-slate-500 leading-relaxed font-medium">Model brains are distributed via Supabase CDN across 12 global regions for near-zero latency startup.</p></div></div>
                        </div>
                    </div>
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
