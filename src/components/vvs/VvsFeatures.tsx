import { useTranslations } from "next-intl";
import { UserCheck, CalendarCheck, GitBranch, Star } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import ScrollReveal from "@/components/shared/ScrollReveal";

const icons = [UserCheck, CalendarCheck, GitBranch, Star];
const featureKeys = ["feature1", "feature2", "feature3", "feature4"] as const;

export default function VvsFeatures() {
  const t = useTranslations("vvs");

  return (
    <section className="bg-surface/30 py-24 px-6">
      <div className="mx-auto max-w-7xl">
        {/* What is VVS */}
        <ScrollReveal className="mb-20 text-center">
          <h2 className="mb-6 font-syne text-4xl font-bold text-white md:text-5xl">
            {t("what_title")}
          </h2>
          <p className="mx-auto max-w-3xl font-dm text-lg text-muted leading-relaxed">
            {t("what_desc")}
          </p>
        </ScrollReveal>

        {/* Feature bento grid */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {featureKeys.map((key, i) => {
            const Icon = icons[i];
            return (
              <GlassCard key={key} delay={i * 0.09} className="p-8">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <Icon className="text-accent" size={22} />
                </div>
                <h3 className="mb-3 font-syne text-lg font-bold text-white">
                  {t(`${key}_title`)}
                </h3>
                <p className="font-dm text-sm leading-relaxed text-muted">
                  {t(`${key}_desc`)}
                </p>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
