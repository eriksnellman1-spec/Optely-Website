"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useLocale } from "next-intl";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12 },
  },
};

const word = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

function AnimatedHeadline({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <motion.span
      variants={container}
      initial="hidden"
      animate="show"
      className="inline"
    >
      {words.map((w, i) => (
        <motion.span key={i} variants={word} className="inline-block mr-[0.25em]">
          {w}
        </motion.span>
      ))}
    </motion.span>
  );
}

export default function Hero() {
  const t = useTranslations("hero");
  const locale = useLocale();
  const prefix = locale === "sv" ? "" : `/${locale}`;
  const [particlesInit, setParticlesInit] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setParticlesInit(true));
  }, []);

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg px-6 pt-24 text-center">
      {/* Particles background */}
      {particlesInit && (
        <Particles
          id="hero-particles"
          className="absolute inset-0"
          options={{
            background: { color: { value: "transparent" } },
            fpsLimit: 60,
            interactivity: {
              events: { onHover: { enable: true, mode: "repulse" } },
              modes: { repulse: { distance: 80, duration: 0.4 } },
            },
            particles: {
              color: { value: "#2563EB" },
              links: {
                color: "#2563EB",
                distance: 130,
                enable: true,
                opacity: 0.25,
                width: 1,
              },
              move: { enable: true, speed: 0.5, outModes: { default: "bounce" } },
              number: { density: { enable: true }, value: 60 },
              opacity: { value: 0.5 },
              shape: { type: "circle" },
              size: { value: { min: 1, max: 3 } },
            },
            detectRetina: true,
          }}
        />
      )}

      {/* Noise overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />

      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(37,99,235,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex max-w-5xl flex-col items-center gap-8">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          <span className="font-mono text-xs text-accent-light">
            {t("badge")}
          </span>
        </motion.div>

        {/* Headline */}
        <h1 className="font-syne text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-7xl lg:text-8xl">
          <AnimatedHeadline text={t("headline_1")} />
          <br />
          <span className="bg-gradient-to-r from-accent to-accent-light bg-clip-text text-transparent">
            <AnimatedHeadline text={t("headline_2")} />
          </span>
        </h1>

        {/* Sub */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="max-w-2xl font-dm text-lg text-muted md:text-xl"
        >
          {t("sub")}
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="flex flex-col items-center gap-4 sm:flex-row"
        >
          <a
            href="https://calendly.com/optelyofficial/15min"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-accent px-8 py-3.5 font-dm text-sm font-semibold text-white shadow-glow-blue transition-all duration-300 hover:bg-accent/90 hover:shadow-glow-blue-lg"
          >
            {t("cta_primary")}
          </a>
          <Link
            href={`${prefix}/services`}
            className="flex items-center gap-2 rounded-full border border-white/10 px-8 py-3.5 font-dm text-sm font-medium text-muted transition-all duration-200 hover:border-white/20 hover:text-white"
          >
            {t("cta_secondary")} →
          </Link>
        </motion.div>

      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2"
      >
        <div className="flex h-10 w-6 items-start justify-center rounded-full border border-white/20 p-1.5">
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="h-2 w-1 rounded-full bg-accent"
          />
        </div>
      </motion.div>
    </section>
  );
}
