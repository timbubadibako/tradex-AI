"use client";

import { motion } from "framer-motion";
import { Settings, Cpu, Database, Globe, Lock, Bell, User, Zap, Save } from "lucide-react";
import { useState } from "react";
import GlassCard from "@/components/dashboard/GlassCard";
import Sidebar from "@/components/dashboard/Sidebar";

// SAKTI DEBUG TOOLTIP
function DebugTooltip({ endpoint, isNull }: { endpoint: string, isNull: boolean }) {
  return (
    <div className={`absolute top-2 right-4 z-50 group`}>
       {isNull && <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]" />}
       <div className="absolute right-0 top-6 w-max opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-2xl pointer-events-none text-left">
          <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">Data Source Required</p>
          <code className="text-[10px] text-slate-300 bg-black/40 px-2 py-1 rounded">{endpoint}</code>
       </div>
    </div>
  );
}

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("****************");
  const [apiSecret, setApiSecret] = useState("****************");

  return (
    <div className="flex h-screen overflow-hidden bg-[#020617] font-sans selection:bg-sky-500/20">
      <Sidebar />
      <main className="flex-1 flex flex-col p-12 md:p-20 overflow-y-auto no-scrollbar relative">
        <div className="mx-auto max-w-[1800px] w-full space-y-12 relative z-10">
          
          <header className="space-y-2">
             <div className="flex items-center gap-3 text-sky-500 mb-2">
                <Settings className="w-8 h-8" />
                <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-100">System Configuration</h1>
             </div>
             <p className="text-slate-500 font-medium text-lg">Manage engine parameters and external connectivity.</p>
          </header>

          <div className="space-y-8">
             
             {/* API Connectivity */}
             <GlassCard className="p-10 border-white/5 shadow-xl bg-white/[0.01] relative group" delay={0.1}>
                <DebugTooltip endpoint="Local Environment Variables (.env)" isNull={false} />
                <div className="flex items-center gap-3 mb-8">
                   <Globe className="w-6 h-6 text-sky-500" />
                   <h3 className="font-black text-slate-200 uppercase tracking-widest">Exchange Connectivity</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Indodax API Key</label>
                      <input 
                        type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                        className="w-full px-6 py-4 rounded-2xl bg-white/[0.02] border border-white/5 focus:bg-white/[0.05] focus:ring-4 focus:ring-sky-500/10 transition-all outline-none font-mono text-sm shadow-inner text-slate-300"
                      />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Indodax Secret</label>
                      <input 
                        type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)}
                        className="w-full px-6 py-4 rounded-2xl bg-white/[0.02] border border-white/5 focus:bg-white/[0.05] focus:ring-4 focus:ring-sky-500/10 transition-all outline-none font-mono text-sm shadow-inner text-slate-300"
                      />
                   </div>
                </div>
                <div className="mt-8 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-4">
                   <Lock className="w-6 h-6 text-amber-500 shrink-0" />
                   <p className="text-xs text-amber-200/60 leading-relaxed font-medium">
                      API Keys are stored locally in your <code className="bg-amber-500/20 px-1 py-0.5 rounded font-black text-amber-400">.env</code> file and encrypted at rest. Never share your secret key with anyone. Zenith will only use these keys for authorized market execution.
                   </p>
                </div>
             </GlassCard>

             {/* Engine Settings */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <GlassCard className="p-8 border-white/5 shadow-xl bg-white/[0.01]" delay={0.2}>
                   <div className="flex items-center gap-3 mb-6">
                      <Cpu className="w-6 h-6 text-purple-500" />
                      <h4 className="font-black text-slate-300 uppercase text-xs tracking-widest">Model Persistence</h4>
                   </div>
                   <div className="space-y-4">
                      <div className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 shadow-sm">
                         <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Auto-Save Evolutionary State</span>
                         <div className="w-12 h-6 bg-sky-500 rounded-full flex items-center justify-end px-1.5 shadow-inner"><div className="w-4 h-4 bg-white rounded-full shadow-sm" /></div>
                      </div>
                      <div className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 shadow-sm">
                         <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Verbose Logging</span>
                         <div className="w-12 h-6 bg-white/10 rounded-full flex items-center justify-start px-1.5 shadow-inner"><div className="w-4 h-4 bg-white rounded-full shadow-sm" /></div>
                      </div>
                   </div>
                </GlassCard>

                <GlassCard className="p-8 border-white/5 shadow-xl bg-white/[0.01]" delay={0.25}>
                   <div className="flex items-center gap-3 mb-6">
                      <Bell className="w-6 h-6 text-rose-500" />
                      <h4 className="font-black text-slate-300 uppercase text-xs tracking-widest">Alert Preferences</h4>
                   </div>
                   <div className="space-y-4">
                      <div className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.01] border border-white/5 opacity-50 cursor-not-allowed">
                         <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Telegram Notification</span>
                         <span className="text-[10px] font-black text-rose-500 uppercase bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">Disabled</span>
                      </div>
                      <div className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 shadow-sm">
                         <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Sound on Execution</span>
                         <div className="w-12 h-6 bg-sky-500 rounded-full flex items-center justify-end px-1.5 shadow-inner"><div className="w-4 h-4 bg-white rounded-full shadow-sm" /></div>
                      </div>
                   </div>
                </GlassCard>
             </div>

             <button className="w-full py-6 mt-4 rounded-[32px] bg-white/[0.03] border border-white/10 text-white font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-sky-500 transition-all flex items-center justify-center gap-4">
                <Save className="w-6 h-6" /> Commit Configuration
             </button>

          </div>
        </div>
      </main>
    </div>
  );
}
