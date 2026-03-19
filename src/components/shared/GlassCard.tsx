"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  delay?: number;
}

export default function GlassCard({
  children,
  className = "",
  hover = true,
  delay = 0,
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay }}
      whileHover={
        hover
          ? {
              y: -4,
              boxShadow: "0 0 30px rgba(37,99,235,0.15)",
            }
          : {}
      }
      className={`rounded-2xl border border-white/[0.08] bg-surface/80 backdrop-blur-xl ${className}`}
      style={{
        background: "rgba(17,17,19,0.8)",
      }}
    >
      {children}
    </motion.div>
  );
}
