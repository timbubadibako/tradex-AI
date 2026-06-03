"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Shield, ShieldAlert, Zap, Target, BarChart3, RotateCcw } from "lucide-react";
import GlassCard from "./GlassCard";
import { getApiUrl } from "@/lib/constants";

interface ControlCenterProps {
  currentConfig: any;
  dailyTarget: number;
}

export default function ControlCenter({ currentConfig, dailyTarget }: ControlCenterProps) {
  const [isActive, setIsActive] = useState(currentConfig?.active || false);
  const [conf, setConf] = useState(currentConfig?.conf_threshold || 0.75);
  const [sig, setSig] = useState(currentConfig?.signal_threshold || 0.5);
  const [useMacro, setUseMacro] = useState(currentConfig?.use_macro !== false);
  const [target, setTarget] = useState(dailyTarget || 150000);

  const defaults = {
    conf: 0.75,
    sig: 0.5,
    useMacro: true,
    target: 150000
  };

  useEffect(() => {
    if (currentConfig) {
      setIsActive(currentConfig.active);
      setConf(currentConfig.conf_threshold);
      setSig(currentConfig.signal_threshold);
      setUseMacro(currentConfig.use_macro);
    }
    if (dailyTarget) setTarget(dailyTarget);
  }, [currentConfig, dailyTarget]);

  const updateConfig = async (params: any) => {
    try {
      const query = new URLSearchParams({
        active: params.active.toString(),
        conf: params.conf.toString(),
        sig: params.sig.toString(),
        macro: params.useMacro.toString()
      });
      await fetch(`${getApiUrl()}/api/update_manual_config?${query}`, { method: 'POST' });
    } catch (e) {
      console.error("Failed to update config", e);
    }
  };

  const updateTarget = async (val: number) => {
    try {
      await fetch(`${getApiUrl()}/api/update_daily_target?target=${val}`, { method: 'POST' });
    } catch (e) {
      console.error("Failed to update target", e);
    }
  };

  const handleToggle = () => {
    const newActive = !isActive;
    setIsActive(newActive);
    if (!newActive) {
      setConf(defaults.conf);
      setSig(defaults.sig);
      setUseMacro(defaults.useMacro);
      updateConfig({ active: false, conf: defaults.conf, sig: defaults.sig, useMacro: defaults.useMacro });
    } else {
      updateConfig({ active: true, conf, sig, useMacro });
    }
  };

  return (
    <GlassCard className="p-10 border-white/5 shadow-2xl bg-white/[0.01]">
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${isActive ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
            {isActive ? <ShieldAlert className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-black text-white text-sm uppercase tracking-[0.2em]">Neural Override Center</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              {isActive ? "Tactical Manual Control Active" : "Autonomous Safety Protocol Engaged"}
            </p>
          </div>
        </div>
        <button 
          onClick={handleToggle}
          className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${isActive ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]' : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'}`}
        >
          {isActive ? "Terminate Override" : "Engage Override"}
        </button>
      </div>

      <div className={`space-y-12 transition-all duration-500 ${!isActive ? 'opacity-20 pointer-events-none grayscale blur-[2px]' : ''}`}>
        {/* Confidence Slider */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <div className="flex items-center gap-3 text-slate-400">
              <Zap className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Inference Confidence Floor</span>
            </div>
            <span className="text-sm font-black text-sky-400 tracking-tighter">{(conf * 100).toFixed(0)}%</span>
          </div>
          <input 
            type="range" min="0.51" max="0.95" step="0.01" value={conf} 
            onChange={(e) => { setConf(parseFloat(e.target.value)); updateConfig({ active: true, conf: parseFloat(e.target.value), sig, useMacro }); }}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* Signal/OBI Threshold */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <div className="flex items-center gap-3 text-slate-400">
              <BarChart3 className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Order Flow Sensitivity</span>
            </div>
            <span className="text-sm font-black text-emerald-400 tracking-tighter">{sig.toFixed(2)}</span>
          </div>
          <input 
            type="range" min="0.0" max="1.0" step="0.05" value={sig} 
            onChange={(e) => { setSig(parseFloat(e.target.value)); updateConfig({ active: true, conf, sig: parseFloat(e.target.value), useMacro }); }}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* Daily Target */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <div className="flex items-center gap-3 text-slate-400">
              <Target className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Tactical Daily Target</span>
            </div>
            <span className="text-sm font-black text-white tracking-tighter">Rp {target.toLocaleString('id-ID')}</span>
          </div>
          <input 
            type="range" min="10000" max="1000000" step="10000" value={target} 
            onChange={(e) => { setTarget(parseInt(e.target.value)); updateTarget(parseInt(e.target.value)); }}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
        </div>

        {/* Macro Toggle */}
        <div className="flex items-center justify-between p-6 bg-white/[0.02] rounded-2xl border border-white/5 shadow-inner">
          <div className="flex items-center gap-4">
             <div className={`w-1.5 h-1.5 rounded-full ${useMacro ? 'bg-sky-500 shadow-[0_0_8px_#38bdf8]' : 'bg-slate-700'}`} />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Macro Trend Correlation (1H)</span>
          </div>
          <button 
            onClick={() => { const val = !useMacro; setUseMacro(val); updateConfig({ active: true, conf, sig, useMacro: val }); }}
            className={`w-12 h-6 rounded-full transition-all relative ${useMacro ? 'bg-sky-500' : 'bg-white/10'}`}
          >
            <motion.div 
              animate={{ x: useMacro ? 26 : 4 }}
              className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm" 
            />
          </button>
        </div>
      </div>

      {!isActive && (
        <div className="mt-10 flex items-center gap-2 text-[9px] font-bold text-slate-600 uppercase tracking-widest justify-center">
           <RotateCcw className="w-3 h-3" />
           Inference parameters locked to factory safe-state
        </div>
      )}
    </GlassCard>
  );
}
