"use client";

import { motion } from "framer-motion";

interface OrderBookIndicatorProps {
    obi: number;
}

export default function OrderBookIndicator({ obi = 0 }: OrderBookIndicatorProps) {
    return (
        <div className="w-full h-full flex flex-col justify-center px-10 bg-[#020617]/40 backdrop-blur-sm relative group">
            <div className="flex justify-between items-end mb-2 text-[9px] font-black uppercase tracking-[0.3em]">
                <div className="text-emerald-500 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                    Bids Depth
                </div>
                <div className="text-white text-sm font-black">
                    {(obi || 0).toFixed(2)} <span className="text-[8px] text-slate-600 ml-1">WOBI</span>
                </div>
                <div className="text-rose-500 flex items-center gap-1.5">
                    Asks Depth
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
                </div>
            </div>

            <div className="relative h-2 w-full bg-white/[0.02] rounded-full flex overflow-hidden border border-white/5">
                <motion.div
                    animate={{ width: `${50 + (obi * 50)}%`, backgroundColor: obi > 0.05 ? '#10b981' : '#334155' }}
                    className="h-full transition-all duration-700 ease-out"
                />
                <motion.div
                    animate={{ backgroundColor: obi < -0.05 ? '#f43f5e' : '#334155' }}
                    className="h-full flex-1 transition-all duration-700 ease-out"
                />
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-[#020617] z-10" />
            </div>
        </div>
    );
}