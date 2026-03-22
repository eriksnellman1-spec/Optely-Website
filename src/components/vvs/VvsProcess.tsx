"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import ScrollReveal from "@/components/shared/ScrollReveal";
import { ArrowDown } from "lucide-react";

const steps = [
  { key: "process_step0" as const, descKey: "process_step0_desc" as const },
  { key: "process_step1" as const, descKey: "process_step1_desc" as const },
  { key: "process_step2" as const, descKey: "process_step2_desc" as const },
  { key: "process_step3" as const, descKey: "process_step3_desc" as const },
  { key: "process_step4" as const, descKey: "process_step4_desc" as const },
];

export default function VvsProcess() {
  const t = useTranslations("vvs");

  return (
    <section className="bg-bg py-24 px-6">
      <div className="mx-auto max-w-2xl">
        <ScrollReveal className="mb-16 text-center">
          <h2 className="font-syne text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            {t("process_title")}
          </h2>
        </ScrollReveal>

        <div className="flex flex-col items-center gap-0">
          {steps.map((step, i) => (
            <div key={step.key} className="flex w-full flex-col items-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="w-full rounded-2xl border border-white/[0.06] bg-surface/80 p-6"
              >
                <div className="mb-2 font-mono text-xs uppercase tracking-widest text-accent">
                  0{i + 1}
                </div>
                <div className="mb-1 font-syne text-lg font-bold text-white">
                  {t(step.key)}
                </div>
                <div className="font-dm text-sm text-muted">{t(step.descKey)}</div>
              </motion.div>

              {i < steps.length - 1 && (
                <div className="flex h-10 w-10 items-center justify-center text-accent/40">
                  <ArrowDown size={20} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <ScrollReveal delay={0.4} className="mt-16 rounded-2xl border border-accent/20 bg-accent/10 p-6 sm:p-10 text-center">
          <h3 className="mb-3 font-syne text-2xl font-bold text-white">
            {t("cta_title")}
          </h3>
          <p className="mb-6 font-dm text-muted">{t("cta_sub")}</p>
          <a
            href="https://calendly.com/optelyofficial/15min"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-full bg-accent px-8 py-3.5 font-dm text-sm font-semibold text-white shadow-glow-blue transition-all hover:bg-accent/90 hover:shadow-glow-blue-lg"
          >
            {t("cta_btn")}
          </a>
        </ScrollReveal>
      </div>
    </section>
  );
}
