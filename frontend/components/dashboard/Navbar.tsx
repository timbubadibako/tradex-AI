"use client";

import { Bell, Search, User, ChevronDown } from "lucide-react";
import GlassCard from "./GlassCard";

export default function Navbar() {
  return (
    <nav className="w-full flex items-center justify-betweenpy p-1 mb-2">
      {/* Search Bar */}
      <div className="relative w-80 hidden md:block">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search..." 
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/50 border border-white focus:bg-white focus:ring-4 focus:ring-sky-50 transition-all outline-none text-xs font-medium text-slate-600 shadow-sm"
        />
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3 ml-auto">
        <button className="relative w-10 h-10 rounded-xl bg-white/60 border border-white flex items-center justify-center text-slate-400 hover:text-sky-500 transition-all shadow-sm">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white" />
        </button>

        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="text-right">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Trader</p>
            <p className="text-xs font-black text-slate-800">Master Jrilym</p>
          </div>
          <button className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-white flex items-center justify-center shadow-sm overflow-hidden group">
            <User className="w-5 h-5 text-slate-400 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </nav>
  );
}
