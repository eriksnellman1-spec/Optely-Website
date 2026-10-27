import { ArrowRight } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import type { Locale } from "@/lib/servicePages";
import { caseStudies, caseStudyLabels, caseStudyPath } from "@/lib/caseStudies";

/** Cards linking to every case study; used on the home page and on /cases. */
export default function CaseStudyCards({ locale }: { locale: Locale }) {
  return (
    <div
      className={`grid grid-cols-1 gap-6 ${caseStudies.length > 1 ? "md:grid-cols-2" : "mx-auto max-w-2xl"}`}
    >
      {caseStudies.map((cs, i) => {
        const c = cs.content[locale];
        return (
          <GlassCard key={cs.id} delay={i * 0.08} className="flex flex-col p-8">
            <div className="mb-3 font-mono text-xs uppercase tracking-widest text-accent-light">
              {caseStudyLabels[locale].label}
            </div>
            <h3 className="mb-3 font-syne text-2xl font-bold text-white">{c.h1}</h3>
            <p className="mb-6 flex-1 font-dm leading-relaxed text-muted">{c.intro}</p>
            {c.quote && (
              <p className="mb-6 border-l-2 border-accent pl-4 font-dm text-sm italic text-white/80">
                “{c.quote.text}” — {c.quote.author}
              </p>
            )}
            <a
              href={caseStudyPath(locale, cs)}
              className="inline-flex items-center gap-1 font-mono text-xs text-accent-light transition-colors hover:text-accent"
            >
              {caseStudyLabels[locale].readMore} <ArrowRight size={12} />
            </a>
          </GlassCard>
        );
      })}
    </div>
  );
}
