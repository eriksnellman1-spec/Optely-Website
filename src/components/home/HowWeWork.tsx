"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import Link from "next/link";
import { motion } from "framer-motion";
import ScrollReveal from "@/components/shared/ScrollReveal";

const phases = [
  { num: "01", key: "phase1" as const },
  { num: "02", key: "phase2" as const },
  { num: "03", key: "phase3" as const },
];

export default function HowWeWork() {
  const t = useTranslations("how_we_work");
  const locale = useLocale();
  const prefix = locale === "sv" ? "" : `/${locale}`;

  return (
    <section className="bg-bg py-24 px-6">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="mb-4 text-center">
          <h2 className="font-syne text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            {t("title")}
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={0.1} className="mb-20 text-center">
          <p className="font-dm text-lg text-muted">{t("sub")}</p>
        </ScrollReveal>

        {/* Timeline */}
        <div className="relative">
          {/* Connector line */}
          <div className="absolute left-8 top-0 hidden h-full w-px bg-gradient-to-b from-accent via-accent/40 to-transparent md:block" />

          <div className="flex flex-col gap-12">
            {phases.map((phase, i) => (
              <motion.div
                key={phase.key}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                className="relative flex gap-4 md:gap-8"
              >
                {/* Dot */}
                <div className="relative hidden flex-shrink-0 md:block">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-accent/30 bg-accent/10 shadow-glow-blue-sm">
                    <span className="font-mono text-sm font-bold text-accent">
                      {phase.num}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 rounded-2xl border border-white/[0.06] bg-surface/60 p-5 sm:p-8 backdrop-blur-md">
                  <div className="mb-1 font-mono text-xs uppercase tracking-widest text-accent">
                    Phase {phase.num}
                  </div>
                  <h3 className="mb-3 font-syne text-2xl font-bold text-white">
                    {t(`${phase.key}_title`)}
                  </h3>
                  <p className="font-dm text-base leading-relaxed text-muted">
                    {t(`${phase.key}_desc`)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <ScrollReveal delay={0.3} className="mt-12 text-center">
          <Link
            href={`${prefix}/process`}
            className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-6 py-3 font-dm text-sm font-medium text-accent-light transition-all hover:bg-accent/20"
          >
            {t("cta")} →
          </Link>
        </ScrollReveal>
      </div>
    </section>
  );
}
