"use client";

import { Bell, Search, User, ChevronDown } from "lucide-react";
import GlassCard from "./GlassCard";

export default function Navbar() {
  return (
    <nav className="w-full flex items-center justify-between py-4 px-2 mb-8">
      {/* Search Bar */}
      <div className="relative w-96 hidden md:block">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search pairs, trades, or metrics..." 
          className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/50 border border-white focus:bg-white focus:ring-4 focus:ring-sky-50 transition-all outline-none text-sm font-medium text-slate-600 shadow-sm"
        />
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4 ml-auto">
        <button className="relative w-12 h-12 rounded-2xl bg-white/60 border border-white flex items-center justify-center text-slate-400 hover:text-sky-500 hover:bg-white transition-all shadow-sm">
          <Bell className="w-5 h-5" />
          <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Trader Mode</p>
            <p className="text-sm font-black text-slate-800">Master Jrilym</p>
          </div>
          <button className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-white flex items-center justify-center shadow-sm overflow-hidden group">
            <User className="w-6 h-6 text-slate-400 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </nav>
  );
}
