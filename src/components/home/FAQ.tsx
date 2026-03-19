"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import ScrollReveal from "@/components/shared/ScrollReveal";

export default function FAQ() {
  const t = useTranslations("faq");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const items = [
    { q: t("q1"), a: t("a1") },
    { q: t("q2"), a: t("a2") },
    { q: t("q3"), a: t("a3") },
    { q: t("q4"), a: t("a4") },
    { q: t("q5"), a: t("a5") },
  ];

  return (
    <section className="bg-surface/30 py-24 px-6">
      <div className="mx-auto max-w-3xl">
        <ScrollReveal className="mb-4 text-center">
          <h2 className="font-syne text-4xl font-bold text-white md:text-5xl">
            {t("title")}
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={0.1} className="mb-16 text-center">
          <p className="font-dm text-lg text-muted">{t("sub")}</p>
        </ScrollReveal>

        <div className="flex flex-col gap-3">
          {items.map((item, i) => (
            <ScrollReveal key={i} delay={i * 0.06}>
              <div
                className={`overflow-hidden rounded-2xl border transition-colors duration-200 ${
                  openIndex === i
                    ? "border-accent/30 bg-accent/5"
                    : "border-white/[0.06] bg-surface/60"
                }`}
              >
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  aria-expanded={openIndex === i}
                >
                  <span className="font-syne text-base font-semibold text-white">
                    {item.q}
                  </span>
                  <motion.div
                    animate={{ rotate: openIndex === i ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="flex-shrink-0"
                  >
                    <ChevronDown
                      size={18}
                      className={openIndex === i ? "text-accent" : "text-muted"}
                    />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {openIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
                    >
                      <div className="border-t border-white/[0.06] px-6 pb-5 pt-4 font-dm text-sm leading-relaxed text-muted">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
