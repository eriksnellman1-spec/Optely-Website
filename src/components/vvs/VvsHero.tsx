"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

export default function VvsHero() {
  const t = useTranslations("vvs");

  return (
    <section className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden bg-bg px-6 pt-24 text-center">
      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Circuit decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-10">
        <svg
          viewBox="0 0 800 600"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl"
          fill="none"
        >
          <path d="M100 300 L200 300 L200 200 L400 200 L400 300 L600 300 L600 400 L700 400" stroke="#2563EB" strokeWidth="1.5" />
          <path d="M150 400 L250 400 L250 300 L350 300 L350 400 L500 400 L500 200 L650 200" stroke="#2563EB" strokeWidth="1.5" />
          <circle cx="200" cy="300" r="4" fill="#2563EB" />
          <circle cx="400" cy="200" r="4" fill="#2563EB" />
          <circle cx="600" cy="300" r="4" fill="#2563EB" />
          <circle cx="350" cy="300" r="4" fill="#2563EB" />
          <circle cx="500" cy="400" r="4" fill="#2563EB" />
        </svg>
      </div>

      <div className="relative z-10 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          <span className="font-mono text-xs text-accent-light">The HVAC Generator</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-6 font-syne text-5xl font-extrabold leading-tight text-white md:text-7xl"
        >
          {t("hero_title")}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mb-10 font-dm text-lg text-muted md:text-xl"
        >
          {t("hero_sub")}
        </motion.p>

        <motion.a
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          href="https://calendly.com/optelyofficial/15min"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-full bg-accent px-10 py-4 font-dm text-base font-semibold text-white shadow-glow-blue transition-all hover:bg-accent/90 hover:shadow-glow-blue-lg"
        >
          {t("hero_cta")}
        </motion.a>
      </div>
    </section>
  );
}
