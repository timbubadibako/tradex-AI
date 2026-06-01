"use client";

import { Home, BarChart2, PieChart, Settings, ShieldCheck, LogOut, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  onTabChange: (tab: string) => void;
  activeTab: string;
}

const menuItems = [
  { icon: Home, label: "Dashboard" },
  { icon: BarChart2, label: "Market" },
  { icon: PieChart, label: "Portfolio" },
  { icon: ShieldCheck, label: "AI Safety" },
  { icon: Settings, label: "Settings" },
];

export default function Sidebar({ onTabChange, activeTab }: SidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 p-6 z-20">
      <div className="flex flex-col h-full bg-white/40 backdrop-blur-xl border border-white/60 rounded-[40px] p-6 shadow-2xl shadow-sky-100/50">
        
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 mb-12">
          <div className="w-10 h-10 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-200">
            <Zap className="w-6 h-6 text-white fill-white" />
          </div>
          <div>
            <h2 className="font-black text-slate-900 leading-none">TRADEX</h2>
            <p className="text-[10px] font-bold text-sky-500 tracking-[0.2em]">AI BOT V2</p>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => onTabChange(item.label)}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group",
                activeTab === item.label 
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-100 font-bold" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-white/50 font-medium"
              )}
            >
              <item.icon className={cn("w-5 h-5", activeTab === item.label ? "text-white" : "text-slate-400 group-hover:text-sky-500")} />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer Sidebar */}
        <div className="mt-auto pt-6 border-t border-slate-100">
          <button className="w-full flex items-center gap-4 px-4 py-4 text-slate-400 hover:text-rose-500 transition-colors">
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-bold">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
