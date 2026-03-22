import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import ScrollReveal from "@/components/shared/ScrollReveal";

export default function WhyOptely() {
  const t = useTranslations("why");

  const points = [
    t("point1"),
    t("point2"),
    t("point3"),
    t("point4"),
    t("point5"),
    t("point6"),
  ];

  return (
    <section className="bg-surface/30 py-24 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          {/* Left: text */}
          <div>
            <ScrollReveal>
              <h2 className="mb-4 font-syne text-3xl font-bold text-white sm:text-4xl md:text-5xl">
                {t("title")}
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <p className="mb-10 font-dm text-lg text-muted">{t("sub")}</p>
            </ScrollReveal>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {points.map((point, i) => (
                <ScrollReveal key={point} delay={0.1 + i * 0.07}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent/10">
                      <Check className="text-accent" size={13} />
                    </div>
                    <span className="font-dm text-sm text-white/90">{point}</span>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>

          {/* Right: abstract dashboard mockup */}
          <ScrollReveal delay={0.2} direction="right">
            <div className="relative rounded-2xl border border-white/[0.06] bg-surface/80 p-6 backdrop-blur-md">
              {/* Fake dashboard header */}
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                <div className="h-3 w-3 rounded-full bg-success/60" />
                <div className="ml-4 font-mono text-xs text-muted">
                  optely-ai-dashboard.tsx
                </div>
              </div>

              {/* Fake workflow nodes */}
              <div className="space-y-3">
                {[
                  { label: "Lead Qualification", status: "active", delay: 0 },
                  { label: "AI Processing", status: "running", delay: 0.3 },
                  { label: "Auto Response", status: "complete", delay: 0.6 },
                  { label: "CRM Update", status: "complete", delay: 0.9 },
                  { label: "Follow-up Scheduled", status: "complete", delay: 1.2 },
                ].map((node) => (
                  <div
                    key={node.label}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-bg/60 px-4 py-3"
                  >
                    <div
                      className={`h-2 w-2 flex-shrink-0 rounded-full ${
                        node.status === "active"
                          ? "bg-accent animate-pulse"
                          : node.status === "running"
                          ? "bg-yellow-400 animate-pulse"
                          : "bg-success"
                      }`}
                    />
                    <span className="font-mono text-xs text-muted/80">
                      {node.label}
                    </span>
                    {node.status === "complete" && (
                      <div className="ml-auto">
                        <Check size={12} className="text-success" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Glow */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-30"
                style={{ boxShadow: "inset 0 0 60px rgba(37,99,235,0.08)" }} />
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
