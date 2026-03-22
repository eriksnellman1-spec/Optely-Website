import { useTranslations } from "next-intl";

const logos = ["Tyre Center", "Ab Seamex Oy", "V-Lift"];

export default function TrustBar() {
  const t = useTranslations("trust");

  return (
    <section className="border-y border-border bg-surface/50 py-10">
      <p className="mb-6 text-center font-mono text-xs uppercase tracking-widest text-muted">
        {t("title")}
      </p>

      <div className="relative overflow-hidden">
        {/* Fade edges */}
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-surface/80 to-transparent sm:w-32" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-surface/80 to-transparent sm:w-32" />

        <div className="flex animate-marquee gap-20 whitespace-nowrap">
          {[...logos, ...logos, ...logos, ...logos].map((name, i) => (
            <div
              key={i}
              className="flex items-center gap-3 font-syne text-sm font-bold text-muted/60 transition-colors hover:text-muted"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent/40" />
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
