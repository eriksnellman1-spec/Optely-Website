import { useTranslations } from "next-intl";
import { TrendingUp, Puzzle, Shield } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import ScrollReveal from "@/components/shared/ScrollReveal";

const icons = [TrendingUp, Puzzle, Shield];
const keys = [
  { title: "profitable_title", desc: "profitable_desc" },
  { title: "tailored_title", desc: "tailored_desc" },
  { title: "reliable_title", desc: "reliable_desc" },
] as const;

export default function Strengths() {
  const t = useTranslations("strengths");

  return (
    <section className="bg-bg py-24 px-6">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="mb-16 text-center">
          <h2 className="font-syne text-4xl font-bold text-white md:text-5xl">
            {t("title")}
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {keys.map((key, i) => {
            const Icon = icons[i];
            return (
              <GlassCard key={key.title} delay={i * 0.1} className="p-8">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                  <Icon className="text-accent" size={22} />
                </div>
                <h3 className="mb-3 font-syne text-xl font-bold text-white">
                  {t(key.title)}
                </h3>
                <p className="font-dm text-sm leading-relaxed text-muted">
                  {t(key.desc)}
                </p>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}
