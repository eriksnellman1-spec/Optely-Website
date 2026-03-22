import { useTranslations } from "next-intl";
import { Quote } from "lucide-react";
import ScrollReveal from "@/components/shared/ScrollReveal";

export default function Testimonials() {
  const t = useTranslations("testimonials");

  const items = [
    {
      quote: t("vlift_quote"),
      author: t("vlift_author"),
      role: t("vlift_role"),
    },
    {
      quote: t("seamex_quote"),
      author: t("seamex_author"),
      role: t("seamex_role"),
    },
  ];

  return (
    <section className="bg-bg py-24 px-6">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="mb-4 text-center">
          <h2 className="font-syne text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            {t("title")}
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={0.1} className="mb-16 text-center">
          <p className="font-dm text-lg text-muted">{t("sub")}</p>
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {items.map((item, i) => (
            <ScrollReveal key={item.author} delay={i * 0.12}>
              <div className="flex flex-col gap-6 rounded-2xl border border-white/[0.06] bg-surface/80 p-5 sm:p-8 backdrop-blur-md">
                <Quote className="text-accent/40" size={28} />
                <p className="font-dm text-base leading-relaxed text-white/90 italic">
                  &ldquo;{item.quote}&rdquo;
                </p>
                <div className="flex items-center gap-4 border-t border-white/[0.06] pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 font-syne text-sm font-bold text-accent">
                    {item.author[0]}
                  </div>
                  <div>
                    <div className="font-syne text-sm font-bold text-white">
                      {item.author}
                    </div>
                    <div className="font-mono text-xs text-muted">{item.role}</div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
