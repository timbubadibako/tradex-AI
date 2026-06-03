"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  isActive?: boolean;
}

export default function GlassCard({ children, className, delay = 0, isActive = false }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.6, 
        delay,
        ease: [0.2, 0, 0, 1] 
      }}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-3xl transition-all duration-500",
        isActive && "active-trade-glow",
        className
      )}
    >
      <div className="relative z-10">{children}</div>
      {/* Dynamic Glow Reflector */}
      <div className={cn(
        "absolute -inset-x-40 -top-40 h-80 w-80 rounded-full blur-[100px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000",
        isActive ? "bg-sky-500/10" : "bg-white/[0.03]"
      )} />
    </motion.div>
  );
}
