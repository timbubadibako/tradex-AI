"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [target, setTarget] = useState(dailyTarget || 100000);

  const defaults = {
    conf: 0.75,
    sig: 0.5,
    useMacro: true,
    target: 100000
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
      // Snapback to defaults
      setConf(defaults.conf);
      setSig(defaults.sig);
      setUseMacro(defaults.useMacro);
      updateConfig({ active: false, conf: defaults.conf, sig: defaults.sig, useMacro: defaults.useMacro });
    } else {
      updateConfig({ active: true, conf, sig, useMacro });
    }
  };

  return (
    <GlassCard className="p-8 border-white shadow-2xl bg-white/90">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isActive ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {isActive ? <ShieldAlert className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest">AI Safety & Control</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              {isActive ? "Manual Override Active" : "Strict Safety Protocol Active"}
            </p>
          </div>
        </div>
        <button 
          onClick={handleToggle}
          className={`px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${isActive ? 'bg-rose-500 text-white shadow-lg shadow-rose-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          {isActive ? "Disable Override" : "Enable Override"}
        </button>
      </div>

      <div className={`space-y-8 transition-all ${!isActive ? 'opacity-40 pointer-events-none grayscale' : ''}`}>
        {/* Confidence Slider */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-slate-600">
              <Zap className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Confidence Threshold</span>
            </div>
            <span className="text-xs font-black text-sky-600">{(conf * 100).toFixed(0)}%</span>
          </div>
          <input 
            type="range" min="0.51" max="0.95" step="0.01" value={conf} 
            onChange={(e) => { setConf(parseFloat(e.target.value)); updateConfig({ active: true, conf: parseFloat(e.target.value), sig, useMacro }); }}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* Signal/OBI Threshold */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-slate-600">
              <BarChart3 className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">OBI Sensitivity</span>
            </div>
            <span className="text-xs font-black text-emerald-600">{sig.toFixed(2)}</span>
          </div>
          <input 
            type="range" min="0.0" max="1.0" step="0.05" value={sig} 
            onChange={(e) => { setSig(parseFloat(e.target.value)); updateConfig({ active: true, conf, sig: parseFloat(e.target.value), useMacro }); }}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        {/* Daily Target */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-slate-600">
              <Target className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Daily Target (Rp)</span>
            </div>
            <span className="text-xs font-black text-slate-900">{target.toLocaleString('id-ID')}</span>
          </div>
          <input 
            type="range" min="10000" max="1000000" step="10000" value={target} 
            onChange={(e) => { setTarget(parseInt(e.target.value)); updateTarget(parseInt(e.target.value)); }}
            className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-800"
          />
        </div>

        {/* Macro Toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3">
             <div className={`w-2 h-2 rounded-full ${useMacro ? 'bg-sky-500' : 'bg-slate-300'}`} />
             <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Use Macro Consensus (1H)</span>
          </div>
          <button 
            onClick={() => { const val = !useMacro; setUseMacro(val); updateConfig({ active: true, conf, sig, useMacro: val }); }}
            className={`w-12 h-6 rounded-full transition-all relative ${useMacro ? 'bg-sky-500' : 'bg-slate-300'}`}
          >
            <motion.div 
              animate={{ x: useMacro ? 24 : 4 }}
              className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm" 
            />
          </button>
        </div>
      </div>

      {!isActive && (
        <div className="mt-8 flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest justify-center">
           <RotateCcw className="w-3 h-3" />
           Parameters locked to safe defaults
        </div>
      )}
    </GlassCard>
  );
}
