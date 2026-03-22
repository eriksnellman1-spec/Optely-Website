import { useTranslations } from "next-intl";
import ScrollReveal from "@/components/shared/ScrollReveal";

const steps = [
  { num: "01", key: "step1" as const },
  { num: "02", key: "step2" as const },
  { num: "03", key: "step3" as const },
];

export default function ProcessSteps() {
  const t = useTranslations("process");

  return (
    <section className="bg-surface/30 py-24 px-6">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="mb-4 text-center">
          <h2 className="font-syne text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            {t("title")}
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={0.1} className="mb-16 text-center">
          <p className="font-dm text-lg text-muted">{t("sub")}</p>
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <ScrollReveal key={step.key} delay={i * 0.1}>
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-surface/80 p-5 sm:p-8">
                {/* Large faded number */}
                <div
                  className="pointer-events-none absolute -right-4 -top-6 font-syne text-9xl font-extrabold leading-none text-white/[0.04]"
                  aria-hidden="true"
                >
                  {step.num}
                </div>

                <div className="relative z-10">
                  <div className="mb-4 font-mono text-xs uppercase tracking-widest text-accent">
                    {step.num}
                  </div>
                  <h3 className="mb-3 font-syne text-xl font-bold text-white">
                    {t(`${step.key}_title`)}
                  </h3>
                  <p className="font-dm text-sm leading-relaxed text-muted">
                    {t(`${step.key}_desc`)}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
