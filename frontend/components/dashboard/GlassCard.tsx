"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function GlassCard({ children, className, delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay,
        ease: [0.23, 1, 0.32, 1] 
      }}
      className={cn(
        "relative overflow-hidden rounded-3xl border border-white/40 bg-white/60 p-6 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] transition-all duration-300 hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] hover:border-white/60",
        className
      )}
    >
      <div className="relative z-10">{children}</div>
      {/* Subtle light reflection effect */}
      <div className="absolute -inset-x-20 -top-20 h-40 w-40 bg-sky-200/20 blur-[80px] pointer-events-none" />
    </motion.div>
  );
}
